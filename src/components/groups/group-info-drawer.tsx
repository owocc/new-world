'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Text } from '@astryxdesign/core/Text';
import { AvatarPicker } from '@/components/avatar-picker';
import { UserAvatar } from '@/components/user-avatar';
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
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  overlay: {position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(2px)'},
  drawer: {display: 'flex', width: '100%', height: '100%', maxWidth: '28rem', flexDirection: 'column', borderInlineStart: '1px solid var(--color-border)', backgroundColor: 'var(--color-background-surface)', boxShadow: 'var(--shadow-high)'},
  header: {display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingInline: '20px', paddingBlock: '16px'},
  headerTitle: {display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)'},
  close: {display: 'flex', width: '32px', height: '32px', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-element)', color: 'var(--color-text-secondary)', transition: 'background-color 150ms ease, color 150ms ease', ':hover': {backgroundColor: 'var(--color-overlay-hover)', color: 'var(--color-text-primary)'}},
  tabs: {display: 'flex', borderBottom: '1px solid var(--color-border)', paddingInline: '20px', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)'},
  tab: {borderBottom: '2px solid transparent', paddingInline: '12px', paddingBlock: '10px', color: 'var(--color-text-secondary)', transition: 'color 150ms ease', ':hover': {color: 'var(--color-text-primary)'}},
  tabActive: {borderBottomColor: 'var(--color-accent)', color: 'var(--color-text-accent)'},
  content: {flex: 1, overflowY: 'auto', padding: '20px'},
  column5: {display: 'flex', flexDirection: 'column', gap: '20px'},
  miniCard: {display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-page)', backgroundColor: 'var(--color-background-surface)', padding: '16px'},
  grow: {minWidth: 0, flex: 1},
  title: {overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)'},
  lineClamp: {display: '-webkit-box', overflow: 'hidden', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2},
  memberSection: {display: 'flex', flexDirection: 'column', gap: '8px'},
  memberHeading: {display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)'},
  invite: {display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-accent)', ':hover': {textDecoration: 'underline'}},
  memberList: {display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-page)', backgroundColor: 'var(--color-background-surface)'},
  member: {display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', transition: 'background-color 150ms ease', ':hover': {backgroundColor: 'var(--color-overlay-hover)'}},
  memberInfo: {display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0},
  memberDetails: {minWidth: 0, flex: 1},
  memberTop: {display: 'flex', alignItems: 'center', gap: '6px'},
  memberName: {overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)'},
  badgeOwner: {borderRadius: 'var(--radius-inner)', backgroundColor: 'var(--color-accent-muted)', paddingInline: '4px', paddingBlock: '2px', fontSize: '10px', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-accent)'},
  badgeAi: {borderRadius: 'var(--radius-inner)', backgroundColor: 'var(--color-background-muted)', paddingInline: '4px', paddingBlock: '2px', fontSize: '10px', color: 'var(--color-text-disabled)'},
  memberBio: {overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11px', color: 'var(--color-text-secondary)'},
  remove: {display: 'flex', width: '28px', height: '28px', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-element)', color: 'var(--color-text-disabled)', transition: 'background-color 150ms ease, color 150ms ease', ':hover': {backgroundColor: 'var(--color-error-muted)', color: 'var(--color-error)'}},
  leave: {paddingTop: '16px'},
  danger: {color: 'var(--color-error)'},
  addColumn: {display: 'flex', flexDirection: 'column', gap: '16px'},
  supporting: {fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)'},
  noItems: {paddingBlock: '32px', textAlign: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-disabled)'},
  available: {display: 'flex', flexDirection: 'column', gap: '8px'},
  availableItem: {display: 'flex', cursor: 'pointer', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-container)', backgroundColor: 'var(--color-background-surface)', padding: '12px', transition: 'all 150ms ease', ':hover': {backgroundColor: 'var(--color-overlay-hover)'}},
  availableSelected: {borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent-muted)'},
  availableName: {display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)'},
  availableBio: {display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)'},
  check: {display: 'flex', width: '20px', height: '20px', flexShrink: 0, alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-inner)', backgroundColor: 'var(--color-background-surface)'},
  checkSelected: {borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent)', color: 'var(--color-on-accent)'},
  editForm: {display: 'flex', flexDirection: 'column', gap: '16px'},
  label: {display: 'block', marginBottom: '6px', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)'},
  optionRow: {display: 'flex', flexWrap: 'wrap', gap: '8px'},
  emoji: {display: 'flex', width: '36px', height: '36px', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-element)', backgroundColor: 'var(--color-background-surface)', fontSize: 'var(--font-size-base)', transition: 'all 150ms ease', ':hover': {backgroundColor: 'var(--color-overlay-hover)'}},
  emojiActive: {borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent-muted)'},
  color: {display: 'flex', width: '28px', height: '28px', alignItems: 'center', justifyContent: 'center', border: '1px solid transparent', borderRadius: '9999px', transition: 'all 150ms ease'},
  colorActive: {borderColor: 'var(--color-accent)', boxShadow: '0 0 0 2px var(--color-accent-muted)'},
  formActions: {display: 'flex', gap: '8px', marginTop: '16px'},
  flexButton: {flex: 1},
  onAccent: {color: 'var(--color-on-accent)'},
  addButton: {marginTop: '16px', width: '100%'},
});
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
    <div {...stylex.props(styles.overlay)}>
      <div {...stylex.props(styles.drawer)}>
        {/* Drawer Header */}
        <div {...stylex.props(styles.header)}>
          <div {...stylex.props(styles.headerTitle)}>
            <Users size={18} />
            <span>群聊资料与成员</span>
          </div>
          <button onClick={onClose} {...stylex.props(styles.close)}>
            <X size={18} />
          </button>
        </div>

        {/* Drawer Tabs */}
        <div {...stylex.props(styles.tabs)}>
          <button onClick={() => setActiveTab('members')} {...stylex.props(styles.tab, activeTab === 'members' && styles.tabActive)}>
            群成员 ({members.length})
          </button>
          <button onClick={() => setActiveTab('add')} {...stylex.props(styles.tab, activeTab === 'add' && styles.tabActive)}>
            添加居民
          </button>
          <button onClick={() => setActiveTab('edit')} {...stylex.props(styles.tab, activeTab === 'edit' && styles.tabActive)}>
            群聊设置
          </button>
        </div>

        {/* Drawer Content */}
        <div {...stylex.props(styles.content)}>
          {activeTab === 'members' && (
            <div {...stylex.props(styles.column5)}>
              {/* Group Mini Card */}
              <div {...stylex.props(styles.miniCard)}>
                <UserAvatar
                  name={group.name}
                  emoji={group.avatarEmoji}
                  color={group.avatarColor}
                  url={group.avatarUrl}
                  size={52}
                />
                <div {...stylex.props(styles.grow)}>
                  <h3 {...stylex.props(styles.title)}>
                    {group.name}
                  </h3>
                  <Text type="supporting" size="sm" as="p" xstyle={styles.lineClamp}>
                    {group.description || '暂无群描述'}
                  </Text>
                </div>
              </div>

              {/* Members List */}
              <div {...stylex.props(styles.memberSection)}>
                <div {...stylex.props(styles.memberHeading)}>
                  <span>全部成员 ({members.length})</span>
                  <button
                    onClick={() => setActiveTab('add')}
                    {...stylex.props(styles.invite)}
                  >
                    <UserPlus size={13} />
                    <span>邀请更多</span>
                  </button>
                </div>

                <div {...stylex.props(styles.memberList)}>
                  {members.map((m) => {
                    const isUser = m.memberType === 'user';
                    return (
                      <div
                        key={m.id}
                        {...stylex.props(styles.member)}
                      >
                        <div {...stylex.props(styles.memberInfo)}>
                          <UserAvatar
                            name={m.name}
                            emoji={m.avatarEmoji}
                            color={m.avatarColor}
                            url={m.avatarUrl}
                            size={36}
                          />
                          <div {...stylex.props(styles.memberDetails)}>
                            <div {...stylex.props(styles.memberTop)}>
                              <span {...stylex.props(styles.memberName)}>
                                {m.name}
                              </span>
                              {isUser ? (
                                <span {...stylex.props(styles.badgeOwner)}>
                                  群主
                                </span>
                              ) : (
                                <span {...stylex.props(styles.badgeAi)}>
                                  AI 居民
                                </span>
                              )}
                            </div>
                            <p {...stylex.props(styles.memberBio)}>
                              @{m.username} · {m.bio || '无简介'}
                            </p>
                          </div>
                        </div>

                        {!isUser && m.characterId && (
                          <button
                            onClick={() => handleRemoveMember(m.characterId!)}
                            title="移出群聊"
                            {...stylex.props(styles.remove)}
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
              <div {...stylex.props(styles.leave)}>
                <Button
                  label="退出该群聊"
                  variant="secondary"
                  xstyle={styles.danger}
                  icon={<LogOut size={14} />}
                  onClick={handleLeaveGroup}
                />
              </div>
            </div>
          )}

          {activeTab === 'add' && (
            <div {...stylex.props(styles.addColumn)}>
              <div {...stylex.props(styles.supporting)}>
                选择尚未加入该群的社区居民：
              </div>

              {availableToAdd.length === 0 ? (
                <div {...stylex.props(styles.noItems)}>
                  所有现存 AI 居民都已在群内
                </div>
              ) : (
                <div {...stylex.props(styles.available)}>
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
                        {...stylex.props(styles.availableItem, selected && styles.availableSelected)}
                      >
                        <div {...stylex.props(styles.memberInfo)}>
                          <UserAvatar
                            name={char.name}
                            emoji={char.avatarEmoji}
                            color={char.avatarColor}
                            url={char.avatarUrl}
                            size={36}
                          />
                          <div {...stylex.props(styles.grow)}>
                            <span {...stylex.props(styles.availableName)}>
                              {char.name}
                            </span>
                            <span {...stylex.props(styles.availableBio)}>
                              {char.bio || char.persona || 'AI 居民'}
                            </span>
                          </div>
                        </div>
                        <div {...stylex.props(styles.check, selected && styles.checkSelected)}>
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
                    xstyle={styles.addButton}
                  />
                </div>
              )}
            </div>
          )}
          {activeTab === 'edit' && (
            <form onSubmit={handleSaveProfile} {...stylex.props(styles.editForm)}>
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

              <AvatarPicker
                name={group.name || '群聊'}
                avatarUrl={group.avatarUrl}
                avatarEmoji={avatarEmoji}
                avatarColor={avatarColor}
                onEmojiChange={setAvatarEmoji}
                onColorChange={setAvatarColor}
                showEmojiColorTab={true}
              />
              <div {...stylex.props(styles.formActions)}>
                <Button
                  label="取消"
                  variant="secondary"
                  type="button"
                  onClick={() => setActiveTab('members')}
                  xstyle={styles.flexButton}
                />
                <Button
                  label={saving ? '保存中...' : '保存更改'}
                  variant="primary"
                  type="submit"
                  isDisabled={saving}
                  isLoading={saving}
                  xstyle={styles.flexButton}
                />
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
