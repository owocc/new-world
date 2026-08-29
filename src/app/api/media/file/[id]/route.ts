import { get } from '@vercel/blob';
import { getSession } from '@/lib/session';
import { getMediaAsset } from '@/server/media';

export const dynamic = 'force-dynamic';

/**
 * Authenticated Media Streaming Endpoint:
 * Serves private/public blob files securely after session & ownership verification.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = await params;
  const asset = await getMediaAsset(session.user.id, id);
  if (!asset) {
    return new Response('Not Found', { status: 404 });
  }

  // 1. Data URL fallback (dev / offline mode)
  if (asset.blobUrl.startsWith('data:')) {
    const [header, base64] = asset.blobUrl.split(',');
    const mimeMatch = header?.match(/data:(.*?);base64/);
    const mime = mimeMatch ? mimeMatch[1] : asset.mimeType || 'image/jpeg';
    const buffer = Buffer.from(base64 || '', 'base64');
    return new Response(buffer, {
      headers: {
        'Content-Type': mime,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  }

  // 2. Vercel Blob Private / Public Store Streaming
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    try {
      // Direct authenticated fetch using Blob token
      const res = await fetch(asset.blobUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok && res.body) {
        return new Response(res.body as BodyInit, {
          headers: {
            'Content-Type': res.headers.get('content-type') || asset.mimeType || 'image/jpeg',
            'Content-Length': res.headers.get('content-length') || String(asset.fileSize),
            'Cache-Control': 'private, max-age=3600',
          },
        });
      }

      // Secondary fallback via SDK get
      const blobResponse = await get(asset.blobUrl, {
        access: 'private',
        token,
      });

      if (blobResponse && blobResponse.stream) {
        return new Response(blobResponse.stream as BodyInit, {
          headers: {
            'Content-Type': blobResponse.blob?.contentType || asset.mimeType || 'image/jpeg',
            'Cache-Control': 'private, max-age=3600',
          },
        });
      }
    } catch (err) {
      console.error('[media/file] error streaming private blob', err);
    }
  }

  return new Response('Failed to load media', { status: 500 });
}
