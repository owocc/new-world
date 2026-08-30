import { after } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { aiCharacters, groupMessages, groups, user } from '@/db/schema';
import { getSession } from '@/lib/session';
import { getGroupDetails } from '@/server/groups';
import { scheduleGroupMessageAttention } from '@/server/ai/group/attention';
import { tickGroupAttention } from '@/server/ai/group/engine';

export const maxDuration = 60;
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
  const { id: groupId } = await params;

  try {
    const body = (await req.json()) as { characterId?: string };
    const characterId = body.characterId;

    if (!characterId) {
      return Response.json({ ok: false, error: 'characterId is required' }, { status: 400 });
    }

    const groupDetails = await getGroupDetails(userId, groupId);
    if (!groupDetails) {
      return Response.json({ ok: false, error: 'Group not found' }, { status: 404 });
    }

    const targetMember = groupDetails.members.find((m) => m.characterId === characterId);
    if (!targetMember) {
      return Response.json({ ok: false, error: 'Member not found in group' }, { status: 404 });
    }

    const [userInfo] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    const userName = userInfo?.name || '我';
    const characterName = targetMember.name;

    const now = new Date();
    const systemMessageId = crypto.randomUUID();
    const pokeContent = `${userName} 拍了拍 ${characterName}`;

    // 1. Persist system poke message
    await db.insert(groupMessages).values({
      id: systemMessageId,
      groupId,
      userId,
      senderType: 'system',
      content: pokeContent,
      mentions: JSON.stringify([{ type: 'ai', id: characterId, name: characterName, username: targetMember.username }]),
      createdAt: now,
    });

    // 2. Update group metadata
    await db
      .update(groups)
      .set({
        lastMessageAt: now,
        lastMessagePreview: pokeContent,
        updatedAt: now,
      })
      .where(and(eq(groups.id, groupId), eq(groups.userId, userId)));

    // 3. Schedule high-priority attention for the poked character
    after(async () => {
      try {
        await scheduleGroupMessageAttention(
          userId,
          groupId,
          systemMessageId,
          null,
          pokeContent,
          null,
          [{ type: 'ai', id: characterId, name: characterName, username: targetMember.username }],
        );
        // Fast-path tick
        await tickGroupAttention(userId, groupId, 4);
      } catch (err) {
        console.error('[api/groups/poke] background attention error:', err);
      }
    });

    return Response.json({
      ok: true,
      message: {
        id: systemMessageId,
        groupId,
        senderType: 'system',
        content: pokeContent,
        createdAt: now,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[api/groups/poke] error sending poke:', err);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
