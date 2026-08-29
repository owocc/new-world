import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { aiCharacters } from '@/db/schema';
import { requireUserId } from '@/lib/session';
import { CreateGroupForm } from '@/components/groups/create-group-form';

export const metadata = { title: '新建群聊' };
export const dynamic = 'force-dynamic';

export default async function NewGroupPage() {
  const userId = await requireUserId();
  const characters = await db
    .select()
    .from(aiCharacters)
    .where(and(eq(aiCharacters.userId, userId), eq(aiCharacters.status, 'active')));

  return <CreateGroupForm characters={characters} />;
}
