import {SettingsNav} from '@/components/settings/settings-nav';

export const metadata = {title: '设置'};

export default function SettingsLayout({children}: {children: React.ReactNode}) {
  return (
    <div className="mx-auto w-full max-w-[680px] px-4 pb-10 pt-4">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">设置</h1>
      <SettingsNav />
      <div className="pt-6">{children}</div>
    </div>
  );
}
