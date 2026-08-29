'use client';

import { usePathname } from 'next/navigation';
import type { UnifiedChatItem } from '@/server/unified-chat';
import type { aiCharacters } from '@/db/schema';
import { ConversationList } from '@/components/conversation-list';

type CharacterRow = typeof aiCharacters.$inferSelect;

/**
 * Messaging frame: conversation list + chat side by side on desktop (split
 * view). On mobile the list and each conversation are separate full screens.
 */
export function MessagesShell({
  chats,
  contacts,
  children,
}: {
  chats: UnifiedChatItem[];
  contacts: CharacterRow[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const inConversation = pathname.startsWith('/messages/') && pathname !== '/messages';

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      {/* conversation list: fixed 320px column on desktop; full screen on mobile unless in conversation */}
      <aside
        className={`w-full shrink-0 overflow-hidden border-border md:h-full md:w-[320px] md:border-r ${
          inConversation ? 'hidden md:block' : 'block'
        }`}
      >
        <ConversationList chats={chats} contacts={contacts} />
      </aside>

      {/* chat column */}
      <section
        className={`min-h-0 min-w-0 flex-1 flex-col ${
          inConversation ? 'flex' : 'hidden md:flex'
        }`}
      >
        {children}
      </section>
    </div>
  );
}
