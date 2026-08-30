import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import * as stylex from '@stylexjs/stylex';
import { colorVars } from '@astryxdesign/core/theme/tokens.stylex';

const styles = stylex.create({
  bar: {
    display: 'none',
    '@media (max-width: 639px)': {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      paddingInline: '12px',
      paddingBlock: '10px',
      backgroundColor: colorVars['--color-background-surface'],
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: colorVars['--color-border'],
      color: colorVars['--color-text-primary'],
      textDecoration: 'none',
      flexShrink: 0,
    },
  },
  label: {
    fontSize: '14px',
    fontWeight: 'var(--font-weight-medium)',
  },
});

/**
 * 移动端二级页面的通用返回栏（桌面端不渲染）。
 * 用于没有自带返回按钮的二级页面（如设置子页、角色详情、新建群聊），
 * 配合 AppNav 在二级页面隐藏底部 Tab 栏，保证移动端仍有返回上级的入口。
 */
export function MobileBackBar({ href, label = '返回' }: { href: string; label?: string }) {
  return (
    <Link href={href} aria-label={label} {...stylex.props(styles.bar)}>
      <ArrowLeft size={18} />
      <span {...stylex.props(styles.label)}>{label}</span>
    </Link>
  );
}
