'use client';

import {usePathname} from 'next/navigation';
import {AppShell} from '@astryxdesign/core/AppShell';
import {TopNav, TopNavHeading} from '@astryxdesign/core/TopNav';
import {
  SideNav,
  SideNavItem,
  SideNavSection,
} from '@astryxdesign/core/SideNav';
import {Badge} from '@astryxdesign/core/Badge';
import {DropdownMenu} from '@astryxdesign/core/DropdownMenu';
import {Avatar} from '@astryxdesign/core/Avatar';
import {
  Bell,
  Compass,
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
import {NotificationPopover} from '@/components/notification-popover';
import type {NotificationItem} from '@/server/actions/feed';

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

function MainNavItems({
  unreadChats = 0,
}: {
  unreadChats: number;
}) {
  const pathname = usePathname();
  return (
    <>
      <SideNavItem
        href="/messages"
        label="聊天"
        icon={<MessageCircle size={18} strokeWidth={2} />}
        isSelected={isActive(pathname, '/messages') || isActive(pathname, '/groups')}
        endContent={<UnreadBadge count={unreadChats} />}
      />
      <SideNavItem
        href="/characters"
        label="联系人"
        icon={<Users size={18} strokeWidth={2} />}
        isSelected={isActive(pathname, '/characters')}
      />
      <SideNavItem
        href="/feed"
        label="朋友圈"
        icon={<Compass size={18} strokeWidth={2} />}
        isSelected={isActive(pathname, '/feed') || isActive(pathname, '/post')}
      />
    </>
  );
}
function UtilityNavItems() {
  const pathname = usePathname();
  return (
    <>
      <SideNavItem
        href="/settings"
        label="设置"
        icon={<Settings size={18} strokeWidth={2} />}
        isSelected={
          isActive(pathname, '/settings') ||
          isActive(pathname, '/usage') ||
          isActive(pathname, '/notifications')
        }
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
  const totalUnreadChats = unreadMessages + unreadGroups;

  const sideNav = (
    <SideNav
      collapsible={true}
      footerIcons={<ThemeMenu />}
    >
      <SideNavSection title="社区">
        <MainNavItems unreadChats={totalUnreadChats} />
      </SideNavSection>
      <SideNavSection title="系统">
        <UtilityNavItems />
      </SideNavSection>
    </SideNav>
  );

  return (
    <AppShell
      variant="wash"
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
            <div className="flex items-center gap-1.5">
              <NotificationPopover
                initialNotifications={initialNotifications}
                initialUnreadCount={unreadNotifications}
              />
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
