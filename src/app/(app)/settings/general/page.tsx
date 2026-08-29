import { GeneralSettings } from '@/components/settings/general-settings';
import { requireUserId } from '@/lib/session';
import { getUserProfile } from '@/server/feed';

export const metadata = { title: '通用设置' };
export const dynamic = 'force-dynamic';

export default async function SettingsGeneralPage() {
  const userId = await requireUserId();
  const profile = await getUserProfile(userId);

  return (
    <GeneralSettings
      profile={{ name: profile?.name ?? '', bio: profile?.bio ?? null }}
    />
  );
}
