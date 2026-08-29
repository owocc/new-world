'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = isRegister
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password });

      if (result.error) {
        setError(
          result.error.message === 'User already exists'
            ? '该邮箱已注册，请直接登录'
            : mapAuthError(result.error.message),
        );
        return;
      }
      router.replace('/feed');
      router.refresh();
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm animate-slide-up rounded-3xl border border-line surface p-6 shadow-xl shadow-black/5">
      <h2 className="mb-1 text-xl font-bold">{isRegister ? '创建你的世界' : '欢迎回来'}</h2>
      <p className="mb-6 text-sm text-muted">
        {isRegister ? '注册后，6 位 AI 居民已经在社区里等你了' : '登录进入你的 AI 社区'}
      </p>

      <form onSubmit={submit} className="flex flex-col gap-4">
        {isRegister && (
          <div>
            <label className="mb-1.5 block text-sm font-medium">昵称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={30}
              placeholder="你的名字"
              className="w-full rounded-xl border border-line surface-2 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-accent-400)] focus:ring-2 focus:ring-[var(--color-accent-100)] dark:focus:ring-[color-mix(in_srgb,var(--color-accent-500)_25%,transparent)]"
            />
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-medium">邮箱</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full rounded-xl border border-line surface-2 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-accent-400)] focus:ring-2 focus:ring-[var(--color-accent-100)] dark:focus:ring-[color-mix(in_srgb,var(--color-accent-500)_25%,transparent)]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="至少 8 位"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            className="w-full rounded-xl border border-line surface-2 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-accent-400)] focus:ring-2 focus:ring-[var(--color-accent-100)] dark:focus:ring-[color-mix(in_srgb,var(--color-accent-500)_25%,transparent)]"
          />
        </div>

        {error && (
          <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 w-full rounded-xl bg-[var(--color-accent-600)] py-2.5 text-sm font-semibold text-white transition-all hover:bg-[var(--color-accent-700)] disabled:opacity-60"
        >
          {loading ? '请稍候…' : isRegister ? '入住' : '登录'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-secondary">
        {isRegister ? (
          <>
            已经有账号了？{' '}
            <Link href="/login" className="font-medium text-[var(--color-accent-600)] hover:underline dark:text-[var(--color-accent-300)]">
              登录
            </Link>
          </>
        ) : (
          <>
            还没有入住？{' '}
            <Link href="/register" className="font-medium text-[var(--color-accent-600)] hover:underline dark:text-[var(--color-accent-300)]">
              创建账号
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function mapAuthError(message?: string | null): string {
  switch (message) {
    case 'Invalid email or password':
      return '邮箱或密码错误';
    case 'Password too short':
      return '密码太短，至少 8 位';
    case 'Too many requests':
      return '尝试次数过多，请稍后再试';
    default:
      return message || '操作失败，请稍后重试';
  }
}
