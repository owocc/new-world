'use server';

import { requireUserId } from '@/lib/session';
import { markOnboardingComplete } from '@/server/onboarding';

/**
 * Marks the first-friend onboarding as done (either completed or skipped).
 * No revalidatePath here on purpose: revalidating would re-render the
 * /onboarding route mid-wizard, whose completed-guard would then bounce the
 * user to /feed before the success screen shows. All gated pages are
 * force-dynamic, so the flag is picked up on the next navigation anyway.
 */
export async function finishOnboarding(): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  await markOnboardingComplete(userId);
  return { ok: true };
}
