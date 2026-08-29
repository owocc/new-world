'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Save, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { TextArea } from '@astryxdesign/core/TextArea';
import { TabList, Tab } from '@astryxdesign/core/TabList';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { useAppToast } from '@/lib/toast';
import {
  saveVisionProfilePromptsAction,
  resetVisionProfileAction,
  type VisionProfileSettingsView,
} from '@/server/actions/settings';
import type { VisionProfileKey } from '@/server/ai/vision-profiles';

export function VisionProfileSettings({
  profiles,
}: {
  profiles: VisionProfileSettingsView[];
}) {
  const router = useRouter();
  const toast = useAppToast();
  const [activeKey, setActiveKey] = useState<VisionProfileKey>(profiles[0]?.key ?? 'general');

  const active = profiles.find((p) => p.key === activeKey) ?? profiles[0];

  // Local draft state keyed by profile
  const [drafts, setDrafts] = useState<Record<string, { systemPrompt: string; userPrompt: string }>>(() => {
    const init: Record<string, { systemPrompt: string; userPrompt: string }> = {};
    for (const p of profiles) {
      init[p.key] = {
        systemPrompt: p.systemPrompt,
        userPrompt: p.userPrompt,
      };
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const draft = drafts[activeKey] ?? { systemPrompt: '', userPrompt: '' };

  const updateDraft = (patch: Partial<{ systemPrompt: string; userPrompt: string }>) => {
    setDrafts((d) => ({ ...d, [activeKey]: { ...d[activeKey], ...patch } }));
  };

  const save = async () => {
    setSaving(true);
    const res = await saveVisionProfilePromptsAction({
      key: activeKey,
      systemPrompt: draft.systemPrompt,
      userPrompt: draft.userPrompt,
    });
    setSaving(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`「${active?.label}」Profile 提示词已保存到数据库`);
      router.refresh();
    }
  };

  const reset = async () => {
    setResetting(true);
    const res = await resetVisionProfileAction(activeKey);
    setResetting(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`已恢复「${active?.label}」内置提示词`);
      if (active) {
        setDrafts((d) => ({
          ...d,
          [activeKey]: { systemPrompt: active.builtinSystemPrompt, userPrompt: active.builtinUserPrompt },
        }));
      }
      router.refresh();
    }
  };

  if (!active) return null;

  return (
    <Card variant="default">
      <VStack gap={4}>
        <VStack gap={0.5}>
          <HStack gap={1.5} vAlign="center">
            <Layers size={18} color="var(--color-primary, #6366f1)" />
            <Text size="base" as="span">
              视觉解析 Profiles（按图片类型分层）
            </Text>
          </HStack>
          <Text type="supporting" size="sm" as="p">
            每类图片（通用 / 头像 / 表情包）使用独立的系统内置提示词。你可以覆写任意 Profile，修改会保存到数据库；同一张图片哈希在不同类型下会用对应 Profile 解析。
          </Text>
        </VStack>

        <TabList value={activeKey} onChange={(v) => setActiveKey(v as VisionProfileKey)} size="sm" hasDivider>
          {profiles.map((p) => (
            <Tab
              key={p.key}
              value={p.key}
              label={`${p.label}${p.isOverridden ? ' · 已覆写' : ''}`}
            />
          ))}
        </TabList>

        <VStack gap={3}>
          <HStack hAlign="between" vAlign="center" width="100%">
            <Text type="supporting" size="sm" as="span">
              {active.description}
            </Text>
            {active.isOverridden ? (
              <Badge label="已覆写内置提示词" variant="yellow" />
            ) : (
              <Badge label="使用系统内置提示词" variant="green" />
            )}
          </HStack>

          <TextArea
            label="System Prompt（系统提示词）"
            description="决定该 Profile 如何理解此类图片。留空则回退到系统内置。"
            value={draft.systemPrompt}
            onChange={(v) => updateDraft({ systemPrompt: v })}
            rows={8}
          />

          <TextArea
            label="User Prompt（指令提示词）"
            description="随图片一并发送的解析指令。留空则回退到系统内置。"
            value={draft.userPrompt}
            onChange={(v) => updateDraft({ userPrompt: v })}
            rows={2}
          />

          <HStack gap={2} vAlign="center">
            <Button
              label={saving ? '保存中…' : '保存此 Profile'}
              variant="primary"
              size="sm"
              icon={<Save size={13} />}
              onClick={save}
              isLoading={saving}
            />
            <Button
              label={resetting ? '恢复中…' : '恢复内置提示词'}
              variant="secondary"
              size="sm"
              icon={<RotateCcw size={13} />}
              onClick={reset}
              isDisabled={!active.isOverridden}
              isLoading={resetting}
            />
            {active.isOverridden && (
              <HStack gap={1} vAlign="center">
                <CheckCircle2 size={13} color="var(--color-text-secondary)" />
                <Text type="supporting" size="sm" as="span">修改将存入数据库</Text>
              </HStack>
            )}
          </HStack>
        </VStack>
      </VStack>
    </Card>
  );
}
