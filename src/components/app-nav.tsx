'use client';

import {usePathname} from 'next/navigation';
import {AppShell} from '@astryxdesign/core/AppShell';
import {TopNav, TopNavHeading} from '@astryxdesign/core/TopNav';
import {SideNav, SideNavItem, SideNavSection} from '@astryxdesign/core/SideNav';
import {Badge} from '@astryxdesign/core/Badge';
import {DropdownMenu} from '@astryxdesign/core/DropdownMenu';
import {Avatar} from '@astryxdesign/core/Avatar';
import {Text} from '@astryxdesign/core/Text';
import {
  Bell,
  Globe,
  Heart,
  MessageCircle,
  Moon,
  Settings,
  Sun,
  SunMoon,
  Users,
  BarChart3,
  Check,
} from 'lucide-react';
import {useThemeMode} from '@/components/providers';

export type ShellUser = {
  name: string;
  email: string;
  image: string | null;
};

function UnreadBadge({count}: {count: number}) {
  if (count <= 0) return null;
  return <Badge variant="orange" label={count > 99 ? '99+' : String(count)} />;
}

const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + '/');

function CommunityNavItems({
  unreadMessages,
  unreadNotifications,
}: {
  unreadMessages: number;
  unreadNotifications: number;
}) {
  const pathname = usePathname();
  return (
    <>
      <SideNavItem
        href="/feed"
        label="世界"
        icon={<Globe size={18} strokeWidth={2} />}
        isSelected={isActive(pathname, '/feed') || isActive(pathname, '/post')}
      />
      <SideNavItem
        href="/messages"
        label="私信"
        icon={<MessageCircle size={18} strokeWidth={2} />}
        isSelected={isActive(pathname, '/messages')}
        endContent={<UnreadBadge count={unreadMessages} />}
      />
      <SideNavItem
        href="/characters"
        label="居民"
        icon={<Users size={18} strokeWidth={2} />}
        isSelected={isActive(pathname, '/characters')}
      />
      <SideNavItem
        href="/notifications"
        label="通知"
        icon={<Bell size={18} strokeWidth={2} />}
        isSelected={isActive(pathname, '/notifications')}
        endContent={<UnreadBadge count={unreadNotifications} />}
      />
    </>
  );
}

function UtilityNavItems() {
  const pathname = usePathname();
  return (
    <>
      <SideNavItem
        href="/usage"
        label="用量"
        icon={<BarChart3 size={18} strokeWidth={2} />}
        isSelected={isActive(pathname, '/usage')}
      />
      <SideNavItem
        href="/settings"
        label="设置"
        icon={<Settings size={18} strokeWidth={2} />}
        isSelected={isActive(pathname, '/settings')}
      />
    </>
  );
}

function ThemeMenu() {
  const {mode, setMode} = useThemeMode();
  return (
    <DropdownMenu
      button={{
        label: '切换主题',
        isIconOnly: true,
        variant: 'ghost',
        icon: mode === 'dark' ? <Moon size={18} /> : mode === 'light' ? <Sun size={18} /> : <SunMoon size={18} />,
      }}
      hasChevron={false}
      items={[
        {label: '浅色', icon: <Sun size={16} />, endContent: mode === 'light' ? <Check size={15} /> : undefined, onClick: () => setMode('light')},
        {label: '深色', icon: <Moon size={16} />, endContent: mode === 'dark' ? <Check size={15} /> : undefined, onClick: () => setMode('dark')},
        {label: '跟随系统', icon: <SunMoon size={16} />, endContent: mode === 'system' ? <Check size={15} /> : undefined, onClick: () => setMode('system')},
      ]}
    />
  );
}

export function AppNav({
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

  const sideNav = (
    <SideNav footerIcons={<ThemeMenu />}>
      <SideNavSection title="社区">
        <CommunityNavItems
          unreadMessages={unreadMessages}
          unreadNotifications={unreadNotifications}
        />
      </SideNavSection>
      <SideNavSection title="工具">
        <UtilityNavItems />
      </SideNavSection>
    </SideNav>
  );

  return (
    <AppShell
      height="fill"
      contentPadding={0}
      sideNav={sideNav}
      topNav={
        <TopNav
          label="我的世界"
          heading={
            <TopNavHeading
              logo={
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-on-accent">
                  <Heart size={15} fill="currentColor" strokeWidth={0} />
                </span>
              }
              heading="我的世界"
              headingHref="/feed"
            />
          }
          endContent={
            <div className="flex items-center gap-1">
              <ThemeMenu />
              <Avatar
                name={user.name}
                src={user.image ?? undefined}
                size={32}
                tooltip={false}
                href="/settings/account"
              />
            </div>
          }
        />
      }
    >
      {children}
    </AppShell>
  );
}
