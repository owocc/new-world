import Link from 'next/link';
import {notFound} from 'next/navigation';
import {and, eq} from 'drizzle-orm';
import {ArrowLeft} from 'lucide-react';
import {db} from '@/db';
import {aiCharacters, providerConfigs} from '@/db/schema';
import {CharacterDetail} from '@/components/character-detail';
import {requireUserId} from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{id: string}>;
}) {
  const {id} = await params;
  const userId = await requireUserId();

  const [character] = await db
    .select()
    .from(aiCharacters)
    .where(and(eq(aiCharacters.id, id), eq(aiCharacters.userId, userId)))
    .limit(1);
  if (!character) notFound();

  const providers = await db
    .select({id: providerConfigs.id, name: providerConfigs.name, providerType: providerConfigs.providerType})
    .from(providerConfigs)
    .where(eq(providerConfigs.userId, userId));

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pb-10 pt-4">
      <Link
        href="/characters"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-secondary transition-colors hover:text-primary"
      >
        <ArrowLeft size={16} />
        返回居民
      </Link>
      <CharacterDetail character={{...character, modelLabel: null}} providers={providers} />
    </div>
  );
}
