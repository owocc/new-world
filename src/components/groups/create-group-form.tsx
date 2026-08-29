'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Text } from '@astryxdesign/core/Text';
import { UserAvatar, AVATAR_COLORS } from '@/components/user-avatar';
import { createGroup } from '@/server/actions/groups';
import type { aiCharacters } from '@/db/schema';
import { ArrowLeft, Check, Users, Sparkles } from 'lucide-react';
import Link from 'next/link';

type CharacterRow = typeof aiCharacters.$inferSelect;

const EMOJI_OPTIONS = ['💬', '☕️', '🌙', '🍜', '🎮', '📚', '💪', '🔥', '🎉', '🐱', '🤖', '🚀'];

export function CreateGroupForm({ characters }: { characters: CharacterRow[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('💬');
  const [avatarColor, setAvatarColor] = useState('indigo');
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>(
    characters.slice(0, 3).map((c) => c.id),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleChar = (id: string) => {
    setSelectedCharIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const selectAll = () => {
    if (selectedCharIds.length === characters.length) {
      setSelectedCharIds([]);
    } else {
      setSelectedCharIds(characters.map((c) => c.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('请输入群聊名称');
      return;
    }
    if (selectedCharIds.length === 0) {
      setError('请至少选择一位 AI 居民');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await createGroup({
        name: name.trim(),
        description: description.trim(),
        avatarEmoji,
        avatarColor,
        characterIds: selectedCharIds,
      });

      if (res.error) {
        setError(res.error);
        setLoading(false);
      } else if (res.groupId) {
        router.push(`/messages/group/${res.groupId}`);
      }
    } catch {
      setError('创建群聊失败，请重试');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/messages"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-secondary transition-colors hover:bg-muted"
            aria-label="返回群聊列表"
          >
            <ArrowLeft size={19} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">创建新群聊</h1>
            <Text type="supporting" size="sm" as="p">
              邀请多位具有独立生活节奏与个性的 AI 居民共同交流
            </Text>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* Group Profile Preview */}
        <section className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
          <UserAvatar name={name || '群聊'} emoji={avatarEmoji} color={avatarColor} size={56} />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-medium truncate">
              {name || '群聊名称预览'}
            </h2>
            <Text type="supporting" size="sm" as="p" className="truncate">
              {description || '还没有填写群描述'}
            </Text>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-secondary">
              <Users size={12} />
              <span>已选 {selectedCharIds.length + 1} 位成员（含你）</span>
            </div>
          </div>
        </section>

        {/* Group Name & Description */}
        <div className="flex flex-col gap-4">
          <TextInput
            label="群聊名称"
            value={name}
            onChange={(v) => setName(v)}
            placeholder="例如：深夜咖啡馆、技术茶水间、周末干饭小分队"
            isRequired
          />

          <TextInput
            label="群聊描述"
            value={description}
            onChange={(v) => setDescription(v)}
            placeholder="简单介绍这个群的日常话题或氛围"
          />
        </div>

        {/* Avatar Emoji & Color */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">群图标 Emoji</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatarEmoji(emoji)}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border text-lg transition-all ${
                    avatarEmoji === emoji
                      ? 'border-accent bg-accent/10 shadow-xs'
                      : 'border-border bg-surface hover:bg-surface-hover'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">主题色</label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all ${
                    avatarColor === color ? 'border-accent ring-2 ring-accent/30' : 'border-transparent'
                  }`}
                  style={{
                    background:
                      color === 'violet'
                        ? '#8b5cf6'
                        : color === 'rose'
                          ? '#f43f5e'
                          : color === 'indigo'
                            ? '#6366f1'
                            : color === 'emerald'
                              ? '#10b981'
                              : color === 'amber'
                                ? '#f59e0b'
                                : color === 'sky'
                                  ? '#0ea5e9'
                                  : color === 'teal'
                                    ? '#14b8a6'
                                    : '#d946ef',
                  }}
                >
                  {avatarColor === color && <Check size={14} className="text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Character Selector */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text-secondary">
              选择加入群聊的 AI 居民 <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-accent transition-colors hover:underline"
            >
              {selectedCharIds.length === characters.length ? '取消全选' : '全选'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {characters.map((char) => {
              const selected = selectedCharIds.includes(char.id);
              return (
                <div
                  key={char.id}
                  onClick={() => toggleChar(char.id)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                    selected
                      ? 'border-accent bg-accent/5 shadow-xs'
                      : 'border-border bg-surface hover:bg-surface-hover'
                  }`}
                >
                  <UserAvatar
                    name={char.name}
                    emoji={char.avatarEmoji}
                    color={char.avatarColor}
                    url={char.avatarUrl}
                    size={40}
                    tooltip={false}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text-primary truncate">
                        {char.name}
                      </span>
                      <span className="text-[11px] text-text-tertiary">@{char.username}</span>
                    </div>
                    <p className="text-xs text-text-secondary truncate">
                      {char.bio || char.persona || '虚拟居民'}
                    </p>
                  </div>
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                      selected ? 'border-accent bg-accent text-white' : 'border-border bg-surface'
                    }`}
                  >
                    {selected && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <div className="mt-4 flex items-center justify-end gap-3 pb-8">
          <Button
            label="取消"
            variant="secondary"
            onClick={() => router.push('/messages')}
            type="button"
          />
          <Button
            label={loading ? '创建中...' : '立即创建群聊'}
            variant="primary"
            type="submit"
            isDisabled={loading}
            isLoading={loading}
          />
        </div>
      </form>
    </div>
  );
}
