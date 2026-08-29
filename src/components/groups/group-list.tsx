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
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  root: {display: 'flex', height: '100%', flexDirection: 'column'},
  hiddenMobile: {'@media (max-width: 1023px)': {display: 'none'}},
  header: {display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingInline: '16px', paddingTop: '16px', paddingBottom: '12px'},
  title: {fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', letterSpacing: '-0.01em'},
  empty: {paddingInline: '24px', paddingBlock: '40px', textAlign: 'center'},
  nav: {flex: 1, overflowY: 'auto'},
  link: {display: 'flex', alignItems: 'center', gap: '12px', marginInline: '8px', marginBottom: '2px', borderRadius: 'var(--radius-container)', paddingInline: '10px', paddingBlock: '10px', color: 'var(--color-text-secondary)', transition: 'background-color 150ms ease, color 150ms ease', ':hover': {backgroundColor: 'var(--color-overlay-hover)', color: 'var(--color-text-primary)'}},
  activeLink: {backgroundColor: 'var(--color-background-muted)', color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-medium)'},
  content: {minWidth: 0, flex: 1},
  topRow: {display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px'},
  name: {overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-medium)'},
  time: {flexShrink: 0, fontSize: '11px', lineHeight: '1.2', color: 'var(--color-text-secondary)'},
  bottomRow: {display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '2px'},
  preview: {overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)'},
});
export function GroupList({
  groups,
}: {
  groups: GroupView[];
}) {
  const pathname = usePathname();
  const hiddenOnMobile = pathname !== '/groups';
  const activeId = pathname.startsWith('/groups/') ? pathname.split('/')[2] : undefined;

  return (
    <div {...stylex.props(styles.root, hiddenOnMobile && styles.hiddenMobile)}>
      {/* Header — identical to ConversationList */}
      <div {...stylex.props(styles.header)}>
        <h1 {...stylex.props(styles.title)}>群聊</h1>
        <Link href="/groups/new">
          <Button label="新建" variant="ghost" size="sm" icon={<Plus size={15} />} />
        </Link>
      </div>

      {groups.length === 0 ? (
        <div {...stylex.props(styles.empty)}>
          <Text type="supporting" as="p">
            还没有群聊，点击右上角新建一个吧
          </Text>
        </div>
      ) : (
        <nav {...stylex.props(styles.nav)} aria-label="群聊列表">
          {groups.map((g) => {
            const isActive = activeId === g.id;
            return (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                aria-current={isActive ? 'page' : undefined}
                {...stylex.props(styles.link, isActive && styles.activeLink)}
              >
                <UserAvatar
                  name={g.name}
                  emoji={g.avatarEmoji}
                  color={g.avatarColor}
                  url={g.avatarUrl}
                  size={46}
                />
                <div {...stylex.props(styles.content)}>
                  <div {...stylex.props(styles.topRow)}>
                    <span {...stylex.props(styles.name)}>{g.name}</span>
                    {g.lastMessageAt && (
                      <TimeAgo
                        date={g.lastMessageAt}
                        short
                        xstyle={styles.time}
                        style={{ fontSize: '11px', lineHeight: 1.2, color: 'var(--color-text-secondary)' }}
                      />
                    )}
                  </div>
                  <div {...stylex.props(styles.bottomRow)}>
                    <span {...stylex.props(styles.preview)}>
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
