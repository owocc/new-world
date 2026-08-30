import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { requireUserId } from '@/lib/session';
import { getConversationMessages, totalUnreadMessages } from '@/server/chat';
import { getRedPacketStatuses, type RedPacketStatusView } from '@/server/wallet';
import { totalUnreadGroupMessages } from '@/server/groups';
import { getUnifiedChats } from '@/server/unified-chat';
import { getConversationTurnState, tickTurns } from '@/server/ai/turn-engine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId') || undefined;
    const since = searchParams.get('since') ? Number(searchParams.get('since')) : undefined;

    // Opportunistically tick due turns for fast background progression
    await tickTurns({ userId, conversationId, limit: 3 }).catch(console.error);

    // Parallel fetch sync data
    const [unreadDMs, unreadGroups, unreadNotifsRows, chats] = await Promise.all([
      totalUnreadMessages(userId),
      totalUnreadGroupMessages(userId),
      db
        .select({ count: sql<number>`CAST(count(*) AS INTEGER)` })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.read, false))),
      getUnifiedChats(userId),
    ]);

    let conversationData: {
      messages: Awaited<ReturnType<typeof getConversationMessages>>;
      redPackets: Record<string, RedPacketStatusView>;
      isTyping: boolean;
      turnStatus: string;
    } | null = null;

    if (conversationId) {
      const [messagesList, turnState] = await Promise.all([
        getConversationMessages(conversationId, 100),
        getConversationTurnState(conversationId),
      ]);

      // 红包消息附带领取状态（谁领了多少、我是否已领）
      const redPacketIds = messagesList
        .filter((m) => m.type === 'red_packet' && m.payload?.redPacketId)
        .map((m) => String(m.payload!.redPacketId));
      const redPacketMap = await getRedPacketStatuses(userId, redPacketIds);
      const redPackets: Record<string, RedPacketStatusView> = {};
      for (const [id, status] of redPacketMap) redPackets[id] = status;

      conversationData = {
        messages: messagesList,
        redPackets,
        isTyping: turnState.isTyping,
        turnStatus: turnState.status,
      };
    }

    // Check for recent notifications if 'since' timestamp is provided
    let recentNotifications: typeof notifications.$inferSelect[] = [];
    if (since && !isNaN(since)) {
      const sinceDate = new Date(since);
      recentNotifications = await db
        .select()
        .from(notifications)
        .where(and(eq(notifications.userId, userId), gt(notifications.createdAt, sinceDate)))
        .orderBy(desc(notifications.createdAt))
        .limit(10);
    }

    return Response.json({
      ok: true,
      timestamp: Date.now(),
      unread: {
        messages: unreadDMs,
        groups: unreadGroups,
        notifications: unreadNotifsRows[0]?.count ?? 0,
        totalChats: unreadDMs + unreadGroups,
      },
      chats,
      conversation: conversationData,
      recentNotifications,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unauthorized';
    return Response.json({ ok: false, error: message }, { status: 401 });
  }
}
