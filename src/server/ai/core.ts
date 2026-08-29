import { generateText, generateObject, streamText, type LanguageModelUsage, type ModelMessage } from 'ai';
import type { z } from 'zod';
import { db } from '@/db';
import { aiCharacters, aiUsage } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  createModelFor,
  getProviderConfig,
  getDefaultProvider,
  getModelPrice,
  type ProviderConfigRow,
} from './providers';
import { getDefaultAIConfig } from '@/server/settings';

export type CallType =
  | 'chat'
  | 'post_generation'
  | 'comment'
  | 'reply'
  | 'reaction_decision'
  | 'memory'
  | 'summary'
  | 'system'
  | 'group_message'
  | 'group_attention'
  | 'group_decision'
  | 'group_digest'
  | 'group_reply'
  | 'group_reaction';

export type ResolvedModel = {
  provider: ProviderConfigRow;
  modelId: string;
  temperature: number | null;
  topP: number | null;
  maxTokens: number | null;
};

/**
 * Resolve which provider/model a call should use:
 * character override -> user default -> error.
 */
export async function resolveModel(
  userId: string,
  characterId?: string | null,
): Promise<ResolvedModel> {
  const defaults = await getDefaultAIConfig(userId);

  let character: {
    providerId: string | null;
    modelId: string | null;
    temperature: number | null;
    topP: number | null;
    maxTokens: number | null;
  } | null = null;
  if (characterId) {
    const [row] = await db
      .select({
        providerId: aiCharacters.providerId,
        modelId: aiCharacters.modelId,
        temperature: aiCharacters.temperature,
        topP: aiCharacters.topP,
        maxTokens: aiCharacters.maxTokens,
      })
      .from(aiCharacters)
      .where(eq(aiCharacters.id, characterId))
      .limit(1);
    character = row ?? null;
  }

  const providerId = character?.providerId ?? defaults.providerId ?? null;
  const modelId = character?.modelId ?? defaults.modelId ?? null;

  let provider: ProviderConfigRow | null = null;
  if (providerId) {
    provider = await getProviderConfig(userId, providerId);
  }
  if (!provider) {
    provider = await getDefaultProvider(userId);
  }
  if (!provider) {
    throw new NoProviderError();
  }

  return {
    provider,
    modelId: modelId ?? 'gpt-4o-mini',
    temperature: character?.temperature ?? defaults.temperature ?? null,
    topP: character?.topP ?? defaults.topP ?? null,
    maxTokens: character?.maxTokens ?? defaults.maxTokens ?? null,
  };
}export class NoProviderError extends Error {
  constructor() {
    super('尚未配置 AI Provider。请先在「设置 → AI Providers」中添加并启用一个 Provider。');
    this.name = 'NoProviderError';
  }
}

export function extractUsage(usage: LanguageModelUsage | undefined) {
  const u = usage as Record<string, unknown> | undefined;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return {
    inputTokens: num(u?.inputTokens),
    outputTokens: num(u?.outputTokens),
    totalTokens: num(u?.totalTokens) || num(u?.inputTokens) + num(u?.outputTokens),
    cachedInputTokens: num(u?.cachedInputTokens),
    reasoningTokens: num(u?.reasoningTokens),
  };
}

type UsageRecord = ReturnType<typeof extractUsage> & {
  success: boolean;
  errorMessage?: string;
  durationMs: number;
};

async function recordUsage(args: {
  userId: string;
  characterId: string | null;
  callType: CallType;
  resolved: ResolvedModel;
  usage: UsageRecord;
}): Promise<string> {
  const price = await getModelPrice(args.userId, args.resolved.provider.id, args.resolved.modelId);
  const costUsd = price
    ? (args.usage.inputTokens / 1_000_000) * price.inputPricePerMTok +
      (args.usage.outputTokens / 1_000_000) * price.outputPricePerMTok
    : null;

  const id = crypto.randomUUID();
  await db.insert(aiUsage).values({
    id,
    userId: args.userId,
    characterId: args.characterId,
    callType: args.callType,
    providerType: args.resolved.provider.providerType,
    model: args.resolved.modelId,
    inputTokens: args.usage.inputTokens,
    outputTokens: args.usage.outputTokens,
    totalTokens: args.usage.totalTokens,
    cachedInputTokens: args.usage.cachedInputTokens,
    reasoningTokens: args.usage.reasoningTokens,
    costUsd,
    durationMs: args.usage.durationMs,
    success: args.usage.success,
    errorMessage: args.usage.errorMessage,
  });
  return id;
}

export type RunTextOptions = {
  userId: string;
  characterId?: string | null;
  callType: CallType;
  system: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
};

/** Single entry point for one-shot text generation with usage tracking. */
export async function runText(opts: RunTextOptions): Promise<string> {
  const resolved = await resolveModel(opts.userId, opts.characterId);
  const start = Date.now();
  try {
    const result = await generateText({
      model: createModelFor(resolved.provider, resolved.modelId),
      system: opts.system,
      prompt: opts.prompt,
      temperature: opts.temperature ?? resolved.temperature ?? undefined,
      maxOutputTokens: opts.maxOutputTokens ?? resolved.maxTokens ?? undefined,
    });
    await recordUsage({
      userId: opts.userId,
      characterId: opts.characterId ?? null,
      callType: opts.callType,
      resolved,
      usage: { ...extractUsage(result.usage), success: true, durationMs: Date.now() - start },
    });
    return result.text;
  } catch (err) {
    await recordUsage({
      userId: opts.userId,
      characterId: opts.characterId ?? null,
      callType: opts.callType,
      resolved,
      usage: {
        ...extractUsage(undefined),
        success: false,
        errorMessage: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
      },
    });
    throw err;
  }
}

/** One-shot structured (JSON) generation with usage tracking. */
export async function runObject<T extends z.ZodType>(opts: {
  userId: string;
  characterId?: string | null;
  callType: CallType;
  system: string;
  prompt: string;
  schema: T;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<z.infer<T>> {
  const resolved = await resolveModel(opts.userId, opts.characterId);
  const start = Date.now();
  try {
    const result = await generateObject({
      model: createModelFor(resolved.provider, resolved.modelId),
      system: opts.system,
      prompt: opts.prompt,
      schema: opts.schema,
      temperature: opts.temperature ?? resolved.temperature ?? undefined,
      maxOutputTokens: opts.maxOutputTokens ?? resolved.maxTokens ?? undefined,
    });
    await recordUsage({
      userId: opts.userId,
      characterId: opts.characterId ?? null,
      callType: opts.callType,
      resolved,
      usage: { ...extractUsage(result.usage), success: true, durationMs: Date.now() - start },
    });
    return result.object as z.infer<T>;
  } catch (err) {
    await recordUsage({
      userId: opts.userId,
      characterId: opts.characterId ?? null,
      callType: opts.callType,
      resolved,
      usage: {
        ...extractUsage(undefined),
        success: false,
        errorMessage: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
      },
    });
    throw err;
  }
}

/** Streaming generation for chat; usage is recorded on finish. */
export async function runStream(opts: RunTextOptions & {
  messages: ModelMessage[];
  onFinish?: (text: string) => void | Promise<void>;
}) {
  const resolved = await resolveModel(opts.userId, opts.characterId);
  const start = Date.now();
  const result = streamText({
    model: createModelFor(resolved.provider, resolved.modelId),
    system: opts.system,
    messages: opts.messages,
    temperature: opts.temperature ?? resolved.temperature ?? undefined,
    maxOutputTokens: opts.maxOutputTokens ?? resolved.maxTokens ?? undefined,
    onError: ({ error }) => {
      console.error('[ai] stream error', error);
    },
    onFinish: async ({ usage, text }) => {
      await recordUsage({
        userId: opts.userId,
        characterId: opts.characterId ?? null,
        callType: opts.callType,
        resolved,
        usage: { ...extractUsage(usage), success: true, durationMs: Date.now() - start },
      }).catch(console.error);
      await opts.onFinish?.(text);
    },
  });
  return result;
}

/** Check whether a user has any usable provider configured. */
export async function hasProvider(userId: string) {
  const defaults = await getDefaultAIConfig(userId);
  if (defaults.providerId) {
    const p = await getProviderConfig(userId, defaults.providerId);
    if (p?.enabled) return true;
  }
  const def = await getDefaultProvider(userId);
  return !!def;
}
