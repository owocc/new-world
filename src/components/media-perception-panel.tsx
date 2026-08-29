'use client';

import { useCallback, useEffect, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { RefreshCw, Pencil, Save, X, Cpu, Hash, Tag, Copy, Check } from 'lucide-react';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Text } from '@astryxdesign/core/Text';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Selector } from '@astryxdesign/core/Selector';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { useAppToast } from '@/lib/toast';
import {
  getMediaPerceptionDetailAction,
  editMediaPerceptionAction,
  reanalyzeMediaPerceptionAction,
  type MediaPerceptionDetail,
} from '@/server/actions/media';
import type { VisionProfileKey } from '@/server/ai/vision-profiles';

const styles = stylex.create({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
    height: '100%',
    overflowY: 'auto',
    backgroundColor: 'var(--color-background)',
    color: 'var(--color-text-primary)',
  },
  section: {
    padding: '12px',
    borderRadius: 'var(--radius-element)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
  },
  sectionLabel: {
    fontSize: '11px',
    color: 'var(--color-text-secondary)',
    marginBottom: '4px',
    display: 'block',
  },
  mono: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: '12px',
    lineHeight: 1.5,
    wordBreak: 'break-all',
    whiteSpace: 'pre-wrap',
  },
  kv: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  kvLabel: {
    fontSize: '11px',
    color: 'var(--color-text-secondary)',
  },
  kvValue: {
    fontSize: '13px',
    fontWeight: 600,
    wordBreak: 'break-word',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '8px',
  },
  promptBlock: {
    backgroundColor: 'var(--color-background-muted)',
    borderRadius: 'var(--radius-element)',
    padding: '10px',
    fontSize: '12px',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    border: '1px solid var(--color-border)',
    maxHeight: '160px',
    overflowY: 'auto',
  },
});

const PROFILE_OPTIONS: Array<{ value: VisionProfileKey; label: string }> = [
  { value: 'general', label: '通用 (General)' },
  { value: 'avatar', label: '头像 (Avatar)' },
  { value: 'sticker', label: '表情包 (Sticker)' },
];

export function MediaPerceptionPanel({
  mediaAssetId,
  onClose,
}: {
  mediaAssetId: string;
  onClose: () => void;
}) {
  const toast = useAppToast();
  const [detail, setDetail] = useState<MediaPerceptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedHash, setCopiedHash] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editSummary, setEditSummary] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Re-run state
  const [rerunProfile, setRerunProfile] = useState<VisionProfileKey | null>(null);
  const [rerunPrompt, setRerunPrompt] = useState('');
  const [rerunning, setRerunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getMediaPerceptionDetailAction(mediaAssetId);
    if (res.ok) {
      setDetail(res.detail);
      setEditSummary(res.detail.perception?.summary || '');
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  }, [mediaAssetId]);

  useEffect(() => {
    load();
  }, [load]);

  const copyHash = () => {
    if (detail?.asset.contentHash) {
      navigator.clipboard.writeText(detail.asset.contentHash);
      setCopiedHash(true);
      toast.success('已复制哈希值');
      setTimeout(() => setCopiedHash(false), 1500);
    }
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    const res = await editMediaPerceptionAction(mediaAssetId, editSummary);
    setSavingEdit(false);
    if (res.ok) {
      toast.success('已保存手动修改的描述');
      setEditing(false);
      await load();
    } else {
      toast.error(res.error);
    }
  };

  const rerun = async () => {
    setRerunning(true);
    const res = await reanalyzeMediaPerceptionAction(mediaAssetId, {
      profileKey: rerunProfile || undefined,
      prompt: rerunPrompt.trim() || null,
    });
    setRerunning(false);
    if (res.ok) {
      toast.success('已重新调用 AI 解析');
      setRerunPrompt('');
      setRerunProfile(null);
      await load();
    } else {
      toast.error(res.error || '重新解析失败');
    }
  };

  if (loading) {
    return (
      <div {...stylex.props(styles.root)}>
        <HStack gap={2} vAlign="center">
          <RefreshCw size={16} className="animate-spin" />
          <Text type="supporting" size="sm">正在加载图片感知上下文...</Text>
        </HStack>
      </div>
    );
  }

  if (!detail) {
    return (
      <div {...stylex.props(styles.root)}>
        <Text type="supporting" size="sm">未找到该图片的感知记录</Text>
      </div>
    );
  }

  const { asset, perception } = detail;

  return (
    <div {...stylex.props(styles.root)}>
      <HStack hAlign="between" vAlign="center" width="100%">
        <HStack gap={1.5} vAlign="center">
          <Cpu size={15} color="var(--color-primary, #6366f1)" />
          <Text size="sm" as="span" style={{ fontWeight: 600 }}>
            开发者 · 图片感知上下文
          </Text>
        </HStack>
        <Button label="" variant="ghost" size="sm" icon={<X size={14} />} onClick={onClose} />
      </HStack>

      {/* Identity */}
      <div {...stylex.props(styles.section)}>
        <VStack gap={2}>
          <div {...stylex.props(styles.kv)}>
            <span {...stylex.props(styles.kvLabel)}>
              <Hash size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
              内容哈希 (SHA-256)
            </span>
            <HStack gap={1} vAlign="center">
              <span {...stylex.props(styles.mono)}>{asset.contentHash || '(未计算)'}</span>
              {asset.contentHash && (
                <button type="button" onClick={copyHash} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                  {copiedHash ? <Check size={12} /> : <Copy size={12} />}
                </button>
              )}
            </HStack>
          </div>
          <div {...stylex.props(styles.grid)}>
            <div {...stylex.props(styles.kv)}>
              <span {...stylex.props(styles.kvLabel)}>
                <Tag size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
                图片类型 (imageType)
              </span>
              <Badge label={asset.imageType} variant="blue" />
            </div>
            <div {...stylex.props(styles.kv)}>
              <span {...stylex.props(styles.kvLabel)}>用途 (purpose)</span>
              <span {...stylex.props(styles.kvValue)}>{asset.purpose}</span>
            </div>
            <div {...stylex.props(styles.kv)}>
              <span {...stylex.props(styles.kvLabel)}>MIME</span>
              <span {...stylex.props(styles.kvValue)}>{asset.mimeType}</span>
            </div>
            <div {...stylex.props(styles.kv)}>
              <span {...stylex.props(styles.kvLabel)}>大小</span>
              <span {...stylex.props(styles.kvValue)}>{(asset.fileSize / 1024).toFixed(1)} KB</span>
            </div>
          </div>
        </VStack>
      </div>

      {/* Perception Context */}
      <div {...stylex.props(styles.section)}>
        <VStack gap={2}>
          <HStack hAlign="between" vAlign="center" width="100%">
            <Text size="sm" as="span" style={{ fontWeight: 600 }}>AI 感知结果</Text>
            <HStack gap={1} vAlign="center">
              {perception && <Badge label={`Profile: ${perception.profile}`} variant="purple" />}
              {perception?.editedByUser && <Badge label="已手动编辑" variant="yellow" />}
            </HStack>
          </HStack>

          {perception?.status !== 'ready' && (
            <Text type="supporting" size="sm" as="p">
              状态：{perception?.status || '无记录'} {perception?.errorMessage ? `· ${perception.errorMessage}` : ''}
            </Text>
          )}

          {editing ? (
            <VStack gap={2}>
              <TextArea
                label="手动修改描述"
                isLabelHidden
                value={editSummary}
                onChange={(v) => setEditSummary(v)}
                rows={4}
              />
              <HStack gap={2}>
                <Button
                  label={savingEdit ? '保存中…' : '保存修改'}
                  variant="primary"
                  size="sm"
                  icon={<Save size={13} />}
                  onClick={saveEdit}
                  isLoading={savingEdit}
                />
                <Button label="取消" variant="secondary" size="sm" onClick={() => setEditing(false)} />
              </HStack>
            </VStack>
          ) : (
            <VStack gap={1}>
              <div {...stylex.props(styles.promptBlock)}>
                {perception?.summary || '(暂无 AI 描述)'}
              </div>
              <HStack gap={2}>
                <Button
                  label="手动编辑描述"
                  variant="secondary"
                  size="sm"
                  icon={<Pencil size={13} />}
                  onClick={() => setEditing(true)}
                />
              </HStack>
            </VStack>
          )}

          {perception?.ocrText && (
            <div {...stylex.props(styles.kv)}>
              <span {...stylex.props(styles.kvLabel)}>可见文字 (OCR)</span>
              <div {...stylex.props(styles.promptBlock)}>{perception.ocrText}</div>
            </div>
          )}

          {perception && (
            <div {...stylex.props(styles.grid)}>
              <div {...stylex.props(styles.kv)}>
                <span {...stylex.props(styles.kvLabel)}>模型</span>
                <span {...stylex.props(styles.kvValue)}>{perception.model || '-'}</span>
              </div>
              <div {...stylex.props(styles.kv)}>
                <span {...stylex.props(styles.kvLabel)}>Provider</span>
                <span {...stylex.props(styles.kvValue)}>{perception.providerType || '-'}</span>
              </div>
              <div {...stylex.props(styles.kv)}>
                <span {...stylex.props(styles.kvLabel)}>Tokens</span>
                <span {...stylex.props(styles.kvValue)}>{perception.totalTokens}</span>
              </div>
              <div {...stylex.props(styles.kv)}>
                <span {...stylex.props(styles.kvLabel)}>耗时</span>
                <span {...stylex.props(styles.kvValue)}>{(perception.durationMs / 1000).toFixed(2)}s</span>
              </div>
            </div>
          )}
        </VStack>
      </div>

      {/* Prompts used */}
      {perception?.systemPromptUsed && (
        <div {...stylex.props(styles.section)}>
          <VStack gap={1}>
            <span {...stylex.props(styles.sectionLabel)}>装配的 System Prompt（本次解析实际使用）</span>
            <div {...stylex.props(styles.promptBlock)}>{perception.systemPromptUsed}</div>
            <span {...stylex.props(styles.sectionLabel)}>User Prompt</span>
            <div {...stylex.props(styles.promptBlock)}>{perception.promptUsed || '-'}</div>
          </VStack>
        </div>
      )}

      {/* Re-run */}
      <div {...stylex.props(styles.section)}>
        <VStack gap={2}>
          <Text size="sm" as="span" style={{ fontWeight: 600 }}>重新解析 (Re-run)</Text>
          <Text type="supporting" size="sm" as="p">
            可选择不同的 Profile 或自定义提示词，重新调用视觉模型生成描述。
          </Text>
          <Selector
            label="覆盖 Profile"
            isLabelHidden
            placeholder="（沿用图片当前类型的 Profile）"
            hasClear
            value={rerunProfile}
            onChange={(v) => setRerunProfile((v as VisionProfileKey | null) ?? null)}
            options={PROFILE_OPTIONS}
          />
          <TextArea
            label="自定义提示词（可选）"
            isLabelHidden
            value={rerunPrompt}
            onChange={(v) => setRerunPrompt(v)}
            placeholder="可选：留空则使用该 Profile 的默认提示词"
            rows={2}
          />
          <Button
            label={rerunning ? '正在重新解析…' : '重新让 AI 解析这张图片'}
            variant="primary"
            size="sm"
            icon={<RefreshCw size={13} className={rerunning ? 'animate-spin' : ''} />}
            onClick={rerun}
            isLoading={rerunning}
          />
        </VStack>
      </div>
    </div>
  );
}
