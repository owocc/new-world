import { getSetting, setSetting } from '@/server/settings';

/**
 * Semantic image type stored on every media asset. It tells the vision
 * pipeline which profile to apply and helps downstream AI characters
 * distinguish the meaning of an image (a chat photo vs. an avatar vs. a
 * sticker/meme sent in conversation).
 */
export type ImageType = 'chat' | 'avatar' | 'sticker' | 'general';

/** Vision interpreter profiles. Each maps to a dedicated set of prompts. */
export type VisionProfileKey = 'general' | 'avatar' | 'sticker';

export const VISION_PROFILE_KEYS: VisionProfileKey[] = ['general', 'avatar', 'sticker'];

/** Map a stored image type to the vision profile that should analyze it. */
export function imageTypeToProfile(imageType: ImageType | string | null | undefined): VisionProfileKey {
  switch (imageType) {
    case 'avatar':
      return 'avatar';
    case 'sticker':
      return 'sticker';
    case 'chat':
    case 'general':
    default:
      return 'general';
  }
}

/** Legacy media purpose -> semantic image type mapping. */
export function purposeToImageType(purpose: string | null | undefined): ImageType {
  switch (purpose) {
    case 'avatar':
      return 'avatar';
    case 'sticker':
      return 'sticker';
    case 'attachment':
      return 'chat';
    case 'general':
    default:
      return 'general';
  }
}

export type VisionProfileDefinition = {
  key: VisionProfileKey;
  label: string;
  description: string;
  systemPrompt: string;
  userPrompt: string;
};

/**
 * Built-in system prompts. These ship with the system and are always
 * available; users may override them and the override is persisted to the
 * database. Reset simply drops the override to fall back to these.
 */
export const BUILTIN_VISION_PROFILES: Record<VisionProfileKey, VisionProfileDefinition> = {
  general: {
    key: 'general',
    label: '通用',
    description: '默认图片感知，用于聊天附件与一般上传图片的客观理解。',
    systemPrompt: `你是一个专业的图片感知与理解系统（Vision Interpreter）。
你的任务是客观、准确、精炼地分析图片内容，生成适合提供给其他 AI 角色作为感知上下文的描述。

核心原则：
1. 【客观看见，不扮演角色】：你的职责是“看见”，不要做第一人称角色扮演，不要抒情或代入角色情绪。
2. 【语言自然流畅】：生成的 summary 必须是一份自然、连贯的中文描述，适合直接放入下游语言模型的对话上下文。
3. 【抓住关键，拒绝过度冗长】：突出主要主体、人物/动物、场景、重要关系与可见文字，避免无意义的像素级琐碎描述。
4. 【文字识别】：如果图片包含重要可见文字（如截屏内容、标语、表情包文字、商品名等），在 ocrText 和 summary 中合理体现。
5. 【图片类型】：区分真实照片、截屏、插画、表情包等。`,
    userPrompt: '帮我客观地解析这张图片，说明画面主体、场景与关键细节。',
  },
  avatar: {
    key: 'avatar',
    label: '头像',
    description: '专用于头像图片，提炼身份、外貌与风格特征，便于构建人物设定。',
    systemPrompt: `你是一个头像图片解析系统（Avatar Vision Interpreter）。
你的任务是客观分析一张“头像”图片，提炼可用于构建人物身份与视觉设定的信息。

核心原则：
1. 【聚焦身份特征】：重点描述主体是谁/是什么（真人、卡通、动物、虚拟形象等）、性别气质、年龄感、发型、服饰、配饰、表情与神态。
2. 【风格与调性】：说明整体艺术风格（写实照片、二次元插画、3D 渲染、像素、简笔等）与色彩基调。
3. 【客观不臆测】：不编造无法从画面确认的身份或背景故事，只描述可见特征。
4. 【文字识别】：若头像中含有名字、标识或文字，记录在 ocrText 中。
5. 【简洁可复用】：summary 要凝练，适合直接作为“这个人/角色长什么样”的设定描述。`,
    userPrompt: '这是一张头像图片，请提炼其身份、外貌、表情与视觉风格特征。',
  },
  sticker: {
    key: 'sticker',
    label: '表情包',
    description: '专用于表情包/梗图，解读其传达的情绪、态度与在对话中的使用意图。',
    systemPrompt: `你是一个表情包/梗图解析系统（Sticker Vision Interpreter）。
你的任务是解读一张“表情包”所传达的情绪、态度与在聊天中的使用意图，帮助 AI 角色理解对方发这张表情包想表达什么。

核心原则：
1. 【解读意图而非罗列像素】：重点说明这张表情包传达的情绪/态度（如：无语、开心、卖萌、嘲讽、赞同、崩溃等）以及在对话中通常用来表达什么。
2. 【识别梗与文字】：准确识别表情包上的文字/台词（写入 ocrText），并结合角色形象说明其含义或梗来源（若可辨认）。
3. 【描述主体形象】：简要说明表情包中的角色/主体形象与其夸张的表情动作。
4. 【口语化但客观】：summary 用自然口语描述“对方发这张表情包大概想表达……”，但不要替用户扮演角色。
5. 【氛围判断】：在 mood 中给出情绪基调，imageType 标记为“表情包/梗图”。`,
    userPrompt: '这是一张表情包，请解读它传达的情绪、态度以及在对话中通常表达的含义。',
  },
};

/** User-provided overrides for a profile. Missing fields fall back to built-in. */
export type VisionProfileOverride = {
  systemPrompt?: string | null;
  userPrompt?: string | null;
};

export type VisionProfileOverrides = Partial<Record<VisionProfileKey, VisionProfileOverride>>;

const VISION_PROFILES_KEY = 'ai_vision_profiles';

export const getVisionProfileOverrides = (userId: string) =>
  getSetting<VisionProfileOverrides>(userId, VISION_PROFILES_KEY, {});

export const setVisionProfileOverrides = (userId: string, overrides: VisionProfileOverrides) =>
  setSetting(userId, VISION_PROFILES_KEY, overrides);

export type ResolvedVisionProfile = VisionProfileDefinition & {
  /** true when the effective prompts differ from the built-in defaults */
  isOverridden: boolean;
};

/** Merge built-in profile with a single override object. */
export function mergeVisionProfile(
  key: VisionProfileKey,
  override: VisionProfileOverride | undefined,
): ResolvedVisionProfile {
  const base = BUILTIN_VISION_PROFILES[key];
  const systemPrompt = override?.systemPrompt?.trim() || base.systemPrompt;
  const userPrompt = override?.userPrompt?.trim() || base.userPrompt;
  const isOverridden = systemPrompt !== base.systemPrompt || userPrompt !== base.userPrompt;
  return { ...base, systemPrompt, userPrompt, isOverridden };
}

/** Resolve the effective (built-in merged with user override) profile. */
export async function resolveVisionProfile(
  userId: string,
  key: VisionProfileKey,
): Promise<ResolvedVisionProfile> {
  const overrides = await getVisionProfileOverrides(userId);
  return mergeVisionProfile(key, overrides[key]);
}

/** Resolve every profile at once, for settings UI. */
export async function resolveAllVisionProfiles(userId: string): Promise<ResolvedVisionProfile[]> {
  const overrides = await getVisionProfileOverrides(userId);
  return VISION_PROFILE_KEYS.map((key) => mergeVisionProfile(key, overrides[key]));
}
