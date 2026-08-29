'use client';

import {useEffect, useRef} from 'react';
import {useChat} from '@ai-sdk/react';
import {DefaultChatTransport} from 'ai';
import Link from 'next/link';
import {ArrowLeft} from 'lucide-react';
import {ChatMessageList} from '@astryxdesign/core/Chat';
import {ChatMessage} from '@astryxdesign/core/Chat';
import {ChatMessageBubble} from '@astryxdesign/core/Chat';
import {ChatComposer} from '@astryxdesign/core/Chat';
import {Markdown} from '@astryxdesign/core/Markdown';
import {Button} from '@astryxdesign/core/Button';
import {Text} from '@astryxdesign/core/Text';
import {UserAvatar} from '@/components/user-avatar';
import {markRead} from '@/server/actions/chat';
import type {aiCharacters} from '@/db/schema';

type CharacterRow = typeof aiCharacters.$inferSelect;

type ChatUIMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: {type: 'text'; text: string}[];
};

function toUIMessages(
  rows: {id: string; role: string; content: string; createdAt: Date}[],
): ChatUIMessage[] {
  return rows.map((m) => ({
    id: m.id,
    role: m.role === 'assistant' ? 'assistant' : 'user',
    parts: [{type: 'text', text: m.content}],
  }));
}

export function ChatWindow({
  conversationId,
  character,
  initialMessages,
}: {
  conversationId: string;
  character: CharacterRow;
  initialMessages: {id: string; role: string; content: string; createdAt: Date}[];
}) {
  const {messages, sendMessage, status, error, regenerate, stop} = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: {conversationId},
    }),
    messages: toUIMessages(initialMessages),
    onFinish: () => {
      markRead(conversationId);
    },
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    markRead(conversationId);
  }, [conversationId]);

  // auto-scroll while streaming; respect manual scroll-up
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, status]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  // keep pinned to bottom when the viewport (or chat column) resizes
  useEffect(() => {
    const scrollToBottom = () => {
      const el = scrollRef.current;
      if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
    };
    window.addEventListener('resize', scrollToBottom);
    return () => window.removeEventListener('resize', scrollToBottom);
  }, []);

  const generating = status === 'submitted' || status === 'streaming';
  const avatar = (
    <UserAvatar
      name={character.name}
      emoji={character.avatarEmoji}
      color={character.avatarColor}
      url={character.avatarUrl}
      size={36}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* header — friend first, no model chrome */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-2 sm:px-4">
        <Link
          href="/messages"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-secondary transition-colors hover:bg-muted lg:hidden"
          aria-label="返回会话列表"
        >
          <ArrowLeft size={19} />
        </Link>
        <UserAvatar
          name={character.name}
          emoji={character.avatarEmoji}
          color={character.avatarColor}
          url={character.avatarUrl}
          size={36}
        />
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="truncate text-[15px] font-semibold leading-tight">{character.name}</div>
          {character.bio && (
            <Text type="supporting" size="sm" as="div" className="truncate">
              {character.bio}
            </Text>
          )}
        </div>
        <Link href={`/characters/${character.id}`} className="shrink-0">
          <Button label="查看资料" variant="ghost" size="sm" />
        </Link>
      </header>

      {/* messages — the only scroll container in the chat column */}
      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[720px] px-3 py-4 sm:px-4">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
              <UserAvatar
                name={character.name}
                emoji={character.avatarEmoji}
                color={character.avatarColor}
                url={character.avatarUrl}
                size={72}
              />
              <div className="text-lg font-semibold">{character.name}</div>
              <Text type="supporting" as="p" className="max-w-xs">
                {character.bio}
              </Text>
              <Text type="supporting" size="sm" as="p">
                打个招呼，开启你们的对话吧
              </Text>
            </div>
          ) : (
            <ChatMessageList isStreaming={status === 'streaming'} gap={2}>
              {messages.map((m) => {
                const isUser = m.role === 'user';
                const text = m.parts
                  .filter((p): p is {type: 'text'; text: string} => p.type === 'text')
                  .map((p) => p.text)
                  .join('');
                return (
                  <ChatMessage
                    key={m.id}
                    sender={isUser ? 'user' : 'assistant'}
                    avatar={isUser ? undefined : avatar}
                  >
                    {isUser ? (
                      <ChatMessageBubble variant="filled">
                        <p className="whitespace-pre-wrap break-words">{text}</p>
                      </ChatMessageBubble>
                    ) : (
                      <ChatMessageBubble variant="ghost">
                        <Markdown className="text-[15px]">{text}</Markdown>
                      </ChatMessageBubble>
                    )}
                  </ChatMessage>
                );
              })}

              {status === 'submitted' && (
                <ChatMessage sender="assistant" avatar={avatar}>
                  <ChatMessageBubble variant="ghost">
                    <span className="flex items-center gap-1.5 py-1" aria-label="正在输入">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 animate-bounce rounded-full bg-border-strong"
                          style={{animationDelay: `${i * 0.15}s`}}
                        />
                      ))}
                    </span>
                  </ChatMessageBubble>
                </ChatMessage>
              )}
            </ChatMessageList>
          )}
        </div>
      </div>

      {/* composer — fixed footer, no floating dock */}
      <footer className="shrink-0 border-t border-border bg-surface px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
        <div className="mx-auto w-full max-w-[720px]">
          <ChatComposer
            elevation="none"
            placeholder={`给 ${character.name} 发消息…`}
            onSubmit={(text) => {
              if (!text.trim() || generating) return;
              stickToBottomRef.current = true;
              sendMessage({text});
            }}
            onStop={() => stop()}
            isStopShown={generating}
            isDisabled={status === 'submitted'}
            status={error ? {type: 'error', message: error.message || '消息发送失败'} : undefined}
            footerActions={
              error ? (
                <Button label="重试" variant="ghost" size="sm" onClick={() => regenerate()} />
              ) : undefined
            }
          />
        </div>
      </footer>
    </div>
  );
}
