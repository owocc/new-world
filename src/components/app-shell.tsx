'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  MessageCircle,
  Users,
  BarChart3,
  Settings,
  Bell,
  PenLine,
} from 'lucide-react';
import { Avatar } from '@/components/avatar';
import { ThemeToggle } from '@/components/theme-toggle';

export type ShellUser = {
  name: string;
  email: string;
  image: string | null;
  bio: string | null;
};

const NAV = [
  { href: '/feed', label: '朋友圈', icon: Home },
  { href: '/messages', label: '私信', icon: MessageCircle },
  { href: '/characters', label: 'AI 居民', icon: Users },
  { href: '/usage', label: '用量', icon: BarChart3 },
];

const SETTINGS_NAV = { href: '/settings', label: '设置', icon: Settings };

export function AppShell({
  user,
  unreadMessages,
  unreadNotifications,
  children,
}: {
  user: ShellUser;
  unreadMessages: number;
  unreadNotifications: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const badge = (n: number) =>
    n > 0 ? (
      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
        {n > 99 ? '99+' : n}
      </span>
    ) : null;

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line surface px-3 py-5 lg:flex xl:w-64">
        <Link href="/feed" className="mb-6 flex items-center gap-2 px-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-accent-400)] to-[var(--color-accent-600)] text-sm font-bold text-white">
            我
          </span>
          <span className="text-lg font-bold tracking-tight">我的世界</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors ${
                isActive(href)
                  ? 'bg-[var(--color-accent-50)] text-[var(--color-accent-700)] dark:bg-[color-mix(in_srgb,var(--color-accent-500)_15%,transparent)] dark:text-[var(--color-accent-300)]'
                  : 'text-secondary hover:surface-2'
              }`}
            >
              <Icon size={20} strokeWidth={2} />
              {label}
              {href === '/messages' && badge(unreadMessages)}
            </Link>
          ))}

          <div className="my-2 h-px bg-[var(--border)]" />

          {[SETTINGS_NAV].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors ${
                isActive(href) ? 'surface-2' : 'text-secondary hover:surface-2'
              }`}
            >
              <Icon size={20} strokeWidth={2} />
              {label}
            </Link>
          ))}

          <Link
            href="/notifications"
            className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors ${
              isActive('/notifications') ? 'surface-2' : 'text-secondary hover:surface-2'
            }`}
          >
            <Bell size={20} strokeWidth={2} />
            通知
            {badge(unreadNotifications)}
          </Link>
        </nav>

        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-line p-3">
          <Avatar name={user.name} emoji="🧑" url={user.image} size={38} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{user.name}</div>
            <div className="truncate text-xs text-muted">{user.email}</div>
          </div>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line surface px-4 lg:hidden">
        <Link href="/feed" className="flex items-center gap-2 font-bold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-accent-400)] to-[var(--color-accent-600)] text-xs font-bold text-white">
            我
          </span>
          我的世界
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/notifications" className="relative flex h-9 w-9 items-center justify-center rounded-full text-secondary">
            <Bell size={20} />
            {badge(unreadNotifications)}
          </Link>
          <ThemeToggle />
          <Link href="/settings/account" className="ml-1">
            <Avatar name={user.name} emoji="🧑" url={user.image} size={32} />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="min-w-0 lg:pl-60 xl:pl-64">
        <div className="pb-20 lg:pb-0">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch justify-around border-t border-line surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] ${
              isActive(href) ? 'text-[var(--color-accent-600)] dark:text-[var(--color-accent-300)]' : 'text-muted'
            }`}
          >
            <span className="relative">
              <Icon size={22} strokeWidth={isActive(href) ? 2.4 : 2} />
              {href === '/messages' && badge(unreadMessages)}
            </span>
            {label}
          </Link>
        ))}
        <Link
          href="/settings"
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] ${
            isActive('/settings') ? 'text-[var(--color-accent-600)] dark:text-[var(--color-accent-300)]' : 'text-muted'
          }`}
        >
          <Settings size={22} strokeWidth={2} />
          设置
        </Link>
      </nav>
    </div>
  );
}

export function ComposerFab({ href = '/feed' }: { href?: string }) {
  return (
    <Link
      href={href}
      className="fixed bottom-20 right-4 z-30 flex h-13 w-13 items-center justify-center rounded-2xl bg-[var(--color-accent-600)] p-3.5 text-white shadow-lg shadow-accent/25 transition-transform active:scale-95 lg:hidden"
      aria-label="发布动态"
    >
      <PenLine size={22} />
    </Link>
  );
}
