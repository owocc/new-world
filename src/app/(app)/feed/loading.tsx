import { Composer } from '@/components/composer';
import { PostCardSkeleton } from '@/components/post-card';
import { PageContainer } from '@/components/page-container';

export default function FeedLoading() {
  return (
    <PageContainer className="space-y-4 pt-4">
      <Composer userName="…" />
      {Array.from({ length: 4 }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </PageContainer>
  );
}
