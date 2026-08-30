'use client';

import type { UnifiedChatItem } from '@/server/unified-chat';
import type { aiCharacters } from '@/db/schema';
import { ConversationList } from '@/components/conversation-list';
import { SplitLayout } from '@/components/split-layout';

type CharacterRow = typeof aiCharacters.$inferSelect;

export function MessagesShell({
  chats,
  contacts,
  children,
}: {
  chats: UnifiedChatItem[];
  contacts: CharacterRow[];
  children: React.ReactNode;
}) {
  return (
    <SplitLayout
      rootPath="/messages"
      sidebarWidth="md:w-[320px]"
      resizable
      sidebar={<ConversationList chats={chats} contacts={contacts} />}
    >
      {children}
    </SplitLayout>
  );
}
