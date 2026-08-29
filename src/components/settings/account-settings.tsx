'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { changePassword } from '@/server/actions/settings';

const inputCls =
  'w-full rounded-xl border border-line surface-2 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-accent-400)]';

export function AccountSettings({ email, createdAt }: { email: string; createdAt: string }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const change = async () => {
    if (!currentPassword || newPassword.length < 8) {
      toast.error('新密码至少 8 位');
      return;
    }
    setSaving(true);
    const res = await changePassword({ currentPassword, newPassword });
    setSaving(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success('密码已修改');
    setCurrentPassword('');
    setNewPassword('');
  };

  const signOut = async () => {
    await authClient.signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-line surface p-4 shadow-sm sm:p-5">
        <h2 className="mb-4 text-base font-bold">账号信息</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-secondary">邮箱</dt>
            <dd className="font-medium">{email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-secondary">注册时间</dt>
            <dd className="font-medium">{createdAt}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-3xl border border-line surface p-4 shadow-sm sm:p-5">
        <h2 className="mb-4 text-base font-bold">修改密码</h2>
        <div className="grid gap-3 sm:max-w-md">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="当前密码"
            autoComplete="current-password"
            className={inputCls}
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="新密码（至少 8 位）"
            autoComplete="new-password"
            className={inputCls}
          />
          <button onClick={change} disabled={saving} className="rounded-xl bg-[var(--color-accent-600)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? '保存中…' : '修改密码'}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-line surface p-4 shadow-sm sm:p-5">
        <h2 className="mb-1 text-base font-bold text-rose-500">退出登录</h2>
        <p className="mb-4 text-xs text-muted">退出后需要重新登录才能回到你的社区。</p>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-500 transition-colors hover:bg-rose-500/20"
        >
          <LogOut size={15} />
          退出登录
        </button>
      </section>
    </div>
  );
}
