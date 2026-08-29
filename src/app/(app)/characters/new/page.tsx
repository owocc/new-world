import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/db';
import { providerConfigs } from '@/db/schema';
import { CharacterEditor, type CharacterFormValues } from '@/components/character-editor';
import { requireUserId } from '@/lib/session';
import { PageContainer } from '@/components/page-container';

export const metadata = { title: '新增居民' };

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
    .select({ id: providerConfigs.id, name: providerConfigs.name, providerType: providerConfigs.providerType })
    .from(providerConfigs)
    .where(eq(providerConfigs.userId, userId));

  return (
    <PageContainer className="pt-4">
      <Link
        href="/characters"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-secondary transition-colors hover:text-[var(--text)]"
      >
        <ArrowLeft size={16} />
        返回列表
      </Link>
      <CharacterEditor initial={emptyCharacter} providers={providers} />
    </PageContainer>
  );
}
