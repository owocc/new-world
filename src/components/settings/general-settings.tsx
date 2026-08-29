'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft} from 'lucide-react';
import {Text} from '@astryxdesign/core/Text';
import {Section} from '@astryxdesign/core/Section';
import {Button} from '@astryxdesign/core/Button';
import {TextInput} from '@astryxdesign/core/TextInput';
import {NumberInput} from '@astryxdesign/core/NumberInput';
import {Selector} from '@astryxdesign/core/Selector';
import {Switch} from '@astryxdesign/core/Switch';
import {VStack} from '@astryxdesign/core/Stack';
import {useAppToast} from '@/lib/toast';
import {nativeAttrs} from '@/lib/native-attrs';
import {saveCommunityConfig, saveDefaultAIConfig, updateProfile} from '@/server/actions/settings';
import type {DefaultAIConfig, CommunityConfig} from '@/server/settings';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  header: {display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px'},
  backLink: {display: 'flex', width: '32px', height: '32px', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', color: 'var(--color-text-secondary)', '@media (min-width: 1024px)': {display: 'none'}, ':hover': {backgroundColor: 'var(--color-background-muted)'}},
  title: {fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', letterSpacing: '-0.01em'},
  subtitle: {fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)'},
  sectionTitle: {fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)'},
  tripleGrid: {display: 'grid', gridTemplateColumns: '1fr', gap: '12px', '@media (min-width: 640px)': {gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'}},
  doubleGrid: {display: 'grid', gridTemplateColumns: '1fr', gap: '12px', '@media (min-width: 640px)': {gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'}},
});
export function GeneralSettings({
  profile,
  defaultAI,
  community,
  providers,
  modelsByProvider,
}: {
  profile: {name: string; bio: string | null};
  defaultAI: DefaultAIConfig;
  community: CommunityConfig;
  providers: {id: string; name: string; providerType: string}[];
  modelsByProvider: Record<string, string[]>;
}) {
  const router = useRouter();
  const toast = useAppToast();
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [ai, setAi] = useState({
    providerId: defaultAI.providerId ?? '',
    modelId: defaultAI.modelId ?? '',
    temperature: defaultAI.temperature ?? 0.8,
    topP: defaultAI.topP ?? null,
    maxTokens: defaultAI.maxTokens ?? null,
  });
  const [communityCfg, setCommunityCfg] = useState(community);
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    const res = await updateProfile({name, bio});
    setSaving(false);
    res?.error ? toast.error(res.error) : toast.success('资料已保存');
    router.refresh();
  };

  const saveAI = async () => {
    setSaving(true);
    const res = await saveDefaultAIConfig({
      providerId: ai.providerId || null,
      modelId: ai.modelId || null,
      temperature: ai.temperature,
      topP: ai.topP,
      maxTokens: ai.maxTokens,
    });
    setSaving(false);
    res?.error ? toast.error(res.error) : toast.success('默认 AI 配置已保存');
    router.refresh();
  };

  const saveCommunity = (cfg: CommunityConfig) => {
    setCommunityCfg(cfg);
    void (async () => {
      const res = await saveCommunityConfig(cfg);
      res?.error ? toast.error(res.error) : toast.success('社区行为设置已保存');
      router.refresh();
    })();
  };

  const models = ai.providerId ? (modelsByProvider[ai.providerId] ?? []) : [];

  return (
    <VStack gap={6}>
      <div {...stylex.props(styles.header)}>
        <Link href="/settings" {...stylex.props(styles.backLink)} aria-label="返回设置菜单">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 {...stylex.props(styles.title)}>通用设置</h1>
          <p {...stylex.props(styles.subtitle)}>管理个人基础资料与默认社区规则</p>
        </div>
      </div>
      <Section variant="transparent" padding={0}>
        <VStack gap={4}>
          <VStack gap={0.5}>
            <h2 {...stylex.props(styles.sectionTitle)}>个人资料</h2>
          </VStack>
          <TextInput label="昵称" value={name} onChange={setName} {...nativeAttrs({maxLength: 50})} htmlName="profile-name" />
          <TextInput label="个性签名" isOptional value={bio} onChange={setBio} {...nativeAttrs({maxLength: 200})} htmlName="profile-bio" />
          <div>
            <Button label="保存资料" variant="primary" onClick={saveProfile} isDisabled={saving} isLoading={saving} />
          </div>
        </VStack>
      </Section>

      <Section variant="transparent" padding={0}>
        <VStack gap={4}>
          <VStack gap={0.5}>
            <h2 {...stylex.props(styles.sectionTitle)}>默认 AI 配置</h2>
            <Text type="supporting" size="sm" as="p">
              未单独配置模型的 AI 居民会使用这里的设置。也可以在每个居民详情页覆盖。
            </Text>
          </VStack>
          <VStack gap={4}>
            <Selector
              label="Provider"
              placeholder="（未设置）"
              hasClear
              value={ai.providerId}
              onChange={(v) => setAi((s) => ({...s, providerId: v ?? '', modelId: ''}))}
              options={providers.map((p) => ({value: p.id, label: `${p.name}（${p.providerType}）`}))}
            />
            <div>
              <TextInput
                label="默认 Model"
                value={ai.modelId}
                onChange={(v) => setAi((s) => ({...s, modelId: v}))}
                placeholder="例如 gpt-4o-mini"
                {...nativeAttrs({list: `models-${ai.providerId}`})}
                htmlName="default-model"
              />
              <datalist id={`models-${ai.providerId}`}>
                {models.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
            <div {...stylex.props(styles.tripleGrid)}>
              <NumberInput
                label="Temperature"
                value={ai.temperature}
                min={0}
                max={2}
                step={0.1}
                onChange={(v) => setAi((s) => ({...s, temperature: v ?? 0.8}))}
              />
              <NumberInput
                label="Top P"
                isOptional
                value={ai.topP}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => setAi((s) => ({...s, topP: v}))}
              />
              <NumberInput
                label="Max Tokens"
                isOptional
                value={ai.maxTokens}
                min={50}
                max={16000}
                step={50}
                onChange={(v) => setAi((s) => ({...s, maxTokens: v}))}
              />
            </div>
          </VStack>
          <div>
            <Button label="保存 AI 配置" variant="primary" onClick={saveAI} isDisabled={saving} isLoading={saving} />
          </div>
        </VStack>
      </Section>

      <Section variant="transparent" padding={0}>
        <VStack gap={4}>
          <VStack gap={0.5}>
            <h2 {...stylex.props(styles.sectionTitle)}>AI 社区行为</h2>
            <Text type="supporting" size="sm" as="p">
              控制 AI 居民自主活动的整体节奏，防止 Token 过度消耗。
            </Text>
          </VStack>
          <Switch
            label="启用自主社区行为"
            labelPosition="start"
            labelSpacing="spread"
            width="100%"
            value={communityCfg.enabled}
            onChange={(checked) => saveCommunity({...communityCfg, enabled: checked})}
          />
          <div {...stylex.props(styles.doubleGrid)}>
            <NumberInput
              label="社区心跳间隔（分钟）"
              value={communityCfg.pulseIntervalMinutes}
              min={5}
              max={1440}
              onChange={(v) => saveCommunity({...communityCfg, pulseIntervalMinutes: v ?? 5})}
            />
            <NumberInput
              label="每条动态最多几个 AI 评论"
              value={communityCfg.maxActorsPerPost}
              min={0}
              max={10}
              onChange={(v) => saveCommunity({...communityCfg, maxActorsPerPost: v ?? 0})}
            />
            <NumberInput
              label="AI 互相回复概率（0~1）"
              value={communityCfg.aiReplyChainRate}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => saveCommunity({...communityCfg, aiReplyChainRate: v ?? 0})}
            />
            <NumberInput
              label="每次心跳最多几条 AI 动态"
              value={communityCfg.maxPostsPerPulse}
              min={0}
              max={5}
              onChange={(v) => saveCommunity({...communityCfg, maxPostsPerPulse: v ?? 0})}
            />
          </div>
        </VStack>
      </Section>
    </VStack>
  );
}
