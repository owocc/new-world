'use client';

import {usePathname, useRouter} from 'next/navigation';
import {TabList, Tab} from '@astryxdesign/core/TabList';

const ITEMS = [
  {href: '/settings', label: '通用'},
  {href: '/settings/appearance', label: '外观'},
  {href: '/settings/account', label: '账号'},
];

export function SettingsNav() {
  const pathname = usePathname();
  const router = useRouter();
  const current = ITEMS.find((i) => pathname === i.href)?.href ?? '/settings';
  return (
    <nav aria-label="设置分区">
      <TabList value={current} onChange={(v) => router.push(v)} overflow="scroll" hasDivider>
        {ITEMS.map((item) => (
          <Tab key={item.href} value={item.href} label={item.label} />
        ))}
      </TabList>
    </nav>
  );
}
