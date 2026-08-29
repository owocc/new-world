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
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  root: {display: 'flex', height: '100%', maxWidth: '42rem', marginInline: 'auto', flexDirection: 'column', overflowY: 'auto', padding: '16px', '@media (min-width: 640px)': {padding: '24px'}, '@media (min-width: 1024px)': {padding: '32px'}},
  header: {display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px'},
  headerGroup: {display: 'flex', alignItems: 'center', gap: '8px'},
  backLink: {display: 'flex', width: '36px', height: '36px', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', color: 'var(--color-text-secondary)', transition: 'background-color 150ms ease', ':hover': {backgroundColor: 'var(--color-background-muted)'}},
  title: {fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', letterSpacing: '-0.01em'},
  form: {display: 'flex', flexDirection: 'column', gap: '24px'},
  error: {border: '1px solid rgba(225, 29, 72, 0.2)', borderRadius: 'var(--radius-element)', backgroundColor: 'rgba(225, 29, 72, 0.1)', padding: '12px', fontSize: 'var(--font-size-xs)', color: 'var(--color-error)'},
  preview: {display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-page)', backgroundColor: 'var(--color-background-surface)', padding: '16px'},
  grow: {minWidth: 0, flex: 1},
  previewTitle: {overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-medium)'},
  supporting: {marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-text-secondary)'},
  fieldGroup: {display: 'flex', flexDirection: 'column', gap: '16px'},
  label: {display: 'block', marginBottom: '6px', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)'},
  optionRow: {display: 'flex', flexWrap: 'wrap', gap: '8px'},
  emoji: {display: 'flex', width: '40px', height: '40px', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-element)', backgroundColor: 'var(--color-background-surface)', fontSize: 'var(--font-size-lg)', transition: 'all 150ms ease', ':hover': {backgroundColor: 'var(--color-overlay-hover)'}},
  emojiSelected: {borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent-muted)', boxShadow: 'var(--shadow-low)'},
  color: {display: 'flex', width: '32px', height: '32px', alignItems: 'center', justifyContent: 'center', border: '1px solid transparent', borderRadius: '9999px', transition: 'all 150ms ease'},
  colorSelected: {borderColor: 'var(--color-accent)', boxShadow: '0 0 0 2px var(--color-accent-muted)'},
  selector: {display: 'flex', flexDirection: 'column', gap: '12px'},
  selectorHeader: {display: 'flex', alignItems: 'center', justifyContent: 'space-between'},
  selectLabel: {fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)'},
  selectAll: {fontSize: 'var(--font-size-xs)', color: 'var(--color-text-accent)', transition: 'text-decoration 150ms ease', ':hover': {textDecoration: 'underline'}},
  charGrid: {display: 'grid', gridTemplateColumns: '1fr', gap: '8px', '@media (min-width: 640px)': {gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'}},
  character: {display: 'flex', cursor: 'pointer', alignItems: 'center', gap: '12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-container)', backgroundColor: 'var(--color-background-surface)', padding: '12px', transition: 'all 150ms ease', ':hover': {backgroundColor: 'var(--color-overlay-hover)'}},
  characterSelected: {borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent-muted)', boxShadow: 'var(--shadow-low)'},
  charDetails: {minWidth: 0, flex: 1},
  charTop: {display: 'flex', alignItems: 'center', justifyContent: 'space-between'},
  charName: {overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)'},
  username: {fontSize: '11px', color: 'var(--color-text-disabled)'},
  bio: {overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)'},
  truncate: {overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'},
  required: {color: 'var(--color-error)'},
  onAccent: {color: 'var(--color-on-accent)'},
  check: {display: 'flex', width: '20px', height: '20px', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background-surface)', color: 'var(--color-text-secondary)', flexShrink: 0},
  checkSelected: {borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent)', color: 'var(--color-on-accent)'},
  submit: {display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px'},
});
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
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.headerGroup)}>
          <Link href="/messages" {...stylex.props(styles.backLink)} aria-label="返回群聊列表">
            <ArrowLeft size={19} />
          </Link>
          <div>
            <h1 {...stylex.props(styles.title)}>创建新群聊</h1>
            <Text type="supporting" size="sm" as="p">
              邀请多位具有独立生活节奏与个性的 AI 居民共同交流
            </Text>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} {...stylex.props(styles.form)}>
        {error && (
          <div {...stylex.props(styles.error)}>
            {error}
          </div>
        )}

        {/* Group Profile Preview */}
        <section {...stylex.props(styles.preview)}>
          <UserAvatar name={name || '群聊'} emoji={avatarEmoji} color={avatarColor} size={56} />
          <div {...stylex.props(styles.grow)}>
            <h2 {...stylex.props(styles.previewTitle)}>
              {name || '群聊名称预览'}
            </h2>
            <Text type="supporting" size="sm" as="p" xstyle={styles.truncate}>
              {description || '还没有填写群描述'}
            </Text>
            <div {...stylex.props(styles.supporting)}>
              <Users size={12} />
              <span>已选 {selectedCharIds.length + 1} 位成员（含你）</span>
            </div>
          </div>
        </section>

        {/* Group Name & Description */}
        <div {...stylex.props(styles.fieldGroup)}>
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
        <div {...stylex.props(styles.fieldGroup)}>
          <div>
            <label {...stylex.props(styles.label)}>群图标 Emoji</label>
            <div {...stylex.props(styles.optionRow)}>
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatarEmoji(emoji)}
                  {...stylex.props(styles.emoji, avatarEmoji === emoji && styles.emojiSelected)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label {...stylex.props(styles.label)}>主题色</label>
            <div {...stylex.props(styles.optionRow)}>
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  {...stylex.props(styles.color, avatarColor === color && styles.colorSelected)}
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
                  {avatarColor === color && <Check {...stylex.props(styles.onAccent)} size={14} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Character Selector */}
        <div {...stylex.props(styles.selector)}>
          <div {...stylex.props(styles.selectorHeader)}>
            <label {...stylex.props(styles.selectLabel)}>
              选择加入群聊的 AI 居民 <span {...stylex.props(styles.required)}>*</span>
            </label>
            <button
              type="button"
              onClick={selectAll}
              {...stylex.props(styles.selectAll)}
            >
              {selectedCharIds.length === characters.length ? '取消全选' : '全选'}
            </button>
          </div>
          <div {...stylex.props(styles.charGrid)}>
            {characters.map((char) => {
              const selected = selectedCharIds.includes(char.id);
              return (
                <div
                  key={char.id}
                  onClick={() => toggleChar(char.id)}
                  {...stylex.props(styles.character, selected && styles.characterSelected)}
                >
                  <UserAvatar
                    name={char.name}
                    emoji={char.avatarEmoji}
                    color={char.avatarColor}
                    url={char.avatarUrl}
                    size={40}
                    tooltip={false}
                  />
                  <div {...stylex.props(styles.charDetails)}>
                    <div {...stylex.props(styles.charTop)}>
                      <span {...stylex.props(styles.charName)}>
                        {char.name}
                      </span>
                      <span {...stylex.props(styles.username)}>@{char.username}</span>
                    </div>
                    <p {...stylex.props(styles.bio)}>
                      {char.bio || char.persona || '虚拟居民'}
                    </p>
                  </div>
                  <div {...stylex.props(styles.check, selected && styles.checkSelected)}>
                    {selected && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <div {...stylex.props(styles.submit)}>
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
