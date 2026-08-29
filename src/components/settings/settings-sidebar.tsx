'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sliders,
  User,
  Palette,
  BarChart3,
  Bell,
  Cpu,
  Sparkles,
} from 'lucide-react';

const SECTIONS = [
  {
    title: '基础设置',
    items: [
      {
        href: '/settings/general',
        label: '通用设置',
        icon: Sliders,
        isMatch: (p: string) => p === '/settings' || p.startsWith('/settings/general'),
      },
      {
        href: '/settings/account',
        label: '账户与资料',
        icon: User,
        isMatch: (p: string) => p.startsWith('/settings/account'),
      },
      {
        href: '/settings/appearance',
        label: '外观与主题',
        icon: Palette,
        isMatch: (p: string) => p.startsWith('/settings/appearance'),
      },
    ],
  },
  {
    title: '工具与数据',
    items: [
      {
        href: '/settings/usage',
        label: '用量统计',
        icon: BarChart3,
        isMatch: (p: string) => p.startsWith('/settings/usage'),
      },
      {
        href: '/settings/notifications',
        label: '通知中心',
        icon: Bell,
        isMatch: (p: string) => p.startsWith('/settings/notifications'),
      },
    ],
  },
  {
    title: 'AI 配置',
    items: [
      {
        href: '/settings/providers',
        label: 'AI 服务商',
        icon: Cpu,
        isMatch: (p: string) => p.startsWith('/settings/providers'),
      },
      {
        href: '/settings/models',
        label: '模型与价格',
        icon: Sparkles,
        isMatch: (p: string) => p.startsWith('/settings/models'),
      },
    ],
  },
];

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col py-4">
      {/* Sidebar Header */}
      <div className="px-4 pb-3">
        <h1 className="text-xl font-semibold tracking-tight">系统设置</h1>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-1" aria-label="设置导航">
        {SECTIONS.map((sec) => (
          <div key={sec.title} className="space-y-0.5">
            <span className="block px-3 pb-1 text-[11px] font-medium text-secondary">
              {sec.title}
            </span>
            {sec.items.map((item) => {
              const Icon = item.icon;
              const isActive = item.isMatch(pathname);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mx-2 mb-0.5 flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-muted font-semibold text-primary'
                      : 'text-secondary hover:bg-muted hover:text-primary'
                  }`}
                >
                  <Icon
                    size={16}
                    className={isActive ? 'text-accent' : 'text-secondary'}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );
}
