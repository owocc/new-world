import { NotificationSettings } from '@/components/settings/notification-settings';
import { requireUserId } from '@/lib/session';
import { getNotificationPrefs, DEFAULT_NOTIFICATION_PREFS } from '@/server/settings';

export const metadata = { title: '通知管理' };
export const dynamic = 'force-dynamic';

export default async function SettingsNotificationsPage() {
  const userId = await requireUserId();
  const prefs = await getNotificationPrefs(userId);

  return <NotificationSettings initialPrefs={prefs ?? DEFAULT_NOTIFICATION_PREFS} />;
}
