import { summarizeDailyMemoriesForAllCharacters } from '@/server/ai/nightly-memory';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * Nightly Memory Consolidation Cron:
 * Triggered at 00:00 Asia/Shanghai (16:00 UTC) every day by Vercel Cron.
 * Authenticated via CRON_SECRET bearer token.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (secret && authHeader !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summaryResult = await summarizeDailyMemoriesForAllCharacters({ type: 'automatic' });
    return Response.json({
      ok: true,
      timestamp: new Date().toISOString(),
      summary: summaryResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[cron/nightly-memory] error:', err);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
