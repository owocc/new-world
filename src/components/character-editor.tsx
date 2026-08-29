'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AVATAR_COLORS } from '@/components/avatar';
import { createCharacter, updateCharacter, type CharacterInput } from '@/server/actions/characters';

export type CharacterFormValues = {
  name: string;
  username: string;
  bio: string;
  avatarUrl: string;
  avatarEmoji: string;
  avatarColor: string;
  persona: string;
  personality: string;
  interests: string;
  expressionStyle: string;
  relationshipToUser: string;
  systemPrompt: string;
  status: 'active' | 'paused';
  chattiness: number;
  likeRate: number;
  commentRate: number;
  postRate: number;
  dmRate: number;
  providerId: string;
  modelId: string;
  temperature: string;
  topP: string;
  maxTokens: string;
};

export const EMOJI_CHOICES = [
  '🙂','🌙','🍜','🎮','📚','💪','☕️','🐱','🐶','🌸','🎸','🎧','✈️','🎨','⚽️','🧋','🦊','🐧','🌻','⚡️',
];

export function CharacterEditor({
  characterId,
  initial,
  providers,
}: {
  characterId?: string;
  initial: CharacterFormValues;
  providers: { id: string; name: string; providerType: string }[];
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'profile' | 'persona' | 'behavior' | 'model'>('profile');

  const set = <K extends keyof CharacterFormValues>(key: K, value: CharacterFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const submit = async () => {
    setSaving(true);
    const input: CharacterInput = {
      ...values,
      avatarUrl: values.avatarUrl || null,
      systemPrompt: values.systemPrompt || null,
      providerId: values.providerId || null,
      modelId: values.modelId || null,
      temperature: values.temperature === '' ? null : Number(values.temperature),
      topP: values.topP === '' ? null : Number(values.topP),
      maxTokens: values.maxTokens === '' ? null : Number(values.maxTokens),
    };
    const res = characterId
      ? await updateCharacter(characterId, input)
      : await createCharacter(input);
    setSaving(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success(characterId ? '已保存' : '新居民已入住社区');
    router.push('/characters');
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {/* header preview */}
      <div className="flex items-center gap-4 rounded-3xl border border-line surface p-4 shadow-sm">
        <Avatar
          name={values.name || '?'}
          emoji={values.avatarEmoji}
          color={values.avatarColor}
          url={values.avatarUrl || null}
          size={56}
        />
        <div className="min-w-0 flex-1">
          <div className="text-lg font-bold">{values.name || '新居民'}</div>
          <div className="truncate text-xs text-muted">@{values.username || 'username'}</div>
        </div>
        <button
          onClick={submit}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-full bg-[var(--color-accent-600)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Save size={15} />
          {saving ? '保存中…' : '保存'}
        </button>
      </div>

      {/* tabs */}
      <div className="flex gap-1 rounded-2xl border border-line surface p-1 text-sm font-medium shadow-sm">
        {(
          [
            ['profile', '基本资料'],
            ['persona', '人设'],
            ['behavior', '行为倾向'],
            ['model', '模型'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-xl py-2 transition-colors ${
              tab === key
                ? 'bg-[var(--color-accent-600)] text-white'
                : 'text-secondary hover:surface-2'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-line surface p-4 shadow-sm sm:p-5">
        {tab === 'profile' && (
          <div className="space-y-4">
            <Field label="名字" required>
              <input {...inputCls} value={values.name} onChange={(e) => set('name', e.target.value)} maxLength={30} />
            </Field>
            <Field label="Username" required hint="社区里的唯一 ID，仅字母数字下划线">
              <input {...inputCls} value={values.username} onChange={(e) => set('username', e.target.value)} maxLength={20} />
            </Field>
            <Field label="简介">
              <input {...inputCls} value={values.bio} onChange={(e) => set('bio', e.target.value)} maxLength={200} placeholder="一句话介绍" />
            </Field>
            <Field label="头像 Emoji">
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_CHOICES.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => set('avatarEmoji', e)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all ${
                      values.avatarEmoji === e ? 'ring-2 ring-[var(--color-accent-500)] surface-2' : 'hover:surface-2'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <input {...inputCls} className={`mt-2 ${inputCls.className}`} value={values.avatarEmoji} onChange={(e) => set('avatarEmoji', e.target.value)} maxLength={8} />
            </Field>
            <Field label="头像渐变色">
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set('avatarColor', c)}
                    className={`h-9 w-9 rounded-full transition-all ${values.avatarColor === c ? 'ring-2 ring-offset-2 ring-[var(--color-accent-500)] ring-offset-[var(--surface)]' : ''}`}
                  >
                    <Avatar name="x" emoji="" color={c} size={36} />
                  </button>
                ))}
              </div>
            </Field>
            <Field label="头像图片 URL（可选，优先于 Emoji）">
              <input {...inputCls} value={values.avatarUrl} onChange={(e) => set('avatarUrl', e.target.value)} placeholder="https://…" />
            </Field>
            <Field label="与你的关系">
              <input {...inputCls} value={values.relationshipToUser} onChange={(e) => set('relationshipToUser', e.target.value)} placeholder="朋友 / 同事 / 室友…" />
            </Field>
            <Field label="状态">
              <div className="flex gap-2">
                {(['active', 'paused'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set('status', s)}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                      values.status === s ? 'bg-[var(--color-accent-600)] text-white' : 'surface-2 text-secondary'
                    }`}
                  >
                    {s === 'active' ? '启用' : '禁用'}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {tab === 'persona' && (
          <div className="space-y-4">
            <Field label="人设（背景故事、身份、习惯）" hint="越具体，AI 越有个性">
              <textarea {...inputCls} rows={6} value={values.persona} onChange={(e) => set('persona', e.target.value)} />
            </Field>
            <Field label="性格标签" hint="用逗号分隔，例如：热情, 毒舌, 慢热">
              <input {...inputCls} value={values.personality} onChange={(e) => set('personality', e.target.value)} />
            </Field>
            <Field label="兴趣标签" hint="用逗号分隔，AI 会更积极参与相关话题">
              <input {...inputCls} value={values.interests} onChange={(e) => set('interests', e.target.value)} />
            </Field>
            <Field label="表达方式" hint="口头禅、语气、句式偏好">
              <textarea {...inputCls} rows={3} value={values.expressionStyle} onChange={(e) => set('expressionStyle', e.target.value)} />
            </Field>
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-[var(--color-accent-600)] dark:text-[var(--color-accent-300)]">
                高级：自定义 System Prompt（留空则自动生成）
              </summary>
              <div className="mt-2">
                <textarea {...inputCls} rows={6} value={values.systemPrompt} onChange={(e) => set('systemPrompt', e.target.value)} className={`font-mono text-xs ${inputCls.className}`} placeholder="完全自定义系统提示词，会覆盖自动生成的人设部分" />
              </div>
            </details>
          </div>
        )}

        {tab === 'behavior' && (
          <div className="space-y-5">
            <p className="text-sm text-muted">
              这些概率决定 TA 在社区里的活跃程度。数值越高越活跃，但也会消耗更多 Token。
            </p>
            <Slider label="聊天意愿" hint="回复私聊消息的积极性" value={values.chattiness} onChange={(v) => set('chattiness', v)} />
            <Slider label="点赞概率" hint="看到动态时点赞的可能性" value={values.likeRate} onChange={(v) => set('likeRate', v)} />
            <Slider label="评论概率" hint="决定评论动态的可能性" value={values.commentRate} onChange={(v) => set('commentRate', v)} />
            <Slider label="自主发帖" hint="主动发布动态的可能性" value={values.postRate} onChange={(v) => set('postRate', v)} />
            <Slider label="主动私信" hint="主动给你发消息的可能性（通常应该较低）" value={values.dmRate} onChange={(v) => set('dmRate', v)} />
          </div>
        )}

        {tab === 'model' && (
          <div className="space-y-4">
            <Field label="Provider">
              <select {...inputCls} value={values.providerId} onChange={(e) => set('providerId', e.target.value)}>
                <option value="">继承全局默认</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}（{p.providerType}）
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Model ID" hint="例如 gpt-4o-mini、claude-sonnet-4-5、gemini-2.0-flash">
              <input {...inputCls} value={values.modelId} onChange={(e) => set('modelId', e.target.value)} placeholder="留空继承全局默认" />
            </Field>
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-[var(--color-accent-600)] dark:text-[var(--color-accent-300)]">
                高级：模型参数
              </summary>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <Field label="Temperature">
                  <input {...inputCls} type="number" step="0.1" min="0" max="2" value={values.temperature} onChange={(e) => set('temperature', e.target.value)} placeholder="默认" />
                </Field>
                <Field label="Top P">
                  <input {...inputCls} type="number" step="0.05" min="0" max="1" value={values.topP} onChange={(e) => set('topP', e.target.value)} placeholder="默认" />
                </Field>
                <Field label="Max Tokens">
                  <input {...inputCls} type="number" step="50" min="50" max="16000" value={values.maxTokens} onChange={(e) => set('maxTokens', e.target.value)} placeholder="默认" />
                </Field>
              </div>
            </details>
          </div>
        )}
      </div>

      <button
        onClick={submit}
        disabled={saving}
        className="w-full rounded-2xl bg-[var(--color-accent-600)] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 lg:hidden"
      >
        {saving ? '保存中…' : '保存'}
      </button>
    </div>
  );
}

const inputCls = {
  className:
    'w-full rounded-xl border border-line surface-2 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-accent-400)]',
} as const;

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Slider({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-sm font-semibold text-[var(--color-accent-600)] dark:text-[var(--color-accent-300)]">
          {Math.round(value * 100)}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-accent-600)]"
      />
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
