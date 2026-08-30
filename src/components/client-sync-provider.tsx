'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();

  const [unread, setUnread] = useState<SyncUnreadState>(initialUnread);
  const [chats, setChats] = useState<UnifiedChatItem[]>(initialChats);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const lastSyncTimestampRef = useRef<number>(Date.now());

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
      // Notifications are gathered in Notification Center badge & popover (no floating toasts)
    } catch (err) {
      console.error('[client-sync] fetch error', err);
    }
  }, []);

  // Periodic polling & refetch on focus / visibility
  useEffect(() => {
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
