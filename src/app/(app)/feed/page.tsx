import { after } from 'next/server';
import { redirect } from 'next/navigation';
import { FeedView } from '@/components/feed-view';
import { requireUserId } from '@/lib/session';
import { getOnboardingStatus } from '@/server/onboarding';
import { getFeedPosts, getUserProfile, getFeedCover } from '@/server/feed';
import { getFeedNotifications, getUnreadFeedNotificationCount } from '@/server/actions/feed';
import { maybePulse, processDueEvents } from '@/server/ai/community/engine';

export const metadata = { title: '朋友圈' };
export const dynamic = 'force-dynamic';

export default async function FeedPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string; user?: string }>;
}) {
  const { filter, user } = (await searchParams) ?? {};
  const isMine = filter === 'mine' || user === 'me';

  const userId = await requireUserId();

  // users who have neither finished onboarding nor created any resident are
  // guided through the first-friend tutorial first
  const onboarding = await getOnboardingStatus(userId);
  if (!onboarding.completed && !onboarding.hasCharacters) {
    redirect('/onboarding');
  }

  const [posts, profile, coverUrl, notifications, unreadCount] = await Promise.all([
    getFeedPosts(userId, 30, 0, isMine ? 'mine' : 'all'),
    getUserProfile(userId),
    getFeedCover(userId),
    getFeedNotifications(20),
    getUnreadFeedNotificationCount(),
  ]);

  // opportunistic community heartbeat (only for all feed)
  if (!isMine) {
    after(async () => {
      try {
        await maybePulse(userId);
        await processDueEvents(userId, 3);
      } catch (err) {
        console.error('[feed] pulse failed', err);
      }
    });
  }

  const userName = profile?.name ?? '你';

  return (
    <FeedView
      userName={userName}
      userImage={profile?.image ?? null}
      coverUrl={coverUrl}
      posts={posts}
      isMine={isMine}
      initialNotifications={notifications}
      initialUnreadCount={unreadCount}
    />
  );
}
