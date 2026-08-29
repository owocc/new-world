import {EmptyState} from '@astryxdesign/core/EmptyState';
import {MessageCircle} from 'lucide-react';

export default function MessagesIndexPage() {
  return (
    <div className="hidden h-full items-center justify-center lg:flex">
      <EmptyState
        icon={<MessageCircle size={40} strokeWidth={1.5} />}
        title="选择一个对话"
        description="从左侧选择私聊或群聊，开启新的对话"
      />
    </div>
  );
}
