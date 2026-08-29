import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { providerConfigs, modelConfigs } from '@/db/schema';

import { PROVIDER_TYPES, PROVIDER_LABELS, type ProviderType } from '@/lib/providers-shared';
export { PROVIDER_TYPES, PROVIDER_LABELS };
export type { ProviderType };

export type ProviderConfigRow = typeof providerConfigs.$inferSelect;

// Cache model instances by provider config revision to avoid rebuilding per call
const modelCache = new Map<string, LanguageModel>();

export function createModelFor(provider: ProviderConfigRow, modelId: string): LanguageModel {
  const cacheKey = `${provider.id}:${provider.updatedAt.getTime()}:${modelId}`;
  const cached = modelCache.get(cacheKey);
  if (cached) return cached;

  let model: LanguageModel;
  switch (provider.providerType as ProviderType) {
    case 'openai': {
      const factory = createOpenAI({ apiKey: provider.apiKey, baseURL: provider.baseUrl ?? undefined });
      model = factory(modelId);
      break;
    }
    case 'anthropic': {
      const factory = createAnthropic({ apiKey: provider.apiKey, baseURL: provider.baseUrl ?? undefined });
      model = factory(modelId);
      break;
    }
    case 'google': {
      const factory = createGoogleGenerativeAI({ apiKey: provider.apiKey, baseURL: provider.baseUrl ?? undefined });
      model = factory(modelId);
      break;
    }
    case 'deepseek': {
      const factory = createDeepSeek({ apiKey: provider.apiKey, baseURL: provider.baseUrl ?? undefined });
      model = factory(modelId);
      break;
    }
    case 'openai-compatible': {
      if (!provider.baseUrl) {
        throw new Error(`Provider「${provider.name}」是自定义类型，必须填写 Base URL`);
      }
      const factory = createOpenAICompatible({
        name: provider.name,
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl,
      });
      model = factory(modelId);
      break;
    }
    default:
      throw new Error(`未知的 Provider 类型: ${provider.providerType}`);
  }

  modelCache.set(cacheKey, model);
  return model;
}

export async function getProviderConfig(userId: string, providerId: string) {
  const [row] = await db
    .select()
    .from(providerConfigs)
    .where(and(eq(providerConfigs.id, providerId), eq(providerConfigs.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function getDefaultProvider(userId: string) {
  const rows = await db
    .select()
    .from(providerConfigs)
    .where(and(eq(providerConfigs.userId, userId), eq(providerConfigs.enabled, true)));
  return rows.find((r) => r.isDefault) ?? rows[0] ?? null;
}

export async function getModelPrice(userId: string, providerId: string, modelId: string) {
  const [row] = await db
    .select()
    .from(modelConfigs)
    .where(
      and(
        eq(modelConfigs.userId, userId),
        eq(modelConfigs.providerId, providerId),
        eq(modelConfigs.modelId, modelId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export type RemoteModel = { id: string; name?: string | null };

/**
 * Fetch available models from a provider's REST API using the same endpoint/auth
 * configuration as the AI SDK factories above. Returns a list of model IDs.
 */
export async function fetchProviderModels(provider: ProviderConfigRow): Promise<RemoteModel[]> {
  const type = provider.providerType as ProviderType;
  let url: string;
  let headers: Record<string, string> = {};

  switch (type) {
    case 'openai': {
      const base = (provider.baseUrl ?? 'https://api.openai.com/v1').replace(/\/+$/, '');
      url = `${base}/models`;
      headers = { Authorization: `Bearer ${provider.apiKey}` };
      break;
    }
    case 'openai-compatible': {
      if (!provider.baseUrl) {
        throw new Error(`Provider「${provider.name}」是自定义类型，必须填写 Base URL`);
      }
      const base = provider.baseUrl.replace(/\/+$/, '');
      url = `${base}/models`;
      headers = { Authorization: `Bearer ${provider.apiKey}` };
      break;
    }
    case 'deepseek': {
      const base = (provider.baseUrl ?? 'https://api.deepseek.com/v1').replace(/\/+$/, '');
      url = `${base}/models`;
      headers = { Authorization: `Bearer ${provider.apiKey}` };
      break;
    }
    case 'anthropic': {
      const base = (provider.baseUrl ?? 'https://api.anthropic.com/v1').replace(/\/+$/, '');
      url = `${base}/models`;
      headers = {
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01',
      };
      break;
    }
    case 'google': {
      const base = (provider.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
      url = `${base}/models?key=${encodeURIComponent(provider.apiKey)}`;
      break;
    }
    default:
      throw new Error(`不支持从「${type}」类型拉取模型列表`);
  }

  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`请求模型列表失败 (${res.status}): ${body || res.statusText}`);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new Error('解析模型列表响应失败：无效的 JSON');
  }

  const data = json as Record<string, unknown>;

  // OpenAI / DeepSeek / OpenAI-compatible: { data: [{ id }] }
  if (Array.isArray(data.data)) {
    return (data.data as { id: string; name?: string | null }[]).map((m) => ({
      id: m.id,
      name: m.name ?? null,
    }));
  }

  // Anthropic: { data: [{ id }] } — same shape
  // Google: { models: [{ name: "models/xxx" }] }
  if (Array.isArray(data.models)) {
    return (data.models as { name: string }[]).map((m) => ({
      id: m.name.replace(/^models\//, ''),
      name: null,
    }));
  }

  throw new Error('无法识别的模型列表响应格式');
}
