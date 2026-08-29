'use client';

import { usePathname } from 'next/navigation';

export interface SplitLayoutProps {
  /** Root pathname for the master list (e.g. '/messages', '/settings', '/groups') */
  rootPath: string;
  /** Width class for the master sidebar (e.g. 'md:w-[320px]', 'md:w-[240px]'). Defaults to 'md:w-[320px]' */
  sidebarWidth?: string;
  /** Secondary sidebar content (e.g. ConversationList, SettingsSidebar) */
  sidebar: React.ReactNode;
  /** Main detail content (children) */
  children: React.ReactNode;
  /** Whether the detail pane should have internal scroll + standard padding by default */
  scrollableDetail?: boolean;
}

/**
 * Unified Next.js nested layout shell for 2-column master-detail views
 * (Chats, Settings, Contacts, etc.).
 *
 * Responsiveness:
 * - Desktop (md+): Left sidebar (fixed width) + Right detail pane side-by-side.
 * - Mobile (< md): If at rootPath, show sidebar full-screen; if in subroute, show detail full-screen.
 */
export function SplitLayout({
  rootPath,
  sidebarWidth = 'md:w-[320px]',
  sidebar,
  children,
  scrollableDetail = false,
}: SplitLayoutProps) {
  const pathname = usePathname();
  // Check if user is on a detail subroute (not exactly at rootPath)
  const inDetail = pathname !== rootPath;

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      {/* Master sidebar: fixed column on desktop; full screen on mobile unless in detail */}
      <aside
        className={`w-full shrink-0 overflow-hidden border-border md:h-full ${sidebarWidth} md:border-r ${
          inDetail ? 'hidden md:block' : 'block'
        }`}
      >
        {sidebar}
      </aside>

      {/* Detail pane */}
      <section
        className={`min-h-0 min-w-0 flex-1 flex-col ${
          scrollableDetail ? 'overflow-y-auto p-4 sm:p-6 lg:p-8' : ''
        } ${inDetail ? 'flex' : 'hidden md:flex'}`}
      >
        {scrollableDetail ? (
          <div className="mx-auto w-full max-w-[720px] pb-12">{children}</div>
        ) : (
          children
        )}
      </section>
    </div>
  );
}
