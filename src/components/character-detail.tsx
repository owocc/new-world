'use client';

import {useState} from 'react';
import * as stylex from '@stylexjs/stylex';
import {MessageCircle} from 'lucide-react';
import {Button} from '@astryxdesign/core/Button';
import {Dialog} from '@astryxdesign/core/Dialog';
import {Layout} from '@astryxdesign/core/Layout';
import {LayoutHeader} from '@astryxdesign/core/Layout';
import {LayoutContent} from '@astryxdesign/core/Layout';
import {VStack} from '@astryxdesign/core/Stack';
import {useRouter} from 'next/navigation';
import {openConversation} from '@/server/actions/chat';
import {useAppToast} from '@/lib/toast';
import {CharacterProfile} from '@/components/character-profile';
import {
  CharacterEditor,
  type CharacterFormValues,
} from '@/components/character-editor';
import type {CharacterListItem} from '@/components/character-card';

const styles = stylex.create({
  dialogTitle: {fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)'},
  editorContainer: {marginInline: 'auto', width: '100%', maxWidth: '640px', paddingBlock: 'var(--spacing-2)'},
});

/**
 * Profile-first resident detail page: the read-only profile card plus the
 * edit dialog (technical settings live inside the editor).
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
      <CharacterProfile
        character={character}
        modelText={character.modelLabel ?? character.modelId ?? '全局默认'}
        actions={
          <>
            <Button label="发私信" variant="primary" icon={<MessageCircle size={16} />} onClick={chat} />
            <Button label="编辑" variant="secondary" onClick={() => setEditing(true)} />
          </>
        }
      />

      <Dialog isOpen={editing} onOpenChange={setEditing} purpose="form" variant="fullscreen" padding={6}>
        <Layout
          height="fill"
          header={
            <LayoutHeader hasDivider>
              <h2 {...stylex.props(styles.dialogTitle)}>编辑居民</h2>
            </LayoutHeader>
          }
          content={
            <LayoutContent>
              <div {...stylex.props(styles.editorContainer)}>
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
