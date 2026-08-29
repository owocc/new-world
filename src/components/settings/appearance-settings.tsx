'use client';

import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Section} from '@astryxdesign/core/Section';
import {VStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {useThemeMode} from '@/components/providers';

export function AppearanceSettings() {
  const {mode, setMode} = useThemeMode();
  return (
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
  );
}
