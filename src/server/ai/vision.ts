import { and, eq, inArray } from 'drizzle-orm';
import { get } from '@vercel/blob';
import sharp from 'sharp';
import { z } from 'zod';
import { db } from '@/db';
import { imagePerceptions, mediaAssets } from '@/db/schema';
import { runVisionObject } from './core';
import { getModelPrice } from './providers';
import {
  BUILTIN_VISION_PROFILES,
  imageTypeToProfile,
  resolveVisionProfile,
  type VisionProfileKey,
} from './vision-profiles';

/**
 * Structured Image Perception schema for Vision Interpreter.
 * Objective, concise, natural language summary + structured perception.
 */
export const imagePerceptionSchema = z.object({
  summary: z
    .string()
    .describe('客观、自然、连贯的自然语言描述（1-3句话），适合直接作为下游语言模型的上下文。例如：“这是一张室内照片。画面中有一只橘猫趴在白色窗台上，窗外正在下雨。桌面上放着一杯咖啡和一本打开的书。”'),
  mainContent: z
    .string()
    .describe('画面的核心主体与主要内容，简明扼要'),
  scene: z
    .string()
    .nullable()
    .describe('场景与环境（如：室内、室外、夜景、街景、办公室、咖啡厅等，若无则为 null）'),
  objects: z
    .array(z.string())
    .describe('画面中识别出的关键人物、动物、重要物体列表'),
  details: z
    .array(z.string())
    .nullable()
    .describe('重要细节、颜色、相对位置或空间关系（不需要过度琐碎，若无则为 null）'),
  ocrText: z
    .string()
    .nullable()
    .describe('画面中清晰可见的重要文字、标牌、字幕或截屏文字（若无文字则为 null）'),
  imageType: z
    .string()
    .nullable()
    .describe('图片类型（如：真实照片、插画、截屏、表情包/梗图、漫画、自拍、设计图、文档等，若无则为 null）'),
  mood: z
    .string()
    .nullable()
    .describe('画面传递的整体氛围或情绪基调（如：温馨、严肃、幽默、阴郁、日常等，若无则为 null）'),
});
export type ImagePerceptionData = z.infer<typeof imagePerceptionSchema>;

export type ImagePerceptionRow = typeof imagePerceptions.$inferSelect;

/**
 * Backward-compatible export of the general profile's system prompt.
 * The canonical, per-profile prompts now live in vision-profiles.ts.
 */
export const VISION_INTERPRETER_SYSTEM_PROMPT = BUILTIN_VISION_PROFILES.general.systemPrompt;

/**
 * Compress and resize an image buffer for optimal AI vision inference.
 * Downscales large images to max 1280px on the longest side and converts to JPEG (quality 80)
 * to significantly reduce payload size, token consumption, and network transfer time.
 */
export async function compressImageBufferForVision(inputBuffer: Buffer): Promise<{ buffer: Buffer; mimeType: string }> {
  try {
    const pipeline = sharp(inputBuffer, { failOn: 'none' });
    const metadata = await pipeline.metadata();
    const maxDimension = 1280;
    let resizeNeeded = false;
    let width = metadata.width;
    let height = metadata.height;

    if (width && height && (width > maxDimension || height > maxDimension)) {
      resizeNeeded = true;
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    let transformer = pipeline.rotate(); // auto-orient based on EXIF
    if (resizeNeeded && width && height) {
      transformer = transformer.resize(width, height, { fit: 'inside', withoutEnlargement: true });
    }

    // Convert to compressed jpeg for AI vision
    const outputBuffer = await transformer.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    return { buffer: outputBuffer, mimeType: 'image/jpeg' };
  } catch (err) {
    console.warn('[vision] image compression via sharp failed, falling back to original bytes', err);
    return { buffer: inputBuffer, mimeType: 'image/jpeg' };
  }
}

/**
 * Resolve an image URL into a compressed data URL suitable for Vision APIs.
 * Fetches or decodes bytes, compresses/resizes them, and returns a lightweight base64 Data URL.
 */
async function resolveImageForVision(blobUrl: string, mimeType: string): Promise<string> {
  let rawBuffer: Buffer | null = null;
  let detectedMime = mimeType || 'image/jpeg';

  if (blobUrl.startsWith('data:')) {
    const commaIndex = blobUrl.indexOf(',');
    if (commaIndex !== -1) {
      const header = blobUrl.slice(0, commaIndex);
      const base64Data = blobUrl.slice(commaIndex + 1);
      const mimeMatch = header.match(/data:([^;]+)/);
      if (mimeMatch) detectedMime = mimeMatch[1];
      rawBuffer = Buffer.from(base64Data, 'base64');
    }
  }

  if (!rawBuffer) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token && blobUrl.includes('blob.vercel-storage.com')) {
      try {
        const blobResponse = await get(blobUrl, {
          access: 'private',
          token,
        });
        if (blobResponse && blobResponse.stream) {
          const stream = blobResponse.stream;
          const reader = stream.getReader();
          const chunks: Uint8Array[] = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
          }
          rawBuffer = Buffer.concat(chunks);
          detectedMime = blobResponse.blob?.contentType || detectedMime;
        }
      } catch (err) {
        console.warn('[vision] @vercel/blob get failed, trying fallback fetch', err);
      }
    }
  }

  // Fallback direct fetch if not data: or @vercel/blob
  if (!rawBuffer) {
    try {
      const res = await fetch(blobUrl);
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        rawBuffer = Buffer.from(arrayBuf);
        detectedMime = res.headers.get('content-type') || detectedMime;
      }
    } catch (err) {
      console.warn('[vision] direct fetch of image url failed', blobUrl, err);
    }
  }

  if (rawBuffer) {
    const compressed = await compressImageBufferForVision(rawBuffer);
    const base64 = compressed.buffer.toString('base64');
    return `data:${compressed.mimeType};base64,${base64}`;
  }

  return blobUrl;
}

/**
 * Process single media asset for perception generation.
 * Avoids duplicate calls if already processed or in-flight.
 */
export async function processMediaAssetPerception(
  userId: string,
  mediaAssetId: string,
  options?: {
    force?: boolean;
    /** Override the profile inferred from the asset's imageType */
    profileKey?: VisionProfileKey;
    /** Override the system prompt (developer re-run) */
    systemPrompt?: string | null;
    /** Override the user/instruction prompt (developer re-run) */
    prompt?: string | null;
  },
): Promise<ImagePerceptionRow | null> {
  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.id, mediaAssetId), eq(mediaAssets.userId, userId)))
    .limit(1);

  if (!asset || asset.mediaType !== 'image') {
    return null;
  }

  const [existing] = await db
    .select()
    .from(imagePerceptions)
    .where(eq(imagePerceptions.mediaAssetId, mediaAssetId))
    .limit(1);

  if (existing && !options?.force) {
    if (existing.status === 'ready') {
      return existing;
    }
    // If currently processing and started less than 45 seconds ago, do not duplicate
    if (existing.status === 'processing' && Date.now() - new Date(existing.updatedAt).getTime() < 45000) {
      return existing;
    }
  }

  const now = new Date();
  const perceptionId = existing?.id ?? crypto.randomUUID();

  // Mark as processing
  if (existing) {
    await db
      .update(imagePerceptions)
      .set({
        status: 'processing',
        errorMessage: null,
        updatedAt: now,
      })
      .where(eq(imagePerceptions.id, existing.id));
  } else {
    await db.insert(imagePerceptions).values({
      id: perceptionId,
      mediaAssetId,
      userId,
      status: 'processing',
      createdAt: now,
      updatedAt: now,
    });
  }

  try {
    const imageUrl = await resolveImageForVision(asset.blobUrl, asset.mimeType);

    const profileKey = options?.profileKey ?? imageTypeToProfile(asset.imageType);
    const profile = await resolveVisionProfile(userId, profileKey);
    const systemPrompt = options?.systemPrompt?.trim() || profile.systemPrompt;
    const userPrompt = options?.prompt?.trim() || profile.userPrompt;

    const result = await runVisionObject({
      userId,
      system: systemPrompt,
      prompt: userPrompt,
      imageUrl,
      schema: imagePerceptionSchema,
      temperature: 0.2,
      maxOutputTokens: 800,
    });

    const price = await getModelPrice(userId, result.resolved.provider.id, result.resolved.modelId);
    const costUsd = price
      ? (result.usage.inputTokens / 1_000_000) * price.inputPricePerMTok +
        (result.usage.outputTokens / 1_000_000) * price.outputPricePerMTok
      : null;

    const [updated] = await db
      .update(imagePerceptions)
      .set({
        status: 'ready',
        providerType: result.resolved.provider.providerType,
        model: result.resolved.modelId,
        profile: profileKey,
        systemPromptUsed: systemPrompt,
        promptUsed: userPrompt,
        editedByUser: false,
        summary: result.object.summary,
        perception: JSON.stringify(result.object),
        ocrText: result.object.ocrText || null,
        usageId: result.usageId,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
        costUsd,
        durationMs: result.usage.durationMs,
        analyzedAt: new Date(),
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(imagePerceptions.id, perceptionId))
      .returning();

    return updated ?? null;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[vision] image perception failed for asset', mediaAssetId, errorMessage);

    const [failed] = await db
      .update(imagePerceptions)
      .set({
        status: 'failed',
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(imagePerceptions.id, perceptionId))
      .returning();

    return failed ?? null;
  }
}

/**
 * Trigger background / asynchronous perceptions for a list of media assets.
 * Non-blocking fire-and-forget.
 */
export function scheduleMediaPerceptions(userId: string, mediaAssetIds: string[]): void {
  if (mediaAssetIds.length === 0) return;
  // Non-blocking async queue
  Promise.resolve().then(async () => {
    for (const id of mediaAssetIds) {
      await processMediaAssetPerception(userId, id).catch((err) => {
        console.error('[vision] background perception error for asset', id, err);
      });
    }
  });
}

/**
 * Fetch perception record for a single media asset.
 */
export async function getMediaPerception(mediaAssetId: string): Promise<ImagePerceptionRow | null> {
  const [row] = await db
    .select()
    .from(imagePerceptions)
    .where(eq(imagePerceptions.mediaAssetId, mediaAssetId))
    .limit(1);
  return row ?? null;
}

/**
 * Fetch perceptions for multiple media asset IDs.
 */
export async function getMediaPerceptions(mediaAssetIds: string[]): Promise<Map<string, ImagePerceptionRow>> {
  if (mediaAssetIds.length === 0) return new Map();

  const rows = await db
    .select()
    .from(imagePerceptions)
    .where(inArray(imagePerceptions.mediaAssetId, mediaAssetIds));

  return new Map(rows.map((r) => [r.mediaAssetId, r]));
}

/**
 * Wait for media perceptions to finish (in real-time 1-on-1 chat or group attention).
 * Directly awaits all in-flight or new perception jobs, ensuring the chat model
 * receives the fully parsed image descriptions before responding.
 */
export async function waitForMediaPerceptions(
  userId: string,
  mediaAssetIds: string[],
  timeoutMs = 25000,
): Promise<Map<string, ImagePerceptionRow>> {
  if (mediaAssetIds.length === 0) return new Map();
  const startTime = Date.now();

  // Launch/await perception processing jobs concurrently
  const promises = mediaAssetIds.map((id) => processMediaAssetPerception(userId, id));
  await Promise.allSettled(promises);

  while (Date.now() - startTime < timeoutMs) {
    const current = await getMediaPerceptions(mediaAssetIds);
    const allSettled = mediaAssetIds.every((id) => {
      const p = current.get(id);
      return p && (p.status === 'ready' || p.status === 'failed');
    });

    if (allSettled) {
      return current;
    }

    const { promise, resolve } = Promise.withResolvers<void>();
    setTimeout(resolve, 300);
    await promise;
  }
  return getMediaPerceptions(mediaAssetIds);
}

/**
 * Format image attachments into a clear, structured prompt block for LLM chat context.
 * Strictly queries perception by mediaAssetId and builds:
 * ### 附件 - 图片
 * - 画面内容：...
 * - 场景环境：...
 * - 画面细节：...
 * - 可见文字：...
 */
export function formatAttachmentPromptBlock(
  attachments: Array<{
    id: string;
    originalFilename?: string | null;
    perception?: {
      status: string;
      summary?: string | null;
      perception?: string | null;
      ocrText?: string | null;
    } | null;
  }>,
): string {
  if (!attachments || attachments.length === 0) return '';

  const blocks: string[] = [];

  for (let i = 0; i < attachments.length; i++) {
    const att = attachments[i];
    const headerTitle = attachments.length > 1 ? `### 附件 - 图片 ${i + 1}` : `### 附件 - 图片`;

    if (att.perception?.status === 'ready' && att.perception.summary) {
      const lines: string[] = [headerTitle];
      lines.push(`- 画面内容：${att.perception.summary}`);

      if (att.perception.perception) {
        try {
          const parsed = JSON.parse(att.perception.perception);
          if (parsed.scene) {
            lines.push(`- 场景环境：${parsed.scene}`);
          }
          if (parsed.details && Array.isArray(parsed.details) && parsed.details.length > 0) {
            lines.push(`- 画面细节：${parsed.details.join('；')}`);
          }
          if (parsed.ocrText) {
            lines.push(`- 可见文字：${parsed.ocrText}`);
          }
        } catch {
          // ignore
        }
      } else if (att.perception.ocrText) {
        lines.push(`- 可见文字：${att.perception.ocrText}`);
      }

      blocks.push(lines.join('\n'));
    } else if (att.perception?.status === 'processing' || att.perception?.status === 'pending') {
      blocks.push(`${headerTitle} (解析中)\n- 状态：正在进行视觉识别与解析中...`);
    } else {
      const fname = att.originalFilename ? ` (${att.originalFilename})` : '';
      blocks.push(`${headerTitle}${fname}\n- 状态：用户发送了图片，暂无详细视觉描述`);
    }
  }

  return blocks.join('\n\n');
}

/**
 * Format perception summaries into a context string for LLM injection.
 */
export function formatPerceptionNote(
  attachments: Array<{
    id: string;
    originalFilename?: string | null;
    perception?: {
      status: string;
      summary?: string | null;
      perception?: string | null;
      ocrText?: string | null;
    } | null;
  }>,
  perceptionsMap?: Map<string, ImagePerceptionRow>,
): string {
  if (!attachments || attachments.length === 0) return '';

  // If perceptionsMap is provided, map it to the attachment perceptions
  const enriched = attachments.map((att) => {
    const p = perceptionsMap?.get(att.id);
    if (p) {
      return {
        ...att,
        perception: {
          status: p.status,
          summary: p.summary,
          perception: p.perception,
          ocrText: p.ocrText,
        },
      };
    }
    return att;
  });

  return formatAttachmentPromptBlock(enriched);
}
