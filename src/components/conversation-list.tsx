'use client';

import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {Text} from '@astryxdesign/core/Text';
import {Badge} from '@astryxdesign/core/Badge';
import {UserAvatar} from '@/components/user-avatar';
import {TimeAgo} from '@/components/time-ago';
import {openConversation} from '@/server/actions/chat';
import type {ConversationView} from '@/server/chat';
import type {aiCharacters} from '@/db/schema';

type CharacterRow = typeof aiCharacters.$inferSelect;

export function ConversationList({
  conversations,
  contacts,
}: {
  conversations: ConversationView[];
  contacts: CharacterRow[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  // on mobile, the conversation view takes over the whole screen
  const hiddenOnMobile = pathname !== '/messages';
  const activeId = pathname.startsWith('/messages/') ? pathname.split('/')[2] : undefined;

  const startChat = async (characterId: string) => {
    const res = await openConversation(characterId);
    if (res.id) router.push(`/messages/${res.id}`);
  };

  return (
    <div className={`flex h-full flex-col ${hiddenOnMobile ? 'hidden lg:flex' : 'flex'}`}>
      <h1 className="px-4 pb-3 pt-4 text-xl font-semibold tracking-tight">私信</h1>

      {contacts.length > 0 && (
        <div className="px-3 pb-3">
          <Text type="supporting" size="sm" as="div" className="px-1 pb-1.5">
            开始新对话
          </Text>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {contacts.map((c) => (
              <button
                key={c.id}
                onClick={() => startChat(c.id)}
                className="flex w-16 shrink-0 flex-col items-center gap-1 rounded-xl p-1.5 transition-colors hover:bg-muted"
              >
                <UserAvatar name={c.name} emoji={c.avatarEmoji} color={c.avatarColor} url={c.avatarUrl} size={44} />
                <span className="w-full truncate text-center text-xs text-secondary">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {conversations.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <Text type="supporting" as="p">
            还没有会话，从上面的联系人开始聊天吧
          </Text>
        </div>
      ) : (
        <nav className="flex-1 overflow-y-auto" aria-label="会话列表">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/messages/${conv.id}`}
              aria-current={activeId === conv.id ? 'page' : undefined}
              className={`mx-2 mb-0.5 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors ${
                activeId === conv.id ? 'bg-muted' : 'hover:bg-muted'
              }`}
            >
              <UserAvatar
                name={conv.characterName}
                emoji={conv.characterAvatarEmoji}
                color={conv.characterAvatarColor}
                url={conv.characterAvatarUrl}
                size={46}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[15px] font-medium">{conv.characterName}</span>
                  {conv.lastMessageAt && (
                    <TimeAgo date={conv.lastMessageAt} short className="shrink-0 text-xs text-secondary" />
                  )}
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] text-secondary">
                    {conv.lastMessagePreview ?? '开始对话吧'}
                  </span>
                  {conv.unreadCount > 0 && <Badge variant="orange" label={conv.unreadCount > 99 ? '99+' : String(conv.unreadCount)} />}
                </div>
              </div>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
