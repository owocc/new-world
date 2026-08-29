'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Text } from '@astryxdesign/core/Text';
import { UserAvatar, AVATAR_COLORS } from '@/components/user-avatar';
import {
  updateGroupProfile,
  addAiMembers,
  removeAiMember,
  leaveGroup,
} from '@/server/actions/groups';
import type { GroupMemberView } from '@/server/groups';
import type { aiCharacters, groups } from '@/db/schema';
import {
  X,
  UserPlus,
  Settings,
  LogOut,
  Trash2,
  Users,
  Shield,
  Bot,
  Check,
  Edit2,
} from 'lucide-react';

type CharacterRow = typeof aiCharacters.$inferSelect;
type GroupRow = typeof groups.$inferSelect;

export function GroupInfoDrawer({
  group,
  members,
  allCharacters,
  isOpen,
  onClose,
}: {
  group: GroupRow;
  members: GroupMemberView[];
  allCharacters: CharacterRow[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'members' | 'edit' | 'add'>('members');

  // Edit form state
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [avatarEmoji, setAvatarEmoji] = useState(group.avatarEmoji || '💬');
  const [avatarColor, setAvatarColor] = useState(group.avatarColor || 'indigo');
  const [saving, setSaving] = useState(false);

  // Add members state
  const existingCharIds = new Set(members.filter((m) => m.characterId).map((m) => m.characterId!));
  const availableToAdd = allCharacters.filter((c) => !existingCharIds.has(c.id));
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateGroupProfile(group.id, {
        name: name.trim(),
        description: description.trim(),
        avatarEmoji,
        avatarColor,
      });
      setActiveTab('members');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMembers = async () => {
    if (selectedToAdd.length === 0) return;
    setAdding(true);
    try {
      await addAiMembers(group.id, selectedToAdd);
      setSelectedToAdd([]);
      setActiveTab('members');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (characterId: string) => {
    if (!confirm('确定要将该 AI 居民移出群聊吗？')) return;
    await removeAiMember(group.id, characterId);
  };

  const handleLeaveGroup = async () => {
    if (!confirm('确定要退出该群聊吗？')) return;
    await leaveGroup(group.id);
    router.push('/messages');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Users size={18} />
            <span>群聊资料与成员</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Tabs */}
        <div className="flex border-b border-border px-5 text-xs font-medium">
          <button
            onClick={() => setActiveTab('members')}
            className={`border-b-2 px-3 py-2.5 transition-colors ${
              activeTab === 'members'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            群成员 ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`border-b-2 px-3 py-2.5 transition-colors ${
              activeTab === 'add'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            添加居民
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`border-b-2 px-3 py-2.5 transition-colors ${
              activeTab === 'edit'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            群聊设置
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'members' && (
            <div className="flex flex-col gap-5">
              {/* Group Mini Card */}
              <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
                <UserAvatar
                  name={group.name}
                  emoji={group.avatarEmoji}
                  color={group.avatarColor}
                  url={group.avatarUrl}
                  size={52}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold truncate">
                    {group.name}
                  </h3>
                  <Text type="supporting" size="sm" as="p" className="line-clamp-2">
                    {group.description || '暂无群描述'}
                  </Text>
                </div>
              </div>

              {/* Members List */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-medium text-text-secondary">
                  <span>全部成员 ({members.length})</span>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="flex items-center gap-1 text-accent hover:underline"
                  >
                    <UserPlus size={13} />
                    <span>邀请更多</span>
                  </button>
                </div>

                <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface overflow-hidden">
                  {members.map((m) => {
                    const isUser = m.memberType === 'user';
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-3 transition-colors hover:bg-surface-hover"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar
                            name={m.name}
                            emoji={m.avatarEmoji}
                            color={m.avatarColor}
                            url={m.avatarUrl}
                            size={36}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-text-primary truncate">
                                {m.name}
                              </span>
                              {isUser ? (
                                <span className="rounded-sm bg-accent/10 px-1 py-0.5 text-[10px] font-medium text-accent">
                                  群主
                                </span>
                              ) : (
                                <span className="rounded-sm bg-surface-raised px-1 py-0.5 text-[10px] text-text-tertiary">
                                  AI 居民
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-text-secondary truncate">
                              @{m.username} · {m.bio || '无简介'}
                            </p>
                          </div>
                        </div>

                        {!isUser && m.characterId && (
                          <button
                            onClick={() => handleRemoveMember(m.characterId!)}
                            title="移出群聊"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-rose-500/10 hover:text-rose-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leave Button */}
              <div className="pt-4">
                <Button
                  label="退出该群聊"
                  variant="secondary"
                  className="w-full text-rose-600 dark:text-rose-400"
                  icon={<LogOut size={14} />}
                  onClick={handleLeaveGroup}
                />
              </div>
            </div>
          )}

          {activeTab === 'add' && (
            <div className="flex flex-col gap-4">
              <div className="text-xs text-text-secondary">
                选择尚未加入该群的社区居民：
              </div>

              {availableToAdd.length === 0 ? (
                <div className="py-8 text-center text-xs text-text-tertiary">
                  所有现存 AI 居民都已在群内
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {availableToAdd.map((char) => {
                    const selected = selectedToAdd.includes(char.id);
                    return (
                      <div
                        key={char.id}
                        onClick={() =>
                          setSelectedToAdd((prev) =>
                            prev.includes(char.id)
                              ? prev.filter((i) => i !== char.id)
                              : [...prev, char.id],
                          )
                        }
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
                          selected
                            ? 'border-accent bg-accent/5'
                            : 'border-border bg-surface hover:bg-surface-hover'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar
                            name={char.name}
                            emoji={char.avatarEmoji}
                            color={char.avatarColor}
                            url={char.avatarUrl}
                            size={36}
                          />
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-text-primary truncate block">
                              {char.name}
                            </span>
                            <span className="text-xs text-text-secondary truncate block">
                              {char.bio || char.persona || 'AI 居民'}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            selected
                              ? 'border-accent bg-accent text-white'
                              : 'border-border bg-surface'
                          }`}
                        >
                          {selected && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}

                  <Button
                    label={adding ? '添加中...' : `确认添加 (${selectedToAdd.length})`}
                    variant="primary"
                    isDisabled={selectedToAdd.length === 0 || adding}
                    isLoading={adding}
                    onClick={handleAddMembers}
                    className="mt-4 w-full"
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'edit' && (
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              <TextInput
                label="群聊名称"
                value={name}
                onChange={(v) => setName(v)}
                isRequired
              />

              <TextInput
                label="群聊描述"
                value={description}
                onChange={(v) => setDescription(v)}
              />

              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  群图标 Emoji
                </label>
                <div className="flex flex-wrap gap-2">
                  {['💬', '☕️', '🌙', '🍜', '🎮', '📚', '💪', '🔥', '🎉', '🐱'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatarEmoji(emoji)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border text-base transition-all ${
                        avatarEmoji === emoji
                          ? 'border-accent bg-accent/10'
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
                      className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all ${
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
                      {avatarColor === color && <Check size={12} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  label="取消"
                  variant="secondary"
                  type="button"
                  onClick={() => setActiveTab('members')}
                  className="flex-1"
                />
                <Button
                  label={saving ? '保存中...' : '保存更改'}
                  variant="primary"
                  type="submit"
                  isDisabled={saving}
                  isLoading={saving}
                  className="flex-1"
                />
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
