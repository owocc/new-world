import { generateImage, type ImageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import {
  computeContentHash,
  createMediaAssetRecord,
  findImageByHash,
  uploadToBlobStorage,
  extractImageDimensions,
} from '@/server/media';
import { getImageGenConfig } from '@/server/settings';
import { getProviderConfig, getDefaultProvider, type ProviderConfigRow } from './providers';
import { recordUsage } from './core';
import { supportsImageGen } from '@/lib/providers-shared';

export { supportsImageGen, IMAGE_MODEL_SUGGESTIONS } from '@/lib/providers-shared';

function createImageModelFor(provider: ProviderConfigRow, modelId: string): ImageModel {
  switch (provider.providerType) {
    case 'openai': {
      const factory = createOpenAI({
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl ?? undefined,
      });
      return factory.imageModel(modelId);
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
      return factory.imageModel(modelId);
    }
    default:
      throw new Error(`服务商类型「${provider.providerType}」暂不支持生图，请使用 OpenAI 或 OpenAI 兼容类型`);
  }
}

export type ResolvedImageModel = {
  enabled: boolean;
  provider: ProviderConfigRow | null;
  modelId: string;
};

/**
 * 解析生图配置：专用配置 -> 用户默认 provider。
 * 未启用或未配置时返回 enabled=false，调用方据此完全跳过生图（不产生任何调用）。
 */
export async function resolveImageModel(userId: string): Promise<ResolvedImageModel> {
  const cfg = await getImageGenConfig(userId);
  if (!cfg.enabled) {
    return { enabled: false, provider: null, modelId: '' };
  }

  let provider: ProviderConfigRow | null = null;
  if (cfg.providerId) {
    provider = await getProviderConfig(userId, cfg.providerId);
  }
  if (!provider) {
    provider = await getDefaultProvider(userId);
  }
  if (!provider || !supportsImageGen(provider.providerType)) {
    return { enabled: false, provider: null, modelId: '' };
  }

  return { enabled: true, provider, modelId: cfg.modelId || 'gpt-image-1' };
}

export type GeneratedImage = {
  id: string | null;
  url: string;
  mimeType: string;
  width: number | null;
  height: number | null;
};

/**
 * 以某个角色（或系统）身份生成一张图片并落库为 media asset。
 * `persist=false` 时仅生成不入库（设置页测试用）。
 */
export async function generateCharacterImage(args: {
  userId: string;
  characterId: string | null;
  prompt: string;
  persist?: boolean;
}): Promise<GeneratedImage> {
  const resolved = await resolveImageModel(args.userId);
  if (!resolved.enabled || !resolved.provider) {
    throw new Error('AI 生图未启用或未配置可用的服务商');
  }

  const start = Date.now();
  try {
    const result = await generateImage({
      model: createImageModelFor(resolved.provider, resolved.modelId),
      prompt: args.prompt,
      maxRetries: 1,
    });

    const mimeType = result.image.mediaType || 'image/png';
    const buffer = Buffer.from(result.image.uint8Array);
    const { width, height } = extractImageDimensions(buffer, mimeType);
    const usageData = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cachedInputTokens: 0,
      reasoningTokens: 0,
      success: true,
      durationMs: Date.now() - start,
    };
    await recordUsage({
      userId: args.userId,
      characterId: args.characterId,
      callType: 'image_generation',
      resolved: {
        provider: resolved.provider,
        modelId: resolved.modelId,
        supportsVision: false,
        temperature: null,
        topP: null,
        maxTokens: null,
      },
      usage: usageData,
    }).catch(console.error);

    if (args.persist === false) {
      const url =
        buffer.length < 2 * 1024 * 1024
          ? `data:${mimeType};base64,${buffer.toString('base64')}`
          : URL.createObjectURL(new Blob([new Uint8Array(buffer)], { type: mimeType }));
      return { id: null, url, mimeType, width, height };
    }

    const hash = computeContentHash(buffer);
    const dedupe = await findImageByHash(args.userId, hash, 'general');
    if (dedupe) {
      return {
        id: dedupe.id,
        url: dedupe.downloadUrl || dedupe.blobUrl,
        mimeType: dedupe.mimeType,
        width: dedupe.width,
        height: dedupe.height,
      };
    }

    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png';
    const uploaded = await uploadToBlobStorage({
      pathname: `users/${args.userId}/generated/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`,
      buffer,
      contentType: mimeType,
    });
    const asset = await createMediaAssetRecord({
      userId: args.userId,
      mediaType: 'image',
      blobUrl: uploaded.url,
      pathname: uploaded.pathname,
      downloadUrl: uploaded.downloadUrl,
      mimeType,
      fileSize: buffer.length,
      originalFilename: `ai-generated.${ext}`,
      width,
      height,
      purpose: 'general',
      status: 'ready',
      contentHash: hash,
      imageType: 'general',
    });

    return {
      id: asset.id,
      url: asset.downloadUrl || asset.blobUrl,
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
    };
  } catch (err) {
    await recordUsage({
      userId: args.userId,
      characterId: args.characterId,
      callType: 'image_generation',
      resolved: {
        provider: resolved.provider,
        modelId: resolved.modelId,
        supportsVision: false,
        temperature: null,
        topP: null,
        maxTokens: null,
      },
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cachedInputTokens: 0,
        reasoningTokens: 0,
        success: false,
        errorMessage: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
      },
    }).catch(console.error);
    throw err;
  }
}
