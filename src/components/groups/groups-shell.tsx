'use client';

import type { GroupView } from '@/server/groups';
import { GroupList } from '@/components/groups/group-list';
import { SplitLayout } from '@/components/split-layout';

export function GroupsShell({
  groups,
  children,
}: {
  groups: GroupView[];
  children: React.ReactNode;
}) {
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
