import * as stylex from '@stylexjs/stylex';
import {MessageCircle} from 'lucide-react';
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
export default function MessagesIndexPage() {
  return (
    <div {...stylex.props(styles.root)}>
      <EmptyState
        icon={<MessageCircle size={40} strokeWidth={1.5} />}
        title="选择一个对话"
        description="从左侧选择私聊或群聊，开启新的对话"
      />
    </div>
  );
}
