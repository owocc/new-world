import { EmptyState } from '@/components/ui';

export default function MessagesIndexPage() {
  return (
    <div className="hidden h-full items-center justify-center lg:flex">
      <EmptyState
        icon="💬"
        title="选择一个对话"
        description="从左侧选择一位 AI 居民，或开始一段新的对话"
      />
    </div>
  );
}
