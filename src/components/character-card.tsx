'use client';

import {useRouter} from 'next/navigation';
import {useState, useTransition} from 'react';
import * as stylex from '@stylexjs/stylex';
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

const styles = stylex.create({
  cardPending: {opacity: 0.6},
  row: {display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-3)'},
  minWidth: {minWidth: 0},
  grow: {flex: 1},
  rowCenter: {display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)'},
  title: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontWeight: 'var(--font-weight-semibold)',
    ':hover': {'@media (hover: hover)': {textDecoration: 'underline'}},
  },
  bio: {
    marginTop: 'var(--spacing-2)',
    color: 'var(--color-text-secondary)',
    display: '-webkit-box',
    overflow: 'hidden',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
  },
  tags: {
    marginTop: '10px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--spacing-1-5)',
  },
  actions: {
    marginTop: 'var(--spacing-3)',
    borderTop: 'var(--border-width) solid var(--color-border)',
    paddingTop: 'var(--spacing-3)',
  },
  section: {
    borderRadius: 'var(--radius-container)',
    border: 'var(--border-width) solid var(--color-border)',
    padding: 'var(--spacing-4)',
    '@media (min-width: 640px)': {padding: 'var(--spacing-5)'},
  },
  sectionTitle: {fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)'},
  sectionDescription: {marginTop: '2px'},
  relationshipList: {marginTop: 'var(--spacing-3)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)'},
  relationshipEmpty: {paddingBlock: 'var(--spacing-4)', textAlign: 'center'},
  relationshipRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-2)',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--color-background-muted)',
    padding: '10px var(--spacing-3)',
    fontSize: 'var(--font-size-sm)',
  },
  medium: {fontWeight: 'var(--font-weight-medium)'},
  relationshipNote: {overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'},
  relationshipDelete: {
    border: 0,
    borderRadius: 'var(--radius-full)',
    padding: 'var(--spacing-1-5)',
    color: 'var(--color-text-secondary)',
    backgroundColor: 'transparent',
    transition: 'color 175ms ease',
    ':hover': {'@media (hover: hover)': {color: 'var(--color-error)'}},
  },
  form: {
    marginTop: 'var(--spacing-4)',
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 'var(--spacing-2)',
    borderTop: 'var(--border-width) solid var(--color-border)',
    paddingTop: 'var(--spacing-4)',
    '@media (min-width: 640px)': {gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'},
    '@media (min-width: 1024px)': {gridTemplateColumns: '1fr 1fr 140px 1fr auto', alignItems: 'start'},
  },
});

export type CharacterListItem = typeof aiCharacters.$inferSelect & {
  modelLabel: string | null;
};

export function CharacterCard({
  character,
  onEdit,
  hideChat,
}: {
  character: CharacterListItem;
  onEdit?: (character: CharacterListItem) => void;
  hideChat?: boolean;
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
    <Card padding={4} xstyle={pending ? styles.cardPending : undefined}>
      <div {...stylex.props(styles.row)}>
        <UserAvatar
          name={character.name}
          emoji={character.avatarEmoji}
          color={character.avatarColor}
          url={character.avatarUrl}
          size={52}
          href={`/characters/${character.id}`}
        />
        <div {...stylex.props(styles.minWidth, styles.grow)}>
          <div {...stylex.props(styles.rowCenter)}>
            <a href={`/characters/${character.id}`} {...stylex.props(styles.title)}>
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
        <Text as="p" size="sm" textWrap="wrap" xstyle={styles.bio}>
          {character.bio}
        </Text>
      )}

      {personalityTags.length > 0 && (
        <div {...stylex.props(styles.tags)}>
          {personalityTags.map((tag) => (
            <Token key={tag} label={tag} size="sm" />
          ))}
        </div>
      )}

      <HStack gap={1} xstyle={styles.actions}>
        {!hideChat && (
          <Button label="私信" variant="ghost" size="sm" icon={<MessageCircle size={15} />} onClick={chat} />
        )}
        <div {...stylex.props(styles.grow)} />
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
    <section {...stylex.props(styles.section)}>
      <h2 {...stylex.props(styles.sectionTitle)}>居民之间的关系</h2>
      <Text type="supporting" size="sm" as="p" xstyle={styles.sectionDescription}>
        关系会影响他们互相回复评论时的语气和意愿
      </Text>

      <div {...stylex.props(styles.relationshipList)}>
        {relationships.length === 0 && (
          <Text type="supporting" as="p" xstyle={styles.relationshipEmpty}>
            还没有设定任何关系
          </Text>
        )}
        {relationships.map((rel) => (
          <div key={rel.id} {...stylex.props(styles.relationshipRow)}>
            <span {...stylex.props(styles.medium)}>{nameOf(rel.fromCharacterId)}</span>
            <Token label={rel.kind} size="sm" color="orange" />
            <span {...stylex.props(styles.medium)}>{nameOf(rel.toCharacterId)}</span>
            {rel.note && <Text type="supporting" size="sm" as="span" xstyle={styles.relationshipNote}>· {rel.note}</Text>}
            <div {...stylex.props(styles.grow)} />
            <button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const {deleteRelationship} = await import('@/server/actions/characters');
                  await deleteRelationship(rel.fromCharacterId, rel.toCharacterId);
                  router.refresh();
                })
              }
              {...stylex.props(styles.relationshipDelete)}
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
    <div {...stylex.props(styles.form)}>
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
