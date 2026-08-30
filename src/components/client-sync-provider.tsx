'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppToast } from '@/lib/toast';
import type { UnifiedChatItem } from '@/server/unified-chat';

export type SyncUnreadState = {
  messages: number;
  groups: number;
  notifications: number;
  totalChats: number;
};

export type ClientSyncContextType = {
  unread: SyncUnreadState;
  chats: UnifiedChatItem[];
  refresh: () => Promise<void>;
  currentConversationId: string | null;
  setCurrentConversationId: (id: string | null) => void;
};

const ClientSyncContext = createContext<ClientSyncContextType | null>(null);

export function ClientSyncProvider({
  initialUnread,
  initialChats = [],
  children,
}: {
  initialUnread: SyncUnreadState;
  initialChats?: UnifiedChatItem[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useAppToast();

  const [unread, setUnread] = useState<SyncUnreadState>(initialUnread);
  const [chats, setChats] = useState<UnifiedChatItem[]>(initialChats);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const lastSyncTimestampRef = useRef<number>(Date.now());
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());

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

  const performSync = useCallback(async () => {
    try {
      const since = lastSyncTimestampRef.current;
      const res = await fetch(`/api/chat/sync?since=${since}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.ok) return;

      lastSyncTimestampRef.current = data.timestamp;

      if (data.unread) {
        setUnread(data.unread);
      }
      if (data.chats) {
        setChats(data.chats);
      }

      // Check for new notifications to display in-app toast
      if (Array.isArray(data.recentNotifications) && data.recentNotifications.length > 0) {
        for (const notif of data.recentNotifications) {
          if (seenNotificationIdsRef.current.has(notif.id)) continue;
          seenNotificationIdsRef.current.add(notif.id);

          // If the notification is for the DM conversation the user is currently viewing, do not toast
          if (notif.type === 'dm' && notif.conversationId && notif.conversationId === currentConversationId) {
            continue;
          }

          // Show Toast
          if (notif.type === 'dm') {
            const charName = chats.find((c) => c.id === notif.conversationId)?.name || '好友';
            toast.info(`${charName} 回复了你: ${notif.content || '新消息'}`);
          }
        }
      }
    } catch (err) {
      console.error('[client-sync] fetch error', err);
    }
  }, [chats, currentConversationId, toast]);

  // Periodic polling & refetch on focus / visibility
  useEffect(() => {
    // Poll every 3.5s for snappy real-time feeling
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        performSync();
      }
    }, 3500);

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
        currentConversationId,
        setCurrentConversationId,
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
