import { AccountSettings } from '@/components/settings/account-settings';
import { requireUserId } from '@/lib/session';
import { getUserProfile } from '@/server/feed';

export const dynamic = 'force-dynamic';

export default async function AccountSettingsPage() {
  const userId = await requireUserId();
  const profile = await getUserProfile(userId);

  return (
    <AccountSettings
      name={profile?.name ?? ''}
      email={profile?.email ?? ''}
      bio={profile?.bio ?? ''}
      image={profile?.image ?? null}
      createdAt={
        profile?.createdAt
          ? new Date(profile.createdAt).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : ''
      }
    />
  );
}
