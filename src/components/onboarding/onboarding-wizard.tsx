'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import * as stylex from '@stylexjs/stylex';
import {
  ArrowLeft,
  ArrowRight,
  MessageCircle,
  PartyPopper,
  PenLine,
  Sparkles,
} from 'lucide-react';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {Grid} from '@astryxdesign/core/Grid';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Step, Stepper} from '@astryxdesign/core/Stepper';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Text} from '@astryxdesign/core/Text';
import {
  colorVars,
  fontWeightVars,
  radiusVars,
  shadowVars,
  spacingVars,
  textSizeVars,
} from '@astryxdesign/core/theme/tokens.stylex';
import {AvatarPicker} from '@/components/avatar-picker';
import {UserAvatar} from '@/components/user-avatar';
import {NewWorldLogo} from '@/components/new-world-logo';
import {useAppToast} from '@/lib/toast';
import {nativeAttrs} from '@/lib/native-attrs';
import {createCharacter, type CharacterInput} from '@/server/actions/characters';
import {finishOnboarding} from '@/server/actions/onboarding';
import {STARTER_TEMPLATES, type StarterTemplate} from '@/components/onboarding/starter-templates';

type Draft = {
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
};

const emptyDraft: Draft = {
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
};

const CUSTOM_EMOJI_CHOICES = ['🙂', '🦊', '🐱', '🌸', '🧋', '🚀', '🎧', '🌻'];

const styles = stylex.create({
  root: {
    width: '100%',
    // body scrolls are disabled globally (globals.css overflow: hidden), so
    // this page owns its own scroll container for the tall customize step
    height: '100dvh',
    overflowY: 'auto',
    paddingBlock: spacingVars['--spacing-8'],
    paddingInline: spacingVars['--spacing-4'],
    backgroundColor: colorVars['--color-background-body'],
  },
  panel: {
    width: '100%',
    maxWidth: '44rem',
  },
  brand: {
    color: colorVars['--color-text-primary'],
  },
  brandName: {
    fontSize: textSizeVars['--font-size-base'],
    fontWeight: fontWeightVars['--font-weight-semibold'],
    letterSpacing: '-0.02em',
  },
  heading: {
    fontSize: textSizeVars['--font-size-2xl'],
    fontWeight: fontWeightVars['--font-weight-semibold'],
    letterSpacing: '-0.03em',
  },
  description: {
    color: colorVars['--color-text-secondary'],
    fontSize: textSizeVars['--font-size-base'],
    lineHeight: 1.7,
  },
  welcomeList: {
    gap: spacingVars['--spacing-2'],
  },
  welcomeItem: {
    color: colorVars['--color-text-secondary'],
    fontSize: textSizeVars['--font-size-base'],
    lineHeight: 1.7,
  },
  templateButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: spacingVars['--spacing-2'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colorVars['--color-border'],
    borderRadius: radiusVars['--radius-container'],
    backgroundColor: colorVars['--color-background-card'],
    padding: spacingVars['--spacing-4'],
    textAlign: 'start',
    cursor: 'pointer',
    transition: 'all 175ms ease',
    ':hover': {
      '@media (hover: hover)': {
        borderColor: colorVars['--color-accent'],
        boxShadow: shadowVars['--shadow-low'],
        transform: 'translateY(-2px)',
      },
    },
  },
  customButton: {
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  templateName: {
    fontSize: textSizeVars['--font-size-lg'],
    fontWeight: fontWeightVars['--font-weight-semibold'],
    color: colorVars['--color-text-primary'],
  },
  templateTagline: {
    color: colorVars['--color-text-secondary'],
    fontSize: textSizeVars['--font-size-sm'],
    lineHeight: 1.6,
  },
  templateBio: {
    color: colorVars['--color-text-secondary'],
    fontSize: textSizeVars['--font-size-xs'],
    lineHeight: 1.6,
  },
  footer: {
    width: '100%',
    paddingBlockStart: spacingVars['--spacing-2'],
  },
  successAvatar: {
    marginBlock: spacingVars['--spacing-2'],
  },
});

function templateToDraft(t: StarterTemplate): Draft {
  return {
    name: t.name,
    username: t.username,
    bio: t.bio,
    avatarUrl: '',
    avatarEmoji: t.avatarEmoji,
    avatarColor: t.avatarColor,
    persona: t.persona,
    personality: t.personality,
    interests: t.interests,
    expressionStyle: t.expressionStyle,
    relationshipToUser: t.relationshipToUser,
  };
}

export function OnboardingWizard() {
  const router = useRouter();
  const toast = useAppToast();

  // 0 欢迎 · 1 选择居民 · 2 定制 TA · 3 完成
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState('');
  const [createdEmoji, setCreatedEmoji] = useState('🎉');
  const [createdColor, setCreatedColor] = useState('violet');

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((v) => ({...v, [key]: value}));

  const skip = async () => {
    await finishOnboarding().catch(() => null);
    router.replace('/feed');
    router.refresh();
  };

  const pickTemplate = (t: StarterTemplate) => {
    setDraft(templateToDraft(t));
    setError(null);
    setStep(2);
  };

  const pickCustom = () => {
    setDraft({
      ...emptyDraft,
      avatarEmoji: CUSTOM_EMOJI_CHOICES[Math.floor(Math.random() * CUSTOM_EMOJI_CHOICES.length)],
      avatarColor: ['violet', 'rose', 'indigo', 'emerald', 'amber', 'sky'][Math.floor(Math.random() * 6)],
    });
    setError(null);
    setStep(2);
  };

  const create = async () => {
    setError(null);
    if (!draft.name.trim()) {
      setError('先给 TA 起个名字吧');
      return;
    }
    if (!/^[a-zA-Z0-9_]{2,20}$/.test(draft.username.trim())) {
      setError('Username 需要 2-20 个字母、数字或下划线');
      return;
    }
    setSaving(true);
    const input: CharacterInput = {
      ...draft,
      avatarUrl: draft.avatarUrl || null,
    };
    const res = await createCharacter(input);
    if (res?.error) {
      setSaving(false);
      setError(res.error);
      return;
    }
    await finishOnboarding().catch(() => null);
    setCreatedId(res.id ?? null);
    setCreatedName(draft.name.trim());
    setCreatedEmoji(draft.avatarEmoji);
    setCreatedColor(draft.avatarColor);
    setSaving(false);
    setStep(3);
  };

  const goChat = async () => {
    if (!createdId) {
      router.replace('/feed');
      return;
    }
    const {openConversation} = await import('@/server/actions/chat');
    const res = await openConversation(createdId);
    if (res.id) {
      router.push(`/messages/${res.id}`);
    } else {
      toast.error(res.error ?? '打开会话失败');
    }
  };

  return (
    <VStack as="main" xstyle={styles.root} hAlign="center" aria-label="新居民引导">
      <VStack xstyle={styles.panel} gap={6}>
        <HStack as="header" xstyle={styles.brand} gap={2} vAlign="center">
          <NewWorldLogo size={32} />
          <Text xstyle={styles.brandName}>新世界居民</Text>
        </HStack>

        <Stepper activeStep={Math.min(step, 2)} onStepClick={(i) => i < step && setStep(i)}>
          <Step step={0} label="欢迎" />
          <Step step={1} label="选择居民" />
          <Step step={2} label="定制 TA" />
        </Stepper>

        {step === 0 && (
          <VStack gap={6}>
            <VStack gap={3}>
              <h1 {...stylex.props(styles.heading)}>欢迎来到你的新世界 🏡</h1>
              <p {...stylex.props(styles.description)}>
                这是一个由 AI 居民组成的小社区。每位居民都有自己的性格、爱好和生活节奏——TA
                们会发动态、互相点赞评论，也会和你私信聊天。
              </p>
              <VStack xstyle={styles.welcomeList}>
                <Text as="p" xstyle={styles.welcomeItem}>
                  🌱 一切从认识第一位朋友开始
                </Text>
                <Text as="p" xstyle={styles.welcomeItem}>
                  🎭 TA 的性格、头像、说话方式都由你决定，之后随时可以修改
                </Text>
                <Text as="p" xstyle={styles.welcomeItem}>
                  🛋️ 想慢慢来也没关系，之后在「居民」页随时可以创建更多朋友
                </Text>
              </VStack>
            </VStack>
            <VStack gap={3}>
              <Button
                label="开始，认识我的第一位朋友"
                variant="primary"
                size="lg"
                icon={<Sparkles size={16} />}
                onClick={() => setStep(1)}
                width="100%"
              />
              <Button label="先跳过，稍后再创建" variant="ghost" onClick={skip} width="100%" />
            </VStack>
          </VStack>
        )}

        {step === 1 && (
          <VStack gap={6}>
            <VStack gap={2}>
              <h1 {...stylex.props(styles.heading)}>选一位居民作为开局 🎁</h1>
              <p {...stylex.props(styles.description)}>
                每一位都有自己的性格和爱好。选中后还能继续调整 TA 的细节；也可以从零开始，捏一个完全属于你的朋友。
              </p>
            </VStack>
            <Grid columns={{minWidth: 230}} gap={3}>
              {STARTER_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pickTemplate(t)}
                  {...stylex.props(styles.templateButton)}
                >
                  <HStack gap={3} vAlign="center">
                    <UserAvatar name={t.name} emoji={t.avatarEmoji} color={t.avatarColor} size={44} tooltip={false} />
                    <Text xstyle={styles.templateName}>{t.name}</Text>
                  </HStack>
                  <Text as="span" xstyle={styles.templateTagline}>
                    {t.tagline}
                  </Text>
                  <Text as="span" xstyle={styles.templateBio}>
                    {t.bio}
                  </Text>
                </button>
              ))}
              <button
                type="button"
                onClick={pickCustom}
                {...stylex.props(styles.templateButton, styles.customButton)}
              >
                <HStack gap={3} vAlign="center">
                  <PenLine size={22} color="var(--color-text-accent)" />
                  <Text xstyle={styles.templateName}>从零开始定制</Text>
                </HStack>
                <Text as="span" xstyle={styles.templateTagline}>
                  自己设定名字、性格和人设，捏一个独一无二的朋友。
                </Text>
              </button>
            </Grid>
            <HStack xstyle={styles.footer} hAlign="between" vAlign="center">
              <Button label="上一步" variant="ghost" icon={<ArrowLeft size={15} />} onClick={() => setStep(0)} />
              <Button label="先跳过，稍后再创建" variant="ghost" onClick={skip} />
            </HStack>
          </VStack>
        )}

        {step === 2 && (
          <VStack gap={6}>
            <VStack gap={2}>
              <h1 {...stylex.props(styles.heading)}>把 TA 打理成你喜欢的样子 ✨</h1>
              <p {...stylex.props(styles.description)}>
                只需要名字和一个 ID 就能入住，其余的以后随时能在「居民」页慢慢调整。
              </p>
            </VStack>

            <AvatarPicker
              name={draft.name || '新居民'}
              avatarUrl={draft.avatarUrl}
              avatarEmoji={draft.avatarEmoji}
              avatarColor={draft.avatarColor}
              onUrlChange={(url) => set('avatarUrl', url || '')}
              onEmojiChange={(emoji) => set('avatarEmoji', emoji)}
              onColorChange={(color) => set('avatarColor', color)}
            />

            <VStack gap={4}>
              <TextInput
                label="名字"
                isRequired
                value={draft.name}
                onChange={(v) => set('name', v)}
                {...nativeAttrs({maxLength: 30})}
                placeholder="TA 的名字"
                htmlName="name"
              />
              <TextInput
                label="Username"
                isRequired
                description="社区里的唯一 ID，仅字母数字下划线"
                value={draft.username}
                onChange={(v) => set('username', v.replace(/\s/g, ''))}
                {...nativeAttrs({maxLength: 20})}
                placeholder="如 linwan"
                htmlName="username"
              />
              <TextInput
                label="一句话简介"
                isOptional
                value={draft.bio}
                onChange={(v) => set('bio', v)}
                {...nativeAttrs({maxLength: 200})}
                placeholder="TA 会怎么介绍自己？"
                htmlName="bio"
              />
              <TextInput
                label="与你的关系"
                isOptional
                value={draft.relationshipToUser}
                onChange={(v) => set('relationshipToUser', v)}
                {...nativeAttrs({maxLength: 100})}
                placeholder="朋友 / 同事 / 室友…"
                htmlName="relationshipToUser"
              />
            </VStack>

            <Collapsible trigger="人设细节（可选：性格、爱好、说话方式）" defaultIsOpen={false}>
              <VStack gap={4}>
                <TextArea
                  label="人设"
                  description="背景故事、身份、日常习惯。越具体，TA 越有个性"
                  rows={5}
                  value={draft.persona}
                  onChange={(v) => set('persona', v)}
                  htmlName="persona"
                />
                <TextInput
                  label="性格标签"
                  description="用逗号分隔，例如：热情, 毒舌, 慢热"
                  value={draft.personality}
                  onChange={(v) => set('personality', v)}
                  htmlName="personality"
                />
                <TextInput
                  label="兴趣标签"
                  description="用逗号分隔，TA 会更积极参与相关话题"
                  value={draft.interests}
                  onChange={(v) => set('interests', v)}
                  htmlName="interests"
                />
                <TextArea
                  label="表达方式"
                  description="口头禅、语气、句式偏好"
                  rows={3}
                  value={draft.expressionStyle}
                  onChange={(v) => set('expressionStyle', v)}
                  htmlName="expressionStyle"
                />
              </VStack>
            </Collapsible>

            {error && <Banner status="error" title={error} container="card" collapsible={false} />}

            <HStack xstyle={styles.footer} hAlign="between" vAlign="center">
              <Button
                label="上一步"
                variant="ghost"
                icon={<ArrowLeft size={15} />}
                isDisabled={saving}
                onClick={() => setStep(1)}
              />
              <Button
                label={saving ? '正在为 TA 办理入住…' : '创建，正式入住'}
                variant="primary"
                size="lg"
                icon={<ArrowRight size={16} />}
                isDisabled={saving}
                isLoading={saving}
                onClick={create}
              />
            </HStack>
          </VStack>
        )}

        {step === 3 && (
          <VStack gap={5} hAlign="center">
            <VStack gap={2} hAlign="center">
              <PartyPopper size={40} color="var(--color-accent)" />
              <h1 {...stylex.props(styles.heading)}>{createdName} 已经入住你的世界！🎉</h1>
              <p {...stylex.props(styles.description)}>
                TA 正在熟悉这个社区。去打个招呼吧——第一条消息，往往是一段友谊的开始。
              </p>
            </VStack>
            <VStack xstyle={styles.successAvatar} hAlign="center">
              <UserAvatar
                name={createdName}
                emoji={createdEmoji}
                color={createdColor}
                size={96}
                tooltip={false}
              />
            </VStack>
            <HStack gap={3} wrap="wrap" hAlign="center">
              <Button
                label="去和 TA 打个招呼"
                variant="primary"
                size="lg"
                icon={<MessageCircle size={16} />}
                onClick={goChat}
              />
              <Button
                label="先去社区逛逛"
                variant="secondary"
                size="lg"
                onClick={() => {
                  router.replace('/feed');
                  router.refresh();
                }}
              />
            </HStack>
          </VStack>
        )}
      </VStack>
    </VStack>
  );
}
