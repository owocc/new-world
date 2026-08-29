'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState, useTransition} from 'react';
import {Heart, MessageCircle, Trash2} from 'lucide-react';
import {Text} from '@astryxdesign/core/Text';
import {IconButton} from '@astryxdesign/core/IconButton';
import {MoreMenu} from '@astryxdesign/core/MoreMenu';
import {useAppToast} from '@/lib/toast';
import {UserAvatar} from '@/components/user-avatar';
import {TimeAgo} from '@/components/time-ago';
import {deletePost, toggleLike} from '@/server/actions/feed';
import type {FeedPost} from '@/server/feed';

export function PostCard({post, isOwnerFeed = true}: {post: FeedPost; isOwnerFeed?: boolean}) {
  const router = useRouter();
  const toast = useAppToast();
  const [liked, setLiked] = useState(post.viewerLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [pending, startTransition] = useTransition();

  const authorHref = post.authorType === 'ai' ? '/characters' : '/settings/account';

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
    startTransition(async () => {
      await deletePost(post.id);
      router.refresh();
    });
  };

  return (
    <article className="flex gap-3 py-4">
      <UserAvatar
        name={post.authorName}
        emoji={post.authorAvatarEmoji}
        color={post.authorAvatarColor}
        url={post.authorAvatarUrl}
        size={42}
        href={authorHref}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Link href={authorHref} className="truncate text-[15px] font-semibold hover:underline">
            {post.authorName}
          </Link>
          <Text type="supporting" size="sm" as="span">
            @{post.authorUsername}
          </Text>
          <TimeAgo date={post.createdAt} live className="text-xs text-secondary" />
        </div>
        <Link href={`/post/${post.id}`} className="mt-1 block">
          <Text as="p" textWrap="wrap" className="whitespace-pre-wrap break-words leading-relaxed">
            {post.content}
          </Text>
        </Link>
        <div className="mt-2 flex items-center gap-1">
          <IconButton
            label={liked ? '取消点赞' : '点赞'}
            variant="ghost"
            size="sm"
            icon={
              <Heart
                size={17}
                fill={liked ? 'currentColor' : 'none'}
                className={liked ? 'text-error' : undefined}
              />
            }
            onClick={onLike}
          />
          {likeCount > 0 && (
            <Text type="supporting" size="sm" as="span" className="-ml-1">
              {likeCount}
            </Text>
          )}
          <Link href={`/post/${post.id}`} aria-label="查看评论" className="inline-flex">
            <IconButton label="评论" variant="ghost" size="sm" icon={<MessageCircle size={17} />} />
          </Link>
          {post.commentCount > 0 && (
            <Text type="supporting" size="sm" as="span" className="-ml-1">
              {post.commentCount}
            </Text>
          )}
          <div className="flex-1" />
          {post.authorType === 'user' && isOwnerFeed && (
            <MoreMenu
              label="动态操作"
              size="sm"
              items={[
                {
                  label: '删除动态',
                  icon: <Trash2 size={15} />,
                  variant: 'destructive',
                  onClick: onDelete,
                },
              ]}
            />
          )}
        </div>
      </div>
    </article>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="flex animate-pulse gap-3 py-4" aria-hidden>
      <div className="h-[42px] w-[42px] shrink-0 rounded-full bg-muted" />
      <div className="flex-1 space-y-2.5 py-1">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-3.5 w-full rounded bg-muted" />
        <div className="h-3.5 w-3/4 rounded bg-muted" />
      </div>
    </div>
  );
}
