'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Eye,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Upload,
  Play,
  Check,
  Copy,
  Image as ImageIcon,
} from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { TextInput } from '@astryxdesign/core/TextInput';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Switch } from '@astryxdesign/core/Switch';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { useAppToast } from '@/lib/toast';
import { nativeAttrs } from '@/lib/native-attrs';
import { saveVisionConfig, testVisionModelAction, type TestVisionModelResult } from '@/server/actions/settings';
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
  uploadZone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    border: '2px dashed var(--color-border)',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--color-surface)',
    cursor: 'pointer',
    transition: 'border-color 150ms ease, background-color 150ms ease',
    ':hover': {
      borderColor: 'var(--color-primary, #6366f1)',
      backgroundColor: 'var(--color-background-muted)',
    },
  },
  hiddenInput: {
    display: 'none',
  },
  previewRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px',
    borderRadius: 'var(--radius-element)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
  },
  previewThumb: {
    width: '64px',
    height: '64px',
    borderRadius: 'var(--radius-element)',
    objectFit: 'cover',
    border: '1px solid var(--color-border)',
  },
  resultCard: {
    backgroundColor: 'var(--color-background-muted)',
    color: 'var(--color-text-primary)',
    borderRadius: 'var(--radius-element)',
    padding: '16px',
    fontSize: '13px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    border: '1px solid var(--color-border)',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '8px',
  },
  errorCard: {
    padding: '12px',
    borderRadius: 'var(--radius-element)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  errorText: {
    color: 'rgb(220, 38, 38)',
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [visionCfg, setVisionCfg] = useState({
    enabled: vision.enabled ?? true,
    providerId: vision.providerId ?? '',
    modelId: vision.modelId ?? '',
    prompt: vision.prompt ?? '帮我解析这个图片',
    temperature: vision.temperature ?? 0.2,
    maxTokens: vision.maxTokens ?? 800,
  });
  const [testFile, setTestFile] = useState<File | null>(null);
  const [testPreviewUrl, setTestPreviewUrl] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestVisionModelResult | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

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
      prompt: visionCfg.prompt || '帮我解析这个图片',
      temperature: visionCfg.temperature,
      maxTokens: visionCfg.maxTokens,
    });
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('图片理解配置已保存');
      router.refresh();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (testPreviewUrl) URL.revokeObjectURL(testPreviewUrl);
    setTestFile(file);
    setTestPreviewUrl(URL.createObjectURL(file));
    setTestResult(null);
  };

  const runTest = async () => {
    if (!testFile) {
      toast.error('请先选择一张测试图片');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const formData = new FormData();
      formData.append('file', testFile);
      if (visionCfg.providerId) formData.append('providerId', visionCfg.providerId);
      if (visionCfg.modelId) formData.append('modelId', visionCfg.modelId);
      if (visionCfg.prompt) formData.append('prompt', visionCfg.prompt);
      if (visionCfg.temperature !== null) formData.append('temperature', String(visionCfg.temperature));
      if (visionCfg.maxTokens !== null) formData.append('maxTokens', String(visionCfg.maxTokens));
      const result = await testVisionModelAction(formData);
      setTestResult(result);
      if (result.ok) {
        toast.success('视觉模型识别测试完成');
      } else {
        toast.error(result.error || '测试失败');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  const copyPromptBlock = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    toast.success('已复制提示词');
    setTimeout(() => setCopiedPrompt(false), 2000);
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
        <HStack gap={1.5} vAlign="center">
          <Eye size={18} color="var(--color-primary, #6366f1)" />
          <Text size="sm" as="span">
            “Vision AI 负责看见，角色 AI 负责感受”
          </Text>
        </HStack>
        <Text type="supporting" size="sm" as="p">
          当你在私聊、群聊或社区中发送图片时，系统会调用配置的专用视觉模型进行一次统一客观感知，生成可复用的结构化数据与自然语言描述。
        </Text>
        <div {...stylex.props(styles.infoGrid)}>
          <div {...stylex.props(styles.infoCard)}>
            <Text size="sm" as="p">
              ⚡ 避免重复调用与高额成本
            </Text>
            <Text type="supporting" size="sm" as="p">
              同一张图片仅执行一次分析，群聊中多个角色不会各自反复调用昂贵的视觉模型。
            </Text>
          </div>
          <div {...stylex.props(styles.infoCard)}>
            <Text size="sm" as="p">
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
          <HStack hAlign="between" vAlign="center" width="100%">
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
          </HStack>

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


              {/* Vision Prompt Input */}
              <div>
                <TextInput
                  label="图片理解提示词"
                  value={visionCfg.prompt}
                  onChange={(v) => setVisionCfg((s) => ({ ...s, prompt: v }))}
                  placeholder="帮我解析这个图片"
                  htmlName="vision-prompt"
                />
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

      {/* Live Vision Model Testing Section */}
      <Card variant="default">
        <VStack gap={4}>
          <VStack gap={0.5}>
            <HStack gap={1.5} vAlign="center">
              <Sparkles size={18} color="var(--color-primary, #6366f1)" />
              <Text size="base" as="span">
                视觉模型在线测试 (Live Vision Test)
              </Text>
            </HStack>
            <Text type="supporting" size="sm" as="p">
              上传一张图片，实时测试当前视觉模型输出的客观感知内容、结构化数据与装配提示词。
            </Text>
          </VStack>

          {/* Upload Area */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            {...stylex.props(styles.hiddenInput)}
            onChange={handleFileChange}
          />

          {!testPreviewUrl ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
              }}
              {...stylex.props(styles.uploadZone)}
            >
              <VStack gap={2} hAlign="center">
                <Upload size={28} color="var(--color-text-secondary)" />
                <Text size="sm" as="span">
                  点击或拖拽上传测试图片
                </Text>
                <Text type="supporting" size="sm" as="span">
                  支持 JPG、PNG、WebP、GIF、AVIF 格式，最大 15MB
                </Text>
              </VStack>
            </div>
          ) : (
            <div {...stylex.props(styles.previewRow)}>
              <img
                src={testPreviewUrl}
                alt="测试预览"
                {...stylex.props(styles.previewThumb)}
              />
              <VStack gap={0.5}>
                <Text size="sm" as="span">
                  {testFile?.name || '测试图片'}
                </Text>
                <Text type="supporting" size="sm" as="span">
                  文件大小：{testFile ? (testFile.size / 1024).toFixed(1) : 0} KB
                </Text>
              </VStack>
              <Button
                label="更换图片"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                isDisabled={testing}
              />
            </div>
          )}

          <div>
            <Button
              label={testing ? '正在识别感知中…' : '开始测试图片理解'}
              variant="primary"
              size="sm"
              icon={<Play size={14} className={testing ? 'animate-spin' : ''} />}
              onClick={runTest}
              isDisabled={!testFile || testing}
              isLoading={testing}
            />
          </div>

          {/* Test Results View */}
          {testResult && (
            <VStack gap={3}>
              {testResult.ok && testResult.perception ? (
                <>
                  {/* Metrics Banner */}
                  <HStack hAlign="between" vAlign="center" width="100%">
                    <HStack gap={1.5} vAlign="center">
                      <Badge label="测试成功" variant="green" />
                      <Badge
                        label={`模型: ${testResult.usage?.model || effectiveModelId}`}
                        variant="neutral"
                      />
                    </HStack>
                    <Text type="supporting" size="sm">
                      耗时: {(testResult.usage?.durationMs ? testResult.usage.durationMs / 1000 : 0).toFixed(2)}s · Token: {testResult.usage?.totalTokens ?? 0}
                    </Text>
                  </HStack>

                  {/* 1. Natural Language Summary */}
                  <VStack gap={1}>
                    <Text size="sm" as="span">
                      1. 客观自然语言摘要 (Summary)
                    </Text>
                    <div {...stylex.props(styles.infoCard)}>
                      <Text size="sm" as="p">
                        {testResult.perception.summary}
                      </Text>
                    </div>
                  </VStack>

                  {/* 2. Structured Perception Details */}
                  <VStack gap={1}>
                    <Text size="sm" as="span">
                      2. 结构化感知明细 (Structured Details)
                    </Text>
                    <div {...stylex.props(styles.detailsGrid)}>
                      <div {...stylex.props(styles.infoCard)}>
                        <Text type="supporting" size="sm" as="div">核心主体 (mainContent)</Text>
                        <Text size="sm" as="div">{testResult.perception.mainContent}</Text>
                      </div>
                      {testResult.perception.scene && (
                        <div {...stylex.props(styles.infoCard)}>
                          <Text type="supporting" size="sm" as="div">场景环境 (scene)</Text>
                          <Text size="sm" as="div">{testResult.perception.scene}</Text>
                        </div>
                      )}
                      {testResult.perception.imageType && (
                        <div {...stylex.props(styles.infoCard)}>
                          <Text type="supporting" size="sm" as="div">图片类型 (imageType)</Text>
                          <Text size="sm" as="div">{testResult.perception.imageType}</Text>
                        </div>
                      )}
                      {testResult.perception.mood && (
                        <div {...stylex.props(styles.infoCard)}>
                          <Text type="supporting" size="sm" as="div">画面氛围 (mood)</Text>
                          <Text size="sm" as="div">{testResult.perception.mood}</Text>
                        </div>
                      )}
                    </div>

                    {/* Objects Badges */}
                    {testResult.perception.objects && testResult.perception.objects.length > 0 && (
                      <VStack gap={1}>
                        <Text type="supporting" size="sm" as="span">识别物体与要素：</Text>
                        <HStack gap={1} wrap="wrap">
                          {testResult.perception.objects.map((obj, i) => (
                            <Badge key={i} label={obj} variant="blue" />
                          ))}
                        </HStack>
                      </VStack>
                    )}

                    {/* OCR Text if present */}
                    {testResult.perception.ocrText && (
                      <div {...stylex.props(styles.infoCard)}>
                        <Text type="supporting" size="sm" as="div">可见文字 (OCR)</Text>
                        <Text size="sm" as="div">
                          {testResult.perception.ocrText}
                        </Text>
                      </div>
                    )}
                  </VStack>

                  {/* 3. Formatted Prompt Block */}
                  {testResult.formattedPromptBlock && (
                    <VStack gap={1.5}>
                      <HStack hAlign="between" vAlign="center" width="100%">
                        <Text size="sm" as="span">
                          3. 装配到下游角色大模型的最终提示词块
                        </Text>
                        <Button
                          label={copiedPrompt ? '已复制' : '复制提示词块'}
                          variant="secondary"
                          size="sm"
                          icon={copiedPrompt ? <Check size={13} /> : <Copy size={13} />}
                          onClick={() => copyPromptBlock(testResult.formattedPromptBlock!)}
                        />
                      </HStack>
                      <div {...stylex.props(styles.resultCard)}>
                        {testResult.formattedPromptBlock}
                      </div>
                    </VStack>
                  )}
                </>
              ) : (
                <div {...stylex.props(styles.errorCard)}>
                  <HStack gap={1.5} vAlign="center">
                    <AlertCircle size={16} color="rgb(220, 38, 38)" />
                    <Text size="sm" as="span" xstyle={styles.errorText}>
                      测试失败
                    </Text>
                  </HStack>
                  <Text size="sm" as="p" xstyle={styles.errorText}>
                    {testResult.error || '未知错误'}
                  </Text>
                </div>
              )}
            </VStack>
          )}
        </VStack>
      </Card>
    </VStack>
  );
}
