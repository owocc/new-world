'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as stylex from '@stylexjs/stylex';
import { Camera, Loader2, Save, Trash2, Upload } from 'lucide-react';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import {Selector} from '@astryxdesign/core/Selector';
import {Slider} from '@astryxdesign/core/Slider';
import {Switch} from '@astryxdesign/core/Switch';
import {TabList, Tab} from '@astryxdesign/core/TabList';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Section} from '@astryxdesign/core/Section';
import {Text} from '@astryxdesign/core/Text';
import { AvatarPicker } from '@/components/avatar-picker';
import { nativeAttrs } from '@/lib/native-attrs';
import { useAppToast } from '@/lib/toast';
import {createCharacter, updateCharacter, type CharacterInput} from '@/server/actions/characters';

const spin = stylex.keyframes({
  from: {transform: 'rotate(0deg)'},
  to: {transform: 'rotate(360deg)'},
});

const styles = stylex.create({
  emojiList: {display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-1-5)'},
  emojiButton: {
    display: 'flex',
    width: '40px',
    height: '40px',
    alignItems: 'center',
    justifyContent: 'center',
    border: 0,
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'transparent',
    fontSize: 'var(--font-size-xl)',
    transition: 'all 175ms ease',
    ':hover': {'@media (hover: hover)': {backgroundColor: 'var(--color-background-muted)'}},
  },
  emojiSelected: {
    backgroundColor: 'var(--color-background-muted)',
    boxShadow: '0 0 0 2px var(--color-accent)',
  },
  colorList: {display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-2)'},
  colorButton: {
    border: 0,
    borderRadius: 'var(--radius-full)',
    padding: 0,
    backgroundColor: 'transparent',
    transition: 'all 175ms ease',
  },
  colorSelected: {
    boxShadow: '0 0 0 2px var(--color-accent), 0 0 0 4px var(--color-background-body)',
  },
  identityPreview: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-4)',
    border: 'var(--border-width) solid var(--color-border)',
    borderRadius: '16px',
    backgroundColor: 'var(--color-background-surface)',
    padding: 'var(--spacing-3)',
  },
  avatarContainer: {
    position: 'relative',
    width: '64px',
    height: '64px',
    flexShrink: 0,
    borderRadius: 'var(--radius-container, 12px)',
    overflow: 'hidden',
  },
  avatarOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 0,
    borderRadius: 'var(--radius-container, 12px)',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    color: 'white',
    opacity: 0,
    transition: 'opacity 175ms ease',
    ':hover': {'@media (hover: hover)': {opacity: 1}},
    ':focus-visible': {opacity: 1},
  },
  avatarOverlayVisible: {opacity: 1},
  hidden: {display: 'none'},
  previewDetails: {minWidth: 0, flex: 1},
  previewName: {fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)'},
  previewUsername: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'var(--color-text-secondary)',
    fontSize: 'var(--font-size-sm)',
  },
  spinner: {animationName: spin, animationDuration: '1s', animationTimingFunction: 'linear', animationIterationCount: 'infinite'},
  previewActions: {display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginTop: '6px'},
  fieldLabel: {marginBottom: '6px', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)'},
});

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
  memoryRetention: 'excellent' | 'normal' | 'slightly_forgetful' | 'forgetful';
  grudgeRate: number;
  providerId: string;
  modelId: string;
  temperature: string;
  topP: string;
  maxTokens: string;
};

function RateSlider({
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
    <Slider
      label={label}
      description={hint}
      min={0}
      max={1}
      step={0.05}
      value={Math.round(value * 100)}
      onChange={(v: number) => onChange(v / 100)}
      formatValue={(v) => `${Math.round(v)}%`}
      valueDisplay="text"
    />
  );
}

export function CharacterEditor({
  characterId,
  initial,
  providers,
  onDone,
}: {
  characterId?: string;
  initial: CharacterFormValues;
  providers: {id: string; name: string; providerType: string}[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const toast = useAppToast();
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('profile');
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
    if (onDone) {
      onDone();
      router.refresh();
    } else {
      router.push('/characters');
      router.refresh();
    }
  };
  return (
    <VStack gap={4}>
      {/* identity preview with unified avatar picker */}
      <AvatarPicker
        name={values.name || '新居民'}
        avatarUrl={values.avatarUrl}
        avatarEmoji={values.avatarEmoji}
        avatarColor={values.avatarColor}
        onUrlChange={(url) => set('avatarUrl', url || '')}
        onEmojiChange={(emoji) => set('avatarEmoji', emoji)}
        onColorChange={(color) => set('avatarColor', color)}
        endAction={
          <Switch
            label="启用"
            value={values.status === 'active'}
            onChange={(checked) => set('status', checked ? 'active' : 'paused')}
          />
        }
      />
      <TabList value={tab} onChange={setTab} hasDivider>
        <Tab value="profile" label="基本资料" />
        <Tab value="persona" label="人设" />
        <Tab value="behavior" label="行为倾向" />
        <Tab value="model" label="模型" />
      </TabList>

      {tab === 'profile' && (
        <VStack gap={4}>
          <TextInput label="名字" isRequired value={values.name} onChange={(v) => set('name', v)} {...nativeAttrs({maxLength: 30})} htmlName="name" />
          <TextInput
            label="Username"
            isRequired
            description="社区里的唯一 ID，仅字母数字下划线"
            value={values.username}
            onChange={(v) => set('username', v)}
            {...nativeAttrs({maxLength: 20})}
            htmlName="username"
          />
          <TextInput label="简介" isOptional value={values.bio} onChange={(v) => set('bio', v)} {...nativeAttrs({maxLength: 200})} placeholder="一句话介绍" htmlName="bio" />
          <TextInput
            label="与你的关系"
            value={values.relationshipToUser}
            onChange={(v) => set('relationshipToUser', v)}
            placeholder="朋友 / 同事 / 室友…"
            htmlName="relationshipToUser"
          />
        </VStack>
      )}

      {tab === 'persona' && (
        <VStack gap={4}>
          <TextArea
            label="人设"
            description="背景故事、身份、习惯。越具体，AI 越有个性"
            rows={6}
            value={values.persona}
            onChange={(v) => set('persona', v)}
            htmlName="persona"
          />
          <TextInput
            label="性格标签"
            description="用逗号分隔，例如：热情, 毒舌, 慢热"
            value={values.personality}
            onChange={(v) => set('personality', v)}
            htmlName="personality"
          />
          <TextInput
            label="兴趣标签"
            description="用逗号分隔，AI 会更积极参与相关话题"
            value={values.interests}
            onChange={(v) => set('interests', v)}
            htmlName="interests"
          />
          <TextArea
            label="表达方式"
            description="口头禅、语气、句式偏好"
            rows={3}
            value={values.expressionStyle}
            onChange={(v) => set('expressionStyle', v)}
            htmlName="expressionStyle"
          />
          <Collapsible trigger="高级：自定义 System Prompt（留空则自动生成）" defaultIsOpen={false}>
            <TextArea
              label="System Prompt"
              isLabelHidden
              rows={6}
              value={values.systemPrompt}
              onChange={(v) => set('systemPrompt', v)}
              placeholder="完全自定义系统提示词，会覆盖自动生成的人设部分"
            />
          </Collapsible>
        </VStack>
      )}

      {tab === 'behavior' && (
        <VStack gap={5}>
          <Text type="supporting" as="p">
            这些设置决定 TA 在社区里的活跃程度与独特的认知记忆风格。数值与性格差异让每个居民独一无二。
          </Text>

          <Selector
            label="记忆力 / 健忘程度"
            description="影响长期记忆的形成概率、遗忘半衰期与细节清晰度"
            value={values.memoryRetention}
            onChange={(v) => set('memoryRetention', (v as any) || 'normal')}
            options={[
              { value: 'excellent', label: '★★★★★ 过目不忘 (博闻强识，极少遗忘细节)' },
              { value: 'normal', label: '★★★☆☆ 普通记忆 (记得关键大事与喜好，琐碎会随时间淡化)' },
              { value: 'slightly_forgetful', label: '★★☆☆☆ 有点健忘 (常需要提醒，“我记得好像说过...”，偶尔翻记录)' },
              { value: 'forgetful', label: '★☆☆☆☆ 贵人多忘事 / 鱼的记忆 (“啊？你说过吗？等我翻翻记录...”)' },
            ]}
          />

          <RateSlider
            label="记仇 / 情绪执念度"
            hint="数值越高，对被冒犯、争吵、感动等强烈情绪事件的记忆保留越久、越深刻"
            value={values.grudgeRate}
            onChange={(v) => set('grudgeRate', v)}
          />

          <RateSlider label="聊天意愿" hint="回复私聊消息的积极性" value={values.chattiness} onChange={(v) => set('chattiness', v)} />
          <RateSlider label="点赞概率" hint="看到动态时点赞的可能性" value={values.likeRate} onChange={(v) => set('likeRate', v)} />
          <RateSlider label="评论概率" hint="决定评论动态的可能性" value={values.commentRate} onChange={(v) => set('commentRate', v)} />
          <RateSlider label="自主发帖" hint="主动发布动态的可能性" value={values.postRate} onChange={(v) => set('postRate', v)} />
          <RateSlider label="主动私信" hint="主动给你发消息的可能性（通常应该较低）" value={values.dmRate} onChange={(v) => set('dmRate', v)} />
        </VStack>
      )}

      {tab === 'model' && (
        <VStack gap={4}>
          <Selector
            label="Provider"
            placeholder="继承全局默认"
            value={values.providerId}
            onChange={(v) => set('providerId', v ?? '')}
            hasClear
            options={[
              {value: '', label: '继承全局默认'},
              ...providers.map((p) => ({value: p.id, label: `${p.name}（${p.providerType}）`})),
            ]}
          />
          <TextInput
            label="Model ID"
            description="例如 gpt-4o-mini、claude-sonnet-4-5、gemini-2.0-flash"
            value={values.modelId}
            onChange={(v) => set('modelId', v)}
            placeholder="留空继承全局默认"
            htmlName="modelId"
          />
          <Collapsible trigger="高级：模型参数" defaultIsOpen={false}>
            <HStack gap={3} wrap="wrap">
              <TextInput label="Temperature" value={values.temperature} onChange={(v) => set('temperature', v)} placeholder="默认" htmlName="temperature" width={140} {...nativeAttrs({inputMode: 'decimal'})} />
              <TextInput label="Top P" value={values.topP} onChange={(v) => set('topP', v)} placeholder="默认" htmlName="topP" width={140} {...nativeAttrs({inputMode: 'decimal'})} />
              <TextInput label="Max Tokens" value={values.maxTokens} onChange={(v) => set('maxTokens', v)} placeholder="默认" htmlName="maxTokens" width={160} {...nativeAttrs({inputMode: 'numeric'})} />
            </HStack>
          </Collapsible>
        </VStack>
      )}

      <Section padding={0}>
        <Button
          label={saving ? '保存中…' : '保存'}
          variant="primary"
          size="lg"
          icon={<Save size={15} />}
          isDisabled={saving}
          isLoading={saving}
          onClick={submit}
          width="100%"
        />
      </Section>
    </VStack>
  );
}

export const emptyCharacter: CharacterFormValues = {
  name: '',
  username: '',
  bio: '',
  avatarUrl: '',
  avatarEmoji: '🙂',
  avatarColor: 'violet',
  persona: '',
  personality: '',
  interests: '',
  expressionStyle: '',
  relationshipToUser: '朋友',
  systemPrompt: '',
  status: 'active',
  chattiness: 0.5,
  likeRate: 0.5,
  commentRate: 0.4,
  postRate: 0.15,
  dmRate: 0.05,
  memoryRetention: 'normal',
  grudgeRate: 0.3,
  providerId: '',
  modelId: '',
  temperature: '',
  topP: '',
  maxTokens: '',
};
