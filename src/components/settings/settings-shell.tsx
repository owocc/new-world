'use client';

import { usePathname } from 'next/navigation';
import { SettingsSidebar } from './settings-sidebar';

/**
 * Settings frame: categorized settings sidebar + detail pane side by side on desktop.
 * On mobile, the settings sidebar and each settings page are separate full screens.
 */
export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // On mobile (< md): if exactly at `/settings`, show sidebar menu; otherwise show detail
  const inDetail = pathname !== '/settings';

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      {/* Settings Navigation Sidebar: 240px column on md+ screens */}
      <aside
        className={`w-full shrink-0 overflow-y-auto border-border md:h-full md:w-[240px] md:border-r ${
          inDetail ? 'hidden md:block' : 'block'
        }`}
      >
        <SettingsSidebar />
      </aside>

      {/* Settings Detail Pane */}
      <section
        className={`min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6 lg:p-8 ${
          inDetail ? 'flex' : 'hidden md:flex'
        }`}
      >
        <div className="mx-auto w-full max-w-[720px] pb-12">{children}</div>
      </section>
    </div>
  );
}
