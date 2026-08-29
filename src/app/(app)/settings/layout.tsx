import Link from 'next/link';
import { PageContainer } from '@/components/page-container';

export const metadata = { title: '设置' };

const ITEMS = [
  { href: '/settings', label: '通用 & AI' },
  { href: '/settings/providers', label: 'AI Providers' },
  { href: '/settings/models', label: '模型与价格' },
  { href: '/settings/appearance', label: '外观' },
  { href: '/settings/account', label: '账号' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageContainer className="pt-4">
      <h1 className="mb-4 text-xl font-bold">设置</h1>
      <div className="flex gap-2 overflow-x-auto pb-3 lg:mb-0">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-xl border border-line surface px-4 py-2 text-sm font-medium text-secondary shadow-sm transition-colors hover:surface-2"
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div className="mt-4">{children}</div>
    </PageContainer>
  );
}
