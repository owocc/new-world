'use client';

import { useState, useTransition, useMemo, useCallback } from 'react';
import * as stylex from '@stylexjs/stylex';
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
  ChevronRight,
} from 'lucide-react';

const styles = stylex.create({
  root: {
    width: '100%',
    maxWidth: 720,
    marginInline: 'auto',
    paddingTop: 16,
    paddingRight: 16,
    paddingBottom: 48,
    paddingLeft: 16,
  },
  header: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: '-0.025em',
    color: 'var(--color-text-primary)',
  },
  filter: {
    marginBottom: 16,
  },
  empty: {
    marginBlock: 32,
    border: '1px solid var(--color-border)',
    borderRadius: 12,
    backgroundColor: 'var(--color-background-surface)',
    padding: 32,
    textAlign: 'center',
  },
  emptyIcon: {
    color: 'var(--color-text-secondary)',
  },
  list: {
    overflow: 'hidden',
    border: '1px solid var(--color-border)',
    borderRadius: 12,
    backgroundColor: 'var(--color-background-surface)',
    boxShadow: '0 1px 2px var(--color-shadow)',
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    transitionProperty: 'background-color',
    transitionDuration: '125ms',
    ':hover': {
      backgroundColor: 'color-mix(in srgb, var(--color-background-muted) 70%, transparent)',
    },
  },
  unreadItem: {
    backgroundColor: 'color-mix(in srgb, var(--color-background-muted) 70%, var(--color-background-surface))',
  },
  itemDivider: {
    borderTop: '1px solid var(--color-border)',
  },
  avatarWrap: {
    position: 'relative',
    flexShrink: 0,
    paddingTop: 2,
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    border: '2px solid var(--color-background-surface)',
    borderRadius: 9999,
    backgroundColor: 'var(--color-accent)',
  },
  itemContent: {
    minWidth: 0,
    flex: 1,
  },
  itemHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  character: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  characterName: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
  },
  time: {
    flexShrink: 0,
    fontSize: 12,
    color: 'var(--color-text-secondary)',
  },
  action: {
    marginTop: 4,
    color: 'var(--color-text-secondary)',
    transitionProperty: 'color',
    transitionDuration: '125ms',
  },
  actionHover: {
    color: 'var(--color-text-primary)',
  },
  notificationContent: {
    display: '-webkit-box',
    overflow: 'hidden',
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: 'color-mix(in srgb, var(--color-background-muted) 60%, transparent)',
    paddingBlock: 8,
    paddingInline: 12,
    fontSize: 14,
    lineHeight: 1.625,
    color: 'var(--color-text-secondary)',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 3,
  },
  chevron: {
    alignSelf: 'center',
    flexShrink: 0,
    marginLeft: 4,
    color: 'color-mix(in srgb, var(--color-text-secondary) 50%, transparent)',
    transitionProperty: 'transform, color',
    transitionDuration: '125ms',
  },
});

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
    <div {...stylex.props(styles.root)}>
      {/* Page Header */}
      <div {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.titleGroup)}>
          <h1 {...stylex.props(styles.title)}>通知</h1>
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

      <div {...stylex.props(styles.filter)}>
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

      {filteredNotifications.length === 0 ? (
        <div {...stylex.props(styles.empty)}>
          <EmptyState
            icon={<Bell size={40} strokeWidth={1.5} {...stylex.props(styles.emptyIcon)} />}
            title={filter === 'unread' ? '没有未读通知' : '暂无相关通知'}
            description={
              filter === 'unread'
                ? '所有通知都已阅读完毕'
                : '当 AI 居民们与你互动时，通知会出现在这里'
            }
          />
        </div>
      ) : (
        <div {...stylex.props(styles.list)}>
          {filteredNotifications.map((item, index) => {
            const href = getNotificationHref(item);
            return (
              <Link
                key={item.id}
                href={href}
                onClick={() => handleItemClick(item)}
                {...stylex.props(styles.item, !item.read && styles.unreadItem, index > 0 && styles.itemDivider)}
              >
                <div {...stylex.props(styles.avatarWrap)}>
                  <UserAvatar
                    name={item.characterName ?? '系统'}
                    emoji={item.characterEmoji ?? '✨'}
                    color={item.characterColor ?? 'violet'}
                    url={item.characterAvatarUrl}
                    size={42}
                  />
                  {!item.read && <span {...stylex.props(styles.unreadDot)} />}
                </div>
                <div {...stylex.props(styles.itemContent)}>
                  <div {...stylex.props(styles.itemHeader)}>
                    <div {...stylex.props(styles.character)}>
                      <span {...stylex.props(styles.characterName)}>
                        {item.characterName ?? '系统'}
                      </span>
                      {getNotificationTypeBadge(item.type)}
                    </div>
                    <span {...stylex.props(styles.time)}>
                      <TimeAgo date={item.createdAt} />
                    </span>
                  </div>
                  <Text as="p" size="sm" xstyle={styles.action}>
                    {getNotificationActionLabel(item.type)}
                  </Text>
                  {item.content && (
                    <div {...stylex.props(styles.notificationContent)}>{item.content}</div>
                  )}
                </div>
                <ChevronRight size={16} {...stylex.props(styles.chevron)} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
