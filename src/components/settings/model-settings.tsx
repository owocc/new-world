'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteModel, saveModel } from '@/server/actions/settings';

const inputCls =
  'w-full rounded-xl border border-line surface-2 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-accent-400)]';

export type ModelRow = {
  id: string;
  providerId: string;
  providerName: string;
  modelId: string;
  displayName: string | null;
  inputPricePerMTok: number;
  outputPricePerMTok: number;
};

export function ModelSettings({
  providers,
  models,
}: {
  providers: { id: string; name: string; providerType: string }[];
  models: ModelRow[];
}) {
  const router = useRouter();
  const [providerId, setProviderId] = useState(providers[0]?.id ?? '');
  const [modelId, setModelId] = useState('');
  const [inPrice, setInPrice] = useState('0');
  const [outPrice, setOutPrice] = useState('0');
  const [saving, setSaving] = useState(false);

  if (providers.length === 0) {
    return (
      <p className="rounded-3xl border border-line surface py-10 text-center text-sm text-muted">
        请先在「AI Providers」页添加一个 Provider
      </p>
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
      inputPricePerMTok: Number(inPrice) || 0,
      outputPricePerMTok: Number(outPrice) || 0,
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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold">模型与价格</h2>
        <p className="text-xs text-muted">
          登记模型单价（每 100 万 Token，美元）后，用量页面会自动估算成本。价格信息请以各 Provider 官方为准。
        </p>
      </div>

      <div className="grid gap-2 rounded-3xl border border-line surface p-4 shadow-sm sm:grid-cols-[160px_1fr_1fr_1fr_auto] sm:items-end">
        <select value={providerId} onChange={(e) => setProviderId(e.target.value)} className={inputCls}>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input value={modelId} onChange={(e) => setModelId(e.target.value)} placeholder="Model ID，如 gpt-4o-mini" className={inputCls} />
        <input value={inPrice} onChange={(e) => setInPrice(e.target.value)} type="number" step="0.01" min="0" placeholder="输入价格 $/M" className={inputCls} />
        <input value={outPrice} onChange={(e) => setOutPrice(e.target.value)} type="number" step="0.01" min="0" placeholder="输出价格 $/M" className={inputCls} />
        <button onClick={submit} disabled={saving} className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-accent-600)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          <Plus size={15} /> 添加
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-line surface shadow-sm">
        {models.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">还没有登记任何模型</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 text-right font-medium">输入 $/M</th>
                <th className="px-4 py-3 text-right font-medium">输出 $/M</th>
                <th className="w-12 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3 text-secondary">{m.providerName}</td>
                  <td className="px-4 py-3 font-mono text-[13px]">{m.modelId}</td>
                  <td className="px-4 py-3 text-right font-mono text-[13px]">{m.inputPricePerMTok}</td>
                  <td className="px-4 py-3 text-right font-mono text-[13px]">{m.outputPricePerMTok}</td>
                  <td className="px-2 py-3">
                    <button
                      onClick={async () => {
                        await deleteModel(m.id);
                        toast.success('已删除');
                        router.refresh();
                      }}
                      className="rounded-full p-1.5 text-muted transition-colors hover:text-rose-500"
                      aria-label="删除"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
