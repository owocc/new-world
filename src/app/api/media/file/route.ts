import { getSession } from '@/lib/session';
import { getMediaAsset } from '@/server/media';

export const dynamic = 'force-dynamic';

/**
 * Authenticated Media Streaming Endpoint via Query Parameters:
 * /api/media/file?id=... or /api/media/file?url=...
 */
export async function GET(req: Request): Promise<Response> {
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const urlParam = searchParams.get('url');

  let targetUrl = urlParam;
  let mimeType = 'image/jpeg';

  if (id) {
    const asset = await getMediaAsset(session.user.id, id);
    if (!asset) return new Response('Not Found', { status: 404 });
    targetUrl = asset.blobUrl;
    mimeType = asset.mimeType;
  }

  if (!targetUrl) {
    return new Response('Missing id or url parameter', { status: 400 });
  }

  // 1. Data URL fallback
  if (targetUrl.startsWith('data:')) {
    const [header, base64] = targetUrl.split(',');
    const mimeMatch = header?.match(/data:(.*?);base64/);
    const mime = mimeMatch ? mimeMatch[1] : mimeType;
    const buffer = Buffer.from(base64 || '', 'base64');
    return new Response(buffer, {
      headers: {
        'Content-Type': mime,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  }

  // 2. Fetch from Vercel Blob with token
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  try {
    const res = await fetch(targetUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (res.ok && res.body) {
      return new Response(res.body as BodyInit, {
        headers: {
          'Content-Type': res.headers.get('content-type') || mimeType,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }
  } catch (err) {
    console.error('[media/file] error fetching blob:', err);
  }

  return new Response('Failed to load media', { status: 500 });
}
