'use client';

import type {ReactNode} from 'react';
import * as stylex from '@stylexjs/stylex';
import {Divider} from '@astryxdesign/core/Divider';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/Stack';
import {UserAvatar} from '@/components/user-avatar';

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
});

export type CharacterProfileData = {
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
}: {
  character: CharacterProfileData;
  actions?: ReactNode;
  modelText?: string;
}) {
  const active = character.status === 'active';

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
