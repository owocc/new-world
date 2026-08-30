import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { aiCharacters, appSettings } from '@/db/schema';

export const ONBOARDING_SETTING_KEY = 'onboarding_completed';

export type OnboardingStatus = {
  completed: boolean;
  hasCharacters: boolean;
};

export async function getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const [setting, characters] = await Promise.all([
    db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(and(eq(appSettings.userId, userId), eq(appSettings.key, ONBOARDING_SETTING_KEY)))
      .limit(1),
    db
      .select({ id: aiCharacters.id })
      .from(aiCharacters)
      .where(eq(aiCharacters.userId, userId))
      .limit(1),
  ]);

  return {
    completed: setting[0]?.value === '1',
    hasCharacters: characters.length > 0,
  };
}

export async function markOnboardingComplete(userId: string) {
  await db
    .insert(appSettings)
    .values({
      id: crypto.randomUUID(),
      userId,
      key: ONBOARDING_SETTING_KEY,
      value: '1',
    })
    .onConflictDoUpdate({
      target: [appSettings.userId, appSettings.key],
      set: { value: '1', updatedAt: new Date() },
    });
}
