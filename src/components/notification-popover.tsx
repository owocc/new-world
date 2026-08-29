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
  getRecentNotifications,
  markNotificationsRead,
  markSingleNotificationRead,
  type NotificationItem,
} from '@/server/actions/feed';
import { Bell, CheckCheck, ArrowRight, MessageCircle, MessageSquare, Heart, Sparkles } from 'lucide-react';
import clsx from 'clsx';

function getNotificationHref(item: NotificationItem): string {
  if (item.conversationId) return `/messages/${item.conversationId}`;
  if (item.postId) return `/post/${item.postId}`;
  return '/feed';
}

function getNotificationActionLabel(type: string): string {
  switch (type) {
    case 'dm':
      return '发来一条私信';
    case 'comment':
      return '评论了你的动态';
    case 'like':
      return '赞了你的动态';
    default:
      return '与你互动';
  }
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'dm':
      return <MessageCircle size={12} className="text-accent" />;
    case 'comment':
      return <MessageSquare size={12} className="text-info" />;
    case 'like':
      return <Heart size={12} className="text-danger" />;
    default:
      return <Sparkles size={12} className="text-warning" />;
  }
}

export function NotificationPopover({
  initialNotifications = [],
  initialUnreadCount = 0,
}: {
  initialNotifications?: NotificationItem[];
  initialUnreadCount?: number;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState<number>(initialUnreadCount);
  const [isPending, startTransition] = useTransition();

  // Sync with initial props if they change
  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Fetch latest notifications on open to stay fresh
      getRecentNotifications(8)
        .then((items) => {
          setNotifications(items);
          setUnreadCount(items.filter((n) => !n.read).length);
        })
        .catch((err) => {
          console.error('[NotificationPopover] failed to fetch recent notifications', err);
        });
    }
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    startTransition(async () => {
      await markNotificationsRead();
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
            通知
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
              icon={<Bell size={32} strokeWidth={1.5} className="text-secondary" />}
              title="暂无新通知"
              description="AI 居民们的动态和私信会在此提醒你"
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
                      name={item.characterName ?? '系统'}
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
                          {item.characterName ?? '系统'}
                        </span>
                        <span className="shrink-0">{getNotificationIcon(item.type)}</span>
                      </div>
                      <TimeAgo
                        date={item.createdAt}
                        className="shrink-0 text-[11px] text-secondary"
                      />
                    </div>

                    <Text
                      type="supporting"
                      as="p"
                      className="mt-0.5 group-hover:text-primary transition-colors text-xs"
                    >
                      {getNotificationActionLabel(item.type)}
                    </Text>

                    {item.content && (
                      <div className="mt-1 rounded-md bg-muted/50 px-2 py-1 text-xs text-secondary line-clamp-2 leading-relaxed">
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

      {/* Footer */}
      <div className="border-t border-border bg-surface p-2">
        <Button
          as={Link}
          href="/notifications"
          onClick={() => setIsOpen(false)}
          variant="ghost"
          width="100%"
          size="sm"
          label="打开通知页面"
          endContent={<ArrowRight size={14} />}
        />
      </div>
    </div>
  );

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      placement="below"
      alignment="end"
      label="最新通知"
      content={popoverContent}
    >
      <button
        type="button"
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-muted hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={unreadCount > 0 ? `${unreadCount} 条未读通知` : '通知'}
        title="通知"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white shadow-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </Popover>
  );
}
