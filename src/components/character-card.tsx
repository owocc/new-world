'use client';

import {useRouter} from 'next/navigation';
import {useState, useTransition} from 'react';
import {MessageCircle, PauseCircle, PlayCircle, Settings2, Trash2} from 'lucide-react';
import {Card} from '@astryxdesign/core/Card';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Button} from '@astryxdesign/core/Button';
import {MoreMenu} from '@astryxdesign/core/MoreMenu';
import {Selector} from '@astryxdesign/core/Selector';
import {TextInput} from '@astryxdesign/core/TextInput';
import {HStack} from '@astryxdesign/core/Stack';
import {useAppToast} from '@/lib/toast';
import {UserAvatar} from '@/components/user-avatar';
import {openConversation} from '@/server/actions/chat';
import {deleteCharacter, setCharacterStatus} from '@/server/actions/characters';
import type {aiCharacters} from '@/db/schema';

export type CharacterListItem = typeof aiCharacters.$inferSelect & {
  modelLabel: string | null;
};

export function CharacterCard({
  character,
  onEdit,
}: {
  character: CharacterListItem;
  onEdit?: (character: CharacterListItem) => void;
}) {
  const router = useRouter();
  const toast = useAppToast();
  const [pending, startTransition] = useTransition();
  const active = character.status === 'active';

  const chat = async () => {
    const res = await openConversation(character.id);
    if (res.id) router.push(`/messages/${res.id}`);
    else toast.error(res.error ?? '打开会话失败');
  };

  const toggleStatus = () =>
    startTransition(async () => {
      await setCharacterStatus(character.id, active ? 'paused' : 'active');
      toast.success(active ? `${character.name} 已禁用` : `${character.name} 已启用`);
      router.refresh();
    });

  const remove = () => {
    if (!confirm(`确定删除「${character.name}」吗？TA 的聊天记录和动态也会一并删除。`)) return;
    startTransition(async () => {
      await deleteCharacter(character.id);
      toast.success('已删除');
      router.refresh();
    });
  };

  const personalityTags = character.personality
    .split(/[,，、]/)
    .filter(Boolean)
    .slice(0, 3)
    .map((tag) => tag.trim());

  return (
    <Card padding={4} className={pending ? 'opacity-60' : undefined}>
      <div className="flex items-start gap-3">
        <UserAvatar
          name={character.name}
          emoji={character.avatarEmoji}
          color={character.avatarColor}
          url={character.avatarUrl}
          size={52}
          href={`/characters/${character.id}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <a href={`/characters/${character.id}`} className="truncate font-semibold hover:underline">
              {character.name}
            </a>
            <StatusDot
              variant={active ? 'success' : 'neutral'}
              label={active ? '活跃' : '已禁用'}
            />
          </div>
          <Text type="supporting" size="sm" as="div">
            @{character.username}
            {character.relationshipToUser ? ` · ${character.relationshipToUser}` : ''}
          </Text>
        </div>
        <MoreMenu
          label={`${character.name} 的操作`}
          items={[
            {
              label: '编辑资料',
              icon: <Settings2 size={15} />,
              onClick: () => (onEdit ? onEdit(character) : router.push(`/characters/${character.id}`)),
            },
            {
              label: active ? '禁用' : '启用',
              icon: active ? <PauseCircle size={15} /> : <PlayCircle size={15} />,
              onClick: toggleStatus,
            },
            {type: 'divider'},
            {label: '删除居民', icon: <Trash2 size={15} />, variant: 'destructive', onClick: remove},
          ]}
        />
      </div>

      {character.bio && (
        <Text as="p" size="sm" textWrap="wrap" className="mt-2 line-clamp-2 text-secondary">
          {character.bio}
        </Text>
      )}

      {personalityTags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {personalityTags.map((tag) => (
            <Token key={tag} label={tag} size="sm" />
          ))}
        </div>
      )}

      <HStack gap={1} className="mt-3 border-t border-border pt-3">
        <Button label="私信" variant="ghost" size="sm" icon={<MessageCircle size={15} />} onClick={chat} />
        <div className="flex-1" />
        <Button
          label={active ? '暂停' : '启用'}
          variant="ghost"
          size="sm"
          icon={active ? <PauseCircle size={15} /> : <PlayCircle size={15} />}
          onClick={toggleStatus}
        />
      </HStack>
    </Card>
  );
}

export function RelationshipEditor({
  characters,
  relationships,
}: {
  characters: {id: string; name: string; avatarEmoji: string; avatarColor: string; avatarUrl: string | null}[];
  relationships: {id: string; fromCharacterId: string; toCharacterId: string; kind: string; note: string | null}[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const nameOf = (id: string) => characters.find((c) => c.id === id)?.name ?? '未知';

  return (
    <section className="rounded-container border border-border p-4 sm:p-5">
      <h2 className="text-base font-semibold">居民之间的关系</h2>
      <Text type="supporting" size="sm" as="p" className="mt-0.5">
        关系会影响他们互相回复评论时的语气和意愿
      </Text>

      <div className="mt-3 space-y-2">
        {relationships.length === 0 && (
          <Text type="supporting" as="p" className="py-4 text-center">
            还没有设定任何关系
          </Text>
        )}
        {relationships.map((rel) => (
          <div key={rel.id} className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm">
            <span className="font-medium">{nameOf(rel.fromCharacterId)}</span>
            <Token label={rel.kind} size="sm" color="orange" />
            <span className="font-medium">{nameOf(rel.toCharacterId)}</span>
            {rel.note && <Text type="supporting" size="sm" as="span" className="truncate">· {rel.note}</Text>}
            <div className="flex-1" />
            <button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const {deleteRelationship} = await import('@/server/actions/characters');
                  await deleteRelationship(rel.fromCharacterId, rel.toCharacterId);
                  router.refresh();
                })
              }
              className="rounded-full p-1.5 text-secondary transition-colors hover:text-error"
              aria-label="删除关系"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      <AddRelationship characters={characters} existing={relationships} />
    </section>
  );
}

function AddRelationship({
  characters,
  existing,
}: {
  characters: {id: string; name: string}[];
  existing: {fromCharacterId: string; toCharacterId: string}[];
}) {
  const router = useRouter();
  const toast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [kind, setKind] = useState('');
  const [note, setNote] = useState('');

  if (characters.length < 2) return null;

  const options = characters.map((c) => ({value: c.id, label: c.name}));

  const submit = () => {
    if (!from || !to || !kind.trim()) {
      toast.error('请选择双方并填写关系类型');
      return;
    }
    startTransition(async () => {
      const {setRelationship} = await import('@/server/actions/characters');
      const res = await setRelationship({fromCharacterId: from, toCharacterId: to, kind: kind.trim(), note});
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success('关系已保存');
      setKind('');
      setNote('');
      router.refresh();
    });
  };

  return (
    <div className="mt-4 grid grid-cols-1 gap-2 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_140px_1fr_auto] lg:items-start">
      <Selector
        label="发起方"
        isLabelHidden
        placeholder="选择居民…"
        options={options}
        value={from}
        onChange={setFrom}
      />
      <Selector
        label="接收方"
        isLabelHidden
        placeholder="选择居民…"
        options={options}
        value={to}
        onChange={setTo}
      />
      <TextInput
        label="关系"
        isLabelHidden
        value={kind}
        onChange={setKind}
        placeholder="好友 / 室友 / 死对头…"
        htmlName="rel-kind"
      />
      <TextInput
        label="备注"
        isLabelHidden
        value={note}
        onChange={setNote}
        placeholder="备注（可选）"
      />
      <Button label="添加" variant="primary" onClick={submit} isDisabled={pending} isLoading={pending} />
    </div>
  );
}
