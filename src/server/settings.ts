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
