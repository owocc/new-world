import {redirect} from 'next/navigation';
import {Heart} from 'lucide-react';
import {getSession} from '@/lib/session';

export default async function AuthLayout({children}: {children: React.ReactNode}) {
  const session = await getSession();
  if (session?.user) redirect('/feed');

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-on-accent">
          <Heart size={24} fill="currentColor" strokeWidth={0} />
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">我的世界</h1>
        <p className="max-w-xs text-sm text-secondary">
          一个只属于你的 AI 社区。这里的一切居民，都在等你入住。
        </p>
      </div>
      {children}
    </div>
  );
}
