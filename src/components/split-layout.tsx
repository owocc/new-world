'use client';

import { usePathname } from 'next/navigation';
import * as stylex from '@stylexjs/stylex';
import { useResizable, ResizeHandle } from '@astryxdesign/core/Resizable';

const styles = stylex.create({
  root: {display: 'flex', height: '100%', minHeight: 0, width: '100%', overflow: 'hidden'},
  sidebar: {
    display: 'flex',
    height: '100%',
    flexShrink: 0,
    flexDirection: 'column',
    overflow: 'hidden',
    width: '100%',
    '@media (min-width: 640px)': {
      borderRight: '1px solid var(--color-border-emphasized)',
    },
    '@media (min-width: 768px)': {width: 'var(--split-sidebar-width)'},
  },
  sidebarHidden: {display: 'none', '@media (min-width: 640px)': {display: 'flex'}},
  handle: {display: 'none', '@media (min-width: 640px)': {display: 'flex'}},
  detail: {
    minHeight: 0,
    minWidth: 0,
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',
    '@media (min-width: 640px)': {
      border: '1px solid var(--color-border-emphasized)',
      borderRadius: 'var(--radius-container)',
    },
  },
  detailVisible: {display: 'flex'},
  detailHidden: {display: 'none', '@media (min-width: 640px)': {display: 'flex'}},
  detailScroll: {
    height: '100%',
    minHeight: 0,
    width: '100%',
    flex: 1,
    overflowY: 'auto',
    padding: 'var(--spacing-6)',
    '@media (min-width: 1024px)': {padding: 'var(--spacing-8)'},
  },
  detailInner: {width: '100%', paddingBottom: 'var(--spacing-12)'},
});

function parseSidebarWidth(value: number | string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = String(value).match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 280;
}
export interface SplitLayoutProps {
  /** Root pathname for the master list (e.g. '/messages', '/settings', '/groups') */
  rootPath: string;
  /** Width of the master sidebar in pixels. Legacy utility strings are also accepted. */
  sidebarWidth?: number | string;
  /** Secondary sidebar content (e.g. ConversationList, SettingsSidebar) */
  sidebar: React.ReactNode;
  /** Main detail content (children) */
  children: React.ReactNode;
  /** Whether the detail pane should have standard padding and scroll wrapper */
  scrollableDetail?: boolean;
  /** Allow dragging the sidebar edge to resize it (desktop only, persisted per rootPath) */
  resizable?: boolean;
}

/**
 * Universal Next.js nested layout shell for 2-column master-detail views (Chats, Settings).
 *
 * Layout Structure:
 * - Column 2 (Sidebar): default 280~320px, resizable on desktop when `resizable`, always visible on tablet/desktop.
 * - Column 3 (Detail Pane): directly occupies the rest of the content area.
 *
 * Responsiveness:
 * - Desktop/Tablet (sm+, >=640px): Sidebar + Detail Pane always side-by-side, separated by a border.
 * - Mobile Phone (<640px): If at rootPath, show sidebar full-screen; if in subroute, show detail full-screen.
 */
export function SplitLayout({
  rootPath,
  sidebarWidth = 280,
  sidebar,
  children,
  scrollableDetail = false,
  resizable = false,
}: SplitLayoutProps) {
  const pathname = usePathname();
  const inDetail = pathname !== rootPath;
  const sidebarWidthPx = parseSidebarWidth(sidebarWidth);
  const resizableState = useResizable({
    defaultSize: sidebarWidthPx,
    minSizePx: 240,
    maxSizePx: 520,
    snaps: [280, 320, 400],
    autoSaveId: `split-sidebar-${rootPath.replace(/\//g, '-')}`,
  });
  const effectiveWidth = resizable ? resizableState.size : sidebarWidthPx;

  return (
    <div {...stylex.props(styles.root)}>
      {/* Secondary Sidebar (Column 2) */}
      <aside
        {...stylex.props(styles.sidebar, inDetail && styles.sidebarHidden)}
        style={{'--split-sidebar-width': `${effectiveWidth}px`} as React.CSSProperties}
      >
        {sidebar}
      </aside>

      {/* Drag handle — resizes the sidebar on desktop */}
      {resizable && (
        <ResizeHandle
          direction="horizontal"
          resizable={resizableState.props}
          label="调整侧边栏大小"
          xstyle={styles.handle}
        />
      )}

      {/* Right Detail Pane (Column 3) — directly occupies the remaining width */}
      <section {...stylex.props(styles.detail, inDetail ? styles.detailVisible : styles.detailHidden)}>
        {scrollableDetail ? (
          <div {...stylex.props(styles.detailScroll)}>
            <div {...stylex.props(styles.detailInner)}>{children}</div>
          </div>
        ) : (
          children
        )}
      </section>
    </div>
  );
}
