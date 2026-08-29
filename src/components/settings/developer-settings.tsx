'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Code2, Terminal, Cpu, FileText, CheckCircle2 } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Switch } from '@astryxdesign/core/Switch';
import { VStack } from '@astryxdesign/core/Stack';
import { useAppToast } from '@/lib/toast';
import { saveDeveloperConfig } from '@/server/actions/settings';
import type { DeveloperConfig } from '@/server/settings';
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
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '9999px',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
  },
  statusActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    color: 'var(--color-primary, #6366f1)',
  },
  statusDisabled: {
    backgroundColor: 'var(--color-background-muted)',
    color: 'var(--color-text-secondary)',
  },
});

export function DeveloperSettings({
  developer,
}: {
  developer: DeveloperConfig;
}) {
  const router = useRouter();
  const toast = useAppToast();

  const [cfg, setCfg] = useState({
    enabled: developer.enabled ?? false,
    showRawPrompts: developer.showRawPrompts ?? true,
    showTokenStats: developer.showTokenStats ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const res = await saveDeveloperConfig(cfg);
    setSaving(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('开发者设置已保存');
      router.refresh();
    }
  };

  return (
    <VStack gap={6}>
      {/* Header */}
      <div {...stylex.props(styles.header)}>
        <Link href="/settings" {...stylex.props(styles.backLink)} aria-label="返回设置菜单">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 {...stylex.props(styles.title)}>开发者设置 (Developer Settings)</h1>
          <p {...stylex.props(styles.subtitle)}>
            开启调试与提示词检查工具，透视传给大模型的完整 System Prompt 与上下文 Payload
          </p>
        </div>
      </div>

      {/* Feature Description */}
      <div {...stylex.props(styles.infoBanner)}>
        <div {...stylex.props(styles.infoTitleRow)}>
          <Code2 size={18} color="var(--color-primary, #6366f1)" />
          <Text size="sm" as="span" style={{ fontWeight: 600 }}>
            上下文透视与提示词调试
          </Text>
        </div>
        <Text type="supporting" size="sm" as="p">
          开启开发者设置后，私聊和群聊顶栏会出现【开发者工具】入口，支持完整查看：
        </Text>
        <div {...stylex.props(styles.infoGrid)}>
          <div {...stylex.props(styles.infoCard)}>
            <Text size="sm" as="p" style={{ fontWeight: 600, marginBottom: 4 }}>
              📜 完整 System Prompt
            </Text>
            <Text type="supporting" size="sm" as="p">
              包含角色基础人设、长期记忆块、对话滚动摘要、群聊时间与规则等完整装配结果。
            </Text>
          </div>
          <div {...stylex.props(styles.infoCard)}>
            <Text size="sm" as="p" style={{ fontWeight: 600, marginBottom: 4 }}>
              💬 上下文消息序列 (Payload)
            </Text>
            <Text type="supporting" size="sm" as="p">
              包含传递给 LLM 的 verbatim 消息数组，以及图片经视觉感知转化后的真实文本描述。
            </Text>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <Card variant="default">
        <VStack gap={5}>
          {/* Master Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Switch
              label="启用开发者模式"
              labelPosition="start"
              labelSpacing="spread"
              value={cfg.enabled}
              onChange={(checked) => setCfg((s) => ({ ...s, enabled: checked }))}
            />
            <div
              {...stylex.props(
                styles.statusBadge,
                cfg.enabled ? styles.statusActive : styles.statusDisabled,
              )}
            >
              {cfg.enabled ? (
                <>
                  <CheckCircle2 size={13} />
                  <span>已启用</span>
                </>
              ) : (
                <span>已停用</span>
              )}
            </div>
          </div>

          {cfg.enabled && (
            <VStack gap={4}>
              <Switch
                label="默认展开完整原始提示词 (Raw System Prompt)"
                labelPosition="start"
                labelSpacing="spread"
                value={cfg.showRawPrompts}
                onChange={(checked) => setCfg((s) => ({ ...s, showRawPrompts: checked }))}
              />
              <Switch
                label="显示 Token 统计与字符数预估"
                labelPosition="start"
                labelSpacing="spread"
                value={cfg.showTokenStats}
                onChange={(checked) => setCfg((s) => ({ ...s, showTokenStats: checked }))}
              />
            </VStack>
          )}

          <div>
            <Button
              label="保存开发者设置"
              variant="primary"
              onClick={handleSave}
              isDisabled={saving}
              isLoading={saving}
            />
          </div>
        </VStack>
      </Card>
    </VStack>
  );
}
