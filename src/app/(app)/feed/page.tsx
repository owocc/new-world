import {after} from 'next/server';
import {Composer} from '@/components/composer';
import {PostCard, PostCardSkeleton} from '@/components/post-card';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Divider} from '@astryxdesign/core/Divider';
import {requireUserId} from '@/lib/session';
import {getFeedPosts, getUserProfile} from '@/server/feed';
import {maybePulse, processDueEvents} from '@/server/ai/community/engine';

export const metadata = {title: '世界'};
export const dynamic = 'force-dynamic';

export default async function FeedPage() {
  const userId = await requireUserId();
  const [posts, profile] = await Promise.all([
    getFeedPosts(userId, 30),
    getUserProfile(userId),
  ]);

  // opportunistic community heartbeat (bounded, runs after response)
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
    <div className="mx-auto w-full max-w-[640px] px-4 pb-10">
      <h1 className="sr-only">世界</h1>
      <div className="pt-3">
        <Composer userName={userName} userImage={profile?.image ?? null} />
      </div>
      {posts.length === 0 ? (
        <EmptyState
          title="你的世界还静悄悄的"
          description="发布第一条动态，或者去私信页和 AI 居民们打个招呼吧"
        />
      ) : (
        <div className="mt-2 divide-y divide-border">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
