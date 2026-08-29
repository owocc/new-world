import { SettingsSidebar } from '@/components/settings/settings-sidebar';
import { SplitLayout } from '@/components/split-layout';

export const metadata = { title: '设置' };

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
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
