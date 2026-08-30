import * as stylex from '@stylexjs/stylex';
import {Settings2} from 'lucide-react';
import {EmptyState} from '@astryxdesign/core/EmptyState';

const styles = stylex.create({
  root: {
    display: 'none',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    '@media (min-width: 1024px)': {
      display: 'flex',
    },
  },
});

export default function SettingsPage() {
  return (
    <div {...stylex.props(styles.root)}>
      <EmptyState
        icon={<Settings2 size={40} strokeWidth={1.5} />}
        title="选择一项设置"
        description="从左侧选择要调整的设置项"
      />
    </div>
  );
}
