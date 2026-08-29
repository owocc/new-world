'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Plus, Trash2} from 'lucide-react';
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
import {deleteModel, saveModel} from '@/server/actions/settings';

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
    setModelId('');
    router.refresh();
  };

  const rows: TableRow[] = models.map((m) => ({...m}));

  return (
    <VStack gap={5}>
      <VStack gap={1}>
        <h2 className="text-base font-semibold">模型与价格</h2>
        <Text type="supporting" size="sm" as="p">
          登记模型单价（每 100 万 Token，美元）后，用量页面会自动估算成本。价格信息请以各 Provider 官方为准。
        </Text>
      </VStack>

      <Card padding={4}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end">
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
              width: pixel(56),
              renderCell: (row) => (
                <button
                  onClick={async () => {
                    await deleteModel(row.id);
                    toast.success('已删除');
                    router.refresh();
                  }}
                  className="rounded-full p-1.5 text-secondary transition-colors hover:text-error"
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
