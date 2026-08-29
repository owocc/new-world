'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Switch } from '@astryxdesign/core/Switch';
import { VStack } from '@astryxdesign/core/Stack';
import { useAppToast } from '@/lib/toast';
import { nativeAttrs } from '@/lib/native-attrs';
import { saveVisionConfig } from '@/server/actions/settings';
import type { VisionConfig } from '@/server/settings';
import { supportsVision } from '@/lib/providers-shared';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '12px',
  },
  backLink: {
    display: 'flex',
    width: '32px',
    height: '32px',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '9999px',
    color: 'var(--color-text-secondary)',
    '@media (min-width: 1024px)': { display: 'none' },
    ':hover': { backgroundColor: 'var(--color-background-muted)' },
  },
  title: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-semibold)',
    letterSpacing: '-0.01em',
  },
  subtitle: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-secondary)',
  },
  infoBanner: {
    padding: '16px',
    backgroundColor: 'var(--color-background-muted)',
    borderRadius: 'var(--radius-container)',
    border: '1px solid var(--color-border)',
  },
  infoTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '12px',
    marginTop: '12px',
    '@media (min-width: 640px)': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },
  },
  infoCard: {
    padding: '12px',
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-element)',
    border: '1px solid var(--color-border)',
  },
  doubleGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '12px',
    '@media (min-width: 640px)': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '9999px',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
  },
  statusReady: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    color: 'rgb(22, 163, 74)',
  },
  statusWarn: {
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
    color: 'rgb(202, 138, 4)',
  },
  statusDisabled: {
    backgroundColor: 'var(--color-background-muted)',
    color: 'var(--color-text-secondary)',
  },
});

export function VisionSettings({
  vision,
  providers,
  modelsByProvider,
}: {
  vision: VisionConfig;
  providers: { id: string; name: string; providerType: string }[];
  modelsByProvider: Record<string, string[]>;
}) {
  const router = useRouter();
  const toast = useAppToast();

  const [visionCfg, setVisionCfg] = useState({
    enabled: vision.enabled ?? true,
    providerId: vision.providerId ?? '',
    modelId: vision.modelId ?? '',
    temperature: vision.temperature ?? 0.2,
    maxTokens: vision.maxTokens ?? 800,
  });
  const [saving, setSaving] = useState(false);

  const selectedProvider = providers.find((p) => p.id === visionCfg.providerId) ?? providers[0];
  const effectiveModelId = visionCfg.modelId || 'gpt-4o-mini';
  const isVisionCapable = selectedProvider
    ? supportsVision(selectedProvider.providerType, effectiveModelId)
    : true;

  const saveConfig = async () => {
    setSaving(true);
    const res = await saveVisionConfig({
      enabled: visionCfg.enabled,
      providerId: visionCfg.providerId || null,
      modelId: visionCfg.modelId || null,
      temperature: visionCfg.temperature,
      maxTokens: visionCfg.maxTokens,
    });
    setSaving(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('图片理解配置已保存');
      router.refresh();
    }
  };

  const currentModels = visionCfg.providerId ? modelsByProvider[visionCfg.providerId] ?? [] : [];

  return (
    <VStack gap={6}>
      {/* Page Header */}
      <div {...stylex.props(styles.header)}>
        <Link href="/settings" {...stylex.props(styles.backLink)} aria-label="返回设置菜单">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 {...stylex.props(styles.title)}>图片理解 (Vision Interpreter)</h1>
          <p {...stylex.props(styles.subtitle)}>
            配置系统级统一视觉感知模型，为所有 AI 角色提供高效客观的图像理解
          </p>
        </div>
      </div>

      {/* Philosophy & Architecture Overview */}
      <div {...stylex.props(styles.infoBanner)}>
        <div {...stylex.props(styles.infoTitleRow)}>
          <Eye size={18} color="var(--color-primary, #6366f1)" />
          <Text size="sm" as="span" style={{ fontWeight: 600 }}>
            “Vision AI 负责看见，角色 AI 负责感受”
          </Text>
        </div>
        <Text type="supporting" size="sm" as="p">
          当你在私聊、群聊或社区中发送图片时，系统会调用配置的专用视觉模型进行一次统一客观感知，生成可复用的结构化数据与自然语言描述。
        </Text>
        <div {...stylex.props(styles.infoGrid)}>
          <div {...stylex.props(styles.infoCard)}>
            <Text size="sm" as="p" style={{ fontWeight: 600, marginBottom: 4 }}>
              ⚡ 避免重复调用与高额成本
            </Text>
            <Text type="supporting" size="sm" as="p">
              同一张图片仅执行一次分析，群聊中多个角色不会各自反复调用昂贵的视觉模型。
            </Text>
          </div>
          <div {...stylex.props(styles.infoCard)}>
            <Text size="sm" as="p" style={{ fontWeight: 600, marginBottom: 4 }}>
              🧠 赋能纯文本角色模型
            </Text>
            <Text type="supporting" size="sm" as="p">
              即使角色使用 DeepSeek 等纯文本模型，也能通过统一感知描述顺畅理解图片。
            </Text>
          </div>
        </div>
      </div>

      {/* Main Settings Card */}
      <Card variant="default">
        <VStack gap={5}>
          {/* Master Switch & Status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Switch
              label="启用统一图片理解"
              labelPosition="start"
              labelSpacing="spread"
              value={visionCfg.enabled}
              onChange={(checked) => setVisionCfg((s) => ({ ...s, enabled: checked }))}
            />
            <div
              {...stylex.props(
                styles.statusBadge,
                !visionCfg.enabled
                  ? styles.statusDisabled
                  : isVisionCapable
                    ? styles.statusReady
                    : styles.statusWarn,
              )}
            >
              {!visionCfg.enabled ? (
                <span>已停用</span>
              ) : isVisionCapable ? (
                <>
                  <CheckCircle2 size={13} />
                  <span>视觉感知已就绪</span>
                </>
              ) : (
                <>
                  <AlertCircle size={13} />
                  <span>当前模型可能不支持视觉</span>
                </>
              )}
            </div>
          </div>

          {visionCfg.enabled && (
            <VStack gap={4}>
              {/* Provider Selector */}
              <Selector
                label="专用 Vision Provider"
                placeholder="（跟随系统默认 AI 服务商）"
                hasClear
                value={visionCfg.providerId}
                onChange={(v) => setVisionCfg((s) => ({ ...s, providerId: v ?? '', modelId: '' }))}
                options={providers.map((p) => ({
                  value: p.id,
                  label: `${p.name}（${p.providerType}）`,
                }))}
              />

              {/* Model ID Input with Smart Datalist */}
              <div>
                <TextInput
                  label="Vision Model ID"
                  value={visionCfg.modelId}
                  onChange={(v) => setVisionCfg((s) => ({ ...s, modelId: v }))}
                  placeholder="例如 gpt-4o-mini / gemini-1.5-flash / claude-3-5-haiku-20241022"
                  {...nativeAttrs({ list: `vision-models-${visionCfg.providerId}` })}
                  htmlName="vision-model-id"
                />
                <datalist id={`vision-models-${visionCfg.providerId}`}>
                  {currentModels.map((m) => (
                    <option key={m} value={m} />
                  ))}
                  <option value="gpt-4o-mini">OpenAI 推荐：极速且经济</option>
                  <option value="gpt-4o">OpenAI：高精度视觉</option>
                  <option value="gemini-1.5-flash">Google 推荐：极速多模态</option>
                  <option value="gemini-2.0-flash">Google：新一代多模态</option>
                  <option value="claude-3-5-haiku-20241022">Anthropic 推荐：轻量快速</option>
                  <option value="claude-3-5-sonnet-20241022">Anthropic：细粒度理解</option>
                  <option value="qwen2.5-vl-72b">自定义/OpenAI 兼容：开源顶尖视觉</option>
                </datalist>
              </div>

              {/* Hyperparameters */}
              <div {...stylex.props(styles.doubleGrid)}>
                <NumberInput
                  label="Temperature"
                  value={visionCfg.temperature}
                  min={0}
                  max={2}
                  step={0.1}
                  onChange={(v) => setVisionCfg((s) => ({ ...s, temperature: v ?? 0.2 }))}
                />
                <NumberInput
                  label="Max Tokens"
                  value={visionCfg.maxTokens}
                  min={100}
                  max={4000}
                  step={50}
                  onChange={(v) => setVisionCfg((s) => ({ ...s, maxTokens: v ?? 800 }))}
                />
              </div>
            </VStack>
          )}

          <div>
            <Button
              label="保存图片理解配置"
              variant="primary"
              onClick={saveConfig}
              isDisabled={saving}
              isLoading={saving}
            />
          </div>
        </VStack>
      </Card>
    </VStack>
  );
}
