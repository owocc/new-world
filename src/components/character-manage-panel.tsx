'use client';

import {useState, useTransition} from 'react';
import * as stylex from '@stylexjs/stylex';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {
  ArrowLeft,
  HeartHandshake,
  PauseCircle,
  PlayCircle,
  Plus,
  Settings2,
  Trash2,
  Users,
} from 'lucide-react';
import {Button} from '@astryxdesign/core/Button';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {TabList, Tab} from '@astryxdesign/core/TabList';
import {Table, proportional, pixel} from '@astryxdesign/core/Table';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {UserAvatar} from '@/components/user-avatar';
import {CharacterEditor, emptyCharacter, type CharacterFormValues} from '@/components/character-editor';
import type {CharacterListItem} from '@/components/character-card';
import {deleteCharacter, setCharacterStatus} from '@/server/actions/characters';
import {useAppToast} from '@/lib/toast';

const styles = stylex.create({
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--spacing-4)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-2)',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    color: 'var(--color-text-secondary)',
    transitionProperty: 'color',
    transitionDuration: '175ms',
    ':hover': {'@media (hover: hover)': {color: 'var(--color-text-primary)'}},
    '@media (min-width: 640px)': {display: 'none'},
  },
  heading: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-semibold)',
    letterSpacing: '-0.025em',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-2)',
    flexShrink: 0,
    flexWrap: 'nowrap',
  },
  searchWrap: {
    width: '220px',
    flexShrink: 0,
  },
  buttonLink: {
    textDecoration: 'none',
    display: 'inline-flex',
    flexShrink: 0,
  },
  buttonWrap: {
    flexShrink: 0,
  },
  characterCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-3)',
    minWidth: 0,
    paddingBlock: '4px',
  },
  nameWrap: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'hidden',
  },
  name: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  username: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  textCell: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  tagsCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  statusCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusText: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-secondary)',
  },
  actionButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: 'var(--radius-element)',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    ':hover': {
      backgroundColor: 'var(--color-background-muted)',
      color: 'var(--color-text-primary)',
    },
  },
  actionButtonDanger: {
    ':hover': {
      backgroundColor: 'var(--color-background-muted)',
      color: 'var(--color-error)',
    },
  },
  editorHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 'var(--spacing-4)',
    borderBottom: '1px solid var(--color-border)',
  },
  editorTitle: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-semibold)',
    letterSpacing: '-0.025em',
  },
  editorWrap: {
    width: '100%',
  },
  closeBtn: {
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
    transition: 'all 150ms ease',
    ':hover': {
      backgroundColor: 'var(--color-background-muted)',
      color: 'var(--color-text-primary)',
    },
  },
});

type EditorState = {mode: 'new'} | {mode: 'edit'; character: CharacterListItem} | null;
type FilterTab = 'all' | 'active' | 'paused';
type CharacterTableRow = CharacterListItem & Record<string, unknown>;

export function CharacterManagePanel({
  characters,
  providers,
}: {
  characters: CharacterListItem[];
  providers: {id: string; name: string; providerType: string}[];
  relationships?: {id: string; fromCharacterId: string; toCharacterId: string; kind: string; note: string | null}[];
}) {
  const router = useRouter();
  const toast = useAppToast();
  const [editor, setEditor] = useState<EditorState>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pending, startTransition] = useTransition();

  const initialFor = (c: CharacterListItem): CharacterFormValues => ({
    name: c.name,
    username: c.username,
    bio: c.bio,
    avatarUrl: c.avatarUrl ?? '',
    avatarEmoji: c.avatarEmoji,
    avatarColor: c.avatarColor,
    persona: c.persona,
    personality: c.personality,
    interests: c.interests,
    expressionStyle: c.expressionStyle,
    relationshipToUser: c.relationshipToUser,
    systemPrompt: c.systemPrompt ?? '',
    status: c.status as 'active' | 'paused',
    chattiness: c.chattiness,
    likeRate: c.likeRate,
    commentRate: c.commentRate,
    postRate: c.postRate,
    dmRate: c.dmRate,
    memoryRetention: (c.memoryRetention as any) || 'normal',
    grudgeRate: c.grudgeRate ?? 0.3,
    providerId: c.providerId ?? '',
    modelId: c.modelId ?? '',
    temperature: c.temperature != null ? String(c.temperature) : '',
    topP: c.topP != null ? String(c.topP) : '',
    maxTokens: c.maxTokens != null ? String(c.maxTokens) : '',
  });

  const filteredCharacters = characters
    .filter((c) => {
      if (activeTab === 'active') return c.status === 'active';
      if (activeTab === 'paused') return c.status === 'paused';
      return true;
    })
    .filter((c) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q) ||
        (c.relationshipToUser ?? '').toLowerCase().includes(q) ||
        (c.interests ?? '').toLowerCase().includes(q)
      );
    });

  const handleToggleStatus = (c: CharacterListItem) => {
    startTransition(async () => {
      const nextStatus = c.status === 'active' ? 'paused' : 'active';
      await setCharacterStatus(c.id, nextStatus);
      toast.success(nextStatus === 'active' ? `已启用 ${c.name}` : `已停用 ${c.name}`);
      router.refresh();
    });
  };

  const handleDelete = (c: CharacterListItem) => {
    if (!window.confirm(`确定删除居民「${c.name}」？此操作不可撤销。`)) return;
    startTransition(async () => {
      await deleteCharacter(c.id);
      toast.success(`已删除 ${c.name}`);
      router.refresh();
    });
  };

  const rows: CharacterTableRow[] = filteredCharacters;

  if (editor !== null) {
    return (
      <VStack gap={5} xstyle={styles.editorWrap}>
        <div {...stylex.props(styles.editorHeader)}>
          <div {...stylex.props(styles.headerLeft)}>
            <button
              type="button"
              onClick={() => setEditor(null)}
              {...stylex.props(styles.closeBtn)}
              aria-label="返回联系人列表"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 {...stylex.props(styles.editorTitle)}>
              {editor.mode === 'edit' ? `编辑居民 · ${editor.character.name}` : '新增居民'}
            </h1>
          </div>
        </div>

        <CharacterEditor
          characterId={editor.mode === 'edit' ? editor.character.id : undefined}
          initial={editor.mode === 'edit' ? initialFor(editor.character) : emptyCharacter}
          providers={providers}
          onDone={() => {
            setEditor(null);
            router.refresh();
          }}
        />
      </VStack>
    );
  }

  return (
    <VStack gap={5}>
      {/* Top Header */}
      <div {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.headerLeft)}>
          <Link href="/characters" {...stylex.props(styles.backLink)} aria-label="返回联系人">
            <ArrowLeft size={16} />
          </Link>
          <h1 {...stylex.props(styles.heading)}>管理联系人</h1>
        </div>

        <div {...stylex.props(styles.headerActions)}>
          <div {...stylex.props(styles.searchWrap)}>
            <TextInput
              label="搜索联系人"
              isLabelHidden
              placeholder="搜索居民/备注/标签…"
              value={searchQuery}
              onChange={setSearchQuery}
              htmlName="manage-search"
            />
          </div>
          <div {...stylex.props(styles.buttonWrap)}>
            <Button
              label="新增居民"
              variant="primary"
              size="sm"
              icon={<Plus size={15} />}
              onClick={() => setEditor({mode: 'new'})}
            />
          </div>
          <Link href="/characters/relationships" {...stylex.props(styles.buttonLink)}>
            <Button
              label="关系管理"
              variant="secondary"
              size="sm"
              icon={<HeartHandshake size={15} />}
            />
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <TabList value={activeTab} onChange={(v) => setActiveTab(v as FilterTab)} size="sm" hasDivider>
        <Tab value="all" label={`全部 (${characters.length})`} />
        <Tab value="active" label={`活跃中 (${characters.filter((c) => c.status === 'active').length})`} />
        <Tab value="paused" label={`已停用 (${characters.filter((c) => c.status === 'paused').length})`} />
      </TabList>

      {/* Table / Empty State */}
      {rows.length === 0 ? (
        <EmptyState
          icon={<Users size={36} strokeWidth={1.5} />}
          title="没有找到居民"
          description={characters.length === 0 ? '点击右上角「新增居民」添加第一个 AI 居民' : '尝试更换筛选标签或搜索关键词'}
        />
      ) : (
        <Table
          data={rows}
          idKey="id"
          hasHover
          columns={[
            {
              key: 'name',
              header: '居民 / 别名',
              width: proportional(2),
              renderCell: (row) => (
                <div {...stylex.props(styles.characterCell)}>
                  <UserAvatar
                    name={row.name}
                    emoji={row.avatarEmoji}
                    color={row.avatarColor}
                    url={row.avatarUrl}
                    size={32}
                    tooltip={false}
                  />
                  <div {...stylex.props(styles.nameWrap)}>
                    <span {...stylex.props(styles.name)}>{row.name}</span>
                    <span {...stylex.props(styles.username)}>@{row.username}</span>
                  </div>
                </div>
              ),
            },
            {
              key: 'relationshipToUser',
              header: '人设身份 / 备注',
              width: proportional(1.5),
              renderCell: (row) => (
                <span {...stylex.props(styles.textCell)}>
                  {row.relationshipToUser || <span style={{color: 'var(--color-text-secondary)'}}>-</span>}
                </span>
              ),
            },
            {
              key: 'interests',
              header: '标签 / 兴趣',
              width: proportional(1.5),
              renderCell: (row) => (
                <div {...stylex.props(styles.tagsCell)}>
                  {row.interests ? (
                    row.interests.split(/[,，、]/).slice(0, 2).map((t: string, idx: number) => (
                      <Token key={idx} label={t.trim()} size="sm" />
                    ))
                  ) : (
                    <span style={{color: 'var(--color-text-secondary)', fontSize: '11px'}}>-</span>
                  )}
                </div>
              ),
            },
            {
              key: 'status',
              header: '状态',
              width: pixel(100),
              renderCell: (row) => {
                const isActive = row.status === 'active';
                return (
                  <div {...stylex.props(styles.statusCell)}>
                    <StatusDot
                      variant={isActive ? 'success' : 'neutral'}
                      label={isActive ? '活跃' : '已停用'}
                    />
                    <span {...stylex.props(styles.statusText)}>{isActive ? '活跃中' : '已停用'}</span>
                  </div>
                );
              },
            },
            {
              key: 'actions',
              header: '',
              align: 'end',
              width: pixel(110),
              renderCell: (row) => {
                const isActive = row.status === 'active';
                return (
                  <HStack gap={1} vAlign="center" hAlign="end">
                    <button
                      type="button"
                      disabled={pending}
                      aria-label={isActive ? '停用' : '启用'}
                      onClick={() => handleToggleStatus(row)}
                      {...stylex.props(styles.actionButton)}
                    >
                      {isActive ? <PauseCircle size={15} /> : <PlayCircle size={15} />}
                    </button>
                    <button
                      type="button"
                      aria-label="编辑"
                      onClick={() => setEditor({mode: 'edit', character: row})}
                      {...stylex.props(styles.actionButton)}
                    >
                      <Settings2 size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      aria-label="删除"
                      onClick={() => handleDelete(row)}
                      {...stylex.props(styles.actionButton, styles.actionButtonDanger)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </HStack>
                );
              },
            },
          ]}
        />
      )}

    </VStack>
  );
}
