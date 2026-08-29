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
import { aiCharacters, user } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { processMediaAssetPerception } from '@/server/ai/vision';
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
 */
export async function reanalyzeMediaPerceptionAction(mediaAssetId: string) {
  const userId = await requireUserId();
  const perception = await processMediaAssetPerception(userId, mediaAssetId, { force: true });
  return { ok: true, perception };
}
