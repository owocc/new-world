import { and, eq, notInArray } from 'drizzle-orm';
import { db } from '@/db';
import { aiCharacters } from '@/db/schema';
import { requireUserId } from '@/lib/session';
import { getUnifiedChats } from '@/server/unified-chat';
import { ConversationList } from '@/components/conversation-list';
import { SplitLayout } from '@/components/split-layout';

export const metadata = { title: '聊天' };
export const dynamic = 'force-dynamic';

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const userId = await requireUserId();
  const chats = await getUnifiedChats(userId);

  const withConvIds = chats
    .filter((c) => c.kind === 'dm' && c.characterId)
    .map((c) => c.characterId!);

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
    <SplitLayout
      rootPath="/messages"
      sidebarWidth="md:w-[320px]"
      sidebar={<ConversationList chats={chats} contacts={contacts} />}
    >
      {children}
    </SplitLayout>
  );
}
