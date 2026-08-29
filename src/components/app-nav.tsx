'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

export type ShellUser = {
  name: string;
  email: string;
  image: string | null;
};

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white shadow-xs">
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
    <div className="flex h-screen w-screen overflow-hidden bg-body">
      {/* 
        Column 1: Main Icon Rail 
        Only icon buttons, fixed width (w-16 / 64px), matching WeChat/messenger style
      */}
      <nav
        className="flex w-16 shrink-0 flex-col items-center justify-between py-3.5 select-none"
        aria-label="主导航"
      >
        {/* Top: App Logo + Navigation Icons */}
        <div className="flex flex-col items-center gap-4">
          <Link
            href="/feed"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-on-accent shadow-xs transition-transform hover:scale-105"
            title="我的世界"
          >
            <Heart size={20} fill="currentColor" strokeWidth={0} />
          </Link>

          {/* Navigation Items */}
          <div className="mt-2 flex flex-col items-center gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`group relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all ${
                    item.selected
                      ? 'bg-surface text-accent shadow-xs'
                      : 'text-secondary hover:bg-muted hover:text-primary'
                  }`}
                >
                  <Icon size={22} strokeWidth={item.selected ? 2.2 : 1.8} />
                  {item.badge ? <UnreadBadge count={item.badge} /> : null}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Bottom: Settings, Theme & User Avatar */}
        <div className="flex flex-col items-center gap-3">
          <NotificationPopover
            initialNotifications={initialNotifications}
            initialUnreadCount={unreadNotifications}
          />

          <Link
            href="/settings"
            title="系统设置"
            className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all ${
              isActive(pathname, '/settings') ||
              isActive(pathname, '/usage') ||
              isActive(pathname, '/notifications')
                ? 'bg-surface text-accent shadow-xs'
                : 'text-secondary hover:bg-muted hover:text-primary'
            }`}
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

      {/* 
        Main Area:
        Outer blank padding (p-3 pl-0) + Inner Card (四周圆角 + 描边 + bg-surface + overflow-hidden)
      */}
      <main className="flex min-h-0 min-w-0 flex-1 p-3 pl-0">
        <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
          {children}
        </div>
      </main>
    </div>
  );
}
