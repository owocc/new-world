import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { user } from '@/db/schema';
import { processDueEvents, maybePulse } from '@/server/ai/community/engine';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Community heartbeat, compatible with Vercel Cron:
//   path: /api/cron/tick, schedule: every 15 minutes
// Authenticated via CRON_SECRET bearer token.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (secret && authHeader !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const users = await db.select({ id: user.id }).from(user);
  let processed = 0;
  for (const u of users) {
    try {
      await maybePulse(u.id);
      await processDueEvents(u.id, 8);
      processed++;
    } catch (err) {
      console.error('[cron] failed for user', u.id, err);
    }
  }

  return Response.json({ ok: true, users: processed });
}
