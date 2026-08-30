'use client';

import { useState, useTransition, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as stylex from '@stylexjs/stylex';
import { colorVars, radiusVars, shadowVars, spacingVars } from '@astryxdesign/core/theme/tokens.stylex';
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

const styles = stylex.create({
  panel: {
    width: '380px',
    maxWidth: 'calc(100vw - 32px)',
    backgroundColor: colorVars['--color-background-surface'],
    borderRadius: radiusVars['--radius-container'],
    boxShadow: shadowVars['--shadow-high'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colorVars['--color-border'],
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '520px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingInline: '16px',
    paddingBlock: '12px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colorVars['--color-border'],
    backgroundColor: colorVars['--color-background-surface'],
    flexShrink: 0,
  },
  headerGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerText: {
    fontWeight: 'var(--font-weight-semibold)',
    color: colorVars['--color-text-primary'],
  },
  body: {
    overflowY: 'auto',
    flex: 1,
    padding: 0,
  },
  empty: {
    paddingInline: '16px',
    paddingBlock: '32px',
    display: 'flex',
    justifyContent: 'center',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    paddingInline: '16px',
    paddingBlock: '14px',
    textDecoration: 'none',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colorVars['--color-border'],
    transitionProperty: 'background-color',
    transitionDuration: '150ms',
    ':hover': {
      backgroundColor: 'color-mix(in srgb, var(--color-background-muted) 80%, transparent)',
    },
  },
  itemRead: {
    backgroundColor: colorVars['--color-background-surface'],
  },
  itemUnread: {
    backgroundColor: 'color-mix(in srgb, var(--color-background-surface) 65%, var(--color-background-muted))',
  },
  avatarWrap: {
    position: 'relative',
    flexShrink: 0,
    marginTop: '2px',
  },
  unreadDot: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    width: '8px',
    height: '8px',
    borderRadius: '9999px',
    backgroundColor: colorVars['--color-text-accent'],
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: colorVars['--color-background-surface'],
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    marginBottom: '2px',
  },
  itemNameGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    minWidth: 0,
  },
  itemName: {
    fontSize: '13px',
    fontWeight: 'var(--font-weight-medium)',
    color: colorVars['--color-text-primary'],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  time: {
    fontSize: '11px',
    color: colorVars['--color-text-secondary'],
    flexShrink: 0,
  },
  actionText: {
    fontSize: '12px',
    color: colorVars['--color-text-secondary'],
    marginBottom: '4px',
  },
  content: {
    fontSize: '12px',
    lineHeight: '1.4',
    color: colorVars['--color-text-secondary'],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    marginTop: '2px',
  },
  iconDm: {
    color: colorVars['--color-text-accent'],
  },
  iconInfo: {
    color: colorVars['--color-icon-blue'],
  },
  iconDanger: {
    color: colorVars['--color-icon-red'],
  },
  iconWarning: {
    color: colorVars['--color-warning'],
  },
  footer: {
    paddingInline: '12px',
    paddingBlock: '8px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: colorVars['--color-border'],
    backgroundColor: colorVars['--color-background-surface'],
    flexShrink: 0,
  },
  popoverReset: {
    padding: 0,
    backgroundColor: 'transparent',
    boxShadow: 'none',
    borderWidth: 0,
    borderRadius: 0,
  },
  notificationButton: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-container)',
    color: colorVars['--color-text-secondary'],
    backgroundColor: 'transparent',
    borderWidth: 0,
    cursor: 'pointer',
    textDecoration: 'none',
    transitionProperty: 'background-color, color',
    transitionDuration: '150ms',
    '@media (hover: hover)': {
      ':hover': {
        backgroundColor: colorVars['--color-background-muted'],
        color: colorVars['--color-text-primary'],
      },
    },
  },
  notificationBadge: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    minWidth: '16px',
    height: '16px',
    paddingInline: '4px',
    borderRadius: '9999px',
    backgroundColor: colorVars['--color-icon-red'],
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: 'var(--font-weight-bold)',
    lineHeight: '16px',
    textAlign: 'center',
    pointerEvents: 'none',
  },
});

function getNotificationHref(item: NotificationItem): string {
  if (item.type === 'dm' && item.conversationId) {
    return `/messages/${item.conversationId}`;
  }
  if ((item.type === 'comment' || item.type === 'like') && item.postId) {
    return `/post/${item.postId}`;
  }
  return '/notifications';
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
      return '系统通知';
  }
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'dm':
      return <MessageCircle size={12} {...stylex.props(styles.iconDm)} />;
    case 'comment':
      return <MessageSquare size={12} {...stylex.props(styles.iconInfo)} />;
    case 'like':
      return <Heart size={12} {...stylex.props(styles.iconDanger)} />;
    default:
      return <Sparkles size={12} {...stylex.props(styles.iconWarning)} />;
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

  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with initial props if they change
  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  const handleFetchLatest = useCallback(() => {
    getRecentNotifications(8)
      .then((items) => {
        setNotifications(items);
        setUnreadCount(items.filter((n) => !n.read).length);
      })
      .catch((err) => {
        console.error('[NotificationPopover] failed to fetch recent notifications', err);
      });
  }, []);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
    handleFetchLatest();
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

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
    <div
      {...stylex.props(styles.panel)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.headerGroup)}>
          <Text as="span" size="sm" xstyle={styles.headerText}>
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
      <div {...stylex.props(styles.body)}>
        {notifications.length === 0 ? (
          <div {...stylex.props(styles.empty)}>
            <EmptyState
              icon={<Bell size={32} strokeWidth={1.5} {...stylex.props(styles.iconInfo)} />}
              title="暂无新通知"
              description="AI 居民们的动态和私信会在此提醒你"
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
                      name={item.characterName ?? '系统'}
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
                          {item.characterName ?? '系统'}
                        </span>
                        <span>{getNotificationIcon(item.type)}</span>
                      </div>
                      <TimeAgo date={item.createdAt} xstyle={styles.time} />
                    </div>

                    <Text type="supporting" as="p" xstyle={styles.actionText}>
                      {getNotificationActionLabel(item.type)}
                    </Text>

                    {item.content && (
                      <p {...stylex.props(styles.content)}>
                        {item.content}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div {...stylex.props(styles.footer)}>
        <Button
          as={Link}
          href="/notifications"
          onClick={() => setIsOpen(false)}
          variant="ghost"
          width="100%"
          size="sm"
          label="打开通知中心"
          endContent={<ArrowRight size={14} />}
        />
      </div>
    </div>
  );

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'inline-flex' }}
    >
      <Popover
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placement="below"
        alignment="end"
        label="最新通知"
        xstyle={styles.popoverReset}
        content={popoverContent}
      >
        <Link
          href="/notifications"
          {...stylex.props(styles.notificationButton)}
          aria-label={unreadCount > 0 ? `${unreadCount} 条未读通知` : '通知中心'}
          title="通知中心"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span {...stylex.props(styles.notificationBadge)}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
      </Popover>
    </div>
  );
}
