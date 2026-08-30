'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import type { UnifiedChatItem } from '@/server/unified-chat';
import type { NotificationPrefs } from '@/server/settings';
import {
  getNotificationPermissionState,
  showAppNotification,
} from '@/lib/browser-notification';

export type SyncUnreadState = {
  messages: number;
  groups: number;
  notifications: number;
  totalChats: number;
};

/** /api/chat/sync 返回的最新通知行（JSON 序列化后 createdAt 为字符串） */
export type SyncNotificationRow = {
  id: string;
  type: string;
  content: string;
  postId: string | null;
  conversationId: string | null;
};

export type ClientSyncContextType = {
  unread: SyncUnreadState;
  chats: UnifiedChatItem[];
  refresh: () => Promise<void>;
  ingestSync: (data: {unread?: SyncUnreadState; chats?: UnifiedChatItem[]}) => void;
  currentConversationId: string | null;
  setCurrentConversationId: (id: string | null) => void;
  notificationPrefs: NotificationPrefs;
  updateNotificationPrefs: (prefs: NotificationPrefs) => void;
};

const ClientSyncContext = createContext<ClientSyncContextType | null>(null);

function describeNotification(n: SyncNotificationRow): {title: string; url: string} {
  switch (n.type) {
    case 'dm':
      return {
        title: '新消息',
        url: n.conversationId ? `/messages/${n.conversationId}` : '/messages',
      };
    case 'like':
      return {title: '收到点赞', url: n.postId ? `/post/${n.postId}` : '/notifications'};
    case 'comment':
      return {title: '新评论', url: n.postId ? `/post/${n.postId}` : '/notifications'};
    default:
      return {title: '新通知', url: '/notifications'};
  }
}

export function ClientSyncProvider({
  initialUnread,
  initialChats = [],
  initialNotificationPrefs,
  children,
}: {
  initialUnread: SyncUnreadState;
  initialChats?: UnifiedChatItem[];
  initialNotificationPrefs: NotificationPrefs;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [unread, setUnread] = useState<SyncUnreadState>(initialUnread);
  const [chats, setChats] = useState<UnifiedChatItem[]>(initialChats);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [notificationPrefs, setNotificationPrefsState] = useState<NotificationPrefs>(
    initialNotificationPrefs,
  );

  const lastSyncTimestampRef = useRef<number>(Date.now());
  const lastHiddenSyncRef = useRef<number>(Date.now());
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  // 轮询回调读取最新偏好，避免把 prefs 加进 performSync 依赖导致高频重建
  const prefsRef = useRef<NotificationPrefs>(initialNotificationPrefs);

  const updateNotificationPrefs = useCallback((prefs: NotificationPrefs) => {
    prefsRef.current = prefs;
    setNotificationPrefsState(prefs);
  }, []);

  // Determine current conversation if user is in /messages/[id]
  useEffect(() => {
    if (pathname.startsWith('/messages/') && !pathname.startsWith('/messages/group/')) {
      const parts = pathname.split('/');
      const convId = parts[2];
      if (convId && convId !== 'group') {
        setCurrentConversationId(convId);
        return;
      }
    }
    setCurrentConversationId(null);
  }, [pathname]);

  const dispatchBrowserNotifications = useCallback((rows: SyncNotificationRow[]) => {
    const prefs = prefsRef.current;
    if (!prefs.pushEnabled || !rows.length) return;
    if (getNotificationPermissionState() !== 'granted') return;
    // 用户正盯着页面时不打扰；切走后由后台轮询补发
    if (document.visibilityState === 'visible') return;

    for (const row of rows) {
      if (notifiedIdsRef.current.has(row.id)) continue;
      notifiedIdsRef.current.add(row.id);
      const allowed =
        row.type === 'dm'
          ? prefs.dm
          : row.type === 'like'
            ? prefs.like
            : row.type === 'comment'
              ? prefs.comment
              : false;
      if (!allowed) continue;

      const {title, url} = describeNotification(row);
      void showAppNotification({title, body: row.content || undefined, tag: row.id, url});
    }
    // 会话内去重集合设个上限，防止长时间驻留内存膨胀
    if (notifiedIdsRef.current.size > 500) {
      notifiedIdsRef.current = new Set([...notifiedIdsRef.current].slice(-200));
    }
  }, []);

  // 将任意同步响应中的未读数与会话列表应用到全局状态，
  // 供聊天窗口等更快的轮询复用，避免侧栏列表落后于导航角标
  const ingestSync = useCallback((data: {unread?: SyncUnreadState; chats?: UnifiedChatItem[]}) => {
    if (data.unread) {
      setUnread(data.unread);
    }
    if (data.chats) {
      setChats(data.chats);
    }
  }, []);

  const performSync = useCallback(async () => {
    try {
      const since = lastSyncTimestampRef.current;
      const res = await fetch(`/api/chat/sync?since=${since}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.ok) return;

      lastSyncTimestampRef.current = data.timestamp;
      ingestSync(data);
      dispatchBrowserNotifications(data.recentNotifications ?? []);
    } catch (err) {
      console.error('[client-sync] fetch error', err);
    }
  }, [ingestSync, dispatchBrowserNotifications]);

  // Periodic polling & refetch on focus / visibility
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        performSync();
      } else if (Date.now() - lastHiddenSyncRef.current > 30_000) {
        // 页面切走时降频轮询，保证浏览器通知仍能送达
        lastHiddenSyncRef.current = Date.now();
        performSync();
      }
    }, 2000);

    const onFocus = () => {
      performSync();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performSync();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [performSync]);

  return (
    <ClientSyncContext.Provider
      value={{
        unread,
        chats,
        refresh: performSync,
        ingestSync,
        currentConversationId,
        setCurrentConversationId,
        notificationPrefs,
        updateNotificationPrefs,
      }}
    >
      {children}
    </ClientSyncContext.Provider>
  );
}

export function useClientSync() {
  const ctx = useContext(ClientSyncContext);
  if (!ctx) {
    throw new Error('useClientSync must be used within a ClientSyncProvider');
  }
  return ctx;
}
