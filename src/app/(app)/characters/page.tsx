import * as stylex from '@stylexjs/stylex';
import {Users} from 'lucide-react';
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

export default function CharactersIndexPage() {
  return (
    <div {...stylex.props(styles.root)}>
      <EmptyState
        icon={<Users size={40} strokeWidth={1.5} />}
        title="选择一个联系人"
        description="从左侧选择联系人查看资料，或进入管理页添加新居民"
      />
    </div>
  );
}
