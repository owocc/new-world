'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@astryxdesign/core/Button';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { UserAvatar } from '@/components/user-avatar';
import { TimeAgo } from '@/components/time-ago';
import type { GroupView } from '@/server/groups';
import { Plus } from 'lucide-react';

export function GroupList({
  groups,
}: {
  groups: GroupView[];
}) {
  const pathname = usePathname();
  const hiddenOnMobile = pathname !== '/groups';
  const activeId = pathname.startsWith('/groups/') ? pathname.split('/')[2] : undefined;

  return (
    <div className={`flex h-full flex-col ${hiddenOnMobile ? 'hidden lg:flex' : 'flex'}`}>
      {/* Header — identical to ConversationList */}
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <h1 className="text-xl font-semibold tracking-tight">群聊</h1>
        <Link href="/groups/new">
          <Button label="新建" variant="ghost" size="sm" icon={<Plus size={15} />} />
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <Text type="supporting" as="p">
            还没有群聊，点击右上角新建一个吧
          </Text>
        </div>
      ) : (
        <nav className="flex-1 overflow-y-auto" aria-label="群聊列表">
          {groups.map((g) => {
            const isActive = activeId === g.id;
            return (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                aria-current={isActive ? 'page' : undefined}
                className={`mx-2 mb-0.5 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors ${
                  isActive ? 'bg-muted' : 'hover:bg-muted'
                }`}
              >
                <UserAvatar
                  name={g.name}
                  emoji={g.avatarEmoji}
                  color={g.avatarColor}
                  url={g.avatarUrl}
                  size={46}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[15px] font-medium">{g.name}</span>
                    {g.lastMessageAt && (
                      <TimeAgo
                        date={g.lastMessageAt}
                        short
                        className="shrink-0 text-xs text-secondary"
                      />
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] text-secondary">
                      {g.lastMessagePreview ?? `${g.memberCount} 位成员`}
                    </span>
                    {g.unreadCount > 0 && (
                      <Badge
                        variant="orange"
                        label={g.unreadCount > 99 ? '99+' : String(g.unreadCount)}
                      />
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
