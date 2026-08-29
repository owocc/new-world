'use client';

import { SettingsSidebar } from './settings-sidebar';
import { SplitLayout } from '@/components/split-layout';

export function SettingsShell({ children }: { children: React.ReactNode }) {
  return (
    <SplitLayout
      rootPath="/settings"
      sidebarWidth="md:w-[240px]"
      sidebar={<SettingsSidebar />}
      scrollableDetail
    >
      {children}
    </SplitLayout>
  );
}
