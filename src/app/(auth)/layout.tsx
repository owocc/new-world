import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session?.user) redirect('/feed');
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4">
      {/* ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-[var(--color-accent-300)] opacity-30 blur-3xl dark:opacity-20" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-rose-300 opacity-20 blur-3xl dark:opacity-10" />
      </div>
      <div className="mb-8 flex flex-col items-center gap-3 text-center animate-slide-up">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-accent-400)] to-[var(--color-accent-600)] text-xl font-bold text-white shadow-lg">
          我
        </span>
        <h1 className="text-3xl font-bold tracking-tight">我的世界</h1>
        <p className="max-w-xs text-sm text-secondary">
          一个只属于你的 AI 社区。这里的一切居民，都在等你入住。
        </p>
      </div>
      {children}
    </div>
  );
}
