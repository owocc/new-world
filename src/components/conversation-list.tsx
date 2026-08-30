'use client';

import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@astryxdesign/core/Button';
import { Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { UserAvatar } from '@/components/user-avatar';
import { TimeAgo } from '@/components/time-ago';
import { openConversation } from '@/server/actions/chat';
import type { UnifiedChatItem } from '@/server/unified-chat';
import type { aiCharacters } from '@/db/schema';
import { useClientSync } from '@/components/client-sync-provider';
import { Plus } from 'lucide-react';
const styles = stylex.create({
  root: {display: 'flex', height: '100%', flexDirection: 'column'},
  hiddenMobile: {display: 'none', '@media (min-width: 640px)': {display: 'flex'}},
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingInline: 'var(--spacing-4)',
    paddingTop: 'var(--spacing-4)',
    paddingBottom: 'var(--spacing-2)',
  },
  heading: {fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', letterSpacing: '-0.025em'},
  contacts: {paddingInline: 'var(--spacing-3)', paddingTop: 'var(--spacing-1)', paddingBottom: 'var(--spacing-2)'},
  contactLabel: {paddingInline: 'var(--spacing-1)', paddingBottom: 'var(--spacing-1)'},
  contactList: {display: 'flex', gap: 'var(--spacing-2)', overflowX: 'auto', paddingBottom: 'var(--spacing-1)'},
  contact: {
    display: 'flex',
    width: '56px',
    flexShrink: 0,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--spacing-1)',
    border: 0,
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'transparent',
    padding: 'var(--spacing-1)',
    outline: 'none',
    transition: 'background-color 175ms ease',
    ':focus': {outline: 'none'},
    ':focus-visible': {outline: 'none'},
    ':hover': {'@media (hover: hover)': {backgroundColor: 'var(--color-background-muted)'}},
  },
  contactName: {
    width: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'center',
    color: 'var(--color-text-secondary)',
    fontSize: '11px',
  },
  empty: {paddingInline: 'var(--spacing-6)', paddingBlock: 'var(--spacing-10)', textAlign: 'center'},
  nav: {flex: 1, overflowY: 'auto'},
  chatLink: {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    gap: 'var(--spacing-3)',
    marginInline: 0,
    marginBottom: 0,
    borderRadius: 0,
    paddingInline: 'var(--spacing-4)',
    paddingBlock: '10px',
    outline: 'none',
    transition: 'color 175ms ease, background-color 175ms ease',
    ':focus': {outline: 'none'},
    ':focus-visible': {outline: 'none'},
  },
  chatActive: {
    backgroundColor: 'var(--color-background-muted)',
    color: 'var(--color-text-primary)',
    fontWeight: 'var(--font-weight-medium)',
  },
  chatInactive: {
    color: 'var(--color-text-secondary)',
    ':hover': {'@media (hover: hover)': {backgroundColor: 'var(--color-overlay-hover)', color: 'var(--color-text-primary)'}},
  },
  chatInfo: {minWidth: 0, flex: 1},
  chatHeader: {display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--spacing-2)'},
  chatName: {display: 'flex', minWidth: 0, alignItems: 'center', gap: '6px'},
  chatNameText: {overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-medium)'},
  time: {flexShrink: 0, color: 'var(--color-text-secondary)', fontSize: '11px', lineHeight: '1.2'},
  previewRow: {display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-2)', marginTop: '2px'},
  preview: {overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)'},
});
type CharacterRow = typeof aiCharacters.$inferSelect;

export function ConversationList({
  chats,
  contacts = [],
}: {
  chats: UnifiedChatItem[];
  contacts?: CharacterRow[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState('');
  const sync = useClientSync();
  const activeChats = sync.chats.length > 0 ? sync.chats : chats;
  // on mobile, detail view takes over the whole screen
  const hiddenOnMobile = pathname !== '/messages';

  const startChat = async (characterId: string) => {
    const res = await openConversation(characterId);
    if (res.id) router.push(`/messages/${res.id}`);
  };

  const filteredChats = activeChats.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.username && c.username.toLowerCase().includes(q)) ||
      (c.lastMessagePreview && c.lastMessagePreview.toLowerCase().includes(q))
    );
  });

  return (
    <div {...stylex.props(styles.root, hiddenOnMobile && styles.hiddenMobile)}>
      {/* Header — 聊天 + 新建 */}
      <div {...stylex.props(styles.header)}>
        <h1 {...stylex.props(styles.heading)}>聊天</h1>
        <Link href="/groups/new">
          <Button label="新建" variant="ghost" size="sm" icon={<Plus size={15} />} />
        </Link>
      </div>

      {/* Quick contacts for unstarted DMs */}
      {contacts.length > 0 && !search && (
        <div {...stylex.props(styles.contacts)}>
          <Text type="supporting" size="sm" as="div" xstyle={styles.contactLabel}>
            快捷私信
          </Text>
          <div {...stylex.props(styles.contactList)}>
            {contacts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => startChat(c.id)}
                {...stylex.props(styles.contact)}
              >
                <UserAvatar
                  name={c.name}
                  emoji={c.avatarEmoji}
                  color={c.avatarColor}
                  url={c.avatarUrl}
                  size={40}
                  tooltip={false}
                />
                <span {...stylex.props(styles.contactName)}>{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation List */}
      {chats.length === 0 ? (
        <div {...stylex.props(styles.empty)}>
          <Text type="supporting" as="p">
            还没有聊天会话，点击右上角新建群聊或从居民列表中开始对话吧
          </Text>
        </div>
      ) : (
        <nav {...stylex.props(styles.nav)} aria-label="聊天会话列表">
          {filteredChats.map((chat) => {
            const isActive =
              pathname === chat.href ||
              (chat.kind === 'dm' && pathname === `/messages/${chat.id}`) ||
              (chat.kind === 'group' &&
                (pathname === `/messages/group/${chat.id}` || pathname === `/groups/${chat.id}`));

            return (
              <Link
                key={`${chat.kind}-${chat.id}`}
                href={chat.href}
                aria-current={isActive ? 'page' : undefined}
                {...stylex.props(styles.chatLink, isActive ? styles.chatActive : styles.chatInactive)}
              >
                <UserAvatar
                  name={chat.name}
                  emoji={chat.avatarEmoji}
                  color={chat.avatarColor}
                  url={chat.avatarUrl}
                  size={46}
                />
                <div {...stylex.props(styles.chatInfo)}>
                  <div {...stylex.props(styles.chatHeader)}>
                    <div {...stylex.props(styles.chatName)}>
                      <span {...stylex.props(styles.chatNameText)}>{chat.name}</span>
                    </div>
                    {chat.lastMessageAt && (
                      <TimeAgo
                        date={chat.lastMessageAt}
                        short
                        xstyle={styles.time}
                        style={{ fontSize: '11px', lineHeight: 1.2, color: 'var(--color-text-secondary)' }}
                      />
                    )}
                  </div>
                  <div {...stylex.props(styles.previewRow)}>
                    <span {...stylex.props(styles.preview)}>
                      {chat.lastMessagePreview ?? (chat.kind === 'group' ? '群聊已创建' : '开始对话吧')}
                    </span>
                    {chat.unreadCount > 0 && (
                      <Badge
                        variant="orange"
                        label={chat.unreadCount > 99 ? '99+' : String(chat.unreadCount)}
                      />
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
