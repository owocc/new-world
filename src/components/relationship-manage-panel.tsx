'use client';

import {useState, useTransition} from 'react';
import * as stylex from '@stylexjs/stylex';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowLeft, ArrowRight, HeartHandshake, Plus, Trash2, Users} from 'lucide-react';
import {Button} from '@astryxdesign/core/Button';
import {Dialog} from '@astryxdesign/core/Dialog';
import {Layout, LayoutHeader, LayoutContent, LayoutFooter} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Selector} from '@astryxdesign/core/Selector';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {VStack} from '@astryxdesign/core/Stack';
import {UserAvatar} from '@/components/user-avatar';
import {useAppToast} from '@/lib/toast';
import {setRelationship, deleteRelationship} from '@/server/actions/characters';

const styles = stylex.create({
  root: {display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)'},
  header: {display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-3)'},
  headerLeft: {display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)'},
  heading: {fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', letterSpacing: '-0.025em'},
  subheading: {color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: '2px'},
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    color: 'var(--color-text-secondary)',
    transitionProperty: 'color',
    transitionDuration: '175ms',
    ':hover': {'@media (hover: hover)': {color: 'var(--color-text-primary)'}},
  },
  headerActions: {display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)'},
  list: {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 'var(--radius-container)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-background-surface)',
    overflow: 'hidden',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-3)',
    padding: 'var(--spacing-4)',
    borderBottom: '1px solid var(--color-border)',
    transition: 'background-color 150ms ease',
    ':last-child': {borderBottom: 'none'},
    ':hover': {'@media (hover: hover)': {backgroundColor: 'var(--color-overlay-hover)'}},
  },
  person: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-2)',
    minWidth: 0,
  },
  personName: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  arrowWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-text-secondary)',
    flexShrink: 0,
  },
  relDetails: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-2)',
    flex: 1,
    minWidth: 0,
    paddingInline: 'var(--spacing-2)',
  },
  note: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  deleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-element)',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 150ms ease',
    ':hover': {
      backgroundColor: 'var(--color-background-muted)',
      color: 'var(--color-error)',
    },
  },
  dialogTitle: {fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)'},
  form: {display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', padding: 'var(--spacing-4)'},
  formRow: {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)'},
});

type CharacterItem = {
  id: string;
  name: string;
  username: string;
  avatarEmoji: string;
  avatarColor: string;
  avatarUrl: string | null;
};

type RelationshipItem = {
  id: string;
  fromCharacterId: string;
  toCharacterId: string;
  kind: string;
  note: string | null;
};

export function RelationshipManagePanel({
  characters,
  relationships,
}: {
  characters: CharacterItem[];
  relationships: RelationshipItem[];
}) {
  const router = useRouter();
  const toast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [kind, setKind] = useState('');
  const [note, setNote] = useState('');

  const characterMap = new Map(characters.map((c) => [c.id, c]));
  const characterOptions = characters.map((c) => ({value: c.id, label: c.name}));

  const handleAdd = () => {
    if (!fromId || !toId || !kind.trim()) {
      toast.error('请选择双方并填写关系类型');
      return;
    }
    if (fromId === toId) {
      toast.error('发起方和接收方不能为同一人');
      return;
    }
    startTransition(async () => {
      const {setRelationship} = await import('@/server/actions/characters');
      const res = await setRelationship({
        fromCharacterId: fromId,
        toCharacterId: toId,
        kind: kind.trim(),
        note: note.trim() || undefined,
      });
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success('关系已保存');
      setIsAddOpen(false);
      setFromId('');
      setToId('');
      setKind('');
      setNote('');
      router.refresh();
    });
  };

  const handleDelete = (fromCharacterId: string, toCharacterId: string) => {
    startTransition(async () => {
      await deleteRelationship(fromCharacterId, toCharacterId);
      toast.success('关系已删除');
      router.refresh();
    });
  };

  return (
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.headerLeft)}>
          <Link href="/characters/manage" {...stylex.props(styles.backLink)} aria-label="返回联系人管理">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 {...stylex.props(styles.heading)}>关系管理</h1>
            <p {...stylex.props(styles.subheading)}>设定居民之间的关系，影响互相互动时的语气与动态</p>
          </div>
        </div>
        <div {...stylex.props(styles.headerActions)}>
          <Button
            label="新增关系"
            variant="primary"
            size="sm"
            icon={<Plus size={15} />}
            isDisabled={characters.length < 2}
            onClick={() => setIsAddOpen(true)}
          />
        </div>
      </div>

      {relationships.length === 0 ? (
        <EmptyState
          icon={<HeartHandshake size={40} strokeWidth={1.5} />}
          title="暂无居民关系"
          description={characters.length < 2 ? '至少需要 2 位居民才能建立关系' : '点击右上角「新增关系」为居民之间设定羁绊'}
        />
      ) : (
        <div {...stylex.props(styles.list)}>
          {relationships.map((rel) => {
            const fromChar = characterMap.get(rel.fromCharacterId);
            const toChar = characterMap.get(rel.toCharacterId);
            if (!fromChar || !toChar) return null;
            return (
              <div key={rel.id} {...stylex.props(styles.card)}>
                <div {...stylex.props(styles.person)}>
                  <UserAvatar
                    name={fromChar.name}
                    emoji={fromChar.avatarEmoji}
                    color={fromChar.avatarColor}
                    url={fromChar.avatarUrl}
                    size={32}
                    tooltip={false}
                  />
                  <span {...stylex.props(styles.personName)}>{fromChar.name}</span>
                </div>

                <div {...stylex.props(styles.arrowWrap)}>
                  <ArrowRight size={14} />
                </div>

                <div {...stylex.props(styles.person)}>
                  <UserAvatar
                    name={toChar.name}
                    emoji={toChar.avatarEmoji}
                    color={toChar.avatarColor}
                    url={toChar.avatarUrl}
                    size={32}
                    tooltip={false}
                  />
                  <span {...stylex.props(styles.personName)}>{toChar.name}</span>
                </div>

                <div {...stylex.props(styles.relDetails)}>
                  <Token label={rel.kind} size="sm" color="orange" />
                  {rel.note && <span {...stylex.props(styles.note)}>· {rel.note}</span>}
                </div>

                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleDelete(rel.fromCharacterId, rel.toCharacterId)}
                  {...stylex.props(styles.deleteBtn)}
                  aria-label="删除关系"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <Dialog
        isOpen={isAddOpen}
        onOpenChange={setIsAddOpen}
        purpose="form"
        width={500}
        padding={4}
      >
        <Layout
          height="fill"
          header={
            <LayoutHeader hasDivider>
              <h2 {...stylex.props(styles.dialogTitle)}>新增居民关系</h2>
            </LayoutHeader>
          }
          content={
            <LayoutContent>
              <div {...stylex.props(styles.form)}>
                <div {...stylex.props(styles.formRow)}>
                  <Selector
                    label="发起方"
                    placeholder="选择居民"
                    options={characterOptions}
                    value={fromId}
                    onChange={setFromId}
                  />
                  <Selector
                    label="接收方"
                    placeholder="选择居民"
                    options={characterOptions.filter((o) => o.value !== fromId)}
                    value={toId}
                    onChange={setToId}
                  />
                </div>
                <TextInput
                  label="关系称谓/类型"
                  placeholder="例如：好友 / 闺蜜 / 死党 / 同事 / 前辈"
                  value={kind}
                  onChange={setKind}
                  htmlName="rel-kind-modal"
                />
                <TextInput
                  label="关系备注（可选）"
                  placeholder="例如：从小一起长大 / 工作搭档"
                  value={note}
                  onChange={setNote}
                  htmlName="rel-note-modal"
                />
              </div>
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%'}}>
                <Button label="取消" variant="secondary" onClick={() => setIsAddOpen(false)} />
                <Button
                  label="保存"
                  variant="primary"
                  onClick={handleAdd}
                  isDisabled={pending || !fromId || !toId || !kind.trim()}
                  isLoading={pending}
                />
              </div>
            </LayoutFooter>
          }
        />
      </Dialog>
    </div>
  );
}
