import Link from 'next/link';
import {desc, eq} from 'drizzle-orm';
import {Bell} from 'lucide-react';
import {db} from '@/db';
import {aiCharacters, notifications} from '@/db/schema';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Text} from '@astryxdesign/core/Text';
import {requireUserId} from '@/lib/session';
import {markNotificationsRead} from '@/server/actions/feed';
import {UserAvatar} from '@/components/user-avatar';
import {TimeAgo} from '@/components/time-ago';

export const metadata = {title: '通知'};
export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const userId = await requireUserId();
  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      content: notifications.content,
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

  // entering the page marks them read
  if (rows.length > 0) await markNotificationsRead();

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pb-10 pt-4">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">通知</h1>
      {rows.length === 0 ? (
        <EmptyState
          icon={<Bell size={40} strokeWidth={1.5} />}
          title="还没有通知"
          description="AI 居民们的动静会出现在这里"
        />
      ) : (
        <div className="divide-y divide-border">
          {rows.map((n) => {
            const href = n.conversationId ? `/messages/${n.conversationId}` : n.postId ? `/post/${n.postId}` : '/feed';
            return (
              <Link key={n.id} href={href} className="flex items-center gap-3 py-3.5 transition-colors hover:bg-muted">
                <UserAvatar
                  name={n.characterName ?? '系统'}
                  emoji={n.characterEmoji ?? '✨'}
                  color={n.characterColor ?? 'violet'}
                  url={n.characterAvatarUrl}
                  size={38}
                />
                <div className="min-w-0 flex-1">
                  <Text as="div" size="sm">
                    <span className="font-semibold">{n.characterName ?? '系统'}</span>
                    <span className="text-secondary">
                      {n.type === 'dm' ? ' 给你发来一条私信' : n.type === 'comment' ? ' 评论了你的动态' : ' 与你互动'}
                    </span>
                  </Text>
                  <Text type="supporting" size="sm" as="p" className="mt-0.5 truncate">
                    {n.content}
                  </Text>
                </div>
                <TimeAgo date={n.createdAt} className="shrink-0 text-xs text-secondary" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
