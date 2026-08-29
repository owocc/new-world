import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { imagePerceptions, mediaAssets } from '@/db/schema';
import { getModelPrice } from './providers';
import { runVisionObject } from './core';

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
    .optional()
    .describe('场景与环境（如：室内、室外、夜景、街景、办公室、咖啡厅等）'),
  objects: z
    .array(z.string())
    .describe('画面中识别出的关键人物、动物、重要物体列表'),
  details: z
    .array(z.string())
    .optional()
    .describe('重要细节、颜色、相对位置或空间关系（不需要过度琐碎）'),
  ocrText: z
    .string()
    .nullable()
    .optional()
    .describe('画面中清晰可见的重要文字、标牌、字幕或截屏文字（若无文字则为 null）'),
  imageType: z
    .string()
    .optional()
    .describe('图片类型（如：真实照片、插画、截屏、表情包/梗图、漫画、自拍、设计图、文档等）'),
  mood: z
    .string()
    .optional()
    .describe('画面传递的整体氛围或情绪基调（如：温馨、严肃、幽默、阴郁、日常等）'),
});

export type ImagePerceptionData = z.infer<typeof imagePerceptionSchema>;

export type ImagePerceptionRow = typeof imagePerceptions.$inferSelect;

export const VISION_INTERPRETER_SYSTEM_PROMPT = `你是一个专业的图片感知与理解系统（Vision Interpreter）。
你的任务是客观、准确、精炼地分析图片内容，生成适合提供给其他 AI 角色作为感知上下文的描述。

核心原则：
1. 【客观看见，不扮演角色】：你的职责是“看见”，不要做第一人称角色扮演，不要抒情或代入角色情绪。
2. 【语言自然流畅】：生成的 summary 必须是一份自然、连贯的中文描述，适合直接放入下游语言模型的对话上下文。
3. 【抓住关键，拒绝过度冗长】：突出主要主体、人物/动物、场景、重要关系与可见文字，避免无意义的像素级琐碎描述。
4. 【文字识别】：如果图片包含重要可见文字（如截屏内容、标语、表情包文字、商品名等），在 ocrText 和 summary 中合理体现。
5. 【图片类型】：区分真实照片、截屏、插画、表情包等。`;

/**
 * Resolve an image URL into a format usable by Vision APIs.
 * If the URL is private Blob Storage, fetches bytes securely and converts to base64 Data URL.
 */
async function resolveImageForVision(blobUrl: string, mimeType: string): Promise<string> {
  if (blobUrl.startsWith('data:')) {
    return blobUrl;
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token && blobUrl.includes('blob.vercel-storage.com')) {
    try {
      const res = await fetch(blobUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const base64 = Buffer.from(arrayBuf).toString('base64');
        return `data:${mimeType || 'image/jpeg'};base64,${base64}`;
      }
    } catch (err) {
      console.warn('[vision] private blob fetch failed, falling back to direct URL', err);
    }
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
  options?: { force?: boolean },
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

    const result = await runVisionObject({
      userId,
      system: VISION_INTERPRETER_SYSTEM_PROMPT,
      prompt: '请客观分析此图片并生成结构化感知数据及自然语言摘要：',
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
 * Wait briefly for a media perception to finish (e.g. in real-time 1-on-1 chat).
 * Returns the perception if ready within timeoutMs, otherwise returns current state.
 */
export async function waitForMediaPerceptions(
  userId: string,
  mediaAssetIds: string[],
  timeoutMs = 3500,
): Promise<Map<string, ImagePerceptionRow>> {
  if (mediaAssetIds.length === 0) return new Map();
  const startTime = Date.now();
  // Ensure processing has started
  for (const id of mediaAssetIds) {
    processMediaAssetPerception(userId, id).catch((err) => {
      console.error('[vision] async wait trigger error', id, err);
    });
  }

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
    setTimeout(resolve, 250);
    await promise;
  }
  return getMediaPerceptions(mediaAssetIds);
}

/**
 * Format perception summaries into a context string for LLM injection.
 */
export function formatPerceptionNote(
  attachments: { id: string }[],
  perceptionsMap: Map<string, ImagePerceptionRow>,
): string {
  if (!attachments || attachments.length === 0) return '';

  const summaries: string[] = [];
  let pendingCount = 0;

  for (const att of attachments) {
    const perception = perceptionsMap.get(att.id);
    if (perception?.status === 'ready' && perception.summary) {
      summaries.push(perception.summary);
    } else if (perception?.status === 'processing' || perception?.status === 'pending') {
      pendingCount++;
    }
  }

  if (summaries.length > 0) {
    const parts = summaries.map((s, idx) => (summaries.length > 1 ? `[图${idx + 1}内容: ${s}]` : `[图片内容: ${s}]`));
    if (pendingCount > 0) {
      parts.push(`[另有 ${pendingCount} 张图片解析中...]`);
    }
    return parts.join(' ');
  }

  if (pendingCount > 0) {
    return `[发送了 ${attachments.length} 张图片 (解析中...)]`;
  }

  return `[发送了 ${attachments.length} 张图片]`;
}
