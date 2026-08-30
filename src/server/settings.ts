import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { appSettings } from '@/db/schema';

export type DefaultAIConfig = {
  providerId: string | null;
  modelId: string | null;
  temperature: number | null;
  topP: number | null;
  maxTokens: number | null;
};

export type VisionConfig = {
  /** Master switch for dedicated vision interpreter */
  enabled: boolean;
  providerId: string | null;
  modelId: string | null;
  prompt?: string | null;
  temperature: number | null;
  maxTokens: number | null;
};

export const DEFAULT_VISION_CONFIG: VisionConfig = {
  enabled: true,
  providerId: null,
  modelId: null,
  prompt: '帮我解析这个图片',
  temperature: 0.2,
  maxTokens: 800,
};

export type DeveloperConfig = {
  /** Master switch for developer tools & context inspector */
  enabled: boolean;
  /** Show raw system prompts */
  showRawPrompts?: boolean;
  /** Show token stats in inspector */
  showTokenStats?: boolean;
};
export const DEFAULT_DEVELOPER_CONFIG: DeveloperConfig = {
  enabled: false,
  showRawPrompts: true,
  showTokenStats: true,
};

export type ImageGenConfig = {
  /** Master switch for AI image generation（关闭后 AI 完全不会调用生图） */
  enabled: boolean;
  providerId: string | null;
  modelId: string | null;
};

export const DEFAULT_IMAGE_GEN_CONFIG: ImageGenConfig = {
  enabled: false,
  providerId: null,
  modelId: null,
};

export type CommunityConfig = {
  /** master switch for autonomous AI behavior */
  enabled: boolean;
  /** min minutes between opportunistic community pulses */
  pulseIntervalMinutes: number;
  /** max AI actors responding to a single user post */
  maxActorsPerPost: number;
  /** probability (0..1) an AI-to-AI reply chain spawns from a comment */
  aiReplyChainRate: number;
  /** max AI autonomous posts per pulse */
  maxPostsPerPulse: number;
};

export const DEFAULT_COMMUNITY_CONFIG: CommunityConfig = {
  enabled: true,
  pulseIntervalMinutes: 20,
  maxActorsPerPost: 3,
  aiReplyChainRate: 0.35,
  maxPostsPerPulse: 1,
};

export async function getSetting<T>(userId: string, key: string, fallback: T): Promise<T> {
  const [row] = await db
    .select()
    .from(appSettings)
    .where(and(eq(appSettings.userId, userId), eq(appSettings.key, key)))
    .limit(1);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export async function setSetting(userId: string, key: string, value: unknown) {
  const serialized = JSON.stringify(value);
  await db
    .insert(appSettings)
    .values({ id: crypto.randomUUID(), userId, key, value: serialized })
    .onConflictDoUpdate({
      target: [appSettings.userId, appSettings.key],
      set: { value: serialized, updatedAt: new Date() },
    });
}

export const getDefaultAIConfig = (userId: string) =>
  getSetting<DefaultAIConfig>(userId, 'ai_default', {
    providerId: null,
    modelId: null,
    temperature: 0.8,
    topP: null,
    maxTokens: null,
  });

export const getCommunityConfig = (userId: string) =>
  getSetting<CommunityConfig>(userId, 'community', DEFAULT_COMMUNITY_CONFIG);

export const getFeedCover = (userId: string) =>
  getSetting<string | null>(userId, 'feed_cover_url', null);

export const setFeedCover = (userId: string, coverUrl: string | null) =>
  setSetting(userId, 'feed_cover_url', coverUrl);

export const getVisionConfig = (userId: string) =>
  getSetting<VisionConfig>(userId, 'ai_vision', DEFAULT_VISION_CONFIG);

export const setVisionConfig = (userId: string, config: VisionConfig) =>
  setSetting(userId, 'ai_vision', config);

export const getImageGenConfig = (userId: string) =>
  getSetting<ImageGenConfig>(userId, 'ai_image_gen', DEFAULT_IMAGE_GEN_CONFIG);

export const setImageGenConfig = (userId: string, config: ImageGenConfig) =>
  setSetting(userId, 'ai_image_gen', config);

export const getDeveloperConfig = (userId: string) =>
  getSetting<DeveloperConfig>(userId, 'developer_config', DEFAULT_DEVELOPER_CONFIG);

export const setDeveloperConfig = (userId: string, config: DeveloperConfig) =>
  setSetting(userId, 'developer_config', config);

export type NotificationPrefs = {
  /** 浏览器通知总开关（需同时授予浏览器通知权限） */
  pushEnabled: boolean;
  /** 私信 / 聊天消息通知 */
  dm: boolean;
  /** 朋友圈点赞通知 */
  like: boolean;
  /** 评论通知 */
  comment: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  pushEnabled: false,
  dm: true,
  like: true,
  comment: true,
};

export const getNotificationPrefs = (userId: string) =>
  getSetting<NotificationPrefs>(userId, 'notification_prefs', DEFAULT_NOTIFICATION_PREFS);

export const setNotificationPrefs = (userId: string, prefs: NotificationPrefs) =>
  setSetting(userId, 'notification_prefs', prefs);
