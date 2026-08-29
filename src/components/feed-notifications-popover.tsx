'use client';

import { useState, useTransition, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as stylex from '@stylexjs/stylex';
import { colorVars, radiusVars, shadowVars } from '@astryxdesign/core/theme/tokens.stylex';
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

const styles = stylex.create({
  panel: {
    width: 360,
    maxWidth: 'calc(100vw - 32px)',
    '@media (min-width: 640px)': {
      width: 380,
    },
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid',
    borderBottomColor: colorVars['--color-border'],
    paddingBlock: 12,
    paddingInline: 16,
    backgroundColor: colorVars['--color-background-surface'],
  },
  headerGroup: {
    display: 'flex',
    alignItems: 'center',
    columnGap: 8,
  },
  headerText: {
    color: colorVars['--color-text-primary'],
    fontWeight: 600,
  },
  body: {
    maxHeight: 380,
    overflowY: 'auto',
    overscrollBehavior: 'contain',
  },
  empty: {
    paddingBlock: 32,
    paddingInline: 16,
    textAlign: 'center',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    columnGap: 12,
    padding: 14,
    borderBottom: '1px solid',
    borderBottomColor: colorVars['--color-border'],
    transitionProperty: 'background-color',
    transitionDuration: '175ms',
    ':hover': {
      backgroundColor: 'color-mix(in srgb, var(--color-background-muted) 70%, transparent)',
    },
  },
  itemRead: {
    backgroundColor: colorVars['--color-background-surface'],
  },
  itemUnread: {
    backgroundColor: 'color-mix(in srgb, var(--color-background-surface) 70%, var(--color-background-muted))',
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
    height: 10,
    width: 10,
    border: '2px solid',
    borderColor: colorVars['--color-background-surface'],
    borderRadius: radiusVars['--radius-full'],
    backgroundColor: colorVars['--color-accent'],
  },
  itemContent: {
    minWidth: 0,
    flex: 1,
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 4,
  },
  itemNameGroup: {
    display: 'flex',
    minWidth: 0,
    alignItems: 'center',
    columnGap: 6,
  },
  itemName: {
    overflow: 'hidden',
    color: colorVars['--color-text-primary'],
    fontSize: 12,
    fontWeight: 600,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  time: {
    flexShrink: 0,
    color: colorVars['--color-text-secondary'],
    fontSize: 11,
  },
  actionText: {
    marginTop: 2,
    color: colorVars['--color-text-secondary'],
    fontSize: 12,
  },
  content: {
    display: '-webkit-box',
    marginTop: 6,
    overflow: 'hidden',
    borderRadius: radiusVars['--radius-inner'],
    backgroundColor: 'color-mix(in srgb, var(--color-background-muted) 60%, transparent)',
    paddingBlock: 6,
    paddingInline: 10,
    color: colorVars['--color-text-primary'],
    fontSize: 12,
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  iconInfo: {
    color: colorVars['--color-icon-blue'],
  },
  iconDanger: {
    color: colorVars['--color-error'],
    fill: 'color-mix(in srgb, var(--color-error) 20%, transparent)',
  },
  iconWarning: {
    color: colorVars['--color-warning'],
  },
  notificationButton: {
    position: 'relative',
    display: 'flex',
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radiusVars['--radius-full'],
    transitionProperty: 'background-color, color, transform',
    transitionDuration: '200ms',
    ':active': {
      transform: 'scale(0.95)',
    },
  },
  notificationButtonScrolled: {
    color: colorVars['--color-text-secondary'],
    ':hover': {
      color: colorVars['--color-text-primary'],
      backgroundColor: colorVars['--color-background-muted'],
    },
  },
  notificationButtonUnscrolled: {
    color: 'rgba(255, 255, 255, 0.9)',
    ':hover': {
      color: colorVars['--color-on-dark'],
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    display: 'flex',
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    borderRadius: radiusVars['--radius-full'],
    backgroundColor: colorVars['--color-error'],
    paddingInline: 4,
    color: colorVars['--color-on-error'],
    fontSize: 10,
    fontWeight: 700,
    lineHeight: 1,
    boxShadow: shadowVars['--shadow-low'],
  },
  iconSecondary: {
    color: colorVars['--color-text-secondary'],
  },
});

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
      return <MessageSquare size={13} {...stylex.props(styles.iconInfo)} />;
    case 'like':
      return <Heart size={13} {...stylex.props(styles.iconDanger)} />;
    default:
      return <Sparkles size={13} {...stylex.props(styles.iconWarning)} />;
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
    <div {...stylex.props(styles.panel)}>
      {/* Header */}
      <div {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.headerGroup)}>
          <Text as="span" size="sm" xstyle={styles.headerText}>
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
      <div {...stylex.props(styles.body)}>
        {notifications.length === 0 ? (
          <div {...stylex.props(styles.empty)}>
            <EmptyState
              icon={<Heart size={32} strokeWidth={1.5} {...stylex.props(styles.iconSecondary)} />}
              title="暂无朋友圈互动"
              description="AI 居民们的点赞和评论会在此提醒你"
            />
          </div>
        ) : (
          <div {...stylex.props(styles.list)}>
            {notifications.map((item) => {
              const href = getNotificationHref(item);
              return (
                <Link
                  key={item.id}
                  href={href}
                  onClick={() => handleItemClick(item)}
                  {...stylex.props(styles.item, item.read ? styles.itemRead : styles.itemUnread)}
                >
                  <div {...stylex.props(styles.avatarWrap)}>
                    <UserAvatar
                      name={item.characterName ?? '居民'}
                      emoji={item.characterEmoji ?? '✨'}
                      color={item.characterColor ?? 'violet'}
                      url={item.characterAvatarUrl}
                      size={36}
                    />
                    {!item.read && <span {...stylex.props(styles.unreadDot)} />}
                  </div>

                  <div {...stylex.props(styles.itemContent)}>
                    <div {...stylex.props(styles.itemRow)}>
                      <div {...stylex.props(styles.itemNameGroup)}>
                        <span {...stylex.props(styles.itemName)}>
                          {item.characterName ?? '居民'}
                        </span>
                        <span>{getNotificationIcon(item.type)}</span>
                      </div>
                      <TimeAgo date={item.createdAt} xstyle={styles.time} />
                    </div>

                    <p {...stylex.props(styles.actionText)}>
                      {getNotificationActionLabel(item.type)}
                    </p>

                    {item.content && (
                      <div {...stylex.props(styles.content)}>
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
        {...stylex.props(
          styles.notificationButton,
          scrolled ? styles.notificationButtonScrolled : styles.notificationButtonUnscrolled,
        )}
      >
        <Bell size={18} strokeWidth={2} />
        {unreadCount > 0 && (
          <span {...stylex.props(styles.notificationBadge)}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </Popover>
  );
}
