'use client';

import { useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Divider } from '@astryxdesign/core/Divider';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Text } from '@astryxdesign/core/Text';
import { Token } from '@astryxdesign/core/Token';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { UserAvatar } from '@/components/user-avatar';
import { Brain, Sparkles, Loader2, Calendar } from 'lucide-react';
import { triggerCharacterDailyMemoryAction } from '@/server/actions/characters';
import { useAppToast } from '@/lib/toast';
import { useRouter } from 'next/navigation';

const spin = stylex.keyframes({
  from: { transform: 'rotate(0deg)' },
  to: { transform: 'rotate(360deg)' },
});

const styles = stylex.create({
  profileHeader: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--spacing-4)'},
  headline: {display: 'flex', alignItems: 'center', gap: '10px'},
  heading: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'var(--font-weight-semibold)',
    letterSpacing: '-0.025em',
  },
  grow: {flex: 1},
  buttonGroup: {display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)'},
  bio: {maxWidth: '36rem', lineHeight: 1.625, color: 'var(--color-text-secondary)'},
  tags: {display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-1-5)'},
  prose: {whiteSpace: 'pre-wrap', lineHeight: 1.625},
  proseSecondary: {whiteSpace: 'pre-wrap', lineHeight: 1.625, color: 'var(--color-text-secondary)'},
  memoryCard: {
    padding: '12px 14px',
    borderRadius: 'var(--radius-element)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  memoryHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  spin: {
    animationName: spin,
    animationDuration: '1s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
  },
});

export type CharacterMemoryItem = {
  id: string;
  kind: string;
  content: string;
  importance: number;
  strength?: number;
  confidence?: number;
  isFuzzy?: boolean;
  reinforcementCount?: number;
  createdAt: Date | string | number;
};

export type CharacterProfileData = {
  id?: string;
  name: string;
  username: string;
  bio: string | null;
  status: string;
  avatarEmoji: string;
  avatarColor: string;
  avatarUrl: string | null;
  relationshipToUser: string | null;
  personality: string;
  interests: string;
  persona: string;
  expressionStyle: string;
  memoryRetention?: string | null;
  grudgeRate?: number | null;
};

function splitTags(value: string): string[] {
  return value
    .split(/[,，、]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Read-only resident profile card, shared by the detail page and the in-chat
 * overlay. `actions` renders buttons at the header's end; `modelText` shows
 * the quiet technical line when provided.
 */
export function CharacterProfile({
  character,
  actions,
  modelText,
  memories = [],
}: {
  character: CharacterProfileData;
  actions?: ReactNode;
  modelText?: string;
  memories?: CharacterMemoryItem[];
}) {
  const router = useRouter();
  const toast = useAppToast();
  const [summarizing, setSummarizing] = useState(false);
  const [localMemories, setLocalMemories] = useState(memories);
  const active = character.status === 'active';

  const handleTriggerSummary = async () => {
    if (!character.id) return;
    setSummarizing(true);
    try {
      const res = await fetch(`/api/characters/${character.id}/memories/summarize`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.ok && data.result) {
        const { dmCount, groupCount, memoryCount } = data.result;
        if (data.memories) {
          setLocalMemories(data.memories);
        }
        toast.success(`总结完成！读取对话: ${dmCount + groupCount}条，已覆写长期记忆: ${memoryCount}条`);
        router.refresh();
      } else {
        toast.error(data.error || '记忆总结失败');
      }
    } catch (err) {
      console.error('Trigger memory summary error:', err);
      toast.error('网络异常，记忆总结失败');
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <VStack gap={6}>
      {/* profile header */}
      <VStack gap={3}>
        <div {...stylex.props(styles.profileHeader)}>
          <UserAvatar
            name={character.name}
            emoji={character.avatarEmoji}
            color={character.avatarColor}
            url={character.avatarUrl}
            size={72}
          />
          <VStack gap={1}>
            <div {...stylex.props(styles.headline)}>
              <h1 {...stylex.props(styles.heading)}>{character.name}</h1>
              <StatusDot variant={active ? 'success' : 'neutral'} label={active ? '活跃' : '已禁用'} />
            </div>
            <Text type="supporting" as="div">
              @{character.username}
              {character.relationshipToUser ? ` · 与你的关系：${character.relationshipToUser}` : ''}
            </Text>
          </VStack>
          <div {...stylex.props(styles.grow)} />
          {actions && <div {...stylex.props(styles.buttonGroup)}>{actions}</div>}
        </div>
        {character.bio && (
          <Text as="p" xstyle={styles.bio}>
            {character.bio}
          </Text>
        )}
      </VStack>

      {/* personality */}
      {(splitTags(character.personality).length > 0 || splitTags(character.interests).length > 0) && (
        <VStack gap={4}>
          {splitTags(character.personality).length > 0 && (
            <VStack gap={1.5}>
              <Text weight="medium" as="div">
                性格
              </Text>
              <div {...stylex.props(styles.tags)}>
                {splitTags(character.personality).map((t) => (
                  <Token key={t} label={t} color="orange" />
                ))}
              </div>
            </VStack>
          )}
          {splitTags(character.interests).length > 0 && (
            <VStack gap={1.5}>
              <Text weight="medium" as="div">
                兴趣
              </Text>
              <div {...stylex.props(styles.tags)}>
                {splitTags(character.interests).map((t) => (
                  <Token key={t} label={t} color="teal" />
                ))}
              </div>
            </VStack>
          )}
        </VStack>
      )}
      {/* memory retention trait */}
      {character.memoryRetention && (
        <VStack gap={1.5}>
          <Text weight="medium" as="div">
            记忆特质
          </Text>
          <div {...stylex.props(styles.tags)}>
            {character.memoryRetention === 'excellent' && <Token label="记忆力 ★★★★★ 过目不忘" color="purple" />}
            {character.memoryRetention === 'normal' && <Token label="记忆力 ★★★☆☆ 普通记忆" color="blue" />}
            {character.memoryRetention === 'slightly_forgetful' && <Token label="记忆力 ★★☆☆☆ 有点健忘" color="orange" />}
            {character.memoryRetention === 'forgetful' && <Token label="记忆力 ★☆☆☆☆ 鱼的记忆" color="red" />}
            {character.grudgeRate && character.grudgeRate >= 0.5 && <Token label="⚡️ 情绪/记仇执念高" color="orange" />}
          </div>
        </VStack>
      )}

      {/* Long-term Memories section */}
      <VStack gap={3}>
        <HStack hAlign="between" vAlign="center" width="100%">
          <HStack gap={2} vAlign="center">
            <Brain size={16} color="var(--color-primary, #6366f1)" />
            <Text weight="medium" as="span">
              长期记忆 ({localMemories.length})
            </Text>
          </HStack>
          {character.id && (
            <Button
              label={summarizing ? '正在总结今日记忆...' : '触发今日记忆总结'}
              variant="secondary"
              size="sm"
              icon={
                summarizing ? (
                  <Loader2 size={13} {...stylex.props(styles.spin)} />
                ) : (
                  <Sparkles size={13} />
                )
              }
              isDisabled={summarizing}
              isLoading={summarizing}
              onClick={handleTriggerSummary}
            />
          )}
        </HStack>

        {localMemories.length === 0 ? (
          <Text type="supporting" size="sm" as="p">
            暂无已沉淀的长期记忆。每天 00:00 会自动总结今日对话，您也可以点击上方按钮手动触发提炼。
          </Text>
        ) : (
          <VStack gap={2}>
            {localMemories.map((mem) => (
              <div key={mem.id} {...stylex.props(styles.memoryCard)}>
                <div {...stylex.props(styles.memoryHeader)}>
                  <HStack gap={1.5} vAlign="center">
                    <Badge
                      label={`${mem.kind} · 重要度: ${Math.round(mem.importance * 100)}%`}
                      variant={mem.kind === 'grudge' ? 'red' : mem.isFuzzy ? 'neutral' : 'blue'}
                    />
                    {mem.strength !== undefined && (
                      <Badge
                        label={`强度: ${Math.round(mem.strength * 100)}%`}
                        variant="neutral"
                      />
                    )}
                    {mem.isFuzzy && (
                      <Badge
                        label="模糊记忆 (低置信度)"
                        variant="neutral"
                      />
                    )}
                    {mem.reinforcementCount && mem.reinforcementCount > 1 ? (
                      <Badge
                        label={`强化×${mem.reinforcementCount}`}
                        variant="green"
                      />
                    ) : null}
                  </HStack>
                  <Text type="supporting" size="sm" as="span" style={{ fontSize: '11px' }}>
                    {new Date(mem.createdAt).toLocaleDateString()}
                  </Text>
                </div>
                <Text as="div" style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--color-text-primary)' }}>
                  {mem.content}
                </Text>
              </div>
            ))}
          </VStack>
        )}
      </VStack>

      <Divider />

      {/* persona & expression */}
      {(character.persona || character.expressionStyle) && (
        <VStack gap={4}>
          {character.persona && (
            <VStack gap={1.5}>
              <Text weight="medium" as="div">
                关于 TA
              </Text>
              <Text as="p" textWrap="wrap" xstyle={styles.prose}>
                {character.persona}
              </Text>
            </VStack>
          )}
          {character.expressionStyle && (
            <VStack gap={1.5}>
              <Text weight="medium" as="div">
                表达方式
              </Text>
              <Text as="p" textWrap="wrap" xstyle={styles.proseSecondary}>
                {character.expressionStyle}
              </Text>
            </VStack>
          )}
        </VStack>
      )}

      {modelText && (
        <>
          <Divider />
          <VStack gap={1.5}>
            <Text type="supporting" size="sm" as="div">
              模型：{modelText}
            </Text>
          </VStack>
        </>
      )}
    </VStack>
  );
}
