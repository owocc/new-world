'use client';

import Link from 'next/link';
import {ArrowLeft} from 'lucide-react';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Section} from '@astryxdesign/core/Section';
import {VStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {useThemeMode} from '@/components/providers';
export function AppearanceSettings() {
  const {mode, setMode} = useThemeMode();
  return (
    <VStack gap={6}>
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Link
          href="/settings"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-secondary hover:bg-muted lg:hidden"
          aria-label="返回设置菜单"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">外观与主题</h1>
          <p className="text-xs text-secondary">自定义界面色彩与显示偏好</p>
        </div>
      </div>
      <Section variant="transparent" padding={0}>
        <VStack gap={4}>
        <VStack gap={0.5}>
          <h2 className="text-base font-semibold">外观</h2>
          <Text type="supporting" size="sm" as="p">
            选择浅色或深色模式，也可以跟随系统自动切换。
          </Text>
        </VStack>
        <SegmentedControl
          label="主题模式"
          value={mode}
          onChange={(v) => setMode(v as 'light' | 'dark' | 'system')}
          layout="fill"
          className="max-w-sm"
        >
          <SegmentedControlItem value="light" label="浅色" />
          <SegmentedControlItem value="dark" label="深色" />
          <SegmentedControlItem value="system" label="跟随系统" />
        </SegmentedControl>
        </VStack>
      </Section>
    </VStack>
  );
}
