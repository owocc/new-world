import {eq} from 'drizzle-orm';
import {db} from '@/db';
import {aiCharacters} from '@/db/schema';
import {requireUserId} from '@/lib/session';
import {SplitLayout} from '@/components/split-layout';
import {ContactList} from '@/components/contact-list';

export const metadata = {title: '联系人'};
export const dynamic = 'force-dynamic';

export default async function CharactersLayout({children}: {children: React.ReactNode}) {
  const userId = await requireUserId();
  const characters = await db
    .select({
      id: aiCharacters.id,
      name: aiCharacters.name,
      username: aiCharacters.username,
      avatarEmoji: aiCharacters.avatarEmoji,
      avatarColor: aiCharacters.avatarColor,
      avatarUrl: aiCharacters.avatarUrl,
      status: aiCharacters.status,
      relationshipToUser: aiCharacters.relationshipToUser,
    })
    .from(aiCharacters)
    .where(eq(aiCharacters.userId, userId));

  return (
    <SplitLayout
      rootPath="/characters"
      sidebarWidth={280}
      scrollableDetail
      sidebar={<ContactList characters={characters} />}
    >
      {children}
    </SplitLayout>
  );
}
