'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar } from '@/components/avatar';
import { TimeAgo } from '@/components/ui';
import { openConversation } from '@/server/actions/chat';
import { useRouter } from 'next/navigation';
import type { ConversationView } from '@/server/chat';
import type { aiCharacters } from '@/db/schema';

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
  // on mobile, the detail page takes over the whole screen
  const hiddenOnMobile = pathname !== '/messages';
  const activeId = pathname.startsWith('/messages/') ? pathname.split('/')[2] : undefined;

  const startChat = async (characterId: string) => {
    const res = await openConversation(characterId);
    if (res.id) router.push(`/messages/${res.id}`);
  };

  return (
    <div
      className={`flex h-full flex-col overflow-y-auto ${
        hiddenOnMobile ? 'hidden lg:flex' : 'flex'
      }`}
    >
      <h1 className="px-4 pb-2 pt-4 text-xl font-bold">私信</h1>

      {contacts.length > 0 && (
        <div className="border-b border-line px-3 pb-3">
          <div className="px-1 pb-1.5 text-xs font-medium text-muted">开始新对话</div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {contacts.map((c) => (
              <button
                key={c.id}
                onClick={() => startChat(c.id)}
                className="flex w-16 shrink-0 flex-col items-center gap-1 rounded-xl p-1.5 transition-colors hover:surface-2"
              >
                <Avatar name={c.name} emoji={c.avatarEmoji} color={c.avatarColor} url={c.avatarUrl} size={44} />
                <span className="w-full truncate text-center text-[11px] text-secondary">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {conversations.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted">
          还没有会话
          <br />
          从上面的联系人开始聊天吧
        </p>
      ) : (
        <div className="flex-1">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/messages/${conv.id}`}
              className={`flex items-center gap-3 px-4 py-3 transition-colors hover:surface-2 ${
                activeId === conv.id
                  ? 'bg-[var(--color-accent-50)] dark:bg-[color-mix(in_srgb,var(--color-accent-500)_12%,transparent)]'
                  : ''
              }`}
            >
              <Avatar
                name={conv.characterName}
                emoji={conv.characterAvatarEmoji}
                color={conv.characterAvatarColor}
                url={conv.characterAvatarUrl}
                size={46}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{conv.characterName}</span>
                  {conv.lastMessageAt && (
                    <TimeAgo date={conv.lastMessageAt} className="shrink-0 text-[11px] text-muted" />
                  )}
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] text-muted">
                    {conv.lastMessagePreview ?? '开始对话吧'}
                  </span>
                  {conv.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-600)] px-1.5 text-[11px] font-semibold text-white">
                      {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
