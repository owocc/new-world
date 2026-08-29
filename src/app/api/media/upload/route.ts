import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { getSession } from '@/lib/session';
import {
  createMediaAssetRecord,
  sanitizeFilename,
  uploadToBlobStorage,
  validateMediaFile,
  type MediaPurpose,
} from '@/server/media';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Upload Endpoint for Media:
 * 1. Direct Multipart Form Upload (Server-verified)
 * 2. Vercel Blob Client Upload Token Generation (Direct client upload)
 */
export async function POST(req: Request): Promise<Response> {
  const session = await getSession();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: '请先登录' }, { status: 401 });
  }
  const userId = session.user.id;

  const contentType = req.headers.get('content-type') || '';

  // 1. Client-Upload / Direct Upload Token Flow via @vercel/blob/client
  if (contentType.includes('application/json')) {
    try {
      const body = (await req.json()) as HandleUploadBody;
      const jsonResponse = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async (pathname) => {
          // Verify user owns the path namespace
          const prefix = `users/${userId}/`;
          if (!pathname.startsWith(prefix)) {
            throw new Error('Forbidden: Path must belong to current user namespace');
          }
          return {
            allowedContentTypes: [
              'image/jpeg',
              'image/png',
              'image/webp',
              'image/gif',
              'image/avif',
            ],
            maximumSizeInBytes: 15 * 1024 * 1024,
            tokenPayload: JSON.stringify({ userId }),
          };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          try {
            const payload = tokenPayload ? JSON.parse(tokenPayload) : { userId };
            await createMediaAssetRecord({
              userId: payload.userId || userId,
              mediaType: 'image',
              blobUrl: blob.url,
              pathname: blob.pathname,
              downloadUrl: blob.downloadUrl,
              mimeType: blob.contentType || 'image/jpeg',
              fileSize: 0, // client upload without exact size in callback
              originalFilename: blob.pathname.split('/').pop(),
              purpose: blob.pathname.includes('/avatars/') ? 'avatar' : 'attachment',
              status: 'ready',
            });
          } catch (err) {
            console.error('[media] onUploadCompleted error:', err);
          }
        },
      });
      return Response.json(jsonResponse);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      return Response.json({ ok: false, error: msg }, { status: 400 });
    }
  }

  // 2. Direct Multipart FormData Upload
  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const purpose = (formData.get('purpose') as MediaPurpose) || 'attachment';

      if (!file) {
        return Response.json({ ok: false, error: '未找到上传文件' }, { status: 400 });
      }

      const originalFilename = file.name || 'image.jpg';
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Validate File buffer and magic bytes
      const validation = validateMediaFile({
        buffer,
        mimeType: file.type,
        originalFilename,
        purpose,
      });

      if (!validation.valid) {
        return Response.json({ ok: false, error: validation.error }, { status: 400 });
      }

      const ext = validation.verifiedMime.split('/')[1] || 'jpg';
      const cleanName = sanitizeFilename(originalFilename);
      const subFolder = purpose === 'avatar' ? 'avatars' : 'messages';
      const pathname = `users/${userId}/${subFolder}/${Date.now()}-${cleanName}.${ext}`;

      const uploadResult = await uploadToBlobStorage({
        pathname,
        buffer,
        contentType: validation.verifiedMime,
      });

      const mediaAsset = await createMediaAssetRecord({
        userId,
        mediaType: 'image',
        blobUrl: uploadResult.url,
        pathname: uploadResult.pathname,
        downloadUrl: uploadResult.downloadUrl,
        mimeType: validation.verifiedMime,
        fileSize: buffer.length,
        originalFilename,
        width: validation.width,
        height: validation.height,
        purpose,
        // message attachments start as 'pending' until message creation succeeds
        status: purpose === 'attachment' ? 'pending' : 'ready',
      });

      return Response.json({ ok: true, media: mediaAsset });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '上传失败，请重试';
      console.error('[media/upload] error:', err);
      return Response.json({ ok: false, error: msg }, { status: 500 });
    }
  }

  return Response.json({ ok: false, error: 'Unsupported Content-Type' }, { status: 400 });
}
