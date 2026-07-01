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

// Shared realism rules for every ideal-body prompt (tarot + generateIdealBody fallbacks).
// - POSE_LOCK: Image 1 defines the pose; Image 2 (if any) is only a physique-level reference — do not copy its stance.
// - SKELETAL_LOCK: bones do not change with training; only postural correction may make the subject look taller.
// - SKIN_UNIFICATION: face skin tone stays at Image 1's Fitzpatrick level; body tone is brought into agreement with the face, not the other way around.
// - WARDROBE_MATCH: match Image 1's clothing state so the before/after physique comparison stays valid.
const POSE_LOCK =
  " POSE & COMPOSITION RULES (critical — do NOT copy the reference pose):" +
  " - Image 1 (current body) defines the POSE, POSTURE, CAMERA ANGLE, FRAMING, HEAD TILT and LIMB POSITIONS. Preserve them exactly." +
  " - Image 2 (reference physique) is ONLY a sample of the target body shape — body-fat level, muscle mass, proportions, definition. Do NOT copy its pose, gesture, stance, hand position, leg position, facial expression or camera angle." +
  " - If Image 1 shows a front-facing torso-crop portrait, the output must be a front-facing torso-crop portrait." +
  " - If there is only one image, treat that image as defining the pose.";

const SKELETAL_LOCK =
  " SKELETAL & PROPORTION RULES (anatomically hard constraints):" +
  " - Overall body height, head size, neck length, torso length, arm length, forearm length, thigh length, shin length, and hand/foot size MUST equal Image 1 exactly. Bones do not change with training." +
  " - Shoulder width is bounded by clavicle length — you may add deltoid muscle THICKNESS but must NOT widen the shoulder joint beyond Image 1's clavicular endpoints." +
  " - Hip width, wrist, elbow, knee and ankle joint POSITIONS in the frame must equal Image 1. Do not stretch or lengthen limbs." +
  " - The ONLY way the subject can look taller is through POSTURAL CORRECTION: fix kyphosis (rounded upper back) → upright thoracic spine; fix rounded/forward shoulders → shoulder blades retracted and depressed; fix anterior pelvic tilt → neutral pelvis; lengthened neck via cervical retraction." +
  " - Muscle mass may increase (chest depth, back thickness, arm circumference, thigh circumference) but joint centers and bone endpoints stay at Image 1's coordinates." +
  " - Do NOT copy Image 2's height, limb ratios, or skeletal frame — Image 2 is only a fat-loss and muscle-mass reference.";

const SKIN_UNIFICATION =
  " SKIN & IDENTITY RULES (critical for realism):" +
  " - Identity lock means locking BONE STRUCTURE, FACIAL FEATURES (eye shape, nose, mouth, brow, jaw), HAIRSTYLE and BEARD — NOT skin color, tone, or brightness." +
  " - BASELINE: the face skin tone must stay at the SAME Fitzpatrick level as Image 1's face — do NOT tan, do NOT darken, do NOT add outdoor sun exposure. The output face must NOT look noticeably darker than Image 1." +
  " - Torso/neck/arm skin tone must be brought INTO AGREEMENT with the Image 1 face tone — unify by matching the body to the face, not the face to the body." +
  " - Allowed subtle adjustments only: very slight healthy flush from active blood circulation (a hint of pink on cheeks), faint natural skin sheen (not oily), slightly higher clarity — nothing that changes the base hue or Fitzpatrick level." +
  " - Global color temperature and white balance across face and torso must match within 100K; same key light direction." +
  " - Explicit negatives: NOT tanned, NOT sun-kissed, NOT bronzed, NOT darker than Image 1, NOT waxy, NOT pale, NOT washed-out.";

const WARDROBE_MATCH =
  " Wardrobe: match the clothing state of Image 1 exactly — if Image 1 is shirtless, the output must also be shirtless with a bare torso for physique comparison; if Image 1 wears a shirt, the output wears the same shirt. Below the waist, wear black athletic training shorts. This is a fitness before/after physique comparison in the style of Sports Illustrated / Men's Health magazine — non-explicit, PG-13, no nudity below waist, no genitalia visible, anatomical fitness reference only.";

// Full realism suffix for prompts that have at least one image.
const IDEAL_REALISM_SUFFIX = POSE_LOCK + SKELETAL_LOCK + SKIN_UNIFICATION + WARDROBE_MATCH;

// Lightweight suffix for text-only prompts — no source image to lock against.
const IDEAL_TEXT_ONLY_SUFFIX =
  " Non-explicit, PG-13, Sports Illustrated / Men's Health magazine style. Wear a fitted athletic tank top and knee-length black training shorts. Realistic anatomy with natural proportions — no exaggerated shoulders, no elongated limbs, no unrealistic height.";


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
          max_tokens: 8192,
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

// ── AI 私教人格（FitClaw "小爪" 风格）──

export const FITNESS_COACH_PROMPT = [
  '你是 **小爪**，RightNow Fitness 的 AI 健身私教。',
  '',
  '## 你的定位',
  '你是一个温柔但专业、务实胜过漂亮话的长期陪伴型教练。',
  '你不是搜索框，不是百科复读机，不是只会说"加油"的客服。',
  '你的使命是：帮用户把"想练好、想吃好、想把身体变成满意的样子"这件事，落成每天真的能执行的路线。',
  '',
  '## 核心原则',
  '- **务实第一**：能给具体数字、具体动作、具体调整，就不给空泛建议。',
  '- **生活化减脂**：承认用户可以吃食堂外卖，不需要水煮鸡胸；热量缺口 + 可持续 + 不苛求完美。',
  '- **数据驱动**：基于用户的体重、身高、TDEE、体脂率等真实数据说话，不凭感觉乱讲。',
  '- **关键时刻鞭策**：用户蛋白没吃够、该练的没练、该喝的水没喝，你会温和但明确地提醒。',
  '- **反对极端**：拒绝"7天瘦10斤""只吃水煮菜"等极端方法，推崇普通人能坚持的执行方案。',
  '- **有态度有观点**：你不是中立百科，你有基于实战的判断和立场。',
  '',
  '## 说话方式',
  '- 简洁、直接但友好',
  '- 用生活化的语言，不说学术黑话',
  '- 有温度，不客服腔',
  '- 可以像老朋友一样查岗，但不能羞辱用户',
  '- 信息不足时明确说"这是临时建议"，不装全知',
  '- 用户练得好，真心为他高兴；用户快放弃，先共鸣再给调整策略',
  '',
  '## 回答规则',
  '- 优先使用提供的参考资料（专业知识库、专业书籍、网络搜索）',
  '- 如果参考资料与生活化减脂理念冲突，以实战派观点为准',
  '- 用通俗口吻改写，不直接引用原文',
  '- 使用简体中文，不要使用 markdown 格式',
  '- 如果用户提供了详细的身体数据（身高体重体脂TDEE等），务必基于这些数据给出个性化建议',
  '',
  '## 你不是什么',
  '- 不是标准客服',
  '- 不是只会复述百科的问答机',
  '- 不是张口就给激进方案的鲁莽教练',
  '- 不是没看上下文就乱建议的人',
].join('\n');

// ── 私教欢迎语（无建档时） ──

export const COACH_WELCOME_MESSAGE = [
  '嗨！我是小爪 🦞，你的 AI 健身私教。',
  '',
  '接下来的日子，我会用专业知识 + 生活化的方式，帮你把目标身材真的做出来。',
  '',
  '你可以直接告诉我今天想聊什么——训练、饮食、体重、状态，都可以。',
  '',
  '不过如果你想让我给你更精准的方案，点击下方「开始私教评估」按钮，我会花几分钟了解你的完整情况，然后给你量身定制的计划。',
].join('\n');

// ── 四段式方案交付 Prompt ──

export const STAGE1_ASSESSMENT_PROMPT = [
  '你现在处于"现状评估"阶段。',
  '请基于用户的所有数据，输出四栏结构：',
  '1. **原始数据**：年龄、性别、身高、体重、训练频率、训练场景、饮食环境',
  '2. **估算数据**：BMI、目标BMI、预估体脂率、目标体脂率、基础代谢（标注"估算值"）',
  '3. **现状判断**：2-3句话总结用户当前的身体状况和训练水平',
  '4. **先解决什么**：指出当前最需要优先解决的问题',
  '',
  '输出完毕后，必须追问用户：',
  '"你看这版现状评估有没有需要改的？如果你最近有更精准的数据（体测仪、体检单、腰围等），可以现在补给我，我按更准的数据修正。"',
  '',
  '必须等待用户确认后才能进入下一阶段。不要一次性输出所有内容。',
].join('\n');

export const STAGE2_EXPECTATION_PROMPT = [
  '你现在处于"预期管理"阶段。',
  '在给出具体方案前，校准用户的预期，建立心理防火墙。',
  '必须包含四层递进：',
  '1. **生理真相**：体重波动是正常的（水分、激素、进食时机）；前两周掉秤快主要是水分和糖原',
  '2. **时间线校准**：按健康速度拆解4周、8周、12周的预期变化（每周约0.5-1kg是健康的）',
  '3. **波动容忍度**：区分正常波动（1-2kg）、需要警惕（连续2周不降）、必须调整（连续3周不降反升）',
  '4. **失败预案**：让用户选择最可能让自己破戒的场景：',
  '   - A：聚餐/应酬',
  '   - B：平台期看不到效果',
  '   - C：纯粹懒得动',
  '   - D：压力大想吃东西',
  '',
  '输出完毕后，必须等用户选择并确认。',
  '根据用户选择的场景给出对应的预防策略。',
].join('\n');

export const STAGE3_NUTRITION_PROMPT = [
  '你现在处于"饮食建议"阶段。',
  '基于用户的TDEE和目标方向（减脂/增肌/维持），给出具体饮食方案：',
  '1. **运动日配额**：总热量、碳水g、蛋白质g、脂肪g（按g/kg体重计算并说明原因）',
  '2. **非运动日配额**：碳水比运动日少0.5g/kg，蛋白质和脂肪不变',
  '3. **分餐建议**：早/午/晚餐+加餐的热量和蛋白分配',
  '4. **明天怎么吃**：给一个具体的次日范例（包含具体食物和估算量）',
  '5. **两周调参规则**：看晨重7日均值+腰围+训练表现；',
  '   - 每周降0.5-1kg：不调',
  '   - 掉太慢：优先减碳水20-30g/天',
  '   - 掉太快：优先加碳水20-30g/天',
  '   - 训练表现明显下降：加运动日碳水',
  '',
  '减脂男性默认：碳水2.5-3.0g/kg，蛋白质1.5g/kg，脂肪0.8g/kg。',
  '',
  '输出完毕后必须等待用户确认，再进入训练框架。',
].join('\n');

export const STAGE4_TRAINING_PROMPT = [
  '你现在处于"训练框架建议"阶段。',
  '必须包含：',
  '1. **为什么选这个分化**：根据用户训练频率和恢复能力说明',
  '2. **分化框架**：明确每天练什么部位',
  '3. **每天动作类别**：每类1-3个动作示例',
  '4. **重量校准**：大复合动作70-80% e1RM，6-10次；其他8-12次；小肌群12-15次',
  '',
  '分化规则：',
  '- 频率不明→默认3分化（推/拉/腿+核心）',
  '- 每周4-5练→4分化（背+肩后束+二头 / 胸+肩前中束+三头 / 腿+核心 / 弱项强化）',
  '- 首次方案不默认上5分化',
  '',
  '训练框架输出完毕后，不立即发当天训练TODO。',
  '等用户说"开始训练"再下发当天具体训练内容。',
].join('\n');

// ── 用户画像上下文 ──

const BODY_STYLE_LABELS: Record<string, string> = {
  slim: '偏瘦',
  balanced: '匀称',
  athletic: '运动型',
  muscular: '肌肉型',
  curvy: '丰满型',
};

const GOAL_DIRECTION_LABELS: Record<string, string> = {
  fat_loss: '减脂塑形',
  recomposition: '体态重塑',
  muscle_gain: '增肌提升',
};

const STAGE_LABELS: Record<string, string> = {
  foundation: '基础适应期',
  build: '增肌构建期',
  cut: '减脂塑形期',
  maintain: '巩固维持期',
};

export interface UserProfileContext {
  // 基础信息
  gender?: string | null;
  height?: number | null;
  weight?: number | null;
  age?: number | null;
  bodyStyle?: string | null;
  goalWeight?: number | null;
  // 教练评估
  goalDirection?: string | null;
  stage?: string | null;
  bmi?: number | null;
  bmr?: number | null;
  tdee?: number | null;
  bodyFatEstimate?: number | null;
  targetBodyFatEstimate?: number | null;
  targetWeeks?: number | null;
  // 训练条件
  trainingExperience?: string | null;
  injuryHistory?: string | null;
  trainingDaysPerWeek?: number | null;
  sessionDurationMinutes?: number | null;
  trainingEnvironment?: string | null;
  timePreference?: string | null;
  // 力量锚点
  strengthAnchors?: string | null; // JSON string of [{exercise, weight, reps, nearFailure}]
  // 饮食环境
  dietEnvironment?: string | null;
  typicalBreakfast?: string | null;
  typicalLunch?: string | null;
  typicalDinner?: string | null;
  alcoholFrequency?: string | null;
  snackFrequency?: string | null;
  diningOutFrequency?: string | null;
  // 恢复与生活
  sleepHours?: number | null;
  sleepQuality?: string | null;
  stressLevel?: string | null;
  cardioType?: string | null;
  cardioFrequency?: string | null;
  stepsPerDay?: number | null;
  // 目标与动机
  motivationLevel?: string | null;
  biggestChallenge?: string | null;
  targetAreas?: string | null; // comma-separated
  // 流程控制
  onboardingCompleted?: boolean;
}

/**
 * 将用户身体数据拼成系统提示词上下文，加上占位符后可插入教练 prompt 中。
 */
export function buildUserContextPrompt(profile: UserProfileContext): string {
  const lines: string[] = [];

  lines.push('## 当前用户信息');
  lines.push('以下是该用户的真实身体数据，请基于这些数据提供个性化建议：');
  lines.push('');

  if (profile.gender) {
    lines.push(`- 性别：${profile.gender === 'male' ? '男' : profile.gender === 'female' ? '女' : profile.gender}`);
  }
  if (typeof profile.height === 'number' && profile.height > 0) {
    lines.push(`- 身高：${profile.height}cm`);
  }
  if (typeof profile.weight === 'number' && profile.weight > 0) {
    lines.push(`- 体重：${profile.weight}kg`);
  }
  if (typeof profile.age === 'number' && profile.age > 0) {
    lines.push(`- 年龄：${profile.age}岁`);
  }
  if (profile.bodyStyle) {
    lines.push(`- 目标体型偏好：${BODY_STYLE_LABELS[profile.bodyStyle] || profile.bodyStyle}`);
  }
  if (profile.goalWeight && profile.goalWeight > 0) {
    lines.push(`- 目标体重：${profile.goalWeight}kg`);
  }

  // 教练评估数据
  if (profile.goalDirection) {
    lines.push(`- 目标方向：${GOAL_DIRECTION_LABELS[profile.goalDirection] || profile.goalDirection}`);
  }
  if (profile.stage) {
    lines.push(`- 当前阶段：${STAGE_LABELS[profile.stage] || profile.stage}`);
  }
  if (typeof profile.bmi === 'number' && profile.bmi > 0) {
    lines.push(`- BMI：${profile.bmi}`);
  }
  if (typeof profile.bmr === 'number' && profile.bmr > 0) {
    lines.push(`- 基础代谢：${profile.bmr} kcal/天`);
  }
  if (typeof profile.tdee === 'number' && profile.tdee > 0) {
    lines.push(`- 每日消耗：${profile.tdee} kcal/天`);
  }
  if (typeof profile.bodyFatEstimate === 'number' && profile.bodyFatEstimate > 0) {
    lines.push(`- 体脂率估算：${profile.bodyFatEstimate}%`);
  }

  // 教练评估
  if (profile.targetBodyFatEstimate && profile.targetBodyFatEstimate > 0) {
    lines.push(`- 目标体脂率：${profile.targetBodyFatEstimate}%`);
  }
  if (profile.targetWeeks && profile.targetWeeks > 0) {
    lines.push(`- 规划周期：约${profile.targetWeeks}周`);
  }

  // 训练背景
  if (profile.trainingExperience) {
    lines.push(`- 训练经验：${profile.trainingExperience}`);
  }
  if (profile.trainingDaysPerWeek && profile.trainingDaysPerWeek > 0) {
    lines.push(`- 每周训练天数：${profile.trainingDaysPerWeek}天`);
  }
  if (profile.sessionDurationMinutes && profile.sessionDurationMinutes > 0) {
    lines.push(`- 单次训练时长：${profile.sessionDurationMinutes}分钟`);
  }
  if (profile.trainingEnvironment) {
    lines.push(`- 训练场景：${profile.trainingEnvironment}`);
  }
  if (profile.timePreference) {
    lines.push(`- 训练时间段偏好：${profile.timePreference}`);
  }
  if (profile.injuryHistory && profile.injuryHistory !== '无明显限制' && profile.injuryHistory !== '无') {
    lines.push(`- ⚠️ 需要规避的身体限制：${profile.injuryHistory}`);
  }

  // 力量锚点
  if (profile.strengthAnchors) {
    try {
      const anchors = JSON.parse(profile.strengthAnchors);
      if (Array.isArray(anchors) && anchors.length > 0) {
        lines.push('- 近期力量数据：');
        for (const a of anchors) {
          lines.push(`  • ${a.exercise}：${a.weight}kg × ${a.reps}次${a.nearFailure ? '（接近力竭）' : ''}`);
        }
      }
    } catch { /* ignore parse errors */ }
  }

  // 饮食环境
  if (profile.dietEnvironment) {
    lines.push(`- 饮食环境：${profile.dietEnvironment}`);
  }
  if (profile.typicalBreakfast) {
    lines.push(`- 典型早餐：${profile.typicalBreakfast}`);
  }
  if (profile.typicalLunch) {
    lines.push(`- 典型午餐：${profile.typicalLunch}`);
  }
  if (profile.typicalDinner) {
    lines.push(`- 典型晚餐：${profile.typicalDinner}`);
  }
  if (profile.alcoholFrequency) {
    lines.push(`- 饮酒频率：${profile.alcoholFrequency}`);
  }
  if (profile.snackFrequency) {
    lines.push(`- 零食/夜宵频率：${profile.snackFrequency}`);
  }
  if (profile.diningOutFrequency) {
    lines.push(`- 外食频率：${profile.diningOutFrequency}`);
  }

  // 恢复与生活
  if (profile.sleepHours && profile.sleepHours > 0) {
    lines.push(`- 平均睡眠：${profile.sleepHours}小时/天`);
  }
  if (profile.sleepQuality) {
    lines.push(`- 睡眠质量：${profile.sleepQuality}`);
  }
  if (profile.stressLevel) {
    lines.push(`- 压力等级：${profile.stressLevel}`);
  }
  if (profile.cardioType) {
    lines.push(`- 有氧类型：${profile.cardioType}`);
  }
  if (profile.cardioFrequency) {
    lines.push(`- 有氧频率：${profile.cardioFrequency}`);
  }
  if (profile.stepsPerDay && profile.stepsPerDay > 0) {
    lines.push(`- 每日步数：约${profile.stepsPerDay}步`);
  }

  // 目标与动机
  if (profile.motivationLevel) {
    lines.push(`- 动机水平：${profile.motivationLevel}`);
  }
  if (profile.biggestChallenge) {
    lines.push(`- 最大挑战：${profile.biggestChallenge}`);
  }
  if (profile.targetAreas) {
    lines.push(`- 优先改善部位：${profile.targetAreas}`);
  }

  if (lines.length <= 3) {
    return ''; // 没有有效数据
  }

  lines.push('');
  lines.push('请务必根据以上真实用户数据提供量身定制的建议。');
  lines.push('例如：计算热量缺口时基于用户的 TDEE、体重和身高；推荐训练方案时考虑训练经验和身体限制；饮食建议结合用户的饮食环境和典型餐食。');

  return lines.join('\n');
}

/**
 * 将用户画像注入到教练系统提示词中。
 */
export function buildPersonalizedCoachPrompt(
  basePrompt: string,
  profile: UserProfileContext,
): string {
  const context = buildUserContextPrompt(profile);
  if (!context) {
    return basePrompt;
  }
  return `${basePrompt}\n\n${context}`;
}

export const COACH_ASSESSMENT_PROMPT = [
  '你是小爪，RightNow 的 AI 体测分析师。',
  '根据用户身体数据给出简洁阶段判断（1-2 句）。',
  '语气专业但有温度，使用中文，直接返回文字。',
].join('\n');

const FREE_CHAT_SYSTEM_FALLBACK = [
  '你是小爪，RightNow 的 AI 健身私教。',
  '回复用中文，不要使用 markdown。',
  '语气专业、友好、有温度、可执行。',
  '务实胜过漂亮话，给具体建议不给空泛鼓励。',
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
    // If StepFun is configured, use it directly (no Gemini key needed)
    if (STEPFUN_API_KEY()) {
      const contents: GeminiMessage[] = [
        ...normalizeHistory(history),
        { role: 'user', parts: [{ text: userText || '请继续。' }] },
      ];
      const data = await requestStepFunChat({
        contents,
        system_instruction: { parts: [{ text: systemPrompt }] },
      });
      return extractFirstTextCandidate(data) || '收到，我再想一下。';
    }

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
    // If StepFun is configured, use it directly (no Gemini key needed)
    if (STEPFUN_API_KEY()) {
      const contents: GeminiMessage[] = [
        ...normalizeHistory(history),
        { role: 'user', parts: [{ text: userText || '请继续。' }] },
      ];
      const data = await requestStepFunChat({
        contents,
        system_instruction: { parts: [{ text: systemPrompt }] },
      });
      return extractFirstTextCandidate(data) || '收到，我再想一下。';
    }

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
      'Image 1 is the current body and image 2 is a physique reference. Re-render the person in Image 1 toward the physique level shown in Image 2. {{safeIdentityInstruction}} Additional adjustment: {{refinement}}. {{safePhotoStyle}}{{idealRealismSuffix}}',
      {
        safeIdentityInstruction,
        refinement: params.refinement,
        safePhotoStyle,
        idealRealismSuffix: IDEAL_REALISM_SUFFIX,
      },
    );
  } else if (params.refinement && hasImage) {
    prompt = await resolveManagedPrompt(
      'image.generate_ideal_body.with_refinement_and_image',
      "Adjust this person's body according to: {{refinement}}. Keep overall identity consistent. {{safeIdentityInstruction}} {{safePhotoStyle}}{{idealRealismSuffix}}",
      {
        refinement: params.refinement,
        safeIdentityInstruction,
        safePhotoStyle,
        idealRealismSuffix: IDEAL_REALISM_SUFFIX,
      },
    );
  } else if (params.refinement) {
    prompt = await resolveManagedPrompt(
      'image.generate_ideal_body.with_refinement_text_only',
      'Generate a full-body {{genderLabel}} fitness photo with {{target}} body type. Extra requirement: {{refinement}}. {{safePhotoStyle}}{{idealTextOnlySuffix}}',
      {
        genderLabel,
        target,
        refinement: params.refinement,
        safePhotoStyle,
        idealTextOnlySuffix: IDEAL_TEXT_ONLY_SUFFIX,
      },
    );
  } else if (hasImage) {
    prompt = await resolveManagedPrompt(
      'image.generate_ideal_body.with_image',
      'Based on this person photo, transform body type toward {{target}}. Keep identity and improve body proportion naturally. {{safeIdentityInstruction}} {{safePhotoStyle}}{{idealRealismSuffix}}',
      {
        target,
        safeIdentityInstruction,
        safePhotoStyle,
        idealRealismSuffix: IDEAL_REALISM_SUFFIX,
      },
    );
  } else {
    prompt = await resolveManagedPrompt(
      'image.generate_ideal_body.text_only',
      'Generate a realistic full-body {{genderLabel}} fitness photo with {{target}} body type. {{safePhotoStyle}}{{idealTextOnlySuffix}}',
      {
        genderLabel,
        target,
        safePhotoStyle,
        idealTextOnlySuffix: IDEAL_TEXT_ONLY_SUFFIX,
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
// Shared realism constants (POSE_LOCK / SKELETAL_LOCK / SKIN_UNIFICATION / WARDROBE_MATCH / IDEAL_REALISM_SUFFIX)
// are declared near the top of this file so both these tarot prompts and the generateIdealBody fallbacks can reuse them.

const IDEAL_PROMPT_A =
  "You are the Master of Digital Refinement. Task: take the person in Image 1 and re-render their body toward the physique level shown in Image 2, without changing pose or identity." +
  " Workflow: 1) Lock the pose, camera angle and framing from Image 1. 2) Preserve the user's facial IDENTITY (bone structure, features, hairstyle, beard) from Image 1 — but re-render the skin so it matches the new body's tone and lighting." +
  " 3) Reshape only the body proportions (fat loss, muscle definition, vascularity) to match the LEVEL of Image 2 — do NOT copy Image 2's pose, stance, gesture, or facial expression." +
  " 4) Unify color temperature and skin tone across face, neck and torso. 5) Fix eye/mouth details for natural expression." +
  " Constraints: the pose must equal Image 1; the physique level must equal Image 2; background must be solid uniform #030303 with no gradients, textures, objects, shadows, or patterns." +
  " Output: ultra-realistic 8K photo of the SAME PERSON in the SAME POSE as Image 1, with an athletic body matching Image 2's level, unified skin tone." +
  IDEAL_REALISM_SUFFIX;

const IDEAL_PROMPT_B =
  "You are the Dimensions Manifestor. Task: keep the user's facial IDENTITY and POSE from Image 1, and reshape the body toward the physique level of Image 2." +
  " Replace the original background with a solid uniform color #030303. Workflow: 1) Lock the pose, camera angle, framing, head tilt and limb positions from Image 1. 2) Lock facial features and hairstyle from Image 1. Do NOT lock skin color — re-render face skin to match the new athletic body." +
  " 3) Use Image 2 ONLY as a physique reference — target body-fat percentage, muscle mass, and proportions. Do NOT copy Image 2's pose, stance, gesture, or camera angle." +
  " 4) Map ideal muscle texture and vascularity onto the body region within Image 1's original silhouette." +
  " 5) Seamlessly blend reshaped body with the solid #030303 background and unify skin tone across face, neck, chest, arms. Constraints: never distort facial features; pose must match Image 1; background must be solid uniform #030303 with no gradients, textures, objects, shadows, or patterns." +
  " Output: the SAME PERSON in the SAME POSE as Image 1, after perfect athletic training — same face identity, healthier skin tone, athletic body at Image 2's level." +
  IDEAL_REALISM_SUFFIX;

const IDEAL_PROMPT_C =
  "You are the Quantum Manifestation Mentor. Task: from Image 1 extract the user's identity (face features, eye expression, hairstyle, beard) AND their pose; use Image 2 only as a physique-level reference." +
  " Workflow: 1) Observe Image 1 and extract unique facial features, spiritual aura, and full pose/framing." +
  " 2) Generate a new entity: same facial identity, same exact pose as Image 1, but neck-downward inherits a perfectly sculpted athletic physique at Image 2's fitness level, with natural skin texture and muscle definition." +
  " 3) The new body must occupy Image 1's silhouette in Image 1's pose — do NOT adopt Image 2's stance, hand gesture, or camera angle. 4) Apply photo-realistic rendering — crisp texture, natural lighting, unified skin tone across face and body." +
  " Constraints: do not merge two different people; user's face on an ideal body in the user's own pose. The background must be a solid uniform color #030303 with no gradients, textures, objects, shadows, or patterns." +
  " Output: a stunning photo proving the power of manifestation — same person, same pose, elevated physique." +
  IDEAL_REALISM_SUFFIX;

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
  const { data } = await apiClient.post<FoodAnalysis>('/diet/analyze/text', {
    foodName,
    description,
  }, { timeout: 60_000 });
  return parseFoodJSON(JSON.stringify(data));
}

export async function analyzeFoodImage(imageBase64: string): Promise<FoodAnalysis> {
  const { data } = await apiClient.post<FoodAnalysis>('/diet/analyze/image', {
    imageBase64,
  }, { timeout: 90_000 });
  return parseFoodJSON(JSON.stringify(data));
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
