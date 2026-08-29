'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft, Check, Plus, Star, Trash2, RefreshCw, Layers} from 'lucide-react';
import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Selector} from '@astryxdesign/core/Selector';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {NumberInput} from '@astryxdesign/core/NumberInput';
import {Table, proportional, pixel} from '@astryxdesign/core/Table';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {useAppToast} from '@/lib/toast';
import {
  createProvider,
  deleteProvider,
  setDefaultProvider,
  updateProvider,
  syncProviderModels,
  saveModel,
  deleteModel,
} from '@/server/actions/settings';
import {PROVIDER_LABELS, PROVIDER_TYPES, type ProviderType} from '@/lib/providers-shared';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  header: {display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px'},
  backLink: {display: 'flex', width: '32px', height: '32px', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', color: 'var(--color-text-secondary)', '@media (min-width: 1024px)': {display: 'none'}, ':hover': {backgroundColor: 'var(--color-background-muted)'}},
  title: {fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', letterSpacing: '-0.01em'},
  subtitle: {fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)'},
  toolbar: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px'},
  formGrid: {display: 'grid', gap: '12px', '@media (min-width: 640px)': {gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px'}},
  buttonRow: {display: 'flex', gap: '8px'},
  item: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px'},
  grow: {flex: 1},
  actions: {display: 'flex', alignItems: 'center', gap: '4px'},
  providerName: {fontWeight: 'var(--font-weight-semibold)'},
  disabled: {opacity: 0.6},
  editGrid: {display: 'grid', gap: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '12px', '@media (min-width: 640px)': {gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', alignItems: 'end'}},
  modelsHeader: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '12px'},
  priceGrid: {display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px'},
  deleteButton: {borderRadius: '9999px', padding: '6px', color: 'var(--color-text-secondary)', transition: 'color 150ms ease', ':hover': {color: 'var(--color-error)'}},
});
export type ProviderRow = {
  id: string;
  name: string;
  providerType: string;
  baseUrl: string | null;
  isDefault: boolean;
  enabled: boolean;
  apiKeyMasked: string;
};

/** A model contained by a provider, including its per-provider token prices. */
export type ProviderModelRow = {
  id: string;
  modelId: string;
  displayName: string | null;
  inputPricePerMTok: number;
  outputPricePerMTok: number;
};

export function ProviderSettings({providers, modelsByProvider}: {providers: ProviderRow[]; modelsByProvider: Record<string, ProviderModelRow[]>}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(providers.length === 0);

  return (
    <VStack gap={5}>
      <div {...stylex.props(styles.header)}>
        <Link href="/settings" {...stylex.props(styles.backLink)} aria-label="返回设置菜单">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 {...stylex.props(styles.title)}>AI 服务商配置</h1>
          <p {...stylex.props(styles.subtitle)}>接入 OpenAI、Anthropic、DeepSeek 等大模型服务商</p>
        </div>
      </div>
      <div {...stylex.props(styles.toolbar)}>
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
          <ProviderItem key={p.id} provider={p} models={modelsByProvider[p.id] ?? []} />
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
        <div {...stylex.props(styles.formGrid)}>
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
        <div {...stylex.props(styles.buttonRow)}>
          <Button label={saving ? '保存中…' : '添加'} variant="primary" onClick={submit} isDisabled={saving} isLoading={saving} />
          <Button label="取消" variant="ghost" onClick={onDone} />
        </div>
      </VStack>
    </Card>
  );
}

function ProviderItem({provider, models}: {provider: ProviderRow; models: ProviderModelRow[]}) {
  const router = useRouter();
  const toast = useAppToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(provider.name);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(provider.baseUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await updateProvider(provider.id, {name, baseUrl: baseUrl.trim() || null, apiKey: apiKey.trim()});
    setSaving(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('已保存');
    }
    setEditing(false);
    router.refresh();
  };

  const handleSync = async () => {
    setSyncing(true);
    const res = await syncProviderModels(provider.id);
    setSyncing(false);
    if ('error' in res && res.error) {
      toast.error(res.error);
    } else if ('count' in res) {
      toast.success(`已同步 ${res.count} 个模型到「${provider.name}」`);
      router.refresh();
    }
  };

  return (
    <Card padding={4} xstyle={provider.enabled ? undefined : styles.disabled}>
      <VStack gap={3}>
        <div {...stylex.props(styles.item)}>
          <StatusDot variant={provider.enabled ? 'success' : 'neutral'} label={provider.enabled ? '启用' : '禁用'} />
          <span {...stylex.props(styles.providerName)}>{provider.name}</span>
          <Badge variant="neutral" label={PROVIDER_LABELS[provider.providerType as ProviderType] ?? provider.providerType} />
          {provider.isDefault && (
            <Badge
              variant="yellow"
              icon={<Star size={11} fill="currentColor" />}
              label="默认"
            />
          )}
          <div {...stylex.props(styles.grow)} />
          <div {...stylex.props(styles.actions)}>
            <Button
              label="同步模型"
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />}
              onClick={handleSync}
              isDisabled={syncing}
              isLoading={syncing}
            />
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

        {/* Contained models: a provider owns its models and their prices */}
        <ProviderModels providerId={provider.id} models={models} />

        {editing && (
          <div {...stylex.props(styles.editGrid)}>
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
            <div {...stylex.props(styles.buttonRow)}>
              <TextInput label="Base URL" isLabelHidden value={baseUrl} onChange={setBaseUrl} placeholder="Base URL" htmlName="edit-url" />
              <Button label="保存" isIconOnly variant="primary" icon={<Check size={15} />} onClick={save} isDisabled={saving} isLoading={saving} />
            </div>
          </div>
        )}
      </VStack>
    </Card>
  );
}

type ModelTableRow = ProviderModelRow & Record<string, unknown>;

function ProviderModels({providerId, models}: {providerId: string; models: ProviderModelRow[]}) {
  const router = useRouter();
  const toast = useAppToast();
  const [addOpen, setAddOpen] = useState(false);
  const [modelId, setModelId] = useState('');
  const [inPrice, setInPrice] = useState<number | null>(0);
  const [outPrice, setOutPrice] = useState<number | null>(0);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setModelId('');
    setInPrice(0);
    setOutPrice(0);
  };

  const addModel = async () => {
    if (!modelId.trim()) {
      toast.error('请填写 Model ID');
      return;
    }
    setSaving(true);
    const res = await saveModel({
      providerId,
      modelId: modelId.trim(),
      inputPricePerMTok: inPrice ?? 0,
      outputPricePerMTok: outPrice ?? 0,
    });
    setSaving(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success('模型已添加');
    setAddOpen(false);
    resetForm();
    router.refresh();
  };

  const rows: ModelTableRow[] = models;

  return (
    <VStack gap={3}>
      <div {...stylex.props(styles.modelsHeader)}>
        <HStack gap={1.5} vAlign="center">
          <Layers size={15} color="var(--color-text-secondary)" />
          <Text size="sm" as="span" style={{fontWeight: 600}}>包含模型</Text>
        </HStack>
        <Badge variant="neutral" label={`${models.length} 个`} />
        <div {...stylex.props(styles.grow)} />
        <Button
          label="添加模型"
          variant="secondary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => setAddOpen(true)}
        />
      </div>

      {models.length === 0 ? (
        <Text type="supporting" size="sm" as="p">
          该 Provider 还未包含任何模型。点击「同步模型」从服务商拉取，或在下方手动添加并登记单价。
        </Text>
      ) : (
        <Table
          data={rows}
          idKey="id"
          density="compact"
          hasHover
          columns={[
            {key: 'modelId', header: 'Model', width: proportional(2)},
            {key: 'inputPricePerMTok', header: '输入 $/M', align: 'end', width: pixel(90)},
            {key: 'outputPricePerMTok', header: '输出 $/M', align: 'end', width: pixel(90)},
            {
              key: 'actions',
              header: '',
              width: pixel(48),
              renderCell: (row) => (
                <button
                  onClick={async () => {
                    await deleteModel(row.id);
                    toast.success('已删除');
                    router.refresh();
                  }}
                  {...stylex.props(styles.deleteButton)}
                  aria-label={`删除 ${row.modelId}`}
                >
                  <Trash2 size={15} />
                </button>
              ),
            },
          ]}
        />
      )}

      <Dialog isOpen={addOpen} onOpenChange={setAddOpen} purpose="form" width={440}>
        <VStack gap={4}>
          <DialogHeader title="添加模型" subtitle="登记该提供商包含的模型与 Token 单价" onOpenChange={setAddOpen} />
          <VStack gap={3}>
            <TextInput
              label="Model ID"
              value={modelId}
              onChange={setModelId}
              placeholder="如 gpt-4o-mini / deepseek-chat"
              htmlName={`model-id-${providerId}`}
            />
            <div {...stylex.props(styles.priceGrid)}>
              <NumberInput label="输入价格 $/M" value={inPrice} min={0} step={0.01} onChange={setInPrice} placeholder="0" />
              <NumberInput label="输出价格 $/M" value={outPrice} min={0} step={0.01} onChange={setOutPrice} placeholder="0" />
            </div>
          </VStack>
          <HStack gap={2} hAlign="end">
            <Button label="取消" variant="ghost" onClick={() => setAddOpen(false)} />
            <Button
              label={saving ? '添加中…' : '添加'}
              variant="primary"
              onClick={addModel}
              isDisabled={saving}
              isLoading={saving}
            />
          </HStack>
        </VStack>
      </Dialog>
    </VStack>
  );
}
