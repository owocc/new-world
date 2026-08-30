import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { aiCharacters } from '@/db/schema';
import { DeveloperSettings } from '@/components/settings/developer-settings';
import { requireUserId } from '@/lib/session';
import { getDeveloperConfig, DEFAULT_DEVELOPER_CONFIG } from '@/server/settings';

export const metadata = { title: '开发者设置' };
export const dynamic = 'force-dynamic';

export default async function AiDeveloperPage() {
  const userId = await requireUserId();
  const [developer, characters] = await Promise.all([
    getDeveloperConfig(userId),
    db
      .select()
      .from(aiCharacters)
      .where(eq(aiCharacters.userId, userId))
      .orderBy(aiCharacters.name),
  ]);

  return (
    <DeveloperSettings
      developer={developer ?? DEFAULT_DEVELOPER_CONFIG}
      characters={characters}
    />
  );
}
