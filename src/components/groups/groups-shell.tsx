'use client';

import { usePathname } from 'next/navigation';
import type { GroupView } from '@/server/groups';
import { GroupList } from '@/components/groups/group-list';

/**
 * Group messaging frame: group list + chat side by side on desktop (split
 * view). On mobile the list and each group chat are separate full screens.
 */
export function GroupsShell({
  groups,
  children,
}: {
  groups: GroupView[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const inGroup = pathname.startsWith('/groups/') && pathname !== '/groups';

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* group list: fixed budget column on desktop; full screen on mobile unless a group is open */}
      <aside
        className={`w-full shrink-0 overflow-hidden border-border md:h-full md:w-[320px] md:border-r ${
          inGroup ? 'hidden md:block' : 'block'
        }`}
      >
        <GroupList groups={groups} />
      </aside>
      {/* chat column: full screen on mobile when a group is open */}
      <section
        className={`min-h-0 min-w-0 flex-1 flex-col ${inGroup ? 'flex' : 'hidden md:flex'}`}
      >
        {children}
      </section>
    </div>
  );
}
