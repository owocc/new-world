import { after } from 'next/server';
import { Composer } from '@/components/composer';
import { PostCard } from '@/components/post-card';
import { EmptyState } from '@/components/ui';
import { requireUserId } from '@/lib/session';
import { getFeedPosts, getUserProfile } from '@/server/feed';
import { maybePulse, processDueEvents } from '@/server/ai/community/engine';
import { PageContainer } from '@/components/page-container';

export const metadata = { title: '朋友圈' };
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

  return (
    <PageContainer className="space-y-4 pt-4">
      <Composer userName={profile?.name ?? '你'} />
      {posts.length === 0 ? (
        <div className="rounded-3xl border border-line surface">
          <EmptyState
            icon="🌌"
            title="你的世界还静悄悄的"
            description="发布第一条动态，或者去私信页和 AI 居民们打个招呼吧"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
