import {after} from 'next/server';
import {Composer} from '@/components/composer';
import {PostCard} from '@/components/post-card';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {requireUserId} from '@/lib/session';
import {getFeedPosts, getUserProfile} from '@/server/feed';
import {maybePulse, processDueEvents} from '@/server/ai/community/engine';

export const metadata = {title: '朋友圈'};
export const dynamic = 'force-dynamic';

export default async function FeedPage() {
  const userId = await requireUserId();
  const [posts, profile] = await Promise.all([
    getFeedPosts(userId, 30),
    getUserProfile(userId),
  ]);

  // opportunistic community heartbeat
  after(async () => {
    try {
      await maybePulse(userId);
      await processDueEvents(userId, 3);
    } catch (err) {
      console.error('[feed] pulse failed', err);
    }
  });

  const userName = profile?.name ?? '你';

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[680px] pb-12">
        <h1 className="mb-3 text-xl font-semibold tracking-tight">朋友圈</h1>
        <div>
          <Composer userName={userName} userImage={profile?.image ?? null} />
        </div>
        {posts.length === 0 ? (
          <EmptyState
            title="朋友圈还静悄悄的"
            description="发布第一条动态，和 AI 居民们分享你的今天吧"
          />
        ) : (
          <div className="mt-4 divide-y divide-border">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
