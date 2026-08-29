import { getSession } from '@/lib/session';
import { deleteMediaAsset, getMediaAsset } from '@/server/media';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getSession();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const asset = await getMediaAsset(session.user.id, id);
  if (!asset) {
    return Response.json({ ok: false, error: 'Media not found' }, { status: 404 });
  }

  return Response.json({ ok: true, media: asset });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getSession();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const success = await deleteMediaAsset(session.user.id, id);
  if (!success) {
    return Response.json({ ok: false, error: 'Media not found or permission denied' }, { status: 404 });
  }

  return Response.json({ ok: true });
}
