import {and, eq, notInArray} from 'drizzle-orm';
import {db} from '@/db';
import {aiCharacters} from '@/db/schema';
import {ConversationList} from '@/components/conversation-list';
import {MessagesShell} from '@/components/messages-shell';
import {requireUserId} from '@/lib/session';
import {getConversations} from '@/server/chat';

export const metadata = {title: '私信'};
export const dynamic = 'force-dynamic';

export default async function MessagesLayout({children}: {children: React.ReactNode}) {
  const userId = await requireUserId();
  const conversations = await getConversations(userId);

  const withConvIds = conversations.map((c) => c.characterId);
  const contacts = await db
    .select()
    .from(aiCharacters)
    .where(
      and(
        eq(aiCharacters.userId, userId),
        eq(aiCharacters.status, 'active'),
        withConvIds.length > 0 ? notInArray(aiCharacters.id, withConvIds) : undefined,
      ),
    );

  return (
    <MessagesShell conversations={conversations} contacts={contacts}>
      {children}
    </MessagesShell>
  );
}
