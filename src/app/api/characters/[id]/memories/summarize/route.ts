import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { aiMemories } from '@/db/schema';
import { getSession } from '@/lib/session';
import { summarizeDailyMemoriesForSingleCharacter } from '@/server/ai/nightly-memory';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const { id: characterId } = await params;

  try {
    const result = await summarizeDailyMemoriesForSingleCharacter(userId, characterId, { type: 'manual' });

    // Fetch fresh memories for this character
    const memories = await db
      .select()
      .from(aiMemories)
      .where(and(eq(aiMemories.characterId, characterId), eq(aiMemories.userId, userId)))
      .orderBy(desc(aiMemories.importance), desc(aiMemories.createdAt))
      .limit(40);

    return Response.json({
      ok: true,
      result,
      memories,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '记忆总结失败';
    console.error(`[POST /api/characters/${characterId}/memories/summarize] error:`, err);
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const { id: characterId } = await params;

  const memories = await db
    .select()
    .from(aiMemories)
    .where(and(eq(aiMemories.characterId, characterId), eq(aiMemories.userId, userId)))
    .orderBy(desc(aiMemories.importance), desc(aiMemories.createdAt))
    .limit(40);

  return Response.json({ ok: true, memories });
}
