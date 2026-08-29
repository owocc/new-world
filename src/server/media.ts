import { del, put } from '@vercel/blob';
import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  groupMessageAttachments,
  mediaAssets,
  messageAttachments,
  user,
  aiCharacters,
} from '@/db/schema';

export const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
] as const;

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIMES)[number];

export const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024; // 15MB

export type MediaPurpose = 'avatar' | 'attachment' | 'general';
export type MediaType = 'image' | 'video' | 'audio' | 'file';
export type MediaStatus = 'pending' | 'ready' | 'orphan' | 'deleted';

export type MediaAssetView = {
  id: string;
  userId: string;
  mediaType: MediaType;
  blobUrl: string;
  pathname: string;
  downloadUrl: string | null;
  mimeType: string;
  fileSize: number;
  originalFilename: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  status: MediaStatus;
  purpose: MediaPurpose;
  createdAt: Date;
};

/**
 * Sanitize filename to avoid path traversal and control characters
 */
export function sanitizeFilename(filename: string): string {
  const clean = filename
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/\.+/g, '.')
    .slice(0, 100);
  return clean || 'upload';
}

/**
 * Inspect magic bytes of a buffer to verify that the claimed image MIME is legitimate.
 */
export function verifyImageMagicBytes(buffer: Buffer): { valid: boolean; mime?: AllowedImageMime } {
  if (buffer.length < 12) return { valid: false };

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, mime: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, mime: 'image/png' };
  }

  // GIF: GIF87a or GIF89a
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return { valid: true, mime: 'image/gif' };
  }

  // WEBP: RIFF .... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, mime: 'image/webp' };
  }

  // AVIF: ....ftypavif or ....ftypavis
  if (buffer.length >= 12) {
    const ftyp = buffer.toString('ascii', 4, 12);
    if (ftyp === 'ftypavif' || ftyp === 'ftypavis' || ftyp === 'ftypmif1') {
      return { valid: true, mime: 'image/avif' };
    }
  }

  return { valid: false };
}

/**
 * Lightweight, zero-dependency image dimensions extractor.
 */
export function extractImageDimensions(
  buffer: Buffer,
  mime: string,
): { width: number | null; height: number | null } {
  try {
    if (mime === 'image/png' && buffer.length >= 24) {
      // PNG header IHDR contains width at 16..20 and height at 20..24 (Big Endian)
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }

    if (mime === 'image/gif' && buffer.length >= 10) {
      // GIF width at 6..8 and height at 8..10 (Little Endian)
      const width = buffer.readUInt16LE(6);
      const height = buffer.readUInt16LE(8);
      return { width, height };
    }

    if (mime === 'image/webp' && buffer.length >= 30) {
      const type = buffer.toString('ascii', 12, 16);
      if (type === 'VP8 ') {
        // Lossy VP8
        const keyframe = buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a;
        if (keyframe) {
          const width = buffer.readUInt16LE(26) & 0x3fff;
          const height = buffer.readUInt16LE(28) & 0x3fff;
          return { width, height };
        }
      } else if (type === 'VP8L') {
        // Lossless VP8L
        if (buffer[20] === 0x2f) {
          const b0 = buffer[21];
          const b1 = buffer[22];
          const b2 = buffer[23];
          const b3 = buffer[24];
          const width = 1 + (((b1 & 0x3f) << 8) | b0);
          const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
          return { width, height };
        }
      } else if (type === 'VP8X') {
        // Extended VP8X
        const width = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
        const height = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));
        return { width, height };
      }
    }

    if (mime === 'image/jpeg') {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        // SOF0 to SOF15 except DHT, JPG, DAC
        if (
          (marker >= 0xc0 && marker <= 0xc3) ||
          (marker >= 0xc5 && marker <= 0xc7) ||
          (marker >= 0xc9 && marker <= 0xcb) ||
          (marker >= 0xcd && marker <= 0xcf)
        ) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        const length = buffer.readUInt16BE(offset + 2);
        offset += 2 + length;
      }
    }
  } catch (err) {
    console.warn('[media] failed to extract image dimensions', err);
  }
  return { width: null, height: null };
}

/**
 * Validate media file buffer, size, and MIME.
 */
export function validateMediaFile(args: {
  buffer: Buffer;
  mimeType: string;
  originalFilename: string;
  purpose: MediaPurpose;
}): { valid: true; verifiedMime: string; width: number | null; height: number | null } | { valid: false; error: string } {
  const { buffer, mimeType, purpose } = args;

  const maxSize = purpose === 'avatar' ? MAX_AVATAR_SIZE : MAX_ATTACHMENT_SIZE;
  if (buffer.length > maxSize) {
    const mb = Math.round(maxSize / (1024 * 1024));
    return { valid: false, error: `文件过大，单张图片不能超过 ${mb}MB` };
  }

  const magic = verifyImageMagicBytes(buffer);
  if (!magic.valid || !magic.mime) {
    return { valid: false, error: '不支持的图片格式或文件已损坏' };
  }

  // Verify against whitelist
  if (!ALLOWED_IMAGE_MIMES.includes(magic.mime)) {
    return { valid: false, error: `不支持的媒体类型: ${magic.mime}` };
  }

  const dims = extractImageDimensions(buffer, magic.mime);
  return {
    valid: true,
    verifiedMime: magic.mime,
    width: dims.width,
    height: dims.height,
  };
}

/**
 * Direct upload helper that puts bytes into Vercel Blob (auto-adapting to private and public stores)
 */
export async function uploadToBlobStorage(args: {
  pathname: string;
  buffer: Buffer;
  contentType: string;
}): Promise<{ url: string; pathname: string; downloadUrl: string }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (token) {
    try {
      // Try private access first (recommended for private social apps and private stores)
      const blob = await put(args.pathname, args.buffer, {
        access: 'private',
        contentType: args.contentType,
        token,
      });
      return {
        url: blob.url,
        pathname: blob.pathname,
        downloadUrl: blob.downloadUrl || blob.url,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // If store requires public access
      if (msg.includes('public') || msg.includes('private') || msg.includes('access') || msg.includes('BlobAccessError')) {
        const blob = await put(args.pathname, args.buffer, {
          access: 'public',
          contentType: args.contentType,
          token,
        });
        return {
          url: blob.url,
          pathname: blob.pathname,
          downloadUrl: blob.downloadUrl || blob.url,
        };
      }
      throw err;
    }
  }

  // Local / dev fallback when BLOB_READ_WRITE_TOKEN is not configured
  const base64 = `data:${args.contentType};base64,${args.buffer.toString('base64')}`;
  return {
    url: base64,
    pathname: args.pathname,
    downloadUrl: base64,
  };
}
/**
 * Delete a blob from Vercel Blob storage.
 */
export async function deleteFromBlobStorage(blobUrl: string): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token || blobUrl.startsWith('data:')) {
    return;
  }
  try {
    await del(blobUrl, { token });
  } catch (err) {
    console.warn('[media] deleteFromBlobStorage warning:', err);
  }
}

/**
 * Create a new Media Asset record in Turso.
 */
export async function createMediaAssetRecord(args: {
  userId: string;
  mediaType?: MediaType;
  blobUrl: string;
  pathname: string;
  downloadUrl?: string | null;
  mimeType: string;
  fileSize: number;
  originalFilename?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  purpose?: MediaPurpose;
  status?: MediaStatus;
}): Promise<MediaAssetView> {
  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(mediaAssets).values({
    id,
    userId: args.userId,
    mediaType: args.mediaType ?? 'image',
    blobUrl: args.blobUrl,
    pathname: args.pathname,
    downloadUrl: args.downloadUrl ?? null,
    mimeType: args.mimeType,
    fileSize: args.fileSize,
    originalFilename: args.originalFilename ?? null,
    width: args.width ?? null,
    height: args.height ?? null,
    duration: args.duration ?? null,
    status: args.status ?? 'ready',
    purpose: args.purpose ?? 'attachment',
    createdAt: now,
    updatedAt: now,
  });

  return {
    id,
    userId: args.userId,
    mediaType: args.mediaType ?? 'image',
    blobUrl: args.blobUrl,
    pathname: args.pathname,
    downloadUrl: args.downloadUrl ?? null,
    mimeType: args.mimeType,
    fileSize: args.fileSize,
    originalFilename: args.originalFilename ?? null,
    width: args.width ?? null,
    height: args.height ?? null,
    duration: args.duration ?? null,
    status: args.status ?? 'ready',
    purpose: args.purpose ?? 'attachment',
    createdAt: now,
  };
}

/**
 * Link uploaded media assets to a 1-on-1 DM message.
 */
export async function linkMediaToMessage(
  userId: string,
  messageId: string,
  mediaAssetIds: string[],
): Promise<void> {
  if (mediaAssetIds.length === 0) return;

  // Verify user owns all mediaAssetIds
  const ownedAssets = await db
    .select({ id: mediaAssets.id })
    .from(mediaAssets)
    .where(and(eq(mediaAssets.userId, userId), inArray(mediaAssets.id, mediaAssetIds)));

  const ownedIdSet = new Set(ownedAssets.map((a) => a.id));
  const validIds = mediaAssetIds.filter((id) => ownedIdSet.has(id));

  for (let i = 0; i < validIds.length; i++) {
    const assetId = validIds[i];
    await db.insert(messageAttachments).values({
      id: crypto.randomUUID(),
      messageId,
      mediaAssetId: assetId,
      order: i,
    });
  }

  // Update mediaAsset status to ready
  if (validIds.length > 0) {
    await db
      .update(mediaAssets)
      .set({ status: 'ready', updatedAt: new Date() })
      .where(inArray(mediaAssets.id, validIds));
  }
}

/**
 * Link uploaded media assets to a Group Message.
 */
export async function linkMediaToGroupMessage(
  userId: string,
  groupMessageId: string,
  mediaAssetIds: string[],
): Promise<void> {
  if (mediaAssetIds.length === 0) return;

  // Verify user owns all mediaAssetIds
  const ownedAssets = await db
    .select({ id: mediaAssets.id })
    .from(mediaAssets)
    .where(and(eq(mediaAssets.userId, userId), inArray(mediaAssets.id, mediaAssetIds)));

  const ownedIdSet = new Set(ownedAssets.map((a) => a.id));
  const validIds = mediaAssetIds.filter((id) => ownedIdSet.has(id));

  for (let i = 0; i < validIds.length; i++) {
    const assetId = validIds[i];
    await db.insert(groupMessageAttachments).values({
      id: crypto.randomUUID(),
      groupMessageId,
      mediaAssetId: assetId,
      order: i,
    });
  }

  // Update mediaAsset status to ready
  if (validIds.length > 0) {
    await db
      .update(mediaAssets)
      .set({ status: 'ready', updatedAt: new Date() })
      .where(inArray(mediaAssets.id, validIds));
  }
}

/**
 * Get media attachments for a batch of 1-on-1 DM message IDs.
 */
export async function getMediaForMessages(
  messageIds: string[],
): Promise<Map<string, MediaAssetView[]>> {
  const result = new Map<string, MediaAssetView[]>();
  if (messageIds.length === 0) return result;

  const rows = await db
    .select({
      messageId: messageAttachments.messageId,
      order: messageAttachments.order,
      asset: mediaAssets,
    })
    .from(messageAttachments)
    .innerJoin(mediaAssets, eq(messageAttachments.mediaAssetId, mediaAssets.id))
    .where(inArray(messageAttachments.messageId, messageIds))
    .orderBy(messageAttachments.order);

  for (const r of rows) {
    const list = result.get(r.messageId) ?? [];
    list.push({
      id: r.asset.id,
      userId: r.asset.userId,
      mediaType: r.asset.mediaType as MediaType,
      blobUrl: r.asset.blobUrl,
      pathname: r.asset.pathname,
      downloadUrl: r.asset.downloadUrl,
      mimeType: r.asset.mimeType,
      fileSize: r.asset.fileSize,
      originalFilename: r.asset.originalFilename,
      width: r.asset.width,
      height: r.asset.height,
      duration: r.asset.duration,
      status: r.asset.status as MediaStatus,
      purpose: r.asset.purpose as MediaPurpose,
      createdAt: new Date(r.asset.createdAt),
    });
    result.set(r.messageId, list);
  }

  return result;
}

/**
 * Get media attachments for a batch of Group Message IDs.
 */
export async function getMediaForGroupMessages(
  groupMessageIds: string[],
): Promise<Map<string, MediaAssetView[]>> {
  const result = new Map<string, MediaAssetView[]>();
  if (groupMessageIds.length === 0) return result;

  const rows = await db
    .select({
      groupMessageId: groupMessageAttachments.groupMessageId,
      order: groupMessageAttachments.order,
      asset: mediaAssets,
    })
    .from(groupMessageAttachments)
    .innerJoin(mediaAssets, eq(groupMessageAttachments.mediaAssetId, mediaAssets.id))
    .where(inArray(groupMessageAttachments.groupMessageId, groupMessageIds))
    .orderBy(groupMessageAttachments.order);

  for (const r of rows) {
    const list = result.get(r.groupMessageId) ?? [];
    list.push({
      id: r.asset.id,
      userId: r.asset.userId,
      mediaType: r.asset.mediaType as MediaType,
      blobUrl: r.asset.blobUrl,
      pathname: r.asset.pathname,
      downloadUrl: r.asset.downloadUrl,
      mimeType: r.asset.mimeType,
      fileSize: r.asset.fileSize,
      originalFilename: r.asset.originalFilename,
      width: r.asset.width,
      height: r.asset.height,
      duration: r.asset.duration,
      status: r.asset.status as MediaStatus,
      purpose: r.asset.purpose as MediaPurpose,
      createdAt: new Date(r.asset.createdAt),
    });
    result.set(r.groupMessageId, list);
  }

  return result;
}

/**
 * Get a single media asset by ID with ownership check.
 */
export async function getMediaAsset(
  userId: string,
  mediaAssetId: string,
): Promise<MediaAssetView | null> {
  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.id, mediaAssetId), eq(mediaAssets.userId, userId)))
    .limit(1);

  if (!asset) return null;

  return {
    id: asset.id,
    userId: asset.userId,
    mediaType: asset.mediaType as MediaType,
    blobUrl: asset.blobUrl,
    pathname: asset.pathname,
    downloadUrl: asset.downloadUrl,
    mimeType: asset.mimeType,
    fileSize: asset.fileSize,
    originalFilename: asset.originalFilename,
    width: asset.width,
    height: asset.height,
    duration: asset.duration,
    status: asset.status as MediaStatus,
    purpose: asset.purpose as MediaPurpose,
    createdAt: new Date(asset.createdAt),
  };
}

/**
 * Delete a media asset record and its remote Blob storage file.
 */
export async function deleteMediaAsset(userId: string, mediaAssetId: string): Promise<boolean> {
  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.id, mediaAssetId), eq(mediaAssets.userId, userId)))
    .limit(1);

  if (!asset) return false;

  // Delete from Blob storage
  await deleteFromBlobStorage(asset.blobUrl);

  // Delete DB record (cascades message_attachments if any)
  await db.delete(mediaAssets).where(eq(mediaAssets.id, mediaAssetId));
  return true;
}

/**
 * High-level helper: upload user avatar, remove old avatar blob if present.
 */
export async function uploadUserAvatar(args: {
  userId: string;
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
}): Promise<{ ok: true; avatarUrl: string; assetId: string } | { ok: false; error: string }> {
  const validation = validateMediaFile({
    buffer: args.buffer,
    mimeType: args.mimeType,
    originalFilename: args.originalFilename,
    purpose: 'avatar',
  });

  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  const ext = validation.verifiedMime.split('/')[1] || 'jpg';
  const cleanName = sanitizeFilename(args.originalFilename);
  const pathname = `users/${args.userId}/avatars/user-${Date.now()}-${cleanName}.${ext}`;

  // Fetch current user image to delete old avatar blob
  const [currentUser] = await db
    .select({ image: user.image })
    .from(user)
    .where(eq(user.id, args.userId))
    .limit(1);

  const uploadRes = await uploadToBlobStorage({
    pathname,
    buffer: args.buffer,
    contentType: validation.verifiedMime,
  });

  const asset = await createMediaAssetRecord({
    userId: args.userId,
    mediaType: 'image',
    blobUrl: uploadRes.url,
    pathname: uploadRes.pathname,
    downloadUrl: uploadRes.downloadUrl,
    mimeType: validation.verifiedMime,
    fileSize: args.buffer.length,
    originalFilename: args.originalFilename,
    width: validation.width,
    height: validation.height,
    purpose: 'avatar',
    status: 'ready',
  });

  // Update user image
  await db
    .update(user)
    .set({ image: uploadRes.url, updatedAt: new Date() })
    .where(eq(user.id, args.userId));

  // If old avatar was a Blob URL, delete it
  if (currentUser?.image && currentUser.image !== uploadRes.url) {
    await deleteFromBlobStorage(currentUser.image);
  }

  return { ok: true, avatarUrl: uploadRes.url, assetId: asset.id };
}

/**
 * High-level helper: upload AI Character avatar, remove old avatar blob if present.
 */
export async function uploadCharacterAvatar(args: {
  userId: string;
  characterId: string;
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
}): Promise<{ ok: true; avatarUrl: string; assetId: string } | { ok: false; error: string }> {
  const validation = validateMediaFile({
    buffer: args.buffer,
    mimeType: args.mimeType,
    originalFilename: args.originalFilename,
    purpose: 'avatar',
  });

  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  const ext = validation.verifiedMime.split('/')[1] || 'jpg';
  const cleanName = sanitizeFilename(args.originalFilename);
  const pathname = `users/${args.userId}/avatars/char-${args.characterId}-${Date.now()}-${cleanName}.${ext}`;

  // Fetch current character avatar
  const [currentChar] = await db
    .select({ avatarUrl: aiCharacters.avatarUrl })
    .from(aiCharacters)
    .where(and(eq(aiCharacters.id, args.characterId), eq(aiCharacters.userId, args.userId)))
    .limit(1);

  const uploadRes = await uploadToBlobStorage({
    pathname,
    buffer: args.buffer,
    contentType: validation.verifiedMime,
  });

  const asset = await createMediaAssetRecord({
    userId: args.userId,
    mediaType: 'image',
    blobUrl: uploadRes.url,
    pathname: uploadRes.pathname,
    downloadUrl: uploadRes.downloadUrl,
    mimeType: validation.verifiedMime,
    fileSize: args.buffer.length,
    originalFilename: args.originalFilename,
    width: validation.width,
    height: validation.height,
    purpose: 'avatar',
    status: 'ready',
  });

  // Update character avatar
  await db
    .update(aiCharacters)
    .set({ avatarUrl: uploadRes.url, updatedAt: new Date() })
    .where(and(eq(aiCharacters.id, args.characterId), eq(aiCharacters.userId, args.userId)));

  // If old avatar was a Blob URL, delete it
  if (currentChar?.avatarUrl && currentChar.avatarUrl !== uploadRes.url) {
    await deleteFromBlobStorage(currentChar.avatarUrl);
  }

  return { ok: true, avatarUrl: uploadRes.url, assetId: asset.id };
}

/**
 * Orphan Blob Cleanup Strategy:
 * 1. Find mediaAssets with status='pending' older than threshold (e.g. 1 hour) - user uploaded but never sent message.
 * 2. Find mediaAssets with purpose='avatar' that are no longer linked to any user or character.
 * 3. Delete their remote Blob file and remove from database.
 */
export async function cleanupOrphanMedia(olderThanMinutes = 60): Promise<{ cleanedCount: number }> {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);

  // 1. Pending media older than cutoff
  const pendingOrphans = await db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.status, 'pending'), lt(mediaAssets.createdAt, cutoff)))
    .limit(100);

  let count = 0;
  for (const asset of pendingOrphans) {
    await deleteFromBlobStorage(asset.blobUrl);
    await db.delete(mediaAssets).where(eq(mediaAssets.id, asset.id));
    count++;
  }

  // 2. Unlinked attachments where status='ready' but no message or groupMessage references it, and older than 2 hours
  const attachmentCutoff = new Date(Date.now() - 120 * 60 * 1000);
  const unlinkedAssets = await db
    .select()
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.purpose, 'attachment'),
        lt(mediaAssets.createdAt, attachmentCutoff),
        sql`NOT EXISTS (SELECT 1 FROM message_attachments WHERE message_attachments.media_asset_id = ${mediaAssets.id})`,
        sql`NOT EXISTS (SELECT 1 FROM group_message_attachments WHERE group_message_attachments.media_asset_id = ${mediaAssets.id})`,
      ),
    )
    .limit(100);

  for (const asset of unlinkedAssets) {
    await deleteFromBlobStorage(asset.blobUrl);
    await db.delete(mediaAssets).where(eq(mediaAssets.id, asset.id));
    count++;
  }

  return { cleanedCount: count };
}
