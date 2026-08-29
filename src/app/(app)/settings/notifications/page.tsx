import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { aiCharacters, notifications } from '@/db/schema';
import { requireUserId } from '@/lib/session';
import { NotificationsView } from '@/components/notifications-view';

export const metadata = { title: '通知中心' };
export const dynamic = 'force-dynamic';

export default async function SettingsNotificationsPage() {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Link
          href="/settings"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-secondary hover:bg-muted lg:hidden"
          aria-label="返回设置菜单"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">通知中心</h1>
          <p className="text-xs text-secondary">查看来自居民的互动与系统通知</p>
        </div>
      </div>
      <NotificationsView initialNotifications={rows} />
    </div>
  );
}
