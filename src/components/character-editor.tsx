'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2, Save, Trash2, Upload } from 'lucide-react';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TextArea } from '@astryxdesign/core/TextArea';
import {Selector} from '@astryxdesign/core/Selector';
import {Slider} from '@astryxdesign/core/Slider';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {TabList, Tab} from '@astryxdesign/core/TabList';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Section} from '@astryxdesign/core/Section';
import {Text} from '@astryxdesign/core/Text';
import { AvatarCropModal } from '@/components/avatar-crop-modal';
import { nativeAttrs } from '@/lib/native-attrs';
import { useAppToast } from '@/lib/toast';
import {UserAvatar, AVATAR_COLORS} from '@/components/user-avatar';
import {createCharacter, updateCharacter, type CharacterInput} from '@/server/actions/characters';

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

function EmojiPicker({value, onChange}: {value: string; onChange: (v: string) => void}) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {EMOJI_CHOICES.map((e) => (
          <button
            key={e}
            type="button"
            aria-pressed={value === e}
            onClick={() => onChange(e)}
            className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all ${
              value === e
                ? 'bg-muted ring-2 ring-accent'
                : 'hover:bg-muted'
            }`}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

function ColorPicker({value, onChange}: {value: string; onChange: (v: string) => void}) {
  return (
    <div className="flex flex-wrap gap-2">
      {AVATAR_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`头像配色 ${c}`}
          aria-pressed={value === c}
          onClick={() => onChange(c)}
          className={`rounded-full transition-all ${
            value === c ? 'ring-2 ring-accent ring-offset-2 ring-offset-body' : ''
          }`}
        >
          <UserAvatar name="·" emoji="·" color={c} size={36} tooltip={false} />
        </button>
      ))}
    </div>
  );
}

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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [tab, setTab] = useState('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setCropImageSrc(objectUrl);
    setCropModalOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropConfirm = async (croppedBlob: Blob) => {
    setUploadingAvatar(true);
    try {
      const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', 'avatar');

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || '头像上传失败');
        return;
      }

      setValues((v) => ({ ...v, avatarUrl: data.media.blobUrl }));
      toast.success('头像裁剪并上传成功');
    } catch (err) {
      console.error('Avatar upload error', err);
      toast.error('网络错误，上传头像失败');
    } finally {
      setUploadingAvatar(false);
    }
  };

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

      {/* 1:1 Avatar Crop Modal */}
      <AvatarCropModal
        isOpen={cropModalOpen}
        imageSrc={cropImageSrc}
        onClose={() => {
          setCropModalOpen(false);
          if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
          setCropImageSrc(null);
        }}
        onConfirm={handleCropConfirm}
      />

  return (
    <VStack gap={4}>
      {/* identity preview with avatar upload */}
      <div className="flex items-center gap-4 p-3 rounded-2xl bg-surface border border-border">
        <div className="relative group">
          <UserAvatar
            name={values.name || '?'}
            emoji={values.avatarEmoji}
            color={values.avatarColor}
            url={values.avatarUrl || null}
            size={64}
          />
          <button
            type="button"
            disabled={uploadingAvatar}
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
            title="点击更换头像"
          >
            {uploadingAvatar ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Camera size={20} />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            className="hidden"
            onChange={handleAvatarFileSelect}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-semibold">{values.name || '新居民'}</div>
          <div className="truncate text-sm text-secondary">@{values.username || 'username'}</div>
          <div className="flex items-center gap-2 mt-1.5">
            <Button
              label={uploadingAvatar ? '上传中…' : '上传头像'}
              size="sm"
              variant="secondary"
              icon={uploadingAvatar ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
              isDisabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
            />
            {values.avatarUrl ? (
              <Button
                label="移除图片"
                size="sm"
                variant="ghost"
                icon={<Trash2 size={14} />}
                onClick={() => setValues((v) => ({ ...v, avatarUrl: '' }))}
              />
            ) : null}
          </div>
        </div>
      </div>
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
          <div>
            <div className="mb-1.5 text-sm font-medium">头像 Emoji</div>
            <EmojiPicker value={values.avatarEmoji} onChange={(v) => set('avatarEmoji', v)} />
          </div>
          <div>
            <div className="mb-1.5 text-sm font-medium">头像渐变色</div>
            <ColorPicker value={values.avatarColor} onChange={(v) => set('avatarColor', v)} />
          </div>
          <TextInput
            label="头像图片 URL"
            isOptional
            description="优先于 Emoji"
            value={values.avatarUrl}
            onChange={(v) => set('avatarUrl', v)}
            placeholder="https://…"
            htmlName="avatarUrl"
          />
          <TextInput
            label="与你的关系"
            value={values.relationshipToUser}
            onChange={(v) => set('relationshipToUser', v)}
            placeholder="朋友 / 同事 / 室友…"
            htmlName="relationshipToUser"
          />
          <SegmentedControl
            label="状态"
            value={values.status}
            onChange={(v) => set('status', v as 'active' | 'paused')}
            layout="fill"
          >
            <SegmentedControlItem value="active" label="启用" />
            <SegmentedControlItem value="paused" label="禁用" />
          </SegmentedControl>
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
            这些概率决定 TA 在社区里的活跃程度。数值越高越活跃，但也会消耗更多 Token。
          </Text>
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
