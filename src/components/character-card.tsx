'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { MessageCircle, MoreHorizontal, PauseCircle, PlayCircle, Settings2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '@/components/avatar';
import { openConversation } from '@/server/actions/chat';
import { deleteCharacter, setCharacterStatus } from '@/server/actions/characters';
import type { aiCharacters } from '@/db/schema';

export type CharacterListItem = typeof aiCharacters.$inferSelect & {
  modelLabel: string | null;
};

export function CharacterCard({ character }: { character: CharacterListItem }) {
  const router = useRouter();
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

  return (
    <div
      className={`group relative rounded-3xl border border-line surface p-4 shadow-sm transition-all hover:shadow-md ${
        pending ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <Link href={`/characters/${character.id}`} className="shrink-0">
          <Avatar
            name={character.name}
            emoji={character.avatarEmoji}
            color={character.avatarColor}
            url={character.avatarUrl}
            size={52}
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/characters/${character.id}`} className="truncate font-semibold hover:underline">
              {character.name}
            </Link>
            {!active && (
              <span className="shrink-0 rounded-full bg-zinc-500/15 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                已禁用
              </span>
            )}
          </div>
          <div className="truncate text-xs text-muted">@{character.username}</div>
          <p className="mt-1 line-clamp-2 text-[13px] text-secondary">{character.bio}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {character.personality
              .split(/[,，、]/)
              .filter(Boolean)
              .slice(0, 3)
              .map((tag) => (
                <span key={tag} className="rounded-full surface-2 px-2 py-0.5 text-[10px] text-secondary">
                  {tag.trim()}
                </span>
              ))}
          </div>
          {character.modelLabel && (
            <div className="mt-1.5 truncate text-[10px] text-muted">🧠 {character.modelLabel}</div>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 border-t border-line pt-3 text-muted">
        <button onClick={chat} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors hover:surface-2 hover:text-[var(--color-accent-600)]">
          <MessageCircle size={15} />
          私信
        </button>
        <Link href={`/characters/${character.id}`} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors hover:surface-2">
          <Settings2 size={15} />
          编辑
        </Link>
        <div className="flex-1" />
        <button onClick={toggleStatus} className="rounded-full p-2 transition-colors hover:surface-2" aria-label={active ? '禁用' : '启用'}>
          {active ? <PauseCircle size={17} /> : <PlayCircle size={17} />}
        </button>
        <button onClick={remove} className="rounded-full p-2 transition-colors hover:bg-rose-500/10 hover:text-rose-500" aria-label="删除">
          <Trash2 size={17} />
        </button>
      </div>
    </div>
  );
}

export function RelationshipEditor({
  characters,
  relationships,
}: {
  characters: { id: string; name: string; avatarEmoji: string; avatarColor: string; avatarUrl: string | null }[];
  relationships: { id: string; fromCharacterId: string; toCharacterId: string; kind: string; note: string | null }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const nameOf = (id: string) => characters.find((c) => c.id === id)?.name ?? '未知';

  return (
    <div className="rounded-3xl border border-line surface p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-bold">居民之间的关系</h2>
      <p className="mt-0.5 text-xs text-muted">
        关系会影响他们互相回复评论时的语气和意愿
      </p>

      <div className="mt-3 space-y-2">
        {relationships.length === 0 && (
          <p className="py-4 text-center text-sm text-muted">还没有设定任何关系</p>
        )}
        {relationships.map((rel) => (
          <div
            key={rel.id}
            className="flex items-center gap-2 rounded-2xl surface-2 px-3 py-2.5 text-sm"
          >
            <span className="font-medium">{nameOf(rel.fromCharacterId)}</span>
            <span className="rounded-full bg-[var(--color-accent-100)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-accent-700)] dark:bg-[color-mix(in_srgb,var(--color-accent-500)_20%,transparent)] dark:text-[var(--color-accent-300)]">
              {rel.kind}
            </span>
            <span className="font-medium">{nameOf(rel.toCharacterId)}</span>
            {rel.note && <span className="truncate text-xs text-muted">· {rel.note}</span>}
            <div className="flex-1" />
            <button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const { deleteRelationship } = await import('@/server/actions/characters');
                  await deleteRelationship(rel.fromCharacterId, rel.toCharacterId);
                  router.refresh();
                })
              }
              className="rounded-full p-1.5 text-muted transition-colors hover:text-rose-500"
              aria-label="删除关系"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      <AddRelationship characters={characters} existing={relationships} />
    </div>
  );
}

function AddRelationship({
  characters,
  existing,
}: {
  characters: { id: string; name: string }[];
  existing: { fromCharacterId: string; toCharacterId: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [kind, setKind] = useState('');
  const [note, setNote] = useState('');

  if (characters.length < 2) return null;

  const submit = () => {
    if (!from || !to || !kind.trim()) {
      toast.error('请选择双方并填写关系类型');
      return;
    }
    startTransition(async () => {
      const { setRelationship } = await import('@/server/actions/characters');
      const res = await setRelationship({ fromCharacterId: from, toCharacterId: to, kind: kind.trim(), note });
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
    <div className="mt-4 grid grid-cols-1 gap-2 border-t border-line pt-4 sm:grid-cols-[1fr_auto_1fr_100px_1fr_auto] sm:items-center">
      <select value={from} onChange={(e) => setFrom(e.target.value)} className={selectCls}>
        <option value="">选择居民…</option>
        {characters.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <span className="hidden text-center text-xs text-muted sm:block">→</span>
      <select value={to} onChange={(e) => setTo(e.target.value)} className={selectCls}>
        <option value="">选择居民…</option>
        {characters.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input
        value={kind}
        onChange={(e) => setKind(e.target.value)}
        placeholder="关系"
        className={selectCls}
        list="rel-kinds"
      />
      <datalist id="rel-kinds">
        {['好友', '闺蜜', '同事', '室友', '死对头', '欢喜冤家', '师徒', '邻居'].map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="备注（可选）" className={`${selectCls} hidden sm:block`} />
      <button
        onClick={submit}
        disabled={pending}
        className="rounded-xl bg-[var(--color-accent-600)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        添加
      </button>
    </div>
  );
}

const selectCls =
  'w-full rounded-xl border border-line surface-2 px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-accent-400)]';
