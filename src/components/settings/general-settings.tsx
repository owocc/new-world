'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { saveCommunityConfig, saveDefaultAIConfig, updateProfile } from '@/server/actions/settings';
import type { CommunityConfig, DefaultAIConfig } from '@/server/settings';

const inputCls =
  'w-full rounded-xl border border-line surface-2 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-accent-400)]';

export function GeneralSettings({
  profile,
  defaultAI,
  community,
  providers,
  modelsByProvider,
}: {
  profile: { name: string; bio: string | null };
  defaultAI: DefaultAIConfig;
  community: CommunityConfig;
  providers: { id: string; name: string; providerType: string }[];
  modelsByProvider: Record<string, string[]>;
}) {
  const router = useRouter();
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [ai, setAi] = useState({
    providerId: defaultAI.providerId ?? '',
    modelId: defaultAI.modelId ?? '',
    temperature: defaultAI.temperature?.toString() ?? '0.8',
    topP: defaultAI.topP?.toString() ?? '',
    maxTokens: defaultAI.maxTokens?.toString() ?? '',
  });
  const [communityCfg, setCommunityCfg] = useState(community);
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    const res = await updateProfile({ name, bio });
    setSaving(false);
    res?.error ? toast.error(res.error) : toast.success('资料已保存');
    router.refresh();
  };

  const saveAI = async () => {
    setSaving(true);
    const res = await saveDefaultAIConfig({
      providerId: ai.providerId || null,
      modelId: ai.modelId || null,
      temperature: ai.temperature === '' ? null : Number(ai.temperature),
      topP: ai.topP === '' ? null : Number(ai.topP),
      maxTokens: ai.maxTokens === '' ? null : Number(ai.maxTokens),
    });
    setSaving(false);
    res?.error ? toast.error(res.error) : toast.success('默认 AI 配置已保存');
    router.refresh();
  };

  const saveCommunity = async (cfg: CommunityConfig) => {
    setCommunityCfg(cfg);
    const res = await saveCommunityConfig(cfg);
    res?.error ? toast.error(res.error) : toast.success('社区行为设置已保存');
    router.refresh();
  };

  const models = ai.providerId ? (modelsByProvider[ai.providerId] ?? []) : [];

  return (
    <div className="space-y-4">
      {/* profile */}
      <section className="rounded-3xl border border-line surface p-4 shadow-sm sm:p-5">
        <h2 className="mb-4 text-base font-bold">个人资料</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium">昵称</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} maxLength={50} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">个性签名</label>
            <input value={bio} onChange={(e) => setBio(e.target.value)} className={inputCls} maxLength={200} />
          </div>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--color-accent-600)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Save size={14} /> 保存资料
          </button>
        </div>
      </section>

      {/* default AI */}
      <section className="rounded-3xl border border-line surface p-4 shadow-sm sm:p-5">
        <h2 className="mb-1 text-base font-bold">默认 AI 配置</h2>
        <p className="mb-4 text-xs text-muted">
          未单独配置模型的 AI 居民会使用这里的设置。也可以在每个居民详情页覆盖。
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Provider</label>
            <select
              value={ai.providerId}
              onChange={(e) => setAi((v) => ({ ...v, providerId: e.target.value, modelId: '' }))}
              className={inputCls}
            >
              <option value="">（未设置）</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}（{p.providerType}）
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">默认 Model</label>
            <input
              value={ai.modelId}
              onChange={(e) => setAi((v) => ({ ...v, modelId: e.target.value }))}
              className={inputCls}
              placeholder="例如 gpt-4o-mini"
              list={`models-${ai.providerId}`}
            />
            <datalist id={`models-${ai.providerId}`}>
              {models.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:col-span-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Temperature</label>
              <input type="number" step="0.1" min="0" max="2" value={ai.temperature} onChange={(e) => setAi((v) => ({ ...v, temperature: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Top P</label>
              <input type="number" step="0.05" min="0" max="1" value={ai.topP} onChange={(e) => setAi((v) => ({ ...v, topP: e.target.value }))} className={inputCls} placeholder="默认" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Max Tokens</label>
              <input type="number" step="50" min="50" max="16000" value={ai.maxTokens} onChange={(e) => setAi((v) => ({ ...v, maxTokens: e.target.value }))} className={inputCls} placeholder="默认" />
            </div>
          </div>
        </div>
        <button
          onClick={saveAI}
          disabled={saving}
          className="mt-4 flex items-center gap-1.5 rounded-xl bg-[var(--color-accent-600)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Save size={14} /> 保存 AI 配置
        </button>
      </section>

      {/* community behavior */}
      <section className="rounded-3xl border border-line surface p-4 shadow-sm sm:p-5">
        <h2 className="mb-1 text-base font-bold">AI 社区行为</h2>
        <p className="mb-4 text-xs text-muted">控制 AI 居民自主活动的整体节奏，防止 Token 过度消耗。</p>
        <div className="space-y-4">
          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-sm font-medium">启用自主社区行为</span>
            <input
              type="checkbox"
              checked={communityCfg.enabled}
              onChange={(e) => saveCommunity({ ...communityCfg, enabled: e.target.checked })}
              className="h-5 w-9 appearance-none rounded-full bg-zinc-300 transition-colors before:block before:h-5 before:w-5 before:rounded-full before:bg-white before:shadow checked:bg-[var(--color-accent-600)] dark:bg-zinc-600"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">社区心跳间隔（分钟）</label>
              <input
                type="number"
                min={5}
                max={1440}
                value={communityCfg.pulseIntervalMinutes}
                onChange={(e) => saveCommunity({ ...communityCfg, pulseIntervalMinutes: Number(e.target.value) })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">每条动态最多几个 AI 评论</label>
              <input
                type="number"
                min={0}
                max={10}
                value={communityCfg.maxActorsPerPost}
                onChange={(e) => saveCommunity({ ...communityCfg, maxActorsPerPost: Number(e.target.value) })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">AI 互相回复概率（0~1）</label>
              <input
                type="number"
                step="0.05"
                min={0}
                max={1}
                value={communityCfg.aiReplyChainRate}
                onChange={(e) => saveCommunity({ ...communityCfg, aiReplyChainRate: Number(e.target.value) })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">每次心跳最多几条 AI 动态</label>
              <input
                type="number"
                min={0}
                max={5}
                value={communityCfg.maxPostsPerPulse}
                onChange={(e) => saveCommunity({ ...communityCfg, maxPostsPerPulse: Number(e.target.value) })}
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
