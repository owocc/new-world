import { requireUserId } from '@/lib/session';
import { getGroups } from '@/server/groups';
import { GroupsShell } from '@/components/groups/groups-shell';

export const metadata = { title: '群聊' };
export const dynamic = 'force-dynamic';

export default async function GroupsLayout({ children }: { children: React.ReactNode }) {
  const userId = await requireUserId();
  const groups = await getGroups(userId);

  return <GroupsShell groups={groups}>{children}</GroupsShell>;
}
