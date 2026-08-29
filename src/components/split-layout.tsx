'use client';

import { usePathname } from 'next/navigation';

export interface SplitLayoutProps {
  /** Root pathname for the master list (e.g. '/messages', '/settings', '/groups') */
  rootPath: string;
  /** Width class for the master sidebar (e.g. 'sm:w-[300px]', 'sm:w-[240px]'). Defaults to 'sm:w-[300px]' */
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
 * - Left column (Sidebar): fixed width (280px~300px), always visible on tablet/desktop.
 * - Right column (Detail Panel): floating embedded card with all 4 corners rounded (rounded-2xl),
 *   clean breathing margin on all sides, border, and surface background.
 *
 * Responsiveness:
 * - Desktop/Tablet (sm+, >=640px): Sidebar + Embedded Right Panel always side-by-side.
 * - Mobile Phone (<640px): If at rootPath, show sidebar full-screen; if in subroute, show detail full-screen.
 */
export function SplitLayout({
  rootPath,
  sidebarWidth = 'sm:w-[300px]',
  sidebar,
  children,
  scrollableDetail = false,
}: SplitLayoutProps) {
  const pathname = usePathname();
  // Check if user is on a detail subroute (not exactly at rootPath)
  const inDetail = pathname !== rootPath;

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-body">
      {/* Secondary Sidebar (Column 2): always visible on sm+ (>=640px) */}
      <aside
        className={`${
          inDetail ? 'hidden sm:flex' : 'flex'
        } h-full w-full shrink-0 flex-col overflow-hidden border-border bg-surface ${sidebarWidth} sm:border-r`}
      >
        {sidebar}
      </aside>

      {/* Right Detail Pane (Column 3): embedded rounded-2xl card with surrounding margins */}
      <section
        className={`${
          inDetail ? 'flex' : 'hidden sm:flex'
        } min-h-0 min-w-0 flex-1 flex-col sm:p-2.5`}
      >
        <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden sm:rounded-2xl sm:border sm:border-border sm:bg-surface sm:shadow-xs">
          {scrollableDetail ? (
            <div className="h-full min-h-0 w-full flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              <div className="mx-auto w-full max-w-[720px] pb-12">{children}</div>
            </div>
          ) : (
            children
          )}
        </div>
      </section>
    </div>
  );
}
