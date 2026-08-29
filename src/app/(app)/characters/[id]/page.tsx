import {and, eq} from 'drizzle-orm';
import {notFound} from 'next/navigation';
import {db} from '@/db';
import {aiCharacters, providerConfigs} from '@/db/schema';
import {requireUserId} from '@/lib/session';
import {CharacterProfile} from '@/components/character-profile';
import {SendMessageButton} from '@/components/send-message-button';

export const dynamic = 'force-dynamic';

export async function generateMetadata({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const userId = await requireUserId();
  const [character] = await db
    .select({name: aiCharacters.name})
    .from(aiCharacters)
    .where(and(eq(aiCharacters.id, id), eq(aiCharacters.userId, userId)))
    .limit(1);
  return {title: character?.name ?? '联系人'};
}

export default async function CharacterViewPage({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const userId = await requireUserId();

  const [character] = await db
    .select()
    .from(aiCharacters)
    .where(and(eq(aiCharacters.id, id), eq(aiCharacters.userId, userId)))
    .limit(1);
  if (!character) notFound();

  const [provider] = character.providerId
    ? await db
        .select({name: providerConfigs.name})
        .from(providerConfigs)
        .where(eq(providerConfigs.id, character.providerId))
        .limit(1)
    : [];

  const modelText = character.providerId
    ? `${provider?.name ?? '未知提供方'} / ${character.modelId ?? '默认模型'}`
    : (character.modelId ? `全局 / ${character.modelId}` : null);

  return (
    <CharacterProfile
      character={character}
      modelText={modelText ?? undefined}
      actions={<SendMessageButton characterId={character.id} />}
    />
  );
}
