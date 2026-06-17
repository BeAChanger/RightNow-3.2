/**
 * Gemini AI Service
 * 闂傚倸鍊搁崐鎼佸磹閹间礁纾圭€瑰嫭鍣磋ぐ鎺戠倞妞ゆ帒顦伴弲顏堟偡濠婂啰效婵犫偓娓氣偓濮婅櫣绱掑Ο铏逛紘濠碘槅鍋勭€氭澘顕ｉ崨濠勭懝闁逞屽墴瀵鎮㈤崗灏栨嫽闂佸湱铏庨崰妤咁敁閺嶎厽鈷戦梺顐ゅ仜閼活垶宕㈤幖浣圭厽闁硅櫣鍋涢々顒勬煙楠炲灝鐏╅柍瑙勫灩閳ь剨缍嗘禍鐐哄磹閻愮儤鈷戦梻鍫熶緱閻掗箖鏌涙惔銈夊摵闁哄懓鍩栭妶锝夊礃閳圭偓瀚藉┑鐐舵彧缂嶁偓婵☆偄瀚。鍧楁⒒娴ｇ懓顕滅€光偓閹间礁钃熼柕濞垮劗濡插牊鎱ㄥΔ鈧Λ娆撳煝閸儲鈷戦悹鍥ｂ偓铏亖闂佹悶鍔嬬划娆撶嵁閸愵喖鐒洪柛鎰ㄦ櫅閸斿懘姊洪幐搴ｇ畵閻庢凹鍠氱划鍫ュ醇閵夛腹鎷洪柣鐘叉搐瀵爼宕径瀣ㄤ簻妞ゆ劑鍩勫Σ鎼佹偂閵堝鐓涚€广儱娴锋禍瑙勭箾瀹割喕绨奸柛瀣姍閹綊宕堕鍕闂? Gemini 3 Flash (gemini-3-flash-preview)
 * 闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌ｉ幋锝呅撻柛濠傛健閺屻劑寮撮悙娴嬪亾閸濄儳涓嶉柡宥庡幗閻撴洘銇勯幇鍓佺ɑ缂佲偓閳ь剛绱掗悙顒€鍔ゆ繛纭风節瀵鏁嶉崟顏呭媰闁荤姴娲﹁ぐ鍐╂叏鎼达絿纾奸柣鎰靛墮閸斻倖绻涚涵椋庣瘈鐎殿喖顭烽幃銏ゆ偂鎼达絿鏆伴梻浣虹帛椤ㄥ懘鎮у鍏炬盯宕熼鐘碉紲闂佸憡鎸嗛崘褍顥氶梺璇叉捣閻熸娊宕惰閻ゅ嫰姊洪棃娑辩劸闁稿孩鐟╅幃銏ゆ偂鎼达紕鈧厼顪冮妶鍡樷拹闁稿骸纾弫顕€宕稿Δ浣叉嫽婵炶揪绲肩拃锕傛倿閻愵兙浜滈柟瀛樼箓閺嗭絿鈧娲樼换鍫ョ嵁鐎ｎ喗鏅濋柍褜鍓熼幏鎴︽偄閸忚偐鍙嗗┑鐘绘涧濡厼危閸濄儳纾兼い鎰╁灮鏁堥梺鍝勬湰缁嬫挻绂掗敂鐐珰婵炴潙顑呮禍鐐繆閵堝懏鍣圭紒鈧径鎰厵闂傚倸顕崝宥夋煃? Gemini 3.1 Flash Lite/Image Preview (fallback)
 */

import apiClient from '../api/client';

const API_KEY = () => import.meta.env.VITE_GEMINI_API_KEY || '';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_UPLOAD_BASE = 'https://generativelanguage.googleapis.com/upload/v1beta';
const GEMINI_MODELS_DOC_URL = 'https://ai.google.dev/gemini-api/docs/models?hl=zh-cn';
const GEMINI_IMAGE_MODEL_DOC_URL = 'https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image-preview?hl=zh-cn';

const INTERACTIVE_MODEL = 'gemini-3-flash-preview';
const CHAT_MODEL_CANDIDATES = [INTERACTIVE_MODEL];
const ALLOWED_CHAT_MODELS = new Set(CHAT_MODEL_CANDIDATES);

// StepFun (阶跃星辰) AI chat — primary chat model
const STEPFUN_BASE = 'https://api.stepfun.com/v1';
const STEPFUN_CHAT_MODEL = 'step-3.7-flash';
const STEPFUN_API_KEY = () => import.meta.env.VITE_STEPFUN_API_KEY || '';

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

type ManagedPromptCode =
  | 'training.extract_data'
  | 'training.generate_feedback'
  | 'training.daily_change_feedback'
  | 'core.fitness_coach_system'
  | 'core.coach_assessment_system'
  | 'core.coach_knowledge_intro'
  | 'core.food_analysis_system'
  | 'core.visual_assessment_system'
  | 'chat.free_chat_system'
  | 'app.generate_fitness_plan_user_prompt'
  | 'image.safe_bg_prompt'
  | 'image.generate_ideal_body.with_refinement_and_reference'
  | 'image.generate_ideal_body.with_refinement_and_image'
  | 'image.generate_ideal_body.with_refinement_text_only'
  | 'image.generate_ideal_body.with_image'
  | 'image.generate_ideal_body.text_only'
  | 'food.analyze_text_user_prompt'
  | 'food.analyze_image_user_prompt'
  | 'insights.generate_data_insights_user_prompt'
  | 'coach.generate_first_day_plan_user_prompt'
  | 'coach.generate_follow_up_user_prompt'
  | 'coach.generate_week_summary_user_prompt'
  | 'coach.visual_assessment_user_prompt'
  | 'evolution.analyze_body_with_image_user_prompt'
  | 'evolution.refinement_ack_user_prompt'
  | 'evolution.face_merge_refinement_text';

interface ManagedPromptRenderResponse {
  code: ManagedPromptCode;
  scene: string;
  key: string;
  source: 'db' | 'fallback';
  templateId: string | null;
  prompt: string;
}

const managedPromptCache = new Map<string, string>();

function renderLocalTemplate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, variableName: string) => {
    const value = variables[variableName];
    if (value === undefined || value === null) {
      return '';
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  });
}

function toPromptCacheKey(code: ManagedPromptCode, variables: Record<string, unknown>): string {
  return `${code}::${JSON.stringify(variables)}`;
}

async function resolveManagedPrompt(
  code: ManagedPromptCode,
  fallbackTemplate: string,
  variables: Record<string, unknown> = {},
  useCache = false,
): Promise<string> {
  const cacheKey = toPromptCacheKey(code, variables);
  if (useCache && managedPromptCache.has(cacheKey)) {
    return managedPromptCache.get(cacheKey)!;
  }

  try {
    const { data } = await apiClient.post<ManagedPromptRenderResponse>('/prompts/runtime/render', {
      code,
      variables,
    });
    const prompt = typeof data?.prompt === 'string' && data.prompt.trim()
      ? data.prompt
      : renderLocalTemplate(fallbackTemplate, variables);
    if (useCache) {
      managedPromptCache.set(cacheKey, prompt);
    }
    return prompt;
  } catch {
    const prompt = renderLocalTemplate(fallbackTemplate, variables);
    if (useCache) {
      managedPromptCache.set(cacheKey, prompt);
    }
    return prompt;
  }
}

function getGeminiApiKey(): string {
  const key = API_KEY();
  if (!key || key === 'PLACEHOLDER_API_KEY') {
    throw new GeminiPolicyError('MISSING_API_KEY', MISSING_API_KEY_MESSAGE);
  }
  return key;
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

function convertGeminiPayloadToOpenAI(payload: Record<string, unknown>): {
  messages: Array<{ role: string; content: any }>;
} {
  const messages: Array<{ role: string; content: any }> = [];

  const systemText = (payload as any)?.system_instruction?.parts
    ?.map((p: any) => p.text)
    .filter(Boolean)
    .join('\n');
  if (systemText) {
    messages.push({ role: 'system', content: systemText });
  }

  const contents = (payload as any)?.contents || [];
  for (const item of contents) {
    const role = item.role === 'model' ? 'assistant' : 'user';
    const parts = item.parts || [];

    const textParts: string[] = [];
    const imageParts: Array<{ type: string; image_url: { url: string } }> = [];

    for (const part of parts) {
      if (part.text) {
        textParts.push(part.text);
      }
      if (part.inline_data) {
        const mimeType = part.inline_data.mime_type || 'image/jpeg';
        const b64 = part.inline_data.data || '';
        imageParts.push({
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${b64}` },
        });
      }
      if (part.file_data) {
        imageParts.push({
          type: 'image_url',
          image_url: { url: part.file_data.file_uri },
        });
      }
    }

    if (imageParts.length > 0) {
      const content: any[] = [];
      if (textParts.length > 0) {
        content.push({ type: 'text', text: textParts.join('\n') });
      }
      content.push(...imageParts);
      messages.push({ role, content: content.length === 1 ? content[0].image_url || content[0].text || content[0] : content });
    } else {
      messages.push({ role, content: textParts.join('\n') || '请继续。' });
    }
  }

  return { messages };
}

async function requestStepFunChat(
  payload: Record<string, unknown>,
): Promise<any> {
  const key = STEPFUN_API_KEY();
  if (!key) {
    throw new Error('STEPFUN_API_KEY is not configured');
  }

  const { messages } = convertGeminiPayloadToOpenAI(payload);
  let lastErrorMessage = 'StepFun request failed';

  for (let attempt = 1; attempt <= MAX_RETRIES_PER_MODEL; attempt += 1) {
    let res: Response;
    try {
      res = await fetch(`${STEPFUN_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: STEPFUN_CHAT_MODEL,
          messages,
          max_tokens: 4096,
        }),
      });
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
      const msg = data?.choices?.[0]?.message;
      const content = msg?.content;
      const reasoning = msg?.reasoning_content;
      const textContent = typeof content === 'string' && content.trim()
        ? content
        : (typeof reasoning === 'string' ? reasoning : '');
      return {
        candidates: [{
          content: {
            parts: [{ text: textContent || '收到，我再想一下。' }],
          },
        }],
      };
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

  throw new Error(lastErrorMessage);
}

async function requestGeminiContentWithFallback(
  key: string,
  payload: Record<string, unknown>,
  options: RequestGeminiOptions = {},
) {
  // Route to StepFun (阶跃星辰) if configured — primary AI engine
  if (STEPFUN_API_KEY()) {
    return requestStepFunChat(payload);
  }

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

export const FITNESS_COACH_PROMPT = [
  '你是 RightNow Fitness 的 AI 健身私教。你倡导"生活化减脂"——一种不极端、可持续的健身理念。',
  '',
  '核心原则：',
  '- 用生活化的语言，不说学术黑话，像朋友聊天一样自然',
  '- 给具体可操作的建议，不空谈理论（比如"外卖米饭盒大概100g碳水，女生吃一半"）',
  '- 承认减脂可以吃食堂外卖，不需要水煮鸡胸，强调可持续的生活方式',
  '- 反对极端方法（"7天瘦10斤""只吃水煮菜"），推崇普通人能坚持的执行方案',
  '- 提倡"生活化减脂"理念：热量缺口 + 可持续 + 不苛求完美',
  '',
  '回答时：',
  '- 优先使用提供的参考资料（来自专业知识库、专业书籍或网络搜索）',
  '- 如果参考资料与生活化减脂理念冲突，以实战派观点为准',
  '- 用通俗的口吻改写，而不是直接引用原文',
  '- 使用简体中文，语气专业但有温度、有鼓励',
].join('\n');

export const COACH_ASSESSMENT_PROMPT = [
  '你是 RightNow Fitness 的 AI 体测分析师。',
  '根据用户身体数据给出简洁阶段判断（1-2 句）。',
  '语气专业但有温度，使用中文，直接返回文字。',
].join('\n');

const FREE_CHAT_SYSTEM_FALLBACK = [
  '你是 RightNow Fitness 的 AI 健身教练。',
  '回复用中文，不超过100字，不要使用*号或markdown。',
  '语气专业、友好、可执行。',
].join(' ');

const EVOLUTION_ANALYZE_BODY_FALLBACK =
  '请分析这张身体照片，用户目标是“{{styleLabel}}”体型。给出简短身体评估（2-3句话），然后告诉用户可以通过对话描述想要的调整，比如“手臂再粗一点”“腰再细一点”来PS理想身材。';

const EVOLUTION_REFINEMENT_ACK_FALLBACK =
  '用户想调整理想身材：“{{userText}}”。请简短确认（1-2句话），告诉用户正在根据要求重新生成。';

const EVOLUTION_FACE_MERGE_FALLBACK = '将这张正脸照的面部特征融合到身材图上，保持身材不变，替换面部。';

const FITNESS_PLAN_USER_PROMPT_FALLBACK = [
  '基于以下用户信息，生成一份详细的个性化健身方案：',
  '用户信息：',
  '- 性别：{{genderLabel}}',
  '- 身高：{{height}}cm，体重：{{weight}}kg，年龄：{{age}}岁',
  '- 目标体型：{{bodyStyle}}',
  '- 运动基础：{{exerciseBase}}',
  '- 饮食习惯：{{dietHabit}}',
  '- 作息规律：{{sleepPattern}}',
  '- 职业：{{occupation}}',
  '',
  '请生成包含以下内容的方案（用 JSON 格式）：',
  '1. mealPlan: 每日三餐具体食谱（早/中/晚/加餐）',
  '2. waterPlan: 喝水时间表（具体时间点和水量）',
  '3. trainingPlan: 每周训练计划（每天训练内容、组数、时长）',
  '4. summary: 一段鼓励性总结（2-3句话）',
  '',
  '请直接返回 JSON，不要 markdown 代码块。',
].join('\n');

const FOOD_ANALYSIS_SYSTEM_PROMPT_FALLBACK = [
  '你是专业营养师。根据用户描述估算营养成分。',
  '必须返回纯 JSON（不要 markdown 代码块），格式：',
  '{"name":"食物名","calories":数字,"protein":数字,"fat":数字,"carbs":数字,"mealType":"早餐|午餐|晚餐|加餐"}',
  '所有数值为整数；calories 单位为千卡，其他单位为克。',
].join('\n');

const DATA_INSIGHTS_PROMPT_FALLBACK = [
  '你是健身营养顾问。请根据以下今日数据给出 2-3 条中文建议（每条不超过 30 字）。',
  '直接返回 JSON 数组，如 ["建议1","建议2"]，不要 markdown。',
  '今日摄入：{{totalCalories}} 千卡',
  '蛋白质：{{totalProtein}}g，脂肪：{{totalFat}}g，碳水：{{totalCarbs}}g',
  '最新体重：{{latestWeight}} kg',
  '体重趋势：{{weightTrend}}',
  '近30天打卡：{{checkinCount}} 天',
].join('\n');

const COACH_KNOWLEDGE_INTRO_FALLBACK = [
  '以下参考资料来自 RightNow 三层知识库（按优先级排列）：',
  '1. 生活化减脂专业知识库（最高优先级）',
  '2. 专业营养学/肌理学教科书',
  '3. 网络搜索补充',
  '',
  '请优先使用专业知识库作为回答基调，教科书作为数据支撑。',
  '如果网络搜索结果与前两层冲突，以前两层为准。',
  '用通俗的口吻改写所有引用内容，不要直接照搬原文。',
  '如用户提供实测数据，以实测数据为准。',
].join('\n');

const VISUAL_ASSESSMENT_SYSTEM_PROMPT_FALLBACK = [
  '你是专业的体脂评估助手。',
  '根据两张身体照片估算体脂率：第一张是当前身材，第二张是理想身材。',
  '返回纯 JSON（不要 markdown 代码块）：',
  '{"currentBodyFat": number, "targetBodyFat": number}',
  '数值保留 1 位小数。',
].join('\n');

const VISUAL_ASSESSMENT_USER_PROMPT_FALLBACK =
  '用户性别：{{genderLabel}}。请分析以下两张照片，第一张是当前身材，第二张是理想身材，并估算各自体脂率。';

const SAFE_PHOTO_STYLE_FALLBACK =
  'Use realistic, non-explicit fitness outfit and natural studio quality. {{safeBgPrompt}}';

export const GUIDED_QUESTIONS = [
  { id: 'exercise_base', field: 'exerciseBase', question: '你的运动基础如何？' },
  { id: 'diet_habit', field: 'dietHabit', question: '你的日常饮食习惯如何？' },
  { id: 'sleep_pattern', field: 'sleepPattern', question: '你的作息规律如何？' },
  { id: 'occupation', field: 'occupation', question: '你的职业类型是？' },
];

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: GeminiMessagePart[];
}

function normalizeHistory(history: GeminiMessage[]): GeminiMessage[] {
  if (!Array.isArray(history)) {
    return [];
  }
  return history
    .filter((item) => item && (item.role === 'user' || item.role === 'model') && Array.isArray(item.parts))
    .map((item) => ({
      role: item.role,
      parts: item.parts,
    }));
}

function parseJsonSafely<T>(raw: string): T | null {
  try {
    const cleaned = raw.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

export async function getFreeChatSystemPrompt(): Promise<string> {
  return resolveManagedPrompt('chat.free_chat_system', FREE_CHAT_SYSTEM_FALLBACK, {}, true);
}

export async function getEvolutionAnalyzeBodyPrompt(styleLabel: string): Promise<string> {
  return resolveManagedPrompt(
    'evolution.analyze_body_with_image_user_prompt',
    EVOLUTION_ANALYZE_BODY_FALLBACK,
    { styleLabel },
  );
}

export async function getEvolutionRefinementAckPrompt(userText: string): Promise<string> {
  return resolveManagedPrompt(
    'evolution.refinement_ack_user_prompt',
    EVOLUTION_REFINEMENT_ACK_FALLBACK,
    { userText },
  );
}

export async function getEvolutionFaceMergeRefinementText(): Promise<string> {
  return resolveManagedPrompt(
    'evolution.face_merge_refinement_text',
    EVOLUTION_FACE_MERGE_FALLBACK,
    {},
    true,
  );
}

export async function chatWithMultimodal(
  userText: string,
  mediaInputs: GeminiMultimodalMediaInput[] = [],
  systemPrompt: string = FITNESS_COACH_PROMPT,
  history: GeminiMessage[] = [],
): Promise<string> {
  try {
    const key = getGeminiApiKey();
    const parts: GeminiMessagePart[] = [{ text: userText || '请继续。' }];
    const modalities: GeminiInputModality[] = ['text'];

    for (const input of mediaInputs) {
      const built = await buildGeminiMediaPart(key, input);
      parts.push(built.part);
      modalities.push(built.modality);
    }

    const data = await requestGeminiContentWithFallback(
      key,
      {
        contents: [...normalizeHistory(history), { role: 'user', parts }],
        system_instruction: { parts: [{ text: systemPrompt }] },
      },
      { modalities },
    );

    return extractFirstTextCandidate(data) || '收到，我再想一下。';
  } catch (error) {
    if (error instanceof GeminiPolicyError) {
      if (error.code === 'MISSING_API_KEY') {
        return MISSING_API_KEY_MESSAGE;
      }
      if (error.code === 'PDF_DISABLED') {
        return '当前不支持 PDF 输入。';
      }
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
      ...normalizeHistory(history),
      { role: 'user', parts: [{ text: userText || '请继续。' }] },
    ];

    const data = await requestGeminiContentWithFallback(
      key,
      {
        contents,
        system_instruction: { parts: [{ text: systemPrompt }] },
      },
      { modalities: ['text'] },
    );

    return extractFirstTextCandidate(data) || '收到，我再想一下。';
  } catch (error) {
    if (error instanceof GeminiPolicyError && error.code === 'MISSING_API_KEY') {
      return MISSING_API_KEY_MESSAGE;
    }
    return GENERIC_GEMINI_ERROR_MESSAGE;
  }
}

export async function chatWithImage(
  userText: string,
  imageBase64: string,
  systemPrompt: string = FITNESS_COACH_PROMPT,
): Promise<string> {
  return chatWithMultimodal(userText, [{ type: 'image', dataUrl: imageBase64 }], systemPrompt);
}

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
  const prompt = await resolveManagedPrompt(
    'app.generate_fitness_plan_user_prompt',
    FITNESS_PLAN_USER_PROMPT_FALLBACK,
    {
      genderLabel: userInfo.gender === 'male' ? '男' : '女',
      height: userInfo.height,
      weight: userInfo.weight,
      age: userInfo.age,
      bodyStyle: userInfo.bodyStyle,
      exerciseBase: userInfo.exerciseBase,
      dietHabit: userInfo.dietHabit,
      sleepPattern: userInfo.sleepPattern,
      occupation: userInfo.occupation,
    },
  );

  const systemPrompt = await resolveManagedPrompt('core.fitness_coach_system', FITNESS_COACH_PROMPT, {}, true);
  return chatWithGemini(prompt, systemPrompt);
}

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
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64DataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(base64DataUrl);
    img.src = base64DataUrl;
  });
}

export async function generateIdealBody(params: {
  currentImageBase64?: string;
  referenceImageBase64?: string;
  targetStyle: string;
  gender: string;
  refinement?: string;
  conservative?: boolean;
}): Promise<string | null> {
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

  const safeBgPrompt = await resolveManagedPrompt('image.safe_bg_prompt', SAFE_BG_PROMPT, {}, true);
  const safePhotoStyle = renderLocalTemplate(SAFE_PHOTO_STYLE_FALLBACK, { safeBgPrompt });

  let prompt: string;
  if (params.refinement && hasImage && hasReferenceImage) {
    prompt = await resolveManagedPrompt(
      'image.generate_ideal_body.with_refinement_and_reference',
      'Image 1 is current body and image 2 is face reference. Blend face traits from image 2 into image 1 while preserving body posture. {{safeIdentityInstruction}} Additional adjustment: {{refinement}}. {{safePhotoStyle}}',
      {
        safeIdentityInstruction,
        refinement: params.refinement,
        safePhotoStyle,
      },
    );
  } else if (params.refinement && hasImage) {
    prompt = await resolveManagedPrompt(
      'image.generate_ideal_body.with_refinement_and_image',
      "Adjust this person's body according to: {{refinement}}. Keep overall identity consistent. {{safeIdentityInstruction}} {{safePhotoStyle}}",
      {
        refinement: params.refinement,
        safeIdentityInstruction,
        safePhotoStyle,
      },
    );
  } else if (params.refinement) {
    prompt = await resolveManagedPrompt(
      'image.generate_ideal_body.with_refinement_text_only',
      'Generate a full-body {{genderLabel}} fitness photo with {{target}} body type. Extra requirement: {{refinement}}. {{safePhotoStyle}}',
      {
        genderLabel,
        target,
        refinement: params.refinement,
        safePhotoStyle,
      },
    );
  } else if (hasImage) {
    prompt = await resolveManagedPrompt(
      'image.generate_ideal_body.with_image',
      'Based on this person photo, transform body type toward {{target}}. Keep identity and improve body proportion naturally. {{safeIdentityInstruction}} {{safePhotoStyle}}',
      {
        target,
        safeIdentityInstruction,
        safePhotoStyle,
      },
    );
  } else {
    prompt = await resolveManagedPrompt(
      'image.generate_ideal_body.text_only',
      'Generate a realistic full-body {{genderLabel}} fitness photo with {{target}} body type. {{safePhotoStyle}}',
      {
        genderLabel,
        target,
        safePhotoStyle,
      },
    );
  }

  try {
    const currentImageBase64 = params.currentImageBase64
      ? await compressImage(params.currentImageBase64, 1024)
      : undefined;
    const referenceImageBase64 = params.referenceImageBase64
      ? await compressImage(params.referenceImageBase64, 1024)
      : undefined;

    const { data } = await apiClient.post<{ image?: string }>('/image-gen/ideal-body', {
      prompt,
      currentImageBase64,
      referenceImageBase64,
      size: '1024x1024',
    }, {
      timeout: 120_000,
    });

    return data?.image || null;
  } catch {
    return null;
  }
}

// ── 3-variant ideal-body generation (tarot selection flow) ──────────────────

const IDEAL_PROMPT_A = `You are the Master of Digital Refinement. Task: face-swap the user's face from the provided photo onto an ideal athletic body model. Workflow: 1) Align face keypoints precisely. 2) Transplant the user's facial identity traits onto the model's head, preserving original hairstyle. 3) Reconstruct lighting so the face naturally matches the body's environment. 4) Fix eye/mouth details for natural expression. Constraints: never alter the body's muscle definition, action, or background. The background must be a solid uniform color #030303 with no gradients, textures, objects, shadows, or patterns. Output: ultra-realistic 8K photo where the face is the user's and the body is perfect athletic form.`;

const IDEAL_PROMPT_B = `You are the Dimensions Manifestor. Task: keep the user's face from the provided photo unchanged, and reshape only the body to an ideal athletic state. Replace the original background with a solid uniform color #030303. Workflow: 1) Lock the face region so it is never modified. 2) Extract body pose skeleton and preserve the exact posture. 3) Map ideal muscle texture, body-fat percentage, and vascularity onto the body region. 4) Seamlessly blend reshaped body with the solid #030303 background. Constraints: never distort facial features; background must be solid uniform #030303 with no gradients, textures, objects, shadows, or patterns. Output: a photo that looks like the user after perfect athletic training — same face, same pose, solid #030303 background, ideal body.`;

const IDEAL_PROMPT_C = `You are the Quantum Manifestation Mentor. Task: from the single provided photo, simultaneously extract the user's consciousness (face and eye expression) and superimpose an ideal body state. Workflow: 1) Observe the photo and extract unique facial features and spiritual aura. 2) Generate a new entity: same face without compromise, but neck-downward inherits a perfectly sculpted athletic physique with natural skin texture and muscle definition. 3) Collapse the new body into the original photo's posture. 4) Apply photo-realistic rendering — crisp texture, natural lighting. Constraints: do not merge two different people; user's face on an ideal body. The background must be a solid uniform color #030303 with no gradients, textures, objects, shadows, or patterns. Output: a stunning photo proving the power of manifestation.`;

export async function generateIdealBodyAll3(params: {
  currentImageBase64?: string;
  targetStyle: string;
  gender: string;
}): Promise<Array<string | null>> {
  const currentImageBase64 = params.currentImageBase64
    ? await compressImage(params.currentImageBase64, 1024)
    : undefined;

  const styleNote = `Target body style: ${params.targetStyle}, gender: ${params.gender}.`;

  const call = (prompt: string) =>
    apiClient
      .post<{ image?: string }>('/image-gen/ideal-body',
        { prompt: `${prompt} ${styleNote}`, currentImageBase64, size: '1024x1024' },
        { timeout: 120_000 })
      .then(r => r.data?.image || null)
      .catch(() => null);

  return Promise.all([
    call(IDEAL_PROMPT_A),
    call(IDEAL_PROMPT_B),
    call(IDEAL_PROMPT_C),
  ]);
}

export interface FoodAnalysis {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  mealType: string;
}

function parseFoodJSON(text: string): FoodAnalysis {
  const parsed = parseJsonSafely<Partial<FoodAnalysis>>(text);
  if (!parsed) {
    return {
      name: '未知食物',
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      mealType: '加餐',
    };
  }

  return {
    name: parsed.name || '未知食物',
    calories: Math.round(Number(parsed.calories) || 0),
    protein: Math.round(Number(parsed.protein) || 0),
    fat: Math.round(Number(parsed.fat) || 0),
    carbs: Math.round(Number(parsed.carbs) || 0),
    mealType: parsed.mealType || '加餐',
  };
}

export async function analyzeFoodText(foodName: string, description?: string): Promise<FoodAnalysis> {
  const query = description ? `${foodName}，${description}` : foodName;

  const userPrompt = await resolveManagedPrompt(
    'food.analyze_text_user_prompt',
    '分析这个食物的营养成分：{{query}}',
    { query },
  );

  const systemPrompt = await resolveManagedPrompt(
    'core.food_analysis_system',
    FOOD_ANALYSIS_SYSTEM_PROMPT_FALLBACK,
    {},
    true,
  );

  const reply = await chatWithGemini(userPrompt, systemPrompt);
  return parseFoodJSON(reply);
}

export async function analyzeFoodImage(imageBase64: string): Promise<FoodAnalysis> {
  const userPrompt = await resolveManagedPrompt(
    'food.analyze_image_user_prompt',
    '识别这张图片中的食物并估算营养成分，返回纯 JSON。',
    {},
    true,
  );

  const systemPrompt = await resolveManagedPrompt(
    'core.food_analysis_system',
    FOOD_ANALYSIS_SYSTEM_PROMPT_FALLBACK,
    {},
    true,
  );

  const reply = await chatWithImage(userPrompt, imageBase64, systemPrompt);
  return parseFoodJSON(reply);
}

export async function generateDataInsights(context: {
  totalCalories?: number;
  totalProtein?: number;
  totalFat?: number;
  totalCarbs?: number;
  latestWeight?: number;
  weightTrend?: string;
  checkinCount?: number;
}): Promise<string[]> {
  const userPrompt = await resolveManagedPrompt(
    'insights.generate_data_insights_user_prompt',
    DATA_INSIGHTS_PROMPT_FALLBACK,
    {
      totalCalories: context.totalCalories ?? '--',
      totalProtein: context.totalProtein ?? '--',
      totalFat: context.totalFat ?? '--',
      totalCarbs: context.totalCarbs ?? '--',
      latestWeight: context.latestWeight ?? '--',
      weightTrend: context.weightTrend || '暂无数据',
      checkinCount: context.checkinCount ?? 0,
    },
  );

  const systemPrompt = await resolveManagedPrompt(
    'core.fitness_coach_system',
    FITNESS_COACH_PROMPT,
    {},
    true,
  );

  const reply = await chatWithGemini(userPrompt, systemPrompt);
  const parsed = parseJsonSafely<unknown>(reply);
  if (Array.isArray(parsed)) {
    return parsed.map((item) => String(item)).slice(0, 3);
  }

  return [
    '今天先把蛋白质补齐一份。',
    '训练后 30 分钟内注意补水。',
    '睡前减少高油高糖摄入。',
  ];
}

export interface CoachPlanTask {
  id: string;
  title: string;
  category: 'training' | 'nutrition' | 'recovery' | 'habit';
  detail: string;
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

export async function buildCoachKnowledgePrompt(
  domains: string[] = ['training', 'nutrition'],
  queryText?: string,
): Promise<string> {
  const knowledgeIntro = await resolveManagedPrompt(
    'core.coach_knowledge_intro',
    COACH_KNOWLEDGE_INTRO_FALLBACK,
    {},
    true,
  );

  if (!queryText?.trim()) {
    return knowledgeIntro;
  }

  try {
    const response = await fetch('/api/chat/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: queryText,
        topK: 4,
        domains,
      }),
    });

    if (!response.ok) {
      return knowledgeIntro;
    }

    const payload = (await response.json()) as {
      data?: { documents?: string[] };
      documents?: string[];
    };

    const documents =
      (Array.isArray(payload?.data?.documents) ? payload.data.documents : undefined)
      ?? (Array.isArray(payload?.documents) ? payload.documents : []);

    if (documents.length === 0) {
      return knowledgeIntro;
    }

    const knowledgeContext = documents
      .map((doc, index) => `[知识片段${index + 1}] ${doc}`)
      .join('\n\n');

    return `${knowledgeIntro}\n\n以下是检索到的知识库内容，请优先依据这些内容回答：\n${knowledgeContext}`;
  } catch {
    return knowledgeIntro;
  }
}

export async function generateFirstDayPlan(
  context: CoachPlanGenerationContext,
): Promise<CoachFirstDayPlan> {
  const queryText = `首日计划生成，用户体测摘要：${context.assessmentSummary} ${context.intakeSummary || ''}`;
  const knowledgePrompt = await buildCoachKnowledgePrompt(['training', 'nutrition'], queryText);

  const prompt = await resolveManagedPrompt(
    'coach.generate_first_day_plan_user_prompt',
    [
      '根据用户评估数据，生成首日教练计划，并严格返回 JSON。',
      '返回字段：headline、tasks、nutritionNote、recoveryNote、coachMessage。',
      '每个 task 包含：id、title、category(training/nutrition/recovery/habit)、detail。',
      '用户体测摘要：{{assessmentSummary}}',
      '{{intakeSummary}}',
      '{{constraintsText}}',
    ].join('\n'),
    {
      assessmentSummary: context.assessmentSummary,
      intakeSummary: context.intakeSummary ? `用户问卷摘要：${context.intakeSummary}` : '',
      constraintsText: context.constraints?.length ? `约束条件：${context.constraints.join(' | ')}` : '',
    },
  );

  const reply = await chatWithGemini(prompt, knowledgePrompt);
  const parsed = parseJsonSafely<CoachFirstDayPlan>(reply);
  if (parsed && Array.isArray(parsed.tasks)) {
    return parsed;
  }

  return {
    headline: '今日先做三件小事，建立执行节奏。',
    tasks: [
      {
        id: 'train-1',
        title: '全身激活训练',
        category: 'training',
        detail: '热身8分钟 + 主训练20分钟（深蹲、俯卧撑、划船各3组）+ 拉伸5分钟。',
      },
      {
        id: 'eat-1',
        title: '蛋白优先的一日饮食',
        category: 'nutrition',
        detail: '每餐保证优质蛋白，晚餐控制油炸和高糖，训练后补充水分。',
      },
      {
        id: 'sleep-1',
        title: '恢复与作息',
        category: 'recovery',
        detail: '今晚尽量在固定时间入睡，睡前30分钟不看高刺激内容。',
      },
    ],
    nutritionNote: '今天优先保证蛋白质和补水，避免高油高糖。',
    recoveryNote: '训练后做拉伸，保证睡眠质量。',
    coachMessage: '你不需要一次做到完美，先把今天完成，节奏就会建立起来。',
  };
}

export async function generateCoachFollowUp(
  dayIndex: number,
  context: CoachPlanGenerationContext,
): Promise<string> {
  const queryText = `第${dayIndex}天跟进，用户体测摘要：${context.assessmentSummary}`;
  const knowledgePrompt = await buildCoachKnowledgePrompt(['training', 'nutrition'], queryText);

  const prompt = await resolveManagedPrompt(
    'coach.generate_follow_up_user_prompt',
    [
      '生成一条简洁的中文每日教练跟进消息，用于 AI 教练每日签到。',
      '当前是第 {{dayIndex}} 天。',
      '用户体测摘要：{{assessmentSummary}}',
      '{{intakeSummary}}',
    ].join('\n'),
    {
      dayIndex,
      assessmentSummary: context.assessmentSummary,
      intakeSummary: context.intakeSummary ? `用户问卷摘要：${context.intakeSummary}` : '',
    },
  );

  const reply = await chatWithGemini(prompt, knowledgePrompt);
  return reply.trim() || '今天也别追求完美，先完成一个最小行动。';
}

export async function generateWeekSummary(
  context: CoachPlanGenerationContext,
): Promise<string> {
  const queryText = `周总结生成，用户体测摘要：${context.assessmentSummary}`;
  const knowledgePrompt = await buildCoachKnowledgePrompt(['training', 'nutrition'], queryText);

  const prompt = await resolveManagedPrompt(
    'coach.generate_week_summary_user_prompt',
    [
      '生成一段简洁的中文周总结，回顾用户本周表现。',
      '突出执行趋势、坚持程度，以及下周最值得微调的一个方向。',
      '用户体测摘要：{{assessmentSummary}}',
      '{{intakeSummary}}',
      '{{constraintsText}}',
    ].join('\n'),
    {
      assessmentSummary: context.assessmentSummary,
      intakeSummary: context.intakeSummary ? `用户问卷摘要：${context.intakeSummary}` : '',
      constraintsText: context.constraints?.length ? `约束条件：${context.constraints.join(' | ')}` : '',
    },
  );

  const reply = await chatWithGemini(prompt, knowledgePrompt);
  return reply.trim() || '这一周你已经建立了连续执行的基础，下周继续把节奏稳住。';
}

export interface VisualBodyFatResult {
  currentBodyFat: number;
  targetBodyFat: number;
}

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

  const userPrompt = await resolveManagedPrompt(
    'coach.visual_assessment_user_prompt',
    VISUAL_ASSESSMENT_USER_PROMPT_FALLBACK,
    {
      genderLabel: gender === 'male' ? '男' : '女',
    },
  );

  const systemPrompt = await resolveManagedPrompt(
    'core.visual_assessment_system',
    VISUAL_ASSESSMENT_SYSTEM_PROMPT_FALLBACK,
    {},
    true,
  );

  try {
    const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];
    parts.push({ text: userPrompt });

    const current64 = currentImageBase64.includes(',') ? currentImageBase64.split(',')[1] : currentImageBase64;
    const currentMime = currentImageBase64.includes(';') ? currentImageBase64.split(';')[0].split(':')[1] : 'image/jpeg';
    parts.push({ inline_data: { mime_type: currentMime, data: current64 } });

    const ideal64 = idealImageBase64.includes(',') ? idealImageBase64.split(',')[1] : idealImageBase64;
    const idealMime = idealImageBase64.includes(';') ? idealImageBase64.split(';')[0].split(':')[1] : 'image/jpeg';
    parts.push({ inline_data: { mime_type: idealMime, data: ideal64 } });

    const data = await requestGeminiContentWithFallback(
      key,
      {
        contents: [{ role: 'user', parts }],
        system_instruction: { parts: [{ text: systemPrompt }] },
      },
      { modalities: ['text', 'image'] },
    );

    const text = extractFirstTextCandidate(data) || '';
    const parsed = parseJsonSafely<{ currentBodyFat?: unknown; targetBodyFat?: unknown }>(text);
    if (!parsed) {
      return null;
    }

    const currentBodyFat = Number(parsed.currentBodyFat);
    const targetBodyFat = Number(parsed.targetBodyFat);

    if (Number.isFinite(currentBodyFat) && Number.isFinite(targetBodyFat)) {
      return {
        currentBodyFat: Math.round(currentBodyFat * 10) / 10,
        targetBodyFat: Math.round(targetBodyFat * 10) / 10,
      };
    }

    return null;
  } catch {
    return null;
  }
}
