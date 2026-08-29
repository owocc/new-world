'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Square } from 'lucide-react';
import { Avatar } from '@/components/avatar';
import { Markdown } from '@/components/markdown';
import { markRead } from '@/server/actions/chat';
import type { aiCharacters } from '@/db/schema';

type CharacterRow = typeof aiCharacters.$inferSelect;

type ChatUIMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: { type: 'text'; text: string }[];
};

function toUIMessages(
  rows: { id: string; role: string; content: string; createdAt: Date }[],
): ChatUIMessage[] {
  return rows.map((m) => ({
    id: m.id,
    role: m.role === 'assistant' ? 'assistant' : 'user',
    parts: [{ type: 'text', text: m.content }],
  }));
}

export function ChatWindow({
  conversationId,
  character,
  initialMessages,
}: {
  conversationId: string;
  character: CharacterRow;
  initialMessages: { id: string; role: string; content: string; createdAt: Date }[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const [input, setInput] = useState('');

  const { messages, sendMessage, status, error, regenerate, stop } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { conversationId },
    }),
    messages: toUIMessages(initialMessages),
    onFinish: () => {
      markRead(conversationId);
    },
  });

  useEffect(() => {
    markRead(conversationId);
  }, [conversationId]);

  // auto-scroll while streaming, respect manual scroll-up
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

  const submit = () => {
    const text = input.trim();
    if (!text || status === 'submitted' || status === 'streaming') return;
    setInput('');
    stickToBottomRef.current = true;
    sendMessage({ text });
  };

  const generating = status === 'submitted' || status === 'streaming';

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col lg:h-dvh">
      {/* header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line surface px-3 sm:px-4">
        <Link
          href="/messages"
          className="flex h-9 w-9 items-center justify-center rounded-full text-secondary transition-colors hover:surface-2 lg:hidden"
          aria-label="返回"
        >
          <ArrowLeft size={19} />
        </Link>
        <Avatar
          name={character.name}
          emoji={character.avatarEmoji}
          color={character.avatarColor}
          url={character.avatarUrl}
          size={36}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{character.name}</div>
          <div className="truncate text-xs text-muted">{character.bio}</div>
        </div>
        <Link
          href={`/characters/${character.id}`}
          className="rounded-full px-3 py-1.5 text-xs font-medium text-[var(--color-accent-600)] transition-colors hover:surface-2 dark:text-[var(--color-accent-300)]"
        >
          查看资料
        </Link>
      </header>

      {/* messages */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-4"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Avatar
              name={character.name}
              emoji={character.avatarEmoji}
              color={character.avatarColor}
              url={character.avatarUrl}
              size={72}
            />
            <div className="text-lg font-bold">{character.name}</div>
            <p className="max-w-xs text-sm text-muted">{character.bio}</p>
            <p className="text-xs text-muted">打个招呼，开启你们的对话吧</p>
          </div>
        )}
        {messages.map((m) => {
          const isUser = m.role === 'user';
          const text = m.parts
            .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
            .map((p) => p.text)
            .join('');
          return (
            <div key={m.id} className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
              {!isUser && (
                <Avatar
                  name={character.name}
                  emoji={character.avatarEmoji}
                  color={character.avatarColor}
                  url={character.avatarUrl}
                  size={32}
                />
              )}
              <div
                className={`max-w-[85%] sm:max-w-[75%] ${
                  isUser
                    ? 'rounded-3xl rounded-br-lg bg-[var(--color-accent-600)] px-4 py-2.5 text-[15px] leading-relaxed text-white'
                    : 'rounded-3xl rounded-bl-lg border border-line surface px-4 py-2.5'
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap break-words">{text}</p>
                ) : (
                  <div className="text-[15px] leading-relaxed">
                    <Markdown content={text} />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* generating indicator */}
        {status === 'submitted' && (
          <div className="flex gap-2.5">
            <Avatar
              name={character.name}
              emoji={character.avatarEmoji}
              color={character.avatarColor}
              url={character.avatarUrl}
              size={32}
            />
            <div className="flex items-center gap-1.5 rounded-3xl rounded-bl-lg border border-line surface px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-[var(--text-3)]"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* error + retry */}
        {error && (
          <div className="mx-auto flex max-w-sm flex-col items-center gap-2 rounded-2xl bg-rose-500/10 px-4 py-3 text-center">
            <p className="text-sm text-rose-600 dark:text-rose-400">
              {error.message || '消息发送失败'}
            </p>
            <button
              onClick={() => regenerate()}
              className="flex items-center gap-1.5 rounded-full bg-rose-500 px-3 py-1.5 text-xs font-medium text-white"
            >
              <RefreshCw size={13} />
              重试
            </button>
          </div>
        )}
      </div>

      {/* composer */}
      <div className="shrink-0 border-t border-line surface px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder={`给 ${character.name} 发消息…`}
            className="max-h-32 min-h-10 w-full resize-none rounded-2xl border border-line surface-2 px-4 py-2.5 text-[15px] outline-none transition-colors focus:border-[var(--color-accent-400)]"
          />
          {generating ? (
            <button
              onClick={() => stop()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-line text-secondary transition-colors hover:surface-2"
              aria-label="停止生成"
            >
              <Square size={16} />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-accent-600)] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              aria-label="发送"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            </button>
          )}
        </div>
        <p className="mt-1.5 hidden text-center text-[10px] text-muted sm:block">
          Enter 发送，Shift + Enter 换行 · AI 生成内容请注意甄别
        </p>
      </div>
    </div>
  );
}
