import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) redirect('/login');
  return session.user.id;
}

export async function getAuthUser() {
  const session = await getSession();
  return session?.user ?? null;
}
