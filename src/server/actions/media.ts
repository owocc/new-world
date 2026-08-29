'use server';

import { revalidatePath } from 'next/cache';
import { requireUserId } from '@/lib/session';
import {
  cleanupOrphanMedia,
  deleteMediaAsset,
  uploadCharacterAvatar,
  uploadFeedCover,
  uploadUserAvatar,
} from '@/server/media';
import { db } from '@/db';
import { aiCharacters, user, imagePerceptions, mediaAssets } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { processMediaAssetPerception } from '@/server/ai/vision';
import type { VisionProfileKey } from '@/server/ai/vision-profiles';
/**
 * Server Action: Upload and save avatar for the current logged-in user.
 */
export async function uploadUserAvatarAction(formData: FormData) {
  const userId = await requireUserId();
  const file = formData.get('file') as File | null;

  if (!file) {
    return { ok: false, error: '请选择要上传的图片' };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const res = await uploadUserAvatar({
    userId,
    buffer,
    originalFilename: file.name || 'avatar.jpg',
    mimeType: file.type,
  });

  if (res.ok) {
    revalidatePath('/settings/account');
    revalidatePath('/feed');
  }

  return res;
}

/**
 * Server Action: Upload and save avatar for a specific AI character.
 */
export async function uploadCharacterAvatarAction(characterId: string, formData: FormData) {
  const userId = await requireUserId();
  const file = formData.get('file') as File | null;

  if (!file) {
    return { ok: false, error: '请选择要上传的图片' };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const res = await uploadCharacterAvatar({
    userId,
    characterId,
    buffer,
    originalFilename: file.name || 'avatar.jpg',
    mimeType: file.type,
  });

  if (res.ok) {
    revalidatePath('/characters');
    revalidatePath(`/characters/${characterId}`);
    revalidatePath('/messages');
    revalidatePath('/groups');
  }

  return res;
}

/**
 * Server Action: Delete a media asset.
 */
export async function deleteMediaAssetAction(mediaAssetId: string) {
  const userId = await requireUserId();
  const success = await deleteMediaAsset(userId, mediaAssetId);
  return { ok: success };
}

/**
 * Server Action: Clean up unreferenced/orphan Blobs and pending media.
 */
export async function cleanupOrphanMediaAction() {
  await requireUserId();
  const res = await cleanupOrphanMedia(60);
  return { ok: true, cleanedCount: res.cleanedCount };
}

/**
 * Update user avatar URL directly (e.g. from uploaded media asset URL)
 */
export async function updateUserImageUrlAction(imageUrl: string | null) {
  const userId = await requireUserId();
  await db
    .update(user)
    .set({ image: imageUrl, updatedAt: new Date() })
    .where(eq(user.id, userId));

  revalidatePath('/settings/account');
  revalidatePath('/feed');
  return { ok: true };
}

/**
 * Update character avatar URL directly
 */
export async function updateCharacterAvatarUrlAction(characterId: string, avatarUrl: string | null) {
  const userId = await requireUserId();
  await db
    .update(aiCharacters)
    .set({ avatarUrl, updatedAt: new Date() })
    .where(and(eq(aiCharacters.id, characterId), eq(aiCharacters.userId, userId)));

  revalidatePath('/characters');
  revalidatePath(`/characters/${characterId}`);
  return { ok: true };
}

/**
 * Server Action: Upload and save Moments / Feed background cover image.
 */
export async function uploadFeedCoverAction(
  formData: FormData,
): Promise<{ ok: true; coverUrl: string; assetId: string } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const file = formData.get('file') as File | null;

  if (!file) {
    return { ok: false, error: '请选择要上传的背景图片' };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const res = await uploadFeedCover({
    userId,
    buffer,
    originalFilename: file.name || 'cover.jpg',
    mimeType: file.type || 'image/jpeg',
  });

  if (res.ok) {
    revalidatePath('/feed');
  }

  return res;
}

/**
 * Server Action: Re-analyze image perception on-demand for a media asset.
 * Developer mode may override the profile and/or prompts to regenerate the
 * description with different instructions.
 */
export async function reanalyzeMediaPerceptionAction(
  mediaAssetId: string,
  overrides?: {
    profileKey?: VisionProfileKey;
    systemPrompt?: string | null;
    prompt?: string | null;
  },
) {
  const userId = await requireUserId();
  const perception = await processMediaAssetPerception(userId, mediaAssetId, {
    force: true,
    profileKey: overrides?.profileKey,
    systemPrompt: overrides?.systemPrompt,
    prompt: overrides?.prompt,
  });

  if (!perception) {
    return { ok: false, error: '图片不存在或不可解析' };
  }
  if (perception.status !== 'ready') {
    return { ok: false, error: perception.errorMessage || 'AI 重新解析失败', perception };
  }
  return { ok: true, perception };
}

export type MediaPerceptionDetail = {
  asset: {
    id: string;
    contentHash: string | null;
    imageType: string;
    purpose: string;
    mimeType: string;
    fileSize: number;
    originalFilename: string | null;
    blobUrl: string;
  };
  perception: {
    id: string | null;
    status: string;
    profile: string | null;
    systemPromptUsed: string | null;
    promptUsed: string | null;
    editedByUser: boolean;
    summary: string | null;
    perception: string | null;
    ocrText: string | null;
    model: string | null;
    providerType: string | null;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUsd: number | null;
    durationMs: number;
    errorMessage: string | null;
    analyzedAt: Date | null;
  } | null;
};

/**
 * Server Action: Fetch the full perception context for a single image, used by
 * the developer-mode image inspector. Returns the asset identity (hash, type)
 * and the complete perception record (profile, prompts, output, usage).
 */
export async function getMediaPerceptionDetailAction(
  mediaAssetId: string,
): Promise<{ ok: true; detail: MediaPerceptionDetail } | { ok: false; error: string }> {
  const userId = await requireUserId();

  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.id, mediaAssetId), eq(mediaAssets.userId, userId)))
    .limit(1);

  if (!asset) {
    return { ok: false, error: '图片不存在' };
  }

  const [perception] = await db
    .select()
    .from(imagePerceptions)
    .where(eq(imagePerceptions.mediaAssetId, mediaAssetId))
    .limit(1);

  return {
    ok: true,
    detail: {
      asset: {
        id: asset.id,
        contentHash: asset.contentHash,
        imageType: asset.imageType,
        purpose: asset.purpose,
        mimeType: asset.mimeType,
        fileSize: asset.fileSize,
        originalFilename: asset.originalFilename,
        blobUrl: asset.blobUrl,
      },
      perception: perception
        ? {
            id: perception.id,
            status: perception.status,
            profile: perception.profile,
            systemPromptUsed: perception.systemPromptUsed,
            promptUsed: perception.promptUsed,
            editedByUser: perception.editedByUser,
            summary: perception.summary,
            perception: perception.perception,
            ocrText: perception.ocrText,
            model: perception.model,
            providerType: perception.providerType,
            inputTokens: perception.inputTokens,
            outputTokens: perception.outputTokens,
            totalTokens: perception.totalTokens,
            costUsd: perception.costUsd,
            durationMs: perception.durationMs,
            errorMessage: perception.errorMessage,
            analyzedAt: perception.analyzedAt,
          }
        : null,
    },
  };
}

/**
 * Server Action: Manually edit the AI perception summary (developer mode).
 * Marks the record as user-edited so it is distinguishable from AI output.
 */
export async function editMediaPerceptionAction(
  mediaAssetId: string,
  summary: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();

  const [asset] = await db
    .select({ id: mediaAssets.id })
    .from(mediaAssets)
    .where(and(eq(mediaAssets.id, mediaAssetId), eq(mediaAssets.userId, userId)))
    .limit(1);

  if (!asset) {
    return { ok: false, error: '图片不存在' };
  }

  const trimmed = summary.trim();
  if (!trimmed) {
    return { ok: false, error: '描述内容不能为空' };
  }

  const [existing] = await db
    .select()
    .from(imagePerceptions)
    .where(eq(imagePerceptions.mediaAssetId, mediaAssetId))
    .limit(1);

  const now = new Date();
  if (existing) {
    await db
      .update(imagePerceptions)
      .set({ summary: trimmed, editedByUser: true, status: 'ready', errorMessage: null, updatedAt: now })
      .where(eq(imagePerceptions.id, existing.id));
  } else {
    await db.insert(imagePerceptions).values({
      id: crypto.randomUUID(),
      mediaAssetId,
      userId,
      status: 'ready',
      profile: 'general',
      summary: trimmed,
      editedByUser: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { ok: true };
}
