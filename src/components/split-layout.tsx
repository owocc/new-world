'use client';

import { usePathname } from 'next/navigation';

export interface SplitLayoutProps {
  /** Root pathname for the master list (e.g. '/messages', '/settings', '/groups') */
  rootPath: string;
  /** Width class for the master sidebar (e.g. 'w-[280px]', 'w-[220px]'). Defaults to 'w-[280px]' */
  sidebarWidth?: string;
  /** Secondary sidebar content (e.g. ConversationList, SettingsSidebar) */
  sidebar: React.ReactNode;
  /** Main detail content (children) */
  children: React.ReactNode;
  /** Whether the detail pane should have standard padding and scroll wrapper */
  scrollableDetail?: boolean;
}

/**
 * Universal Next.js nested layout shell for 2-column master-detail views (Chats, Settings).
 *
 * Layout Structure:
 * - Column 2 (Sidebar): fixed width (240px~280px), always visible on tablet/desktop.
 * - Column 3 (Detail Pane): directly occupies the rest of the content area.
 *
 * Responsiveness:
 * - Desktop/Tablet (sm+, >=640px): Sidebar + Detail Pane always side-by-side.
 * - Mobile Phone (<640px): If at rootPath, show sidebar full-screen; if in subroute, show detail full-screen.
 */
export function SplitLayout({
  rootPath,
  sidebarWidth = 'w-[280px]',
  sidebar,
  children,
  scrollableDetail = false,
}: SplitLayoutProps) {
  const pathname = usePathname();
  const inDetail = pathname !== rootPath;

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      {/* Secondary Sidebar (Column 2) */}
      <aside
        className={`${
          inDetail ? 'hidden sm:flex' : 'flex'
        } h-full shrink-0 flex-col overflow-hidden border-border ${sidebarWidth} sm:border-r`}
      >
        {sidebar}
      </aside>

      {/* Right Detail Pane (Column 3) — directly occupies the remaining width */}
      <section
        className={`${
          inDetail ? 'flex' : 'hidden sm:flex'
        } min-h-0 min-w-0 flex-1 flex-col overflow-hidden`}
      >
        {scrollableDetail ? (
          <div className="h-full min-h-0 w-full flex-1 overflow-y-auto p-6 lg:p-8">
            <div className="w-full max-w-[760px] pb-12">{children}</div>
          </div>
        ) : (
          children
        )}
      </section>
    </div>
  );
}
