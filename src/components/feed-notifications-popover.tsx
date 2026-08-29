'use client';

import { useState, useTransition, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Popover } from '@astryxdesign/core/Popover';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Text } from '@astryxdesign/core/Text';
import { UserAvatar } from '@/components/user-avatar';
import { TimeAgo } from '@/components/time-ago';
import {
  getFeedNotifications,
  markFeedNotificationsRead,
  markSingleNotificationRead,
  type NotificationItem,
} from '@/server/actions/feed';
import { Bell, CheckCheck, MessageSquare, Heart, Sparkles } from 'lucide-react';
import clsx from 'clsx';

function getNotificationHref(item: NotificationItem): string {
  if (item.postId) return `/post/${item.postId}`;
  return '/feed';
}

function getNotificationActionLabel(type: string): string {
  switch (type) {
    case 'comment':
      return '评论了你的动态';
    case 'like':
      return '赞了你的动态';
    default:
      return '互动了你的动态';
  }
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'comment':
      return <MessageSquare size={13} className="text-info" />;
    case 'like':
      return <Heart size={13} className="text-danger fill-danger/20" />;
    default:
      return <Sparkles size={13} className="text-warning" />;
  }
}

export interface FeedNotificationsPopoverProps {
  initialNotifications?: NotificationItem[];
  initialUnreadCount?: number;
  scrolled?: boolean;
}

export function FeedNotificationsPopover({
  initialNotifications = [],
  initialUnreadCount = 0,
  scrolled = false,
}: FeedNotificationsPopoverProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState<number>(initialUnreadCount);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (open) {
      getFeedNotifications(20)
        .then((items) => {
          setNotifications(items);
          setUnreadCount(items.filter((n) => !n.read).length);
        })
        .catch((err) => {
          console.error('[FeedNotificationsPopover] failed to fetch notifications', err);
        });
    }
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    startTransition(async () => {
      await markFeedNotificationsRead();
      router.refresh();
    });
  }, [router]);

  const handleItemClick = useCallback(
    (item: NotificationItem) => {
      if (!item.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)),
        );
        markSingleNotificationRead(item.id).catch(console.error);
      }
      setIsOpen(false);
    },
    [],
  );

  const popoverContent = (
    <div className="w-[360px] sm:w-[380px] max-w-[calc(100vw-32px)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-surface">
        <div className="flex items-center gap-2">
          <Text as="span" size="sm" className="font-semibold text-primary">
            朋友圈互动
          </Text>
          {unreadCount > 0 && (
            <Badge variant="orange" label={`${unreadCount > 99 ? '99+' : unreadCount} 条未读`} />
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="ghost"
            icon={<CheckCheck size={14} />}
            label="全部已读"
            onClick={handleMarkAllRead}
            isLoading={isPending}
          />
        )}
      </div>

      {/* Body List */}
      <div className="max-h-[380px] overflow-y-auto overscroll-contain">
        {notifications.length === 0 ? (
          <div className="py-8 px-4 text-center">
            <EmptyState
              icon={<Heart size={32} strokeWidth={1.5} className="text-secondary" />}
              title="暂无朋友圈互动"
              description="AI 居民们的点赞和评论会在此提醒你"
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((item) => {
              const href = getNotificationHref(item);
              return (
                <Link
                  key={item.id}
                  href={href}
                  onClick={() => handleItemClick(item)}
                  className={clsx(
                    'group flex items-start gap-3 p-3.5 transition-colors hover:bg-muted/70',
                    !item.read ? 'bg-surface-elevated/70' : 'bg-surface',
                  )}
                >
                  <div className="relative shrink-0 pt-0.5">
                    <UserAvatar
                      name={item.characterName ?? '居民'}
                      emoji={item.characterEmoji ?? '✨'}
                      color={item.characterColor ?? 'violet'}
                      url={item.characterAvatarUrl}
                      size={36}
                    />
                    {!item.read && (
                      <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-surface" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate text-xs font-semibold text-primary">
                          {item.characterName ?? '居民'}
                        </span>
                        <span className="shrink-0">{getNotificationIcon(item.type)}</span>
                      </div>
                      <TimeAgo
                        date={item.createdAt}
                        className="text-[11px] text-secondary shrink-0"
                      />
                    </div>

                    <p className="mt-0.5 text-xs text-secondary">
                      {getNotificationActionLabel(item.type)}
                    </p>

                    {item.content && (
                      <div className="mt-1.5 rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-primary line-clamp-2">
                        {item.content}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      content={popoverContent}
      placement="below"
      alignment="end"
      label="朋友圈通知"
    >
      <button
        type="button"
        title="朋友圈通知"
        aria-label="朋友圈通知"
        className={clsx(
          'relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 active:scale-95',
          scrolled
            ? 'text-secondary hover:text-primary hover:bg-muted'
            : 'text-white/90 hover:text-white hover:bg-white/20 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.7)]',
        )}
      >
        <Bell size={18} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute 0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-xs ring-1.5 ring-white/60">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </Popover>
  );
}
