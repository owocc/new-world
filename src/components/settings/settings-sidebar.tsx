'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  User,
  Palette,
  BarChart3,
  Bell,
  Cpu,
  Eye,
  Code2,
  FlaskConical,
  Settings2,
} from 'lucide-react';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  root: {display: 'flex', height: '100%', flexDirection: 'column', paddingBlock: '16px'},
  header: {paddingInline: '16px', paddingBottom: '12px'},
  title: {fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', letterSpacing: '-0.01em'},
  nav: {flex: 1, overflowY: 'auto', paddingInline: '4px'},
  section: {marginBottom: '16px'},
  sectionLabel: {display: 'block', paddingInline: '12px', paddingBottom: '4px', fontSize: '11px', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)'},
  item: {display: 'flex', alignItems: 'center', gap: '10px', marginInline: '8px', marginBottom: '2px', borderRadius: 'var(--radius-container)', paddingInline: '10px', paddingBlock: '8px', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', transition: 'background-color 150ms ease, color 150ms ease', ':hover': {backgroundColor: 'var(--color-background-muted)', color: 'var(--color-text-primary)'}},
  activeItem: {backgroundColor: 'var(--color-background-muted)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)'},
  icon: {color: 'var(--color-text-secondary)'},
  activeIcon: {color: 'var(--color-text-accent)'},
});
const SECTIONS = [
  {
    title: '基础设置',
    items: [
      {
        href: '/settings/account',
        label: '账户与资料',
        icon: User,
        isMatch: (p: string) => p === '/settings' || p.startsWith('/settings/account'),
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
      {
        href: '/settings/developer',
        label: '开发者设置',
        icon: Code2,
        isMatch: (p: string) => p === '/settings/developer',
      },
      {
        href: '/settings/developer/test-factory',
        label: '测试场',
        icon: FlaskConical,
        isMatch: (p: string) => p.startsWith('/settings/developer/test-factory'),
      },
    ],
  },
  {
    title: 'AI 配置',
    items: [
      {
        href: '/settings/defaults',
        label: '默认配置',
        icon: Settings2,
        isMatch: (p: string) => p.startsWith('/settings/defaults'),
      },
      {
        href: '/settings/providers',
        label: 'AI 服务商',
        icon: Cpu,
        isMatch: (p: string) => p.startsWith('/settings/providers'),
      },
      {
        href: '/settings/vision',
        label: '图片理解',
        icon: Eye,
        isMatch: (p: string) => p.startsWith('/settings/vision'),
      },
    ],
  },
];

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <div {...stylex.props(styles.root)}>
      {/* Sidebar Header */}
      <div {...stylex.props(styles.header)}>
        <h1 {...stylex.props(styles.title)}>系统设置</h1>
      </div>

      {/* Navigation Sections */}
      <nav {...stylex.props(styles.nav)} aria-label="设置导航">
        {SECTIONS.map((sec) => (
          <div key={sec.title} {...stylex.props(styles.section)}>
            <span {...stylex.props(styles.sectionLabel)}>
              {sec.title}
            </span>
            {sec.items.map((item) => {
              const Icon = item.icon;
              const isActive = item.isMatch(pathname);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  {...stylex.props(styles.item, isActive && styles.activeItem)}
                  >
                    <Icon
                      size={16}
                      {...stylex.props(isActive ? styles.activeIcon : styles.icon)}
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
