import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { aiCharacters, notifications } from '@/db/schema';
import { Avatar } from '@/components/avatar';
import { EmptyState, TimeAgo } from '@/components/ui';
import { requireUserId } from '@/lib/session';
import { markNotificationsRead } from '@/server/actions/feed';
import { PageContainer } from '@/components/page-container';

export const metadata = { title: '通知' };
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
    <PageContainer className="pt-4">
      <h1 className="mb-4 px-0 text-xl font-bold">通知</h1>
      {rows.length === 0 ? (
        <div className="rounded-3xl border border-line surface">
          <EmptyState icon="🔔" title="还没有通知" description="AI 居民们的动静会出现在这里" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-line surface shadow-sm">
          {rows.map((n, i) => {
            const href = n.conversationId ? `/messages/${n.conversationId}` : n.postId ? `/post/${n.postId}` : '/feed';
            return (
              <Link
                key={n.id}
                href={href}
                className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:surface-2 ${
                  i > 0 ? 'border-t border-line' : ''
                }`}
              >
                <Avatar
                  name={n.characterName ?? '系统'}
                  emoji={n.characterEmoji ?? '✨'}
                  color={n.characterColor ?? 'violet'}
                  url={n.characterAvatarUrl}
                  size={38}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm">
                    <span className="font-semibold">{n.characterName ?? '系统'}</span>
                    <span className="text-secondary">
                      {n.type === 'dm' ? ' 给你发来一条私信' : n.type === 'comment' ? ' 评论了你的动态' : ' 与你互动'}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">{n.content}</p>
                </div>
                <TimeAgo date={n.createdAt} className="shrink-0 text-xs text-muted" />
              </Link>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
