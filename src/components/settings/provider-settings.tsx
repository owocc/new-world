'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft, Check, Plus, Star, Trash2} from 'lucide-react';
import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Selector} from '@astryxdesign/core/Selector';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {VStack} from '@astryxdesign/core/Stack';
import {useAppToast} from '@/lib/toast';
import {
  createProvider,
  deleteProvider,
  setDefaultProvider,
  updateProvider,
} from '@/server/actions/settings';
import {PROVIDER_LABELS, PROVIDER_TYPES, type ProviderType} from '@/lib/providers-shared';

export type ProviderRow = {
  id: string;
  name: string;
  providerType: string;
  baseUrl: string | null;
  isDefault: boolean;
  enabled: boolean;
  apiKeyMasked: string;
};

export function ProviderSettings({providers}: {providers: ProviderRow[]}) {
  const router = useRouter();
  const toast = useAppToast();
  const [showForm, setShowForm] = useState(providers.length === 0);

  return (
    <VStack gap={5}>
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Link
          href="/settings"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-secondary hover:bg-muted lg:hidden"
          aria-label="返回设置菜单"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">AI 服务商配置</h1>
          <p className="text-xs text-secondary">接入 OpenAI、Anthropic、DeepSeek 等大模型服务商</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          label={showForm ? '收起' : '新增'}
          variant={showForm ? 'secondary' : 'primary'}
          size="sm"
          icon={<Plus size={15} />}
          onClick={() => setShowForm((v) => !v)}
        />
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
        <EmptyState title="还没有配置任何 Provider" description="添加后 AI 居民们才能开工" />
      )}

      <VStack gap={3}>
        {providers.map((p) => (
          <ProviderItem key={p.id} provider={p} />
        ))}
      </VStack>
    </VStack>
  );
}

function ProviderForm({onDone}: {onDone: () => void}) {
  const toast = useAppToast();
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
    const res = await createProvider({name: name.trim(), providerType: type, apiKey: apiKey.trim(), baseUrl: baseUrl.trim() || null});
    setSaving(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success('Provider 已添加');
    onDone();
  };

  return (
    <Card padding={4}>
      <VStack gap={4}>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <TextInput label="名称" value={name} onChange={setName} placeholder="例如 我的 OpenAI" htmlName="provider-name" />
          <Selector
            label="类型"
            value={type}
            onChange={(v) => setType((v ?? 'openai') as ProviderType)}
            options={PROVIDER_TYPES.map((t) => ({value: t, label: PROVIDER_LABELS[t]}))}
          />
          <TextInput label="API Key" type="password" value={apiKey} onChange={setApiKey} placeholder="sk-…" htmlName="provider-key" />
          <TextInput
            label="Base URL"
            isOptional={type !== 'openai-compatible'}
            value={baseUrl}
            onChange={setBaseUrl}
            placeholder={type === 'openai' ? '留空使用官方地址' : 'https://api.example.com/v1'}
            htmlName="provider-url"
          />
        </div>
        <div className="flex gap-2">
          <Button label={saving ? '保存中…' : '添加'} variant="primary" onClick={submit} isDisabled={saving} isLoading={saving} />
          <Button label="取消" variant="ghost" onClick={onDone} />
        </div>
      </VStack>
    </Card>
  );
}

function ProviderItem({provider}: {provider: ProviderRow}) {
  const router = useRouter();
  const toast = useAppToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(provider.name);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(provider.baseUrl ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await updateProvider(provider.id, {name, baseUrl: baseUrl.trim() || null, apiKey: apiKey.trim()});
    setSaving(false);
    res?.error ? toast.error(res.error) : toast.success('已保存');
    setEditing(false);
    router.refresh();
  };

  return (
    <Card padding={4} className={provider.enabled ? undefined : 'opacity-60'}>
      <VStack gap={3}>
        <div className="flex flex-wrap items-center gap-2">
          <StatusDot variant={provider.enabled ? 'success' : 'neutral'} label={provider.enabled ? '启用' : '禁用'} />
          <span className="font-semibold">{provider.name}</span>
          <Badge variant="neutral" label={PROVIDER_LABELS[provider.providerType as ProviderType] ?? provider.providerType} />
          {provider.isDefault && (
            <Badge
              variant="yellow"
              icon={<Star size={11} fill="currentColor" />}
              label="默认"
            />
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            {!provider.isDefault && (
              <Button
                label="设为默认"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await setDefaultProvider(provider.id);
                  toast.success('已设为默认');
                  router.refresh();
                }}
              />
            )}
            <Button
              label={provider.enabled ? '禁用' : '启用'}
              variant="ghost"
              size="sm"
              onClick={async () => {
                await updateProvider(provider.id, {enabled: !provider.enabled});
                router.refresh();
              }}
            />
            <Button label={editing ? '收起' : '编辑'} variant="ghost" size="sm" onClick={() => setEditing((v) => !v)} />
            <Button
              label="删除"
              isIconOnly
              variant="ghost"
              size="sm"
              icon={<Trash2 size={15} />}
              tooltip="删除 Provider"
              onClick={async () => {
                if (!confirm(`确定删除「${provider.name}」吗？`)) return;
                await deleteProvider(provider.id);
                toast.success('已删除');
                router.refresh();
              }}
            />
          </div>
        </div>
        <Text type="supporting" size="sm" as="div">
          Key: {provider.apiKeyMasked}
          {provider.baseUrl ? ` · ${provider.baseUrl}` : ''}
        </Text>

        {editing && (
          <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-3 sm:items-end">
            <TextInput label="名称" isLabelHidden value={name} onChange={setName} placeholder="名称" htmlName="edit-name" />
            <TextInput
              label="新 API Key"
              isLabelHidden
              type="password"
              value={apiKey}
              onChange={setApiKey}
              placeholder="新 API Key（留空保持不变）"
              htmlName="edit-key"
            />
            <div className="flex gap-2">
              <TextInput label="Base URL" isLabelHidden value={baseUrl} onChange={setBaseUrl} placeholder="Base URL" htmlName="edit-url" />
              <Button label="保存" isIconOnly variant="primary" icon={<Check size={15} />} onClick={save} isDisabled={saving} isLoading={saving} />
            </div>
          </div>
        )}
      </VStack>
    </Card>
  );
}
