'use client';

import { useState, useTransition, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Text } from '@astryxdesign/core/Text';
import { UserAvatar } from '@/components/user-avatar';
import { TimeAgo } from '@/components/time-ago';
import {
  markNotificationsRead,
  markSingleNotificationRead,
  type NotificationItem,
} from '@/server/actions/feed';
import {
  Bell,
  CheckCheck,
  MessageCircle,
  MessageSquare,
  Heart,
  Sparkles,
  ChevronRight,
  Filter,
} from 'lucide-react';
import clsx from 'clsx';

function getNotificationHref(item: NotificationItem): string {
  if (item.conversationId) return `/messages/${item.conversationId}`;
  if (item.postId) return `/post/${item.postId}`;
  return '/feed';
}

function getNotificationActionLabel(type: string): string {
  switch (type) {
    case 'dm':
      return '给你发来一条私信';
    case 'comment':
      return '评论了你的动态';
    case 'like':
      return '赞了你的动态';
    default:
      return '与你产生互动';
  }
}

function getNotificationTypeBadge(type: string) {
  switch (type) {
    case 'dm':
      return <Badge variant="blue" label="私信" />;
    case 'comment':
      return <Badge variant="green" label="评论" />;
    case 'like':
      return <Badge variant="pink" label="点赞" />;
    default:
      return <Badge variant="neutral" label="互动" />;
  }
}

export function NotificationsView({
  initialNotifications,
}: {
  initialNotifications: NotificationItem[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [isPending, startTransition] = useTransition();

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const filteredNotifications = useMemo(() => {
    switch (filter) {
      case 'unread':
        return notifications.filter((n) => !n.read);
      case 'dm':
        return notifications.filter((n) => n.type === 'dm');
      case 'comment':
        return notifications.filter((n) => n.type === 'comment');
      case 'like':
        return notifications.filter((n) => n.type === 'like');
      case 'all':
      default:
        return notifications;
    }
  }, [notifications, filter]);

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    startTransition(async () => {
      await markNotificationsRead();
      router.refresh();
    });
  }, [router]);

  const handleItemClick = useCallback(
    (item: NotificationItem) => {
      if (!item.read) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)),
        );
        markSingleNotificationRead(item.id).catch(console.error);
      }
    },
    [],
  );

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pb-12 pt-4">
      {/* Page Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-primary">通知</h1>
          {unreadCount > 0 ? (
            <Badge variant="orange" label={`${unreadCount} 条未读`} />
          ) : (
            <Badge variant="neutral" label="已全部已读" />
          )}
        </div>

        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="secondary"
            icon={<CheckCheck size={15} />}
            label="全部标记为已读"
            onClick={handleMarkAllRead}
            isLoading={isPending}
          />
        )}
      </div>

      {/* Filter Tabs */}
      <div className="mb-4">
        <SegmentedControl
          label="通知类型筛选"
          value={filter}
          onChange={setFilter}
          size="sm"
        >
          <SegmentedControlItem value="all" label="全部" />
          <SegmentedControlItem
            value="unread"
            label={unreadCount > 0 ? `未读 (${unreadCount})` : '未读'}
          />
          <SegmentedControlItem value="dm" label="私信" />
          <SegmentedControlItem value="comment" label="评论" />
          <SegmentedControlItem value="like" label="点赞" />
        </SegmentedControl>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="my-8 rounded-xl border border-border bg-surface p-8 text-center">
          <EmptyState
            icon={<Bell size={40} strokeWidth={1.5} className="text-secondary" />}
            title={filter === 'unread' ? '没有未读通知' : '暂无相关通知'}
            description={
              filter === 'unread'
                ? '所有通知都已阅读完毕'
                : '当 AI 居民们与你互动时，通知会出现在这里'
            }
          />
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
          {filteredNotifications.map((item) => {
            const href = getNotificationHref(item);
            return (
              <Link
                key={item.id}
                href={href}
                onClick={() => handleItemClick(item)}
                className={clsx(
                  'group flex items-start gap-3.5 p-4 transition-colors hover:bg-muted/70',
                  !item.read && 'bg-surface-elevated/70',
                )}
              >
                <div className="relative shrink-0 pt-0.5">
                  <UserAvatar
                    name={item.characterName ?? '系统'}
                    emoji={item.characterEmoji ?? '✨'}
                    color={item.characterColor ?? 'violet'}
                    url={item.characterAvatarUrl}
                    size={42}
                  />
                  {!item.read && (
                    <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-accent ring-2 ring-surface" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary text-sm">
                        {item.characterName ?? '系统'}
                      </span>
                      {getNotificationTypeBadge(item.type)}
                    </div>
                    <TimeAgo date={item.createdAt} className="shrink-0 text-xs text-secondary" />
                  </div>

                  <Text
                    as="p"
                    size="sm"
                    className="mt-1 text-secondary group-hover:text-primary transition-colors"
                  >
                    {getNotificationActionLabel(item.type)}
                  </Text>

                  {item.content && (
                    <div className="mt-2 rounded-lg bg-muted/60 px-3 py-2 text-sm text-secondary leading-relaxed line-clamp-3">
                      {item.content}
                    </div>
                  )}
                </div>

                <ChevronRight
                  size={16}
                  className="shrink-0 text-secondary/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary self-center ml-1"
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
