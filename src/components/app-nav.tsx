'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as stylex from '@stylexjs/stylex';
import { colorVars, radiusVars, shadowVars } from '@astryxdesign/core/theme/tokens.stylex';
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';
import { UserAvatar } from '@/components/user-avatar';
import {
  Compass,
  Heart,
  MessageCircle,
  Moon,
  Settings,
  Sun,
  SunMoon,
  Users,
  Check,
} from 'lucide-react';
import { useThemeMode } from '@/components/providers';
import { NotificationPopover } from '@/components/notification-popover';
import type { NotificationItem } from '@/server/actions/feed';

const styles = stylex.create({
  shell: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    backgroundColor: colorVars['--color-background-body'],
  },
  rail: {
    display: 'flex',
    width: 64,
    flexShrink: 0,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBlock: 14,
    userSelect: 'none',
  },
  top: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    rowGap: 16,
  },
  logo: {
    display: 'flex',
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radiusVars['--radius-container'],
    backgroundColor: colorVars['--color-accent'],
    color: colorVars['--color-on-accent'],
    boxShadow: shadowVars['--shadow-low'],
    transitionProperty: 'transform',
    transitionDuration: '175ms',
    ':hover': {
      transform: 'scale(1.05)',
    },
  },
  navGroup: {
    display: 'flex',
    marginTop: 8,
    flexDirection: 'column',
    alignItems: 'center',
    rowGap: 8,
  },
  navItem: {
    position: 'relative',
    display: 'flex',
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radiusVars['--radius-page'],
    transitionProperty: 'background-color, color, box-shadow',
    transitionDuration: '175ms',
  },
  navSelected: {
    backgroundColor: colorVars['--color-background-surface'],
    color: colorVars['--color-text-accent'],
    boxShadow: shadowVars['--shadow-low'],
  },
  navIdle: {
    color: colorVars['--color-text-secondary'],
    ':hover': {
      backgroundColor: colorVars['--color-background-muted'],
      color: colorVars['--color-text-primary'],
    },
  },
  bottom: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    rowGap: 12,
  },
  settings: {
    display: 'flex',
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radiusVars['--radius-page'],
    transitionProperty: 'background-color, color, box-shadow',
    transitionDuration: '175ms',
  },
  settingsActive: {
    backgroundColor: colorVars['--color-background-surface'],
    color: colorVars['--color-text-accent'],
    boxShadow: shadowVars['--shadow-low'],
  },
  settingsIdle: {
    color: colorVars['--color-text-secondary'],
    ':hover': {
      backgroundColor: colorVars['--color-background-muted'],
      color: colorVars['--color-text-primary'],
    },
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    display: 'flex',
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radiusVars['--radius-full'],
    backgroundColor: colorVars['--color-accent'],
    paddingInline: 4,
    color: colorVars['--color-on-accent'],
    fontSize: 10,
    fontWeight: 700,
    boxShadow: shadowVars['--shadow-low'],
  },
  main: {
    display: 'flex',
    minHeight: 0,
    minWidth: 0,
    flex: 1,
    padding: 12,
    paddingLeft: 0,
  },
  card: {
    display: 'flex',
    height: '100%',
    minHeight: 0,
    width: '100%',
    flex: 1,
    overflow: 'hidden',
    border: '1px solid',
    borderColor: colorVars['--color-border'],
    borderRadius: radiusVars['--radius-page'],
    backgroundColor: colorVars['--color-background-surface'],
    boxShadow: shadowVars['--shadow-low'],
  },
});

export type ShellUser = {
  name: string;
  email: string;
  image: string | null;
};
function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span {...stylex.props(styles.unreadBadge)}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + '/');

export function AppNav({
  user,
  unreadMessages,
  unreadGroups = 0,
  unreadNotifications,
  initialNotifications = [],
  children,
}: {
  user: ShellUser;
  unreadMessages: number;
  unreadGroups?: number;
  unreadNotifications: number;
  initialNotifications?: NotificationItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { mode, setMode } = useThemeMode();
  const totalUnreadChats = unreadMessages + unreadGroups;

  const NAV_ITEMS = [
    {
      href: '/messages',
      label: '聊天',
      icon: MessageCircle,
      badge: totalUnreadChats,
      selected: isActive(pathname, '/messages') || isActive(pathname, '/groups'),
    },
    {
      href: '/characters',
      label: '联系人',
      icon: Users,
      selected: isActive(pathname, '/characters'),
    },
    {
      href: '/feed',
      label: '朋友圈',
      icon: Compass,
      selected: isActive(pathname, '/feed') || isActive(pathname, '/post'),
    },
  ];

  return (
    <div {...stylex.props(styles.shell)}>
      <nav {...stylex.props(styles.rail)} aria-label="主导航">
        <div {...stylex.props(styles.top)}>
          <Link
            href="/feed"
            {...stylex.props(styles.logo)}
            title="我的世界"
          >
            <Heart size={20} fill="currentColor" strokeWidth={0} />
          </Link>

          {/* Navigation Items */}
          <div {...stylex.props(styles.navGroup)}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  {...stylex.props(styles.navItem, item.selected ? styles.navSelected : styles.navIdle)}
                >
                  <Icon size={22} strokeWidth={item.selected ? 2.2 : 1.8} />
                  {item.badge ? <UnreadBadge count={item.badge} /> : null}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Bottom: Settings, Theme & User Avatar */}
        <div {...stylex.props(styles.bottom)}>
          <NotificationPopover
            initialNotifications={initialNotifications}
            initialUnreadCount={unreadNotifications}
          />

          <Link
            href="/settings"
            title="系统设置"
            {...stylex.props(
              styles.settings,
              isActive(pathname, '/settings') ||
                isActive(pathname, '/usage') ||
                isActive(pathname, '/notifications')
                ? styles.settingsActive
                : styles.settingsIdle,
            )}
          >
            <Settings size={20} />
          </Link>

          <DropdownMenu
            button={{
              label: '切换主题',
              isIconOnly: true,
              variant: 'ghost',
              icon:
                mode === 'dark' ? (
                  <Moon size={18} />
                ) : mode === 'light' ? (
                  <Sun size={18} />
                ) : (
                  <SunMoon size={18} />
                ),
            }}
            hasChevron={false}
            items={[
              {
                label: '浅色',
                icon: <Sun size={16} />,
                endContent: mode === 'light' ? <Check size={15} /> : undefined,
                onClick: () => setMode('light'),
              },
              {
                label: '深色',
                icon: <Moon size={16} />,
                endContent: mode === 'dark' ? <Check size={15} /> : undefined,
                onClick: () => setMode('dark'),
              },
              {
                label: '跟随系统',
                icon: <SunMoon size={16} />,
                endContent: mode === 'system' ? <Check size={15} /> : undefined,
                onClick: () => setMode('system'),
              },
            ]}
          />

          <UserAvatar
            name={user.name}
            url={user.image}
            size={32}
            tooltip={user.name}
            href="/settings/account"
          />
        </div>
      </nav>

      {/* Main Area */}
      <main {...stylex.props(styles.main)}>
        <div {...stylex.props(styles.card)}>
          {children}
        </div>
      </main>
    </div>
  );
}
