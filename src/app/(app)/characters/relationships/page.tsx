import {eq} from 'drizzle-orm';
import {db} from '@/db';
import {aiCharacters, aiRelationships} from '@/db/schema';
import {requireUserId} from '@/lib/session';
import {RelationshipManagePanel} from '@/components/relationship-manage-panel';

export const metadata = {title: 'AI 通讯录'};
export const dynamic = 'force-dynamic';

export default async function CharactersRelationshipsPage() {
  const userId = await requireUserId();
  const [characters, relationships] = await Promise.all([
    db
      .select({
        id: aiCharacters.id,
        name: aiCharacters.name,
        username: aiCharacters.username,
        avatarEmoji: aiCharacters.avatarEmoji,
        avatarColor: aiCharacters.avatarColor,
        avatarUrl: aiCharacters.avatarUrl,
      })
      .from(aiCharacters)
      .where(eq(aiCharacters.userId, userId)),
    db.select().from(aiRelationships).where(eq(aiRelationships.userId, userId)),
  ]);

  return (
    <RelationshipManagePanel
      characters={characters}
      relationships={relationships.map((r) => ({
        id: r.id,
        fromCharacterId: r.fromCharacterId,
        toCharacterId: r.toCharacterId,
        kind: r.kind,
        note: r.note,
      }))}
    />
  );
}
