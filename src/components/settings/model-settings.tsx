'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft, Plus, Trash2} from 'lucide-react';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {NumberInput} from '@astryxdesign/core/NumberInput';
import {Selector} from '@astryxdesign/core/Selector';
import {Table} from '@astryxdesign/core/Table';
import {proportional, pixel} from '@astryxdesign/core/Table';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {VStack} from '@astryxdesign/core/Stack';
import {useAppToast} from '@/lib/toast';
import {saveModel, deleteModel} from '@/server/actions/settings';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  header: {display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px'},
  backLink: {display: 'flex', width: '32px', height: '32px', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', color: 'var(--color-text-secondary)', '@media (min-width: 1024px)': {display: 'none'}, ':hover': {backgroundColor: 'var(--color-background-muted)'}},
  title: {fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', letterSpacing: '-0.01em'},
  subtitle: {fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)'},
  formGrid: {display: 'grid', gridTemplateColumns: '1fr', gap: '12px', '@media (min-width: 640px)': {gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'}, '@media (min-width: 1024px)': {gridTemplateColumns: '1fr 1fr 1fr 1fr auto', alignItems: 'end'}},
  deleteButton: {borderRadius: '9999px', padding: '6px', color: 'var(--color-text-secondary)', transition: 'color 150ms ease', ':hover': {color: 'var(--color-error)'}},
});
export type ModelRow = {
  id: string;
  providerId: string;
  providerName: string;
  modelId: string;
  displayName: string | null;
  inputPricePerMTok: number;
  outputPricePerMTok: number;
};

type TableRow = ModelRow & Record<string, unknown>;

export function ModelSettings({
  providers,
  models,
}: {
  providers: {id: string; name: string; providerType: string}[];
  models: ModelRow[];
}) {
  const router = useRouter();
  const toast = useAppToast();
  const [providerId, setProviderId] = useState(providers[0]?.id ?? '');
  const [modelId, setModelId] = useState('');
  const [inPrice, setInPrice] = useState<number | null>(0);
  const [outPrice, setOutPrice] = useState<number | null>(0);
  const [saving, setSaving] = useState(false);
  const rows: TableRow[] = models;

  if (providers.length === 0) {
    return (
      <EmptyState
        title="还没有可用的 Provider"
        description="请先在「AI Providers」页添加一个 Provider"
      />
    );
  }

  const submit = async () => {
    if (!providerId || !modelId.trim()) {
      toast.error('请选择 Provider 并填写 Model ID');
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
    toast.success('模型已保存');
  };
  return (
    <VStack gap={5}>
      <div {...stylex.props(styles.header)}>
        <Link href="/settings" {...stylex.props(styles.backLink)} aria-label="返回设置菜单">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 {...stylex.props(styles.title)}>模型与价格</h1>
          <p {...stylex.props(styles.subtitle)}>配置各 Provider 下可用的模型标识及 Token 计费价格</p>
        </div>
      </div>
      <Text type="supporting" size="sm" as="p">
        登记模型单价（每 100 万 Token，美元）后，用量页面会自动估算成本。价格信息请以各 Provider 官方为准。
      </Text>

      <Card padding={4}>
        <div {...stylex.props(styles.formGrid)}>
          <Selector
            label="Provider"
            isLabelHidden
            value={providerId}
            onChange={(v) => setProviderId(v ?? '')}
            options={providers.map((p) => ({value: p.id, label: p.name}))}
          />
          <TextInput
            label="Model ID"
            isLabelHidden
            value={modelId}
            onChange={setModelId}
            placeholder="Model ID，如 gpt-4o-mini"
            htmlName="model-id"
          />
          <NumberInput
            label="输入价格 $/M"
            isLabelHidden
            value={inPrice}
            min={0}
            step={0.01}
            onChange={setInPrice}
            placeholder="0"
          />
          <NumberInput
            label="输出价格 $/M"
            isLabelHidden
            value={outPrice}
            min={0}
            step={0.01}
            onChange={setOutPrice}
            placeholder="0"
          />
          <div>
            <Button
              label="添加"
              variant="primary"
              icon={<Plus size={15} />}
              onClick={submit}
              isDisabled={saving}
              isLoading={saving}
            />
          </div>
        </div>
      </Card>

      {rows.length === 0 ? (
        <EmptyState isCompact title="还没有登记任何模型" description="添加模型和单价后，用量页会自动估算成本" />
      ) : (
        <Table
          data={rows}
          idKey="id"
          density="balanced"
          hasHover
          columns={[
            {key: 'providerName', header: 'Provider', width: proportional(1)},
            {key: 'modelId', header: 'Model', width: proportional(1.4)},
            {key: 'inputPricePerMTok', header: '输入 $/M', align: 'end', width: pixel(110)},
            {key: 'outputPricePerMTok', header: '输出 $/M', align: 'end', width: pixel(110)},
            {
              key: 'actions',
              header: '',
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
    </VStack>
  );
}
