import {requireUserId} from '@/lib/session';
import {OnboardingWizard} from '@/components/onboarding/onboarding-wizard';

export const metadata = {title: '欢迎引导'};
export const dynamic = 'force-dynamic';

/**
 * No completed-guard redirect here on purpose: server actions used by the
 * wizard re-render this route mid-flow, and a guard would bounce the user to
 * /feed before the success screen shows. Unfinished users are already routed
 * here by the feed gate; revisiting manually just replays the tutorial.
 */
export default async function OnboardingPage() {
  await requireUserId();
  return <OnboardingWizard />;
}
