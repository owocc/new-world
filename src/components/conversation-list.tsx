'use client';

import { useState } from 'react';
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
import { Plus } from 'lucide-react';

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

  // on mobile, detail view takes over the whole screen
  const hiddenOnMobile = pathname !== '/messages';

  const startChat = async (characterId: string) => {
    const res = await openConversation(characterId);
    if (res.id) router.push(`/messages/${res.id}`);
  };

  const filteredChats = chats.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.username && c.username.toLowerCase().includes(q)) ||
      (c.lastMessagePreview && c.lastMessagePreview.toLowerCase().includes(q))
    );
  });

  return (
    <div className={`flex h-full flex-col ${hiddenOnMobile ? 'hidden lg:flex' : 'flex'}`}>
      {/* Header — 聊天 + 新建 */}
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h1 className="text-xl font-semibold tracking-tight">聊天</h1>
        <Link href="/groups/new">
          <Button label="新建" variant="ghost" size="sm" icon={<Plus size={15} />} />
        </Link>
      </div>

      {/* Quick contacts for unstarted DMs */}
      {contacts.length > 0 && !search && (
        <div className="px-3 pb-2 pt-1">
          <Text type="supporting" size="sm" as="div" className="px-1 pb-1">
            快捷私信
          </Text>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {contacts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => startChat(c.id)}
                className="flex w-14 shrink-0 flex-col items-center gap-1 rounded-xl p-1 transition-colors hover:bg-muted"
              >
                <UserAvatar
                  name={c.name}
                  emoji={c.avatarEmoji}
                  color={c.avatarColor}
                  url={c.avatarUrl}
                  size={40}
                  tooltip={false}
                />
                <span className="w-full truncate text-center text-[11px] text-secondary">
                  {c.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation List */}
      {chats.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <Text type="supporting" as="p">
            还没有聊天会话，点击右上角新建群聊或从居民列表中开始对话吧
          </Text>
        </div>
      ) : (
        <nav className="flex-1 overflow-y-auto" aria-label="聊天会话列表">
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
                className={`mx-2 mb-0.5 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors ${
                  isActive ? 'bg-muted' : 'hover:bg-muted'
                }`}
              >
                <UserAvatar
                  name={chat.name}
                  emoji={chat.avatarEmoji}
                  color={chat.avatarColor}
                  url={chat.avatarUrl}
                  size={46}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate text-[15px] font-medium">{chat.name}</span>
                    </div>
                    {chat.lastMessageAt && (
                      <TimeAgo
                        date={chat.lastMessageAt}
                        short
                        className="shrink-0 text-xs text-secondary"
                      />
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] text-secondary">
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
