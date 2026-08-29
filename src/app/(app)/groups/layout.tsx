import { requireUserId } from '@/lib/session';
import { getGroups } from '@/server/groups';
import { GroupList } from '@/components/groups/group-list';
import { SplitLayout } from '@/components/split-layout';

export const metadata = { title: '群聊' };
export const dynamic = 'force-dynamic';

export default async function GroupsLayout({ children }: { children: React.ReactNode }) {
  const userId = await requireUserId();
  const groups = await getGroups(userId);

  return (
    <SplitLayout
      rootPath="/groups"
      sidebarWidth="md:w-[320px]"
      sidebar={<GroupList groups={groups} />}
    >
      {children}
    </SplitLayout>
  );
}
