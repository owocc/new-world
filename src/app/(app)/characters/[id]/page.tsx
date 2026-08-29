import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/db';
import { aiCharacters, providerConfigs } from '@/db/schema';
import { CharacterEditor, type CharacterFormValues } from '@/components/character-editor';
import { requireUserId } from '@/lib/session';
import { PageContainer } from '@/components/page-container';

export const dynamic = 'force-dynamic';

export default async function EditCharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();

  const [character] = await db
    .select()
    .from(aiCharacters)
    .where(and(eq(aiCharacters.id, id), eq(aiCharacters.userId, userId)))
    .limit(1);
  if (!character) notFound();

  const providers = await db
    .select({ id: providerConfigs.id, name: providerConfigs.name, providerType: providerConfigs.providerType })
    .from(providerConfigs)
    .where(eq(providerConfigs.userId, userId));

  const initial: CharacterFormValues = {
    name: character.name,
    username: character.username,
    bio: character.bio,
    avatarUrl: character.avatarUrl ?? '',
    avatarEmoji: character.avatarEmoji,
    avatarColor: character.avatarColor,
    persona: character.persona,
    personality: character.personality,
    interests: character.interests,
    expressionStyle: character.expressionStyle,
    relationshipToUser: character.relationshipToUser,
    systemPrompt: character.systemPrompt ?? '',
    status: character.status as 'active' | 'paused',
    chattiness: character.chattiness,
    likeRate: character.likeRate,
    commentRate: character.commentRate,
    postRate: character.postRate,
    dmRate: character.dmRate,
    providerId: character.providerId ?? '',
    modelId: character.modelId ?? '',
    temperature: character.temperature?.toString() ?? '',
    topP: character.topP?.toString() ?? '',
    maxTokens: character.maxTokens?.toString() ?? '',
  };

  return (
    <PageContainer className="pt-4">
      <Link
        href="/characters"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-secondary transition-colors hover:text-[var(--text)]"
      >
        <ArrowLeft size={16} />
        返回列表
      </Link>
      <CharacterEditor characterId={id} initial={initial} providers={providers} />
    </PageContainer>
  );
}
