'use client';

import {usePathname, useRouter} from 'next/navigation';
import {TabList, Tab} from '@astryxdesign/core/TabList';

const ITEMS = [
  {href: '/settings', label: '通用'},
  {href: '/settings/providers', label: 'AI 服务商'},
  {href: '/settings/models', label: '模型与价格'},
  {href: '/settings/vision', label: '图片理解'},
  {href: '/settings/developer', label: '开发者'},
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
