import {desc, eq} from 'drizzle-orm';
import {db} from '@/db';
import {aiCharacters, notifications} from '@/db/schema';
import {requireUserId} from '@/lib/session';
import {NotificationsView} from '@/components/notifications-view';

export const metadata = {title: '通知'};
export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const userId = await requireUserId();
  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      content: notifications.content,
      read: notifications.read,
      createdAt: notifications.createdAt,
      conversationId: notifications.conversationId,
      postId: notifications.postId,
      characterName: aiCharacters.name,
      characterEmoji: aiCharacters.avatarEmoji,
      characterColor: aiCharacters.avatarColor,
      characterAvatarUrl: aiCharacters.avatarUrl,
    })
    .from(notifications)
    .leftJoin(aiCharacters, eq(notifications.characterId, aiCharacters.id))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return <NotificationsView initialNotifications={rows} />;
}
