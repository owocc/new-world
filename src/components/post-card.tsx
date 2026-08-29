'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Heart, MessageCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '@/components/avatar';
import { TimeAgo } from '@/components/ui';
import { deletePost, toggleLike } from '@/server/actions/feed';
import type { FeedPost } from '@/server/feed';

export function PostCard({ post, isOwnerFeed = true }: { post: FeedPost; isOwnerFeed?: boolean }) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.viewerLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  const onLike = () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    startTransition(async () => {
      try {
        await toggleLike(post.id);
      } catch {
        setLiked(!next);
        setLikeCount((c) => c + (next ? -1 : 1));
        toast.error('操作失败');
      }
    });
  };

  const onDelete = () => {
    if (!confirm('确定删除这条动态吗？')) return;
    setDeleting(true);
    startTransition(async () => {
      await deletePost(post.id);
      router.refresh();
    });
  };

  return (
    <article
      className={`rounded-3xl border border-line surface p-4 shadow-sm transition-all sm:p-5 ${
        deleting ? 'opacity-50' : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-3">
        <Link href={post.authorType === 'ai' ? '/characters' : '/settings/account'} className="shrink-0">
          <Avatar
            name={post.authorName}
            emoji={post.authorAvatarEmoji}
            color={post.authorAvatarColor}
            url={post.authorAvatarUrl}
            size={42}
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-x-2 text-sm">
            <span className="truncate font-semibold">{post.authorName}</span>
            {post.authorType === 'ai' && (
              <span className="hidden shrink-0 rounded-full bg-[var(--color-accent-50)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent-600)] dark:bg-[color-mix(in_srgb,var(--color-accent-500)_15%,transparent)] dark:text-[var(--color-accent-300)] sm:inline">
                居民
              </span>
            )}
            <span className="text-xs text-muted">@{post.authorUsername}</span>
            <span className="text-xs text-muted">·</span>
            <TimeAgo date={post.createdAt} className="shrink-0 text-xs text-muted" />
          </div>
          <Link href={`/post/${post.id}`} className="mt-1.5 block">
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
              {post.content}
            </p>
          </Link>
          <div className="mt-3 flex items-center gap-1 text-muted">
            <button
              onClick={onLike}
              disabled={pending}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors hover:surface-2 ${
                liked ? 'text-rose-500' : ''
              }`}
            >
              <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>
            <Link
              href={`/post/${post.id}`}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors hover:surface-2"
            >
              <MessageCircle size={17} />
              {post.commentCount > 0 && <span>{post.commentCount}</span>}
            </Link>
            <div className="flex-1" />
            {post.authorType === 'user' && isOwnerFeed && (
              <button
                onClick={onDelete}
                disabled={pending}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-rose-500/10 hover:text-rose-500"
                aria-label="删除动态"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="rounded-3xl border border-line surface p-5 shadow-sm">
      <div className="flex gap-3">
        <div className="h-11 w-11 animate-pulse-soft rounded-full bg-[var(--surface-2)]" />
        <div className="flex-1 space-y-2.5">
          <div className="h-4 w-28 animate-pulse-soft rounded bg-[var(--surface-2)]" />
          <div className="h-3.5 w-full animate-pulse-soft rounded bg-[var(--surface-2)]" />
          <div className="h-3.5 w-3/4 animate-pulse-soft rounded bg-[var(--surface-2)]" />
        </div>
      </div>
    </div>
  );
}
