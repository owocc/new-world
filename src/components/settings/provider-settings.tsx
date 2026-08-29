'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Plus, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  createProvider,
  deleteProvider,
  setDefaultProvider,
  updateProvider,
} from '@/server/actions/settings';
import { PROVIDER_LABELS, PROVIDER_TYPES, type ProviderType } from '@/lib/providers-shared';

const inputCls =
  'w-full rounded-xl border border-line surface-2 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-accent-400)]';

type ProviderRow = {
  id: string;
  name: string;
  providerType: string;
  baseUrl: string | null;
  isDefault: boolean;
  enabled: boolean;
  apiKeyMasked: string;
};

export function ProviderSettings({ providers }: { providers: ProviderRow[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(providers.length === 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold">AI Providers</h2>
          <p className="text-xs text-muted">API Key 仅保存在服务端数据库，绝不会发送到浏览器。</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-full bg-[var(--color-accent-600)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus size={15} />
          新增
        </button>
      </div>

      {showForm && (
        <ProviderForm
          onDone={() => {
            setShowForm(false);
            router.refresh();
          }}
        />
      )}

      {providers.length === 0 && !showForm && (
        <p className="rounded-3xl border border-line surface py-10 text-center text-sm text-muted">
          还没有配置任何 Provider，AI 居民们无法开工
        </p>
      )}

      <div className="space-y-3">
        {providers.map((p) => (
          <ProviderItem key={p.id} provider={p} />
        ))}
      </div>
    </div>
  );
}

function ProviderForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ProviderType>('openai');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim() || !apiKey.trim()) {
      toast.error('请填写名称和 API Key');
      return;
    }
    setSaving(true);
    const res = await createProvider({ name: name.trim(), providerType: type, apiKey: apiKey.trim(), baseUrl: baseUrl.trim() || null });
    setSaving(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success('Provider 已添加');
    onDone();
  };

  return (
    <div className="space-y-3 rounded-3xl border border-[var(--color-accent-300)] surface p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">名称</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="例如 我的 OpenAI" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">类型</label>
          <select value={type} onChange={(e) => setType(e.target.value as ProviderType)} className={inputCls}>
            {PROVIDER_TYPES.map((t) => (
              <option key={t} value={t}>
                {PROVIDER_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">API Key</label>
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className={inputCls} placeholder="sk-…" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Base URL{type === 'openai-compatible' && '（必填）'}
          </label>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className={inputCls}
            placeholder={type === 'openai' ? '留空使用官方地址' : 'https://api.example.com/v1'}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving} className="rounded-xl bg-[var(--color-accent-600)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? '保存中…' : '添加'}
        </button>
        <button onClick={onDone} className="rounded-xl surface-2 px-4 py-2 text-sm font-medium text-secondary">
          取消
        </button>
      </div>
    </div>
  );
}

function ProviderItem({ provider }: { provider: ProviderRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(provider.name);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(provider.baseUrl ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await updateProvider(provider.id, { name, baseUrl: baseUrl.trim() || null, apiKey: apiKey.trim() });
    setSaving(false);
    res?.error ? toast.error(res.error) : toast.success('已保存');
    setEditing(false);
    router.refresh();
  };

  return (
    <div className={`rounded-3xl border border-line surface p-4 shadow-sm ${!provider.enabled ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{provider.name}</span>
            <span className="rounded-full surface-2 px-2 py-0.5 text-[11px] text-secondary">
              {PROVIDER_LABELS[provider.providerType as ProviderType] ?? provider.providerType}
            </span>
            {provider.isDefault && (
              <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                <Star size={11} fill="currentColor" />
                默认
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-muted">
            Key: {provider.apiKeyMasked}
            {provider.baseUrl && <> · {provider.baseUrl}</>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!provider.isDefault && (
            <button
              onClick={async () => {
                await setDefaultProvider(provider.id);
                toast.success('已设为默认');
                router.refresh();
              }}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:surface-2"
            >
              设为默认
            </button>
          )}
          <button
            onClick={async () => {
              await updateProvider(provider.id, { enabled: !provider.enabled });
              router.refresh();
            }}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:surface-2"
          >
            {provider.enabled ? '禁用' : '启用'}
          </button>
          <button
            onClick={() => setEditing((v) => !v)}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:surface-2"
          >
            {editing ? '收起' : '编辑'}
          </button>
          <button
            onClick={async () => {
              if (!confirm(`确定删除「${provider.name}」吗？`)) return;
              await deleteProvider(provider.id);
              toast.success('已删除');
              router.refresh();
            }}
            className="rounded-full p-2 text-muted transition-colors hover:text-rose-500"
            aria-label="删除"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-3">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="名称" />
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className={inputCls}
            placeholder="新 API Key（留空保持不变）"
          />
          <div className="flex gap-2">
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className={inputCls} placeholder="Base URL" />
            <button onClick={save} disabled={saving} className="flex shrink-0 items-center rounded-xl bg-[var(--color-accent-600)] px-4 text-sm font-semibold text-white disabled:opacity-50">
              <Check size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
