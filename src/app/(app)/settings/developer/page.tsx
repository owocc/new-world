import { DeveloperSettings } from '@/components/settings/developer-settings';
import { requireUserId } from '@/lib/session';
import { getDeveloperConfig, DEFAULT_DEVELOPER_CONFIG } from '@/server/settings';

export const metadata = { title: '开发者设置' };
export const dynamic = 'force-dynamic';

export default async function AiDeveloperPage() {
  const userId = await requireUserId();
  const developer = await getDeveloperConfig(userId);

  return (
    <DeveloperSettings developer={developer ?? DEFAULT_DEVELOPER_CONFIG} />
  );
}
