import { requireUserId } from '@/lib/session';
import { getGroupMessages, markGroupRead } from '@/server/groups';
import { tickGroupAttention } from '@/server/ai/group/engine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id: groupId } = await params;

    // Opportunistically tick any due events for this group
    await tickGroupAttention(userId, groupId, 4).catch(console.error);

    const messages = await getGroupMessages(userId, groupId, 100);
    return Response.json({ ok: true, messages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    return Response.json({ ok: false, error: message }, { status: 401 });
  }
}
