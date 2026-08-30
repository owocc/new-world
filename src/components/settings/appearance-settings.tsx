'use client';

import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Section} from '@astryxdesign/core/Section';
import {VStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {useThemeMode} from '@/components/providers';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  header: {display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px'},
  title: {fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', letterSpacing: '-0.01em'},
  subtitle: {fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)'},
  sectionTitle: {fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)'},
  control: {maxWidth: '24rem'},
});
export function AppearanceSettings() {
  const {mode, setMode} = useThemeMode();
  return (
    <VStack gap={6}>
      <div {...stylex.props(styles.header)}>
        <div>
          <h1 {...stylex.props(styles.title)}>外观与主题</h1>
          <p {...stylex.props(styles.subtitle)}>自定义界面色彩与显示偏好</p>
        </div>
      </div>
      <Section variant="transparent" padding={0}>
        <VStack gap={4}>
        <VStack gap={0.5}>
          <h2 {...stylex.props(styles.sectionTitle)}>外观</h2>
          <Text type="supporting" size="sm" as="p">
            选择浅色或深色模式，也可以跟随系统自动切换。
          </Text>
        </VStack>
        <SegmentedControl
          label="主题模式"
          value={mode}
          onChange={(v) => setMode(v as 'light' | 'dark' | 'system')}
          layout="fill"
          xstyle={styles.control}
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
