import {and, eq, sql} from 'drizzle-orm';
import {db} from '@/db';
import {notifications} from '@/db/schema';
import {AppNav} from '@/components/app-nav';
import {requireUserId} from '@/lib/session';
import {getUserProfile} from '@/server/feed';
import {totalUnreadMessages} from '@/server/chat';
import {totalUnreadGroupMessages} from '@/server/groups';
import {getRecentNotifications} from '@/server/actions/feed';

export default async function AppLayout({children}: {children: React.ReactNode}) {
  const userId = await requireUserId();
  const [profile, unreadMsgs, unreadGroups, unreadNotifs, initialNotifs] = await Promise.all([
    getUserProfile(userId),
    totalUnreadMessages(userId),
    totalUnreadGroupMessages(userId),
    db
      .select({count: sql<number>`CAST(count(*) AS INTEGER)`})
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false))),
    getRecentNotifications(10),
  ]);

  return (
    <AppNav
      user={{
        name: profile?.name ?? '我',
        email: profile?.email ?? '',
        image: profile?.image ?? null,
      }}
      unreadMessages={unreadMsgs}
      unreadGroups={unreadGroups}
      unreadNotifications={unreadNotifs[0]?.count ?? 0}
      initialNotifications={initialNotifs}
    >
      {children}
    </AppNav>
  );
}
