import {and, eq, sql} from 'drizzle-orm';
import {db} from '@/db';
import {notifications} from '@/db/schema';
import {AppNav} from '@/components/app-nav';
import {requireUserId} from '@/lib/session';
import {getUserProfile} from '@/server/feed';
import {totalUnreadMessages} from '@/server/chat';

export default async function AppLayout({children}: {children: React.ReactNode}) {
  const userId = await requireUserId();
  const [profile, unreadMsgs, unreadNotifs] = await Promise.all([
    getUserProfile(userId),
    totalUnreadMessages(userId),
    db
      .select({count: sql<number>`CAST(count(*) AS INTEGER)`})
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false))),
  ]);

  return (
    <AppNav
      user={{
        name: profile?.name ?? '我',
        email: profile?.email ?? '',
        image: profile?.image ?? null,
      }}
      unreadMessages={unreadMsgs}
      unreadNotifications={unreadNotifs[0]?.count ?? 0}
    >
      {children}
    </AppNav>
  );
}
