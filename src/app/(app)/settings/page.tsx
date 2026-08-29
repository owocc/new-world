import { GeneralSettings } from '@/components/settings/general-settings';
import { requireUserId } from '@/lib/session';
import { getUserProfile } from '@/server/feed';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const userId = await requireUserId();
  const profile = await getUserProfile(userId);

  return (
    <GeneralSettings
      profile={{ name: profile?.name ?? '', bio: profile?.bio ?? null }}
    />
  );
}
