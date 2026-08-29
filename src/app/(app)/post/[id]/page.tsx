import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowLeft} from 'lucide-react';
import {Divider} from '@astryxdesign/core/Divider';
import {PostCard} from '@/components/post-card';
import {CommentSection} from '@/components/comment-section';
import {requireUserId} from '@/lib/session';
import {getPostById, getPostComments} from '@/server/feed';

export const dynamic = 'force-dynamic';

export default async function PostPage({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const userId = await requireUserId();
  const post = await getPostById(userId, id);
  if (!post) notFound();

  const {topLevel, replies} = await getPostComments(userId, id);

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pb-10 pt-4">
      <Link
        href="/feed"
        className="mb-2 inline-flex items-center gap-1.5 text-sm text-secondary transition-colors hover:text-primary"
      >
        <ArrowLeft size={16} />
        返回世界
      </Link>
      <PostCard post={post} />
      <Divider className="my-2" />
      <CommentSection postId={id} topLevel={topLevel} replies={replies} />
    </div>
  );
}
