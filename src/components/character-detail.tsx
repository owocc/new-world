'use client';

import {useState} from 'react';
import {MessageCircle} from 'lucide-react';
import {Button} from '@astryxdesign/core/Button';
import {Dialog} from '@astryxdesign/core/Dialog';
import {Divider} from '@astryxdesign/core/Divider';
import {Layout} from '@astryxdesign/core/Layout';
import {LayoutHeader} from '@astryxdesign/core/Layout';
import {LayoutContent} from '@astryxdesign/core/Layout';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {VStack} from '@astryxdesign/core/Stack';
import {useRouter} from 'next/navigation';
import {openConversation} from '@/server/actions/chat';
import {useAppToast} from '@/lib/toast';
import {UserAvatar} from '@/components/user-avatar';
import {
  CharacterEditor,
  type CharacterFormValues,
} from '@/components/character-editor';
import type {CharacterListItem} from '@/components/character-card';

function splitTags(value: string): string[] {
  return value
    .split(/[,，、]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Profile-first resident detail: shows the person first. Technical settings
 * (model, rates, prompt) live inside the editor dialog.
 */
export function CharacterDetail({
  character,
  providers,
}: {
  character: CharacterListItem;
  providers: {id: string; name: string; providerType: string}[];
}) {
  const router = useRouter();
  const toast = useAppToast();
  const [editing, setEditing] = useState(false);
  const active = character.status === 'active';

  const chat = async () => {
    const res = await openConversation(character.id);
    if (res.id) router.push(`/messages/${res.id}`);
    else toast.error(res.error ?? '打开会话失败');
  };

  const initial: CharacterFormValues = {
    name: character.name,
    username: character.username,
    bio: character.bio,
    avatarUrl: character.avatarUrl ?? '',
    avatarEmoji: character.avatarEmoji,
    avatarColor: character.avatarColor,
    persona: character.persona,
    personality: character.personality,
    interests: character.interests,
    expressionStyle: character.expressionStyle,
    relationshipToUser: character.relationshipToUser,
    systemPrompt: character.systemPrompt ?? '',
    status: character.status as 'active' | 'paused',
    chattiness: character.chattiness,
    likeRate: character.likeRate,
    commentRate: character.commentRate,
    postRate: character.postRate,
    dmRate: character.dmRate,
    providerId: character.providerId ?? '',
    modelId: character.modelId ?? '',
    temperature: character.temperature?.toString() ?? '',
    topP: character.topP?.toString() ?? '',
    maxTokens: character.maxTokens?.toString() ?? '',
  };

  return (
    <VStack gap={6}>
      {/* profile header */}
      <VStack gap={3}>
        <div className="flex flex-wrap items-center gap-4">
          <UserAvatar
            name={character.name}
            emoji={character.avatarEmoji}
            color={character.avatarColor}
            url={character.avatarUrl}
            size={72}
          />
          <VStack gap={1}>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight">{character.name}</h1>
              <StatusDot variant={active ? 'success' : 'neutral'} label={active ? '活跃' : '已禁用'} />
            </div>
            <Text type="supporting" as="div">
              @{character.username}
              {character.relationshipToUser ? ` · 与你的关系：${character.relationshipToUser}` : ''}
            </Text>
          </VStack>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Button label="发私信" variant="primary" icon={<MessageCircle size={16} />} onClick={chat} />
            <Button label="编辑" variant="secondary" onClick={() => setEditing(true)} />
          </div>
        </div>
        {character.bio && (
          <Text as="p" className="max-w-xl leading-relaxed text-secondary">
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
              <div className="flex flex-wrap gap-1.5">
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
              <div className="flex flex-wrap gap-1.5">
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
              <Text as="p" textWrap="wrap" className="whitespace-pre-wrap leading-relaxed">
                {character.persona}
              </Text>
            </VStack>
          )}
          {character.expressionStyle && (
            <VStack gap={1.5}>
              <Text weight="medium" as="div">
                表达方式
              </Text>
              <Text as="p" textWrap="wrap" className="whitespace-pre-wrap leading-relaxed text-secondary">
                {character.expressionStyle}
              </Text>
            </VStack>
          )}
        </VStack>
      )}

      <Divider />

      {/* quiet technical facts */}
      <VStack gap={1.5}>
        <Text type="supporting" size="sm" as="div">
          模型：{character.modelLabel ?? character.modelId ?? '全局默认'}
        </Text>
      </VStack>

      <Dialog isOpen={editing} onOpenChange={setEditing} purpose="form" variant="fullscreen" padding={6}>
        <Layout
          height="fill"
          header={
            <LayoutHeader hasDivider>
              <h2 className="text-lg font-semibold">编辑居民</h2>
            </LayoutHeader>
          }
          content={
            <LayoutContent>
              <div className="mx-auto w-full max-w-[640px] py-2">
                <CharacterEditor
                  characterId={character.id}
                  initial={initial}
                  providers={providers}
                  onDone={() => setEditing(false)}
                />
              </div>
            </LayoutContent>
          }
        />
      </Dialog>
    </VStack>
  );
}
