import Link from 'next/link';
import {eq} from 'drizzle-orm';
import {ArrowLeft} from 'lucide-react';
import {db} from '@/db';
import {providerConfigs} from '@/db/schema';
import {CharacterEditor, type CharacterFormValues} from '@/components/character-editor';
import {requireUserId} from '@/lib/session';

export const metadata = {title: '新增居民'};

export const emptyCharacter: CharacterFormValues = {
  name: '',
  username: '',
  bio: '',
  avatarUrl: '',
  avatarEmoji: '🙂',
  avatarColor: 'violet',
  persona: '',
  personality: '',
  interests: '',
  expressionStyle: '',
  relationshipToUser: '朋友',
  systemPrompt: '',
  status: 'active',
  chattiness: 0.5,
  likeRate: 0.5,
  commentRate: 0.4,
  postRate: 0.15,
  dmRate: 0.05,
  providerId: '',
  modelId: '',
  temperature: '',
  topP: '',
  maxTokens: '',
};

export default async function NewCharacterPage() {
  const userId = await requireUserId();
  const providers = await db
    .select({id: providerConfigs.id, name: providerConfigs.name, providerType: providerConfigs.providerType})
    .from(providerConfigs)
    .where(eq(providerConfigs.userId, userId));

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pb-10 pt-4">
      <Link
        href="/characters"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-secondary transition-colors hover:text-primary"
      >
        <ArrowLeft size={16} />
        返回居民
      </Link>
      <h1 className="mb-4 text-xl font-semibold tracking-tight">新增居民</h1>
      <CharacterEditor initial={emptyCharacter} providers={providers} />
    </div>
  );
}
