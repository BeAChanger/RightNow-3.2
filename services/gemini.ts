/**
 * Gemini AI Service
 * 瀵硅瘽妯″瀷: Gemini 3 Flash (gemini-3-flash-preview)
 * 鍥惧儚鐢熸垚: Nano Banana 2 (gemini-3.1-flash-image-preview)
 */

const API_KEY = () => import.meta.env.VITE_GEMINI_API_KEY || '';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_UPLOAD_BASE = 'https://generativelanguage.googleapis.com/upload/v1beta';
const GEMINI_MODELS_DOC_URL = 'https://ai.google.dev/gemini-api/docs/models?hl=zh-cn';
const GEMINI_IMAGE_MODEL_DOC_URL = 'https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image-preview?hl=zh-cn';

const PRIMARY_CHAT_MODEL = 'gemini-3-flash-preview';
const FALLBACK_CHAT_MODEL = 'gemini-2.5-flash';
const CHAT_MODEL_CANDIDATES = [PRIMARY_CHAT_MODEL, FALLBACK_CHAT_MODEL];
const IMAGE_MODEL = 'gemini-3.1-flash-image-preview';
const ALLOWED_CHAT_MODELS = new Set(CHAT_MODEL_CANDIDATES);
const ALLOWED_IMAGE_MODELS = new Set([IMAGE_MODEL]);

type GeminiInputModality = 'text' | 'image' | 'video' | 'audio' | 'pdf';
const ALLOWED_INPUT_MODALITIES = new Set<GeminiInputModality>(['text', 'image', 'video', 'audio']);
const PDF_INPUT_ENABLED = false;

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES_PER_MODEL = 2;
const INLINE_DATA_MAX_BYTES = 2 * 1024 * 1024;
const INLINE_MEDIA_LIMITS: Record<'image' | 'video' | 'audio', number> = {
  image: INLINE_DATA_MAX_BYTES,
  video: 512 * 1024,
  audio: 512 * 1024,
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const MISSING_API_KEY_MESSAGE = 'Please configure VITE_GEMINI_API_KEY first.';
const GENERIC_GEMINI_ERROR_MESSAGE = 'AI service is temporarily unavailable. Please try again later.';

export class GeminiPolicyError extends Error {
  code:
    | 'MISSING_API_KEY'
    | 'MODEL_NOT_ALLOWED'
    | 'MODALITY_NOT_ALLOWED'
    | 'PDF_DISABLED'
    | 'INVALID_INPUT'
    | 'UPLOAD_FAILED';

  constructor(
    code:
      | 'MISSING_API_KEY'
      | 'MODEL_NOT_ALLOWED'
      | 'MODALITY_NOT_ALLOWED'
      | 'PDF_DISABLED'
      | 'INVALID_INPUT'
      | 'UPLOAD_FAILED',
    message: string,
  ) {
    super(message);
    this.name = 'GeminiPolicyError';
    this.code = code;
  }
}

interface RequestGeminiOptions {
  modelCandidates?: string[];
  modalities?: GeminiInputModality[];
}

type GeminiMessagePart = {
  text?: string;
  inline_data?: { mime_type: string; data: string };
  file_data?: { mime_type?: string; file_uri: string };
};

export type GeminiMediaType = 'image' | 'video' | 'audio' | 'pdf';

export interface GeminiMultimodalMediaInput {
  type: GeminiMediaType;
  mimeType?: string;
  dataUrl?: string;
  base64Data?: string;
  file?: Blob;
  fileUri?: string;
  displayName?: string;
}
const SAFE_BG_PROMPT = 'Use a clean dark charcoal gray seamless background without gradients, noise, or shadows.';

function getGeminiApiKey(): string {
  const key = API_KEY();
  if (!key || key === 'PLACEHOLDER_API_KEY') {
    throw new GeminiPolicyError('MISSING_API_KEY', MISSING_API_KEY_MESSAGE);
  }
  return key;
}

function ensureAllowedImageModel(model: string) {
  if (!ALLOWED_IMAGE_MODELS.has(model)) {
    throw new GeminiPolicyError(
      'MODEL_NOT_ALLOWED',
      `Image model "${model}" is not in the project allowlist. Ref: ${GEMINI_IMAGE_MODEL_DOC_URL}`,
    );
  }
}

function ensureAllowedChatModels(modelCandidates: string[]) {
  for (const model of modelCandidates) {
    if (!ALLOWED_CHAT_MODELS.has(model)) {
      throw new GeminiPolicyError(
        'MODEL_NOT_ALLOWED',
        `Model "${model}" is not in the project allowlist. Ref: ${GEMINI_MODELS_DOC_URL}`,
      );
    }
  }
}

function ensureAllowedModalities(modalities: GeminiInputModality[]) {
  for (const modality of modalities) {
    if (modality === 'pdf' && !PDF_INPUT_ENABLED) {
      throw new GeminiPolicyError('PDF_DISABLED', 'PDF upload is disabled in the current project policy.');
    }
    if (!ALLOWED_INPUT_MODALITIES.has(modality)) {
      throw new GeminiPolicyError(
        'MODALITY_NOT_ALLOWED',
        `Modality "${modality}" is not allowed by current project policy.`,
      );
    }
  }
}

function extractBase64Data(raw: string, fallbackMimeType: string) {
  if (!raw) {
    throw new GeminiPolicyError('INVALID_INPUT', 'Missing base64 input.');
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    throw new GeminiPolicyError('INVALID_INPUT', 'Empty base64 input.');
  }

  if (trimmed.startsWith('data:')) {
    const commaIndex = trimmed.indexOf(',');
    if (commaIndex < 0) {
      throw new GeminiPolicyError('INVALID_INPUT', 'Invalid data URL input.');
    }
    const meta = trimmed.slice(5, commaIndex);
    const mimeType = meta.split(';')[0] || fallbackMimeType;
    const base64Data = trimmed.slice(commaIndex + 1);
    return { mimeType, base64Data };
  }

  return { mimeType: fallbackMimeType, base64Data: trimmed };
}

function estimateBase64Bytes(base64Data: string) {
  const len = base64Data.length;
  if (!len) return 0;
  const padding = base64Data.endsWith('==') ? 2 : (base64Data.endsWith('=') ? 1 : 0);
  return Math.floor((len * 3) / 4) - padding;
}

function base64ToUint8Array(base64Data: string): Uint8Array {
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function inferMimeType(type: GeminiMediaType, explicit?: string): string {
  if (explicit) return explicit;
  switch (type) {
    case 'image':
      return 'image/jpeg';
    case 'video':
      return 'video/mp4';
    case 'audio':
      return 'audio/mpeg';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

function shouldUseInlineData(type: GeminiMediaType, bytes: number): boolean {
  if (type === 'pdf') return false;
  const limit = INLINE_MEDIA_LIMITS[type];
  return bytes > 0 && bytes <= limit;
}

function resolveDisplayName(input: GeminiMultimodalMediaInput): string {
  if (input.displayName?.trim()) {
    return input.displayName.trim();
  }
  if (input.file && typeof File !== 'undefined' && input.file instanceof File && input.file.name) {
    return input.file.name;
  }
  return `${input.type}-${Date.now()}`;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result.includes(',')) {
        reject(new GeminiPolicyError('INVALID_INPUT', 'Failed to parse Blob as data URL.'));
        return;
      }
      resolve(result.split(',')[1]);
    };
    reader.onerror = () => reject(new GeminiPolicyError('INVALID_INPUT', 'Failed to read Blob input.'));
    reader.readAsDataURL(blob);
  });
}

async function uploadGeminiFile(
  key: string,
  bytes: Uint8Array,
  mimeType: string,
  displayName: string,
): Promise<string> {
  const startRes = await fetch(`${GEMINI_UPLOAD_BASE}/files?key=${key}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'X-Goog-Upload-Header-Content-Length': String(bytes.byteLength),
    },
    body: JSON.stringify({
      file: {
        display_name: displayName,
      },
    }),
  });

  const uploadUrl =
    startRes.headers.get('x-goog-upload-url')
    || startRes.headers.get('X-Goog-Upload-URL');

  if (!startRes.ok || !uploadUrl) {
    throw new GeminiPolicyError('UPLOAD_FAILED', `Failed to start Gemini file upload. HTTP ${startRes.status}`);
  }

  const uploadBody = new Blob([bytes], { type: mimeType });

  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': mimeType,
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: uploadBody,
  });

  let uploaded: any = null;
  try {
    uploaded = await uploadRes.json();
  } catch {
    uploaded = null;
  }

  const fileUri = uploaded?.file?.uri;
  if (!uploadRes.ok || !fileUri) {
    throw new GeminiPolicyError('UPLOAD_FAILED', `Gemini file upload failed. HTTP ${uploadRes.status}`);
  }

  return fileUri;
}

async function buildGeminiMediaPart(
  key: string,
  input: GeminiMultimodalMediaInput,
): Promise<{ part: GeminiMessagePart; modality: GeminiInputModality }> {
  const modality = input.type;
  ensureAllowedModalities([modality]);

  const mimeType = inferMimeType(input.type, input.mimeType);
  const displayName = resolveDisplayName(input);

  if (input.fileUri) {
    return {
      modality,
      part: {
        file_data: {
          mime_type: mimeType,
          file_uri: input.fileUri,
        },
      },
    };
  }

  if (input.dataUrl || input.base64Data) {
    const { mimeType: parsedMimeType, base64Data } = extractBase64Data(
      input.dataUrl || input.base64Data || '',
      mimeType,
    );
    const bytes = estimateBase64Bytes(base64Data);

    if (shouldUseInlineData(input.type, bytes)) {
      return {
        modality,
        part: {
          inline_data: {
            mime_type: parsedMimeType,
            data: base64Data,
          },
        },
      };
    }

    const fileUri = await uploadGeminiFile(
      key,
      base64ToUint8Array(base64Data),
      parsedMimeType,
      displayName,
    );

    return {
      modality,
      part: {
        file_data: {
          mime_type: parsedMimeType,
          file_uri: fileUri,
        },
      },
    };
  }

  if (input.file) {
    const fileMimeType = inferMimeType(input.type, input.file.type || input.mimeType);
    if (shouldUseInlineData(input.type, input.file.size)) {
      const b64 = await blobToBase64(input.file);
      return {
        modality,
        part: {
          inline_data: {
            mime_type: fileMimeType,
            data: b64,
          },
        },
      };
    }

    const bytes = new Uint8Array(await input.file.arrayBuffer());
    const fileUri = await uploadGeminiFile(key, bytes, fileMimeType, displayName);
    return {
      modality,
      part: {
        file_data: {
          mime_type: fileMimeType,
          file_uri: fileUri,
        },
      },
    };
  }

  throw new GeminiPolicyError('INVALID_INPUT', `Missing payload for ${input.type} input.`);
}

function extractFirstTextCandidate(data: any): string | null {
  return data?.candidates?.[0]?.content?.parts?.find((part: any) => typeof part?.text === 'string')?.text || null;
}

async function requestGeminiContentWithFallback(
  key: string,
  payload: Record<string, unknown>,
  options: RequestGeminiOptions = {},
) {
  const modelCandidates = options.modelCandidates || CHAT_MODEL_CANDIDATES;
  ensureAllowedChatModels(modelCandidates);
  if (options.modalities?.length) {
    ensureAllowedModalities(options.modalities);
  }

  let lastErrorMessage = 'Gemini request failed';

  for (const model of modelCandidates) {
    for (let attempt = 1; attempt <= MAX_RETRIES_PER_MODEL; attempt += 1) {
      let res: Response;
      try {
        res = await fetch(
          `${GEMINI_BASE}/models/${model}:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          },
        );
      } catch (error) {
        lastErrorMessage = error instanceof Error ? error.message : 'Network request failed';
        if (attempt < MAX_RETRIES_PER_MODEL) {
          await sleep(300 * attempt);
          continue;
        }
        break;
      }

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (res.ok) {
        return data;
      }

      lastErrorMessage = data?.error?.message || `HTTP ${res.status}`;
      if (res.status === 404) {
        break;
      }

      if (RETRYABLE_STATUS_CODES.has(res.status)) {
        if (attempt < MAX_RETRIES_PER_MODEL) {
          await sleep(300 * attempt);
          continue;
        }
        break;
      }

      throw new Error(lastErrorMessage);
    }
  }

  throw new Error(lastErrorMessage);
}

// 鍋ヨ韩鏁欑粌 system prompt
export const FITNESS_COACH_PROMPT = [
  '你是 RightNow Fitness 的 AI 健身教练。',
  '请使用简体中文回答，语气专业、简洁、鼓励。',
  '优先提供可执行的训练、饮食和恢复建议。',
].join(' ');

// 引导式对话问题序列
export const GUIDED_QUESTIONS = [
  {
    id: 'exercise_base',
    question: '你之前有运动基础吗？比如健身、跑步或球类运动，大概坚持了多久？',
    field: 'exerciseBase',
  },
  {
    id: 'diet_habit',
    question: '聊聊你目前的饮食习惯：一天几餐，偏好哪些食物，有没有忌口？',
    field: 'dietHabit',
  },
  {
    id: 'sleep_pattern',
    question: '你的作息如何？一般几点睡、几点起？睡眠质量怎么样？',
    field: 'sleepPattern',
  },
  {
    id: 'occupation',
    question: '你从事什么工作？日常久坐多还是活动多？',
    field: 'occupation',
  },
];

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: GeminiMessagePart[];
}

/**
 * 璋冪敤 Gemini 鏂囨湰瀵硅瘽
 */
export async function chatWithMultimodal(
  userText: string,
  mediaInputs: GeminiMultimodalMediaInput[] = [],
  systemPrompt: string = FITNESS_COACH_PROMPT,
  history: GeminiMessage[] = [],
): Promise<string> {
  try {
    const key = getGeminiApiKey();
    const parts: GeminiMessagePart[] = [{ text: userText }];
    const modalities: GeminiInputModality[] = ['text'];

    for (const input of mediaInputs) {
      const built = await buildGeminiMediaPart(key, input);
      parts.push(built.part);
      modalities.push(built.modality);
    }

    const data = await requestGeminiContentWithFallback(
      key,
      {
        contents: [...history, { role: 'user', parts }],
        system_instruction: { parts: [{ text: systemPrompt }] },
      },
      { modalities },
    );

    return extractFirstTextCandidate(data) || 'Received. Let me think...';
  } catch (error) {
    if (error instanceof GeminiPolicyError) {
      if (error.code === 'MISSING_API_KEY') return MISSING_API_KEY_MESSAGE;
      if (error.code === 'PDF_DISABLED') return 'PDF upload is currently not supported.';
    }
    return GENERIC_GEMINI_ERROR_MESSAGE;
  }
}
export async function chatWithGemini(
  userText: string,
  systemPrompt: string = FITNESS_COACH_PROMPT,
  history: GeminiMessage[] = [],
): Promise<string> {
  try {
    const key = getGeminiApiKey();
    const contents: GeminiMessage[] = [
      ...history,
      { role: 'user', parts: [{ text: userText }] },
    ];

    const data = await requestGeminiContentWithFallback(
      key,
      {
        contents,
        system_instruction: { parts: [{ text: systemPrompt }] },
      },
      { modalities: ['text'] },
    );
    return extractFirstTextCandidate(data) || '收到，让我想想...';
  } catch (error) {
    if (error instanceof GeminiPolicyError && error.code === 'MISSING_API_KEY') {
      return MISSING_API_KEY_MESSAGE;
    }
    return GENERIC_GEMINI_ERROR_MESSAGE;
  }
}
/**
 * 璋冪敤 Gemini 澶氭ā鎬侊紙甯﹀浘鐗囷級
 */
export async function chatWithImage(
  userText: string,
  imageBase64: string,
  systemPrompt: string = FITNESS_COACH_PROMPT,
): Promise<string> {
  return chatWithMultimodal(
    userText,
    [{ type: 'image', dataUrl: imageBase64 }],
    systemPrompt,
  );
}
/**
 * 鍩轰簬鐢ㄦ埛淇℃伅鐢熸垚涓€у寲鍋ヨ韩鏂规
 */
export async function generateFitnessPlan(userInfo: {
  gender: string;
  height: number;
  weight: number;
  age: number;
  bodyStyle: string;
  exerciseBase: string;
  dietHabit: string;
  sleepPattern: string;
  occupation: string;
}): Promise<string> {
  const prompt = `基于以下用户信息，生成一份详细的个性化健身方案：
用户信息：
- 性别：${userInfo.gender === 'male' ? '男' : '女'}
- 身高：${userInfo.height}cm，体重：${userInfo.weight}kg，年龄：${userInfo.age}岁
- 目标体型：${userInfo.bodyStyle}
- 运动基础：${userInfo.exerciseBase}
- 饮食习惯：${userInfo.dietHabit}
- 作息规律：${userInfo.sleepPattern}
- 职业：${userInfo.occupation}

请生成包含以下内容的方案（用 JSON 格式）：
1. mealPlan: 每日三餐具体食谱（早/中/晚/加餐）
2. waterPlan: 喝水时间表（具体时间点和水量）
3. trainingPlan: 每周训练计划（每天的训练内容、组数、时长）
4. summary: 一段鼓励性的总结（2-3句话）

请直接返回 JSON，不要加 markdown 代码块。`;

  return chatWithGemini(prompt);
}

/**
 * 鍘嬬缉鍥剧墖鍒版寚瀹氭渶澶у搴︼紝杩斿洖 base64 data URL
 */
function compressImage(base64DataUrl: string, maxWidth = 800): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(base64DataUrl);
    img.src = base64DataUrl;
  });
}

/**
 * Nano Banana 2 鍥惧儚鐢熸垚 鈥?鍩轰簬鐢ㄦ埛鐓х墖+鐩爣浣撳瀷鐢熸垚鐞嗘兂韬潗
 * 杩斿洖 base64 鍥剧墖鏁版嵁鎴?null
 */
export async function generateIdealBody(params: {
  currentImageBase64?: string;
  referenceImageBase64?: string;
  targetStyle: string;
  gender: string;
  refinement?: string;
  conservative?: boolean;
}): Promise<string | null> {
  let key = '';
  try {
    key = getGeminiApiKey();
    ensureAllowedImageModel(IMAGE_MODEL);
  } catch {
    return null;
  }

  const styleDesc = params.gender === 'male'
    ? { slim: 'lean', athletic: 'athletic', muscular: 'muscular' }
    : { comic: 'slim', athletic: 'athletic', muscular: 'toned-muscular' };

  const target = styleDesc[params.targetStyle as keyof typeof styleDesc] || params.targetStyle;
  const genderLabel = params.gender === 'male' ? 'male' : 'female';
  const hasImage = !!params.currentImageBase64;
  const hasReferenceImage = !!params.referenceImageBase64;
  const safeIdentityInstruction = params.conservative
    ? 'Keep identity, hairstyle, and facial traits close to source; avoid exact face copy.'
    : 'Keep identity, hairstyle, and core facial traits consistent.';
  const safePhotoStyle = `Use realistic, non-explicit fitness outfit and natural studio quality. ${SAFE_BG_PROMPT}`;

  let prompt: string;
  if (params.refinement && hasImage && hasReferenceImage) {
    prompt = `Image 1 is current body and image 2 is face reference. Blend face traits from image 2 into image 1 while preserving body posture. ${safeIdentityInstruction} Additional adjustment: ${params.refinement}. ${safePhotoStyle}`;
  } else if (params.refinement && hasImage) {
    prompt = `Adjust this person's body according to: ${params.refinement}. Keep overall identity consistent. ${safeIdentityInstruction} ${safePhotoStyle}`;
  } else if (params.refinement) {
    prompt = `Generate a full-body ${genderLabel} fitness photo with ${target} body type. Extra requirement: ${params.refinement}. ${safePhotoStyle}`;
  } else if (hasImage) {
    prompt = `Based on this person photo, transform body type toward ${target}. Keep identity and improve body proportion naturally. ${safeIdentityInstruction} ${safePhotoStyle}`;
  } else {
    prompt = `Generate a realistic full-body ${genderLabel} fitness photo with ${target} body type. ${safePhotoStyle}`;
  }

  // 120 绉掕秴鏃讹紙鎱㈢綉缁滈渶瑕佹洿闀挎椂闂达級
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const parts: any[] = [{ text: prompt }];

    if (params.currentImageBase64) {
      const compressed = await compressImage(params.currentImageBase64, 600);
      const base64Data = compressed.includes(',')
        ? compressed.split(',')[1]
        : compressed;
      const mimeType = compressed.includes(';')
        ? compressed.split(';')[0].split(':')[1]
        : 'image/jpeg';
      parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
      console.log('[generateIdealBody] image compressed, payload size:', Math.round(base64Data.length / 1024), 'KB');
    }

    if (params.referenceImageBase64) {
      const compressed = await compressImage(params.referenceImageBase64, 600);
      const base64Data = compressed.includes(',')
        ? compressed.split(',')[1]
        : compressed;
      const mimeType = compressed.includes(';')
        ? compressed.split(';')[0].split(':')[1]
        : 'image/jpeg';
      parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
      console.log('[generateIdealBody] reference image compressed, payload size:', Math.round(base64Data.length / 1024), 'KB');
    }

    console.log('[generateIdealBody] sending request, hasImage:', hasImage, 'style:', params.targetStyle);
    const t0 = Date.now();

    const res = await fetch(
      `${GEMINI_BASE}/models/${IMAGE_MODEL}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { responseModalities: ['image', 'text'] },
        }),
        signal: controller.signal,
      },
    );

    console.log('[generateIdealBody] response status:', res.status, 'took:', Math.round((Date.now() - t0) / 1000), 's');

    const data = await res.json();
    console.log('[generateIdealBody] json parsed, took:', Math.round((Date.now() - t0) / 1000), 's total');

    if (!res.ok) {
      console.error('[generateIdealBody] API error:', res.status, JSON.stringify(data).slice(0, 500));
      return null;
    }
    const candidate = data.candidates?.[0]?.content?.parts;
    if (!candidate) {
      console.error('[generateIdealBody] no candidates:', JSON.stringify(data).slice(0, 500));
      return null;
    }

    // Debug: log actual response structure to identify field naming
    console.log('[generateIdealBody] parts keys:', candidate.map((p: any) => Object.keys(p)));

    // Check both snake_case (inline_data) and camelCase (inlineData) 鈥?Gemini API may use either
    const imgPart = candidate.find((p: any) =>
      p.inline_data?.mime_type?.startsWith('image/') ||
      p.inlineData?.mimeType?.startsWith('image/')
    );
    if (imgPart) {
      const iData = imgPart.inline_data || imgPart.inlineData;
      const mimeType = iData.mime_type || iData.mimeType;
      const b64 = iData.data;
      console.log('[generateIdealBody] success! size:', Math.round(b64.length / 1024), 'KB, total:', Math.round((Date.now() - t0) / 1000), 's');
      return `data:${mimeType};base64,${b64}`;
    }

    const textPart = candidate.find((p: any) => p.text);
    if (textPart) {
      console.warn('[generateIdealBody] text only:', textPart.text.slice(0, 200));
    } else {
      console.warn('[generateIdealBody] no image or text found, parts:', JSON.stringify(candidate).slice(0, 500));
    }
    return null;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error('[generateIdealBody] TIMEOUT (120s)');
    } else {
      console.error('[generateIdealBody] FAILED:', err);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// 鈹€鈹€鈹€ 楗鍒嗘瀽 鈹€鈹€鈹€

export interface FoodAnalysis {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  mealType: string;
}

const FOOD_ANALYSIS_PROMPT = `你是专业营养师。根据用户描述估算营养成分。
必须返回纯 JSON（不要 markdown 代码块），格式：
{"name":"食物名","calories":数字,"protein":数字,"fat":数字,"carbs":数字,"mealType":"早餐|午餐|晚餐|加餐"}
所有数值为整数；calories 单位为千卡，其他单位为克。`;

function parseFoodJSON(text: string): FoodAnalysis {
  const cleaned = text.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
  try {
    const obj = JSON.parse(cleaned);
    return {
      name: obj.name || '鏈煡椋熺墿',
      calories: Math.round(Number(obj.calories) || 0),
      protein: Math.round(Number(obj.protein) || 0),
      fat: Math.round(Number(obj.fat) || 0),
      carbs: Math.round(Number(obj.carbs) || 0),
      mealType: obj.mealType || '鍔犻',
    };
  } catch {
    return { name: '鏈煡椋熺墿', calories: 0, protein: 0, fat: 0, carbs: 0, mealType: '鍔犻' };
  }
}

/**
 * 鏂囧瓧鎻忚堪 鈫?AI 鍒嗘瀽钀ュ吇鎴愬垎
 */
export async function analyzeFoodText(foodName: string, description?: string): Promise<FoodAnalysis> {
  const query = description ? `${foodName}（${description}）` : foodName;
  const reply = await chatWithGemini(`鍒嗘瀽杩欎釜椋熺墿鐨勮惀鍏绘垚鍒嗭細${query}`, FOOD_ANALYSIS_PROMPT);
  return parseFoodJSON(reply);
}

/**
 * 椋熺墿鐓х墖 鈫?AI 澶氭ā鎬佽瘑鍒?+ 钀ュ吇鍒嗘瀽
 */
export async function analyzeFoodImage(imageBase64: string): Promise<FoodAnalysis> {
  const reply = await chatWithImage(
    '识别这张图片中的食物并估算营养成分，返回纯 JSON。',
    imageBase64,
    FOOD_ANALYSIS_PROMPT,
  );
  return parseFoodJSON(reply);
}

// 鈹€鈹€鈹€ 鏁版嵁鐪嬫澘 AI 寤鸿 鈹€鈹€鈹€

/**
 * 鏍规嵁鐢ㄦ埛鏁版嵁鐢熸垚涓€у寲 AI 寤鸿
 */
export async function generateDataInsights(context: {
  totalCalories?: number;
  totalProtein?: number;
  totalFat?: number;
  totalCarbs?: number;
  latestWeight?: number;
  weightTrend?: string;
  checkinCount?: number;
}): Promise<string[]> {
  const prompt = `你是健身营养顾问。请根据以下今日数据给出 2-3 条中文建议（每条不超过 30 字）。
直接返回 JSON 数组，如 ["建议1","建议2"]，不要 markdown。
今日摄入：${context.totalCalories ?? '未记录'} 千卡
蛋白质：${context.totalProtein ?? '--'}g，脂肪：${context.totalFat ?? '--'}g，碳水：${context.totalCarbs ?? '--'}g
最新体重：${context.latestWeight ?? '未记录'} kg
体重趋势：${context.weightTrend || '暂无数据'}
近30天打卡：${context.checkinCount ?? 0} 天`;

  const reply = await chatWithGemini(prompt, FITNESS_COACH_PROMPT);
  try {
    const cleaned = reply.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
    const arr = JSON.parse(cleaned);
    if (Array.isArray(arr)) return arr.map(String).slice(0, 3);
  } catch { /* fallback */ }
  return ['记录今日饮食，让 AI 生成个性化建议'];
}

export const COACH_ASSESSMENT_PROMPT = [
  '你是 RightNow Fitness 的 AI 教练评估引擎。',
  '请基于健康与运动科学给出稳健建议。',
  '输出默认使用简体中文；如要求 JSON 时仅输出 JSON。',
  '当用户目标周期不现实时，自动给出更安全可行的区间。',
].join(' ');

const COACH_KNOWLEDGE_INTRO = [
  '你正在基于 RightNow Fitness 知识库生成教练回复。',
  '请优先使用下方知识内容作为事实依据。',
  '如用户提供实测数据，与估算冲突时以实测数据为准。',
].join(' ');

type CoachKnowledgeDomain = 'nutrition' | 'exercise' | 'training' | 'metrics';

export interface CoachPlanTask {
  id: string;
  title: string;
  category: 'training' | 'nutrition' | 'recovery' | 'habit';
  detail: string;
  completed?: boolean;
}

export interface CoachFirstDayPlan {
  headline: string;
  tasks: CoachPlanTask[];
  nutritionNote: string;
  recoveryNote: string;
  coachMessage: string;
}

export interface CoachPlanGenerationContext {
  assessmentSummary: string;
  intakeSummary?: string;
  dayIndex?: number;
  constraints?: string[];
}

async function loadKnowledgeFile(path: string): Promise<string> {
  try {
    const res = await fetch(path);
    if (!res.ok) {
      return '';
    }
    return await res.text();
  } catch {
    return '';
  }
}

export async function buildCoachKnowledgePrompt(
  domains: CoachKnowledgeDomain[] = ['nutrition', 'exercise', 'training', 'metrics'],
): Promise<string> {
  const pathMap: Record<CoachKnowledgeDomain, string> = {
    nutrition: '/knowledge/nutrition.md',
    exercise: '/knowledge/exercise-science.md',
    training: '/knowledge/training-templates.md',
    metrics: '/knowledge/body-metrics.md',
  };

  const sections = await Promise.all(
    domains.map(async (domain) => {
      const content = await loadKnowledgeFile(pathMap[domain]);
      if (!content.trim()) {
        return '';
      }
      return `[${domain}]\n${content.trim()}`;
    }),
  );

  const availableSections = sections.filter(Boolean);
  if (availableSections.length === 0) {
    return COACH_KNOWLEDGE_INTRO;
  }

  return `${COACH_KNOWLEDGE_INTRO}\n\n${availableSections.join('\n\n')}`;
}

export async function generateFirstDayPlan(
  context: CoachPlanGenerationContext,
): Promise<CoachFirstDayPlan> {
  const knowledgePrompt = await buildCoachKnowledgePrompt(['nutrition', 'exercise', 'training', 'metrics']);
  const prompt = [
    '根据用户评估数据，生成首日教练计划，并严格返回 JSON。',
    '返回字段：headline、tasks、nutritionNote、recoveryNote、coachMessage。',
    '每个 task 包含：id、title、category(training/nutrition/recovery/habit)、detail。',
    `用户体测摘要：${context.assessmentSummary}`,
    context.intakeSummary ? `用户问卷摘要：${context.intakeSummary}` : '',
    context.constraints?.length ? `约束条件：${context.constraints.join(' | ')}` : '',
  ].filter(Boolean).join('\n');

  const reply = await chatWithGemini(prompt, knowledgePrompt);
  try {
    const cleaned = reply.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned) as CoachFirstDayPlan;
    if (parsed && Array.isArray(parsed.tasks)) {
      return parsed;
    }
  } catch {
    // fall through to deterministic fallback
  }

  return {
    headline: '第一天先把节奏建立起来',
    tasks: [
      { id: 'train-1', title: '完成一次基础训练', category: 'training', detail: '控制强度，优先动作质量。' },
      { id: 'eat-1', title: '保证三次蛋白摄入', category: 'nutrition', detail: '每餐先保证蛋白质来源。' },
      { id: 'sleep-1', title: '今晚提前休息', category: 'recovery', detail: '保证恢复，为明天留出余量。' },
    ],
    nutritionNote: '今天先追求稳定，不追求极端节食。',
    recoveryNote: '训练后补水，今晚优先保证睡眠。',
    coachMessage: '先把第一天完成，比做得完美更重要。',
  };
}

export async function generateCoachFollowUp(
  dayIndex: number,
  context: CoachPlanGenerationContext,
): Promise<string> {
  const knowledgePrompt = await buildCoachKnowledgePrompt(['nutrition', 'exercise', 'training']);
  const prompt = [
    '生成一条简洁的中文每日教练跟进消息，用于 AI 教练每日签到。',
    `当前是第 ${dayIndex} 天。`,
    `用户体测摘要：${context.assessmentSummary}`,
    context.intakeSummary ? `用户问卷摘要：${context.intakeSummary}` : '',
  ].filter(Boolean).join('\n');

  const reply = await chatWithGemini(prompt, knowledgePrompt);
  return reply.trim() || '今天继续按计划推进，先完成最关键的一项。';
}

export async function generateWeekSummary(
  context: CoachPlanGenerationContext,
): Promise<string> {
  const knowledgePrompt = await buildCoachKnowledgePrompt(['nutrition', 'exercise', 'training', 'metrics']);
  const prompt = [
    '生成一段简洁的中文周总结，回顾用户本周表现。',
    '突出执行趋势、坚持程度，以及下周最值得微调的一个方向。',
    `用户体测摘要：${context.assessmentSummary}`,
    context.intakeSummary ? `用户问卷摘要：${context.intakeSummary}` : '',
    context.constraints?.length ? `约束条件：${context.constraints.join(' | ')}` : '',
  ].filter(Boolean).join('\n');

  const reply = await chatWithGemini(prompt, knowledgePrompt);
  return reply.trim() || '这一周你已经完成了从目标到执行的第一轮建立，下周继续稳住节奏。';
}

// --- 瑙嗚浣撹剛璇勪及 ---

export interface VisualBodyFatResult {
  currentBodyFat: number;
  targetBodyFat: number;
}

const VISUAL_ASSESSMENT_PROMPT = `你是专业的体脂评估助手。
根据两张身体照片估算体脂率：
- 第一张是当前身材，第二张是理想身材。
- 返回纯 JSON（不要 markdown 代码块），格式：
{"currentBodyFat": number, "targetBodyFat": number}
- 数值保留 1 位小数。`;

/**
 * 鍩轰簬涓ゅ紶鐓х墖锛堝綋鍓嶈韩鏉?+ 鐞嗘兂韬潗锛夎繘琛岃瑙変綋鑴傝瘎浼? */
export async function assessBodyFatFromImages(
  currentImageBase64: string,
  idealImageBase64: string,
  gender: string,
): Promise<VisualBodyFatResult | null> {
  let key = '';
  try {
    key = getGeminiApiKey();
  } catch {
    return null;
  }

  try {
    const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];

    parts.push({ text: `用户性别：${gender === 'male' ? '男' : '女'}。请分析以下两张照片，第一张是当前身材，第二张是理想身材，并估算各自体脂率。` });

    // Current photo
    const current64 = currentImageBase64.includes(',') ? currentImageBase64.split(',')[1] : currentImageBase64;
    const currentMime = currentImageBase64.includes(';') ? currentImageBase64.split(';')[0].split(':')[1] : 'image/jpeg';
    parts.push({ inline_data: { mime_type: currentMime, data: current64 } });

    // Ideal photo
    const ideal64 = idealImageBase64.includes(',') ? idealImageBase64.split(',')[1] : idealImageBase64;
    const idealMime = idealImageBase64.includes(';') ? idealImageBase64.split(';')[0].split(':')[1] : 'image/jpeg';
    parts.push({ inline_data: { mime_type: idealMime, data: ideal64 } });

    const data = await requestGeminiContentWithFallback(
      key,
      {
        contents: [{ role: 'user', parts }],
        system_instruction: { parts: [{ text: VISUAL_ASSESSMENT_PROMPT }] },
      },
      { modalities: ['text', 'image'] },
    );

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = text.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (typeof parsed.currentBodyFat === 'number' && typeof parsed.targetBodyFat === 'number') {
      return {
        currentBodyFat: Math.round(parsed.currentBodyFat * 10) / 10,
        targetBodyFat: Math.round(parsed.targetBodyFat * 10) / 10,
      };
    }
    return null;
  } catch (err) {
    console.error('[assessBodyFatFromImages] failed:', err);
    return null;
  }
}











