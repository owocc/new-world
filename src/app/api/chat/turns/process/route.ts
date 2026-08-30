import { after } from 'next/server';
import { requireUserId } from '@/lib/session';
import { tickTurns, processTurn, QUIET_WINDOW_MS } from '@/server/ai/turn-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Trigger turn execution.
 * If turnId is provided, schedule or run that turn.
 * Can be called with after() or via HTTP dispatch / fetch.
 */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as {
      turnId?: string;
      conversationId?: string;
      waitQuietWindow?: boolean;
    };

    const { turnId, conversationId, waitQuietWindow } = body;

    // Run in background after response
    after(async () => {
      try {
        if (waitQuietWindow) {
          // Wait for the quiet window to elapse so consecutive messages can be batched
          await new Promise((resolve) => setTimeout(resolve, QUIET_WINDOW_MS + 200));
        }

        if (turnId) {
          await processTurn(turnId, { callerUserId: userId }).catch(console.error);
        } else {
          await tickTurns({ userId, conversationId, limit: 4 }).catch(console.error);
        }
      } catch (err) {
        console.error('[api/chat/turns/process] background execution error:', err);
      }
    });

    return Response.json({ ok: true, scheduled: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    return Response.json({ ok: false, error: message }, { status: 401 });
  }
}
