'use client';

import {usePathname} from 'next/navigation';
import type {ConversationView} from '@/server/chat';
import type {aiCharacters} from '@/db/schema';
import {ConversationList} from '@/components/conversation-list';

type CharacterRow = typeof aiCharacters.$inferSelect;

/**
 * Messaging frame: conversation list + chat side by side on desktop (split
 * view). On mobile the list and each conversation are separate full screens.
 */
export function MessagesShell({
  conversations,
  contacts,
  children,
}: {
  conversations: ConversationView[];
  contacts: CharacterRow[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const inConversation = pathname.startsWith('/messages/');

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* conversation list: fixed budget column on desktop; full screen on
          mobile unless a conversation is open */}
      <aside
        className={`w-full shrink-0 overflow-hidden border-border lg:block lg:h-full lg:w-[320px] lg:border-r ${
          inConversation ? 'hidden' : 'block'
        }`}
      >
        <ConversationList conversations={conversations} contacts={contacts} />
      </aside>
      {/* chat column: full screen on mobile when a conversation is open */}
      <section
        className={`min-h-0 min-w-0 flex-1 flex-col ${inConversation ? 'flex' : 'hidden'} lg:flex`}
      >
        {children}
      </section>
    </div>
  );
}
