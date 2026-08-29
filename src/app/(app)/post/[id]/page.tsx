import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PostCard } from '@/components/post-card';
import { CommentSection } from '@/components/comment-section';
import { requireUserId } from '@/lib/session';
import { getPostById, getPostComments } from '@/server/feed';
import { PageContainer } from '@/components/page-container';

export const dynamic = 'force-dynamic';

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();
  const post = await getPostById(userId, id);
  if (!post) notFound();

  const { topLevel, replies } = await getPostComments(userId, id);

  return (
    <PageContainer className="pt-4">
      <Link
        href="/feed"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-secondary transition-colors hover:text-[var(--text)]"
      >
        <ArrowLeft size={16} />
        返回朋友圈
      </Link>
      <PostCard post={post} />
      <CommentSection postId={id} topLevel={topLevel} replies={replies} />
    </PageContainer>
  );
}
