'use client';

import { useState, useRef, useTransition, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { UserAvatar } from '@/components/user-avatar';
import { MediaImage } from '@/components/media-image';
import { Composer } from '@/components/composer';
import { PostCard } from '@/components/post-card';
import { FeedNotificationsPopover } from '@/components/feed-notifications-popover';
import { MediaCropModal } from '@/components/avatar-crop-modal';
import { useAppToast } from '@/lib/toast';
import {
  triggerFeedPulseAction,
  uploadFeedCoverAction,
  type NotificationItem,
} from '@/server/actions/feed';
import type { FeedPost } from '@/server/feed';
import { Camera, RotateCw, ArrowLeft } from 'lucide-react';
import clsx from 'clsx';

export const DEFAULT_FEED_COVER =
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop';

export interface FeedViewProps {
  userName: string;
  userImage: string | null;
  coverUrl: string | null;
  posts: FeedPost[];
  isMine?: boolean;
  initialNotifications?: NotificationItem[];
  initialUnreadCount?: number;
}

export function FeedView({
  userName,
  userImage,
  coverUrl,
  posts,
  isMine = false,
  initialNotifications = [],
  initialUnreadCount = 0,
}: FeedViewProps) {
  const router = useRouter();
  const toast = useAppToast();

  const [composerOpen, setComposerOpen] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  const [currentCover, setCurrentCover] = useState<string>(coverUrl || DEFAULT_FEED_COVER);
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [, startCoverTransition] = useTransition();

  const [isScrolled, setIsScrolled] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayCover = currentCover || DEFAULT_FEED_COVER;

  // Track scroll position on container
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setIsScrolled(el.scrollTop > 40);
  }, []);

  // Handle manual refresh / heartbeat pulse
  const handleRefresh = useCallback(() => {
    startRefreshTransition(async () => {
      try {
        await triggerFeedPulseAction();
        toast.success('已刷新居民心跳与动态');
        router.refresh();
      } catch {
        toast.error('刷新失败，请稍后重试');
      }
    });
  }, [router, toast]);

  // Handle local file selection -> open 16:9 crop modal
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('图片大小不能超过 15MB');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCropImageSrc(objectUrl);
    setCropModalOpen(true);
    e.target.value = '';
  };

  // Handle cropped image confirmation & upload
  const handleCropConfirm = async (croppedBlob: Blob) => {
    startCoverTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('file', croppedBlob, 'cover.jpg');

        const res = await uploadFeedCoverAction(formData);
        if (res.ok) {
          setCurrentCover(res.coverUrl);
          setCropModalOpen(false);
          if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
          setCropImageSrc(null);
          toast.success('朋友圈背景已更新');
          router.refresh();
        } else {
          toast.error(res.error || '背景上传失败');
        }
      } catch (err) {
        console.error('[FeedView] cover upload error', err);
        toast.error('上传失败，请稍后重试');
      }
    });
  };

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="relative h-full min-h-0 w-full overflow-y-auto overflow-x-hidden bg-surface"
    >
      {/* Hidden file input for cover upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* 
        Sticky Top Header:
        Fixed at the top of the scroll pane.
        When scrollY === 0: transparent with ghosty buttons over the cover.
        When scrollY > 40: overlays bg-surface/95 backdrop-blur-md, title fades in, buttons adapt to surface theme.
      */}
      <header
        className={clsx(
          'sticky top-0 z-30 flex h-14 w-full items-center justify-between px-4 sm:px-6 transition-all duration-200',
          isScrolled
            ? 'border-b border-border bg-surface/95 backdrop-blur-md shadow-xs text-primary'
            : 'border-b border-transparent bg-transparent text-white',
        )}
      >
        {/* Left: Back button when viewing my moments */}
        <div className="flex items-center min-w-[70px]">
          {isMine && (
            <Link
              href="/feed"
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200 active:scale-95',
                isScrolled
                  ? 'text-secondary hover:text-primary hover:bg-muted'
                  : 'text-white/90 hover:text-white hover:bg-white/20 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.7)]',
              )}
            >
              <ArrowLeft size={14} />
              <span>全部</span>
            </Link>
          )}
        </div>
        {/* Center: Title (Only visible when scrolled down or when in mine mode) */}
        <div
          className={clsx(
            'text-base font-semibold tracking-tight transition-opacity duration-200 select-none',
            isScrolled
              ? 'opacity-100 text-primary'
              : isMine
                ? 'opacity-100 text-white'
                : 'opacity-0 pointer-events-none',
          )}
        >
          {isMine ? '我的朋友圈' : '朋友圈'}
        </div>

        {/* Right: Action Buttons Toolbar (Ghosty Style) */}
        <div className="flex items-center justify-end gap-2 sm:gap-2.5 min-w-[70px]">
          {/* 1. Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="刷新动态与居民心跳"
            aria-label="刷新动态"
            className={clsx(
              'flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 active:scale-95 disabled:opacity-50',
              isScrolled
                ? 'text-secondary hover:text-primary hover:bg-muted'
                : 'text-white/90 hover:text-white hover:bg-white/20 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.7)]',
            )}
          >
            <RotateCw
              size={17}
              strokeWidth={2}
              className={clsx('transition-transform duration-500', isRefreshing && 'animate-spin')}
            />
          </button>

          {/* 2. Moments Notifications Popover (朋友圈专用通知) */}
          <FeedNotificationsPopover
            initialNotifications={initialNotifications}
            initialUnreadCount={initialUnreadCount}
            scrolled={isScrolled}
          />

          {/* 3. Send / Camera Button (收纳发送按钮) */}
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            title="发布朋友圈动态"
            aria-label="发布动态"
            className={clsx(
              'flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 active:scale-95',
              isScrolled
                ? 'text-secondary hover:text-primary hover:bg-muted'
                : 'text-white/90 hover:text-white hover:bg-white/20 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.7)]',
            )}
          >
            <Camera size={17} strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* 
        Cover Banner Container:
        Negative top margin `-mt-14` pulls the cover all the way up behind the transparent header.
        Strict height constraint (280px-320px) guarantees proper proportion.
      */}
      <div className="-mt-14 relative w-full h-[260px] sm:h-[300px] max-h-[320px] select-none">
        {/* Cover Image Area - clicking directly opens image cropper */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="group relative h-full w-full cursor-pointer overflow-hidden bg-neutral"
          title="点击更换朋友圈背景"
        >
          <MediaImage
            src={displayCover}
            alt="朋友圈背景图"
            fallbackSrc={DEFAULT_FEED_COVER}
            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
          />
          {/* Top & Bottom gradient overlay: top shaded for controls, middle transparent, bottom shaded for username */}
          <div
            className="pointer-events-none absolute inset-0 z-1"
            style={{
              background:
                'linear-gradient(to bottom, rgba(0, 0, 0, 0.65) 0%, rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, 0) 60%, rgba(0, 0, 0, 0.82) 100%)',
            }}
          />
          <div className="absolute bottom-3.5 left-4 flex items-center gap-1.5 rounded-full bg-black/35 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-md opacity-0 transition-opacity duration-200 group-hover:opacity-100 border border-white/15">
            <Camera size={13} />
            <span>更换背景</span>
          </div>
        </div>

        {/* 
          Bottom-Right User Info & Avatar:
          Positioned on the far right of the cover, overlapping into the post feed below.
          Pure circular avatar with zero outer square background!
        */}
        <div className="absolute -bottom-6 right-6 sm:right-8 z-10 flex items-end gap-3 pointer-events-auto">
          {/* User Name without text shadow */}
          <span className="mb-7 max-w-[200px] truncate text-base sm:text-lg font-bold text-white tracking-wide">
            {userName}
          </span>

          {/* User Avatar - click to navigate to My Moments */}
          <Link
            href={isMine ? '/feed' : '/feed?filter=mine'}
            title={isMine ? '点击返回全部朋友圈' : '点击查看我的朋友圈'}
            className="inline-flex rounded-full transition-transform duration-200 hover:scale-105 select-none"
          >
            <UserAvatar name={userName} url={userImage} size={68} />
          </Link>
        </div>
      </div>

      {/* 
        Feed Posts Container:
        Spacing below cover ensures overlapping avatar doesn't collide with the first post.
      */}
      <div className="mx-auto w-full max-w-[680px] px-4 sm:px-6 pt-12 pb-20">
        {/* Mine mode indicator banner */}
        {isMine && (
          <div className="mb-6 flex items-center justify-between rounded-xl bg-muted/70 px-4 py-2.5 text-sm text-secondary">
            <span className="font-medium">我的朋友圈（仅显示自己发布的动态）</span>
            <Link
              href="/feed"
              className="text-xs font-semibold text-accent hover:underline"
            >
              查看全部动态 →
            </Link>
          </div>
        )}

        {posts.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title={isMine ? '你还没有发布过动态' : '朋友圈还静悄悄的'}
              description={
                isMine
                  ? '点击右上角相机发布第一条动态吧'
                  : '点击右上角相机发布第一条动态，和 AI 居民们分享你的今天吧'
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>

      {/* Composer Dialog Triggered by the Top-Right Camera Button */}
      <Composer
        userName={userName}
        userImage={userImage}
        isOpen={composerOpen}
        onOpenChange={setComposerOpen}
        hideDefaultTrigger
      />

      {/* 16:9 Media Cropper Modal - Reused from avatar crop component with 16:9 aspect */}
      <MediaCropModal
        isOpen={cropModalOpen}
        imageSrc={cropImageSrc}
        onClose={() => {
          setCropModalOpen(false);
          if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
          setCropImageSrc(null);
        }}
        onConfirm={handleCropConfirm}
        aspect={16 / 9}
        title="裁剪朋友圈背景"
      />
    </div>
  );
}
