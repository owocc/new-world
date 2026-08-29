import { and, eq, notInArray } from 'drizzle-orm';
import { db } from '@/db';
import { aiCharacters } from '@/db/schema';
import { ConversationList } from '@/components/conversation-list';
import { requireUserId } from '@/lib/session';
import { getConversations } from '@/server/chat';

export const metadata = { title: '私信' };
export const dynamic = 'force-dynamic';

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
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
    <div className="lg:grid lg:h-dvh lg:grid-cols-[320px_1fr]">
      <aside className="border-b border-line lg:h-dvh lg:border-b-0 lg:border-r">
        <ConversationList conversations={conversations} contacts={contacts} />
      </aside>
      <section className="min-h-[calc(100dvh-3.5rem)] lg:h-dvh lg:min-h-0 lg:overflow-hidden">
        {children}
      </section>
    </div>
  );
}
