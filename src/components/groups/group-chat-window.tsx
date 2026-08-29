'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, Reply, X, AtSign, Info } from 'lucide-react';
import {
  ChatMessageList,
  ChatMessage,
  ChatMessageBubble,
  ChatComposer,
} from '@astryxdesign/core/Chat';
import { Markdown } from '@astryxdesign/core/Markdown';
import { Button } from '@astryxdesign/core/Button';
import { Text } from '@astryxdesign/core/Text';
import { UserAvatar } from '@/components/user-avatar';
import { TimeAgo } from '@/components/time-ago';
import { GroupInfoDrawer } from './group-info-drawer';
import {
  sendGroupMessage,
  toggleGroupReaction,
  markGroupAsRead,
} from '@/server/actions/groups';
import type { GroupMemberView, GroupMessageView } from '@/server/groups';
import type { aiCharacters, groups } from '@/db/schema';

type CharacterRow = typeof aiCharacters.$inferSelect;
type GroupRow = typeof groups.$inferSelect;

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '☕️', '🌙', '🍜', '👏', '👀'];

export function GroupChatWindow({
  group,
  members,
  allCharacters,
  initialMessages,
}: {
  group: GroupRow;
  members: GroupMemberView[];
  allCharacters: CharacterRow[];
  initialMessages: GroupMessageView[];
}) {
  const [messages, setMessages] = useState<GroupMessageView[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [replyingTo, setReplyingTo] = useState<GroupMessageView | null>(null);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [activeReactionPickerMsgId, setActiveReactionPickerMsgId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  // Sync initial messages when props change
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Mark group read on mount and when group changes
  useEffect(() => {
    markGroupAsRead(group.id).catch(console.error);
  }, [group.id]);

  // Scroll to bottom
  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  useEffect(() => {
    const handleResize = () => {
      const el = scrollRef.current;
      if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Real-time polling for group messages and opportunistic ticks
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/groups/${group.id}/messages`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.messages)) {
            setMessages(data.messages);
          }
        }
      } catch (err) {
        console.error('Failed to poll group messages', err);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [group.id]);

  // Handle Send Message
  const handleSend = async (rawText?: string) => {
    const text = (rawText ?? inputValue).trim();
    if (!text || isPending) return;

    // Detect mentioned AI members in text
    const mentions: { type: 'ai'; id: string; name: string; username: string }[] = [];
    members.forEach((m) => {
      if (m.characterId && (text.includes(`@${m.name}`) || text.includes(`@${m.username}`))) {
        mentions.push({
          type: 'ai',
          id: m.characterId,
          name: m.name,
          username: m.username,
        });
      }
    });

    const replyId = replyingTo?.id;

    // Optimistic UI insert
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: GroupMessageView = {
      id: tempId,
      groupId: group.id,
      senderType: 'user',
      senderCharacterId: null,
      senderName: '我',
      senderUsername: 'me',
      senderAvatarEmoji: '👤',
      senderAvatarColor: 'violet',
      senderAvatarUrl: null,
      content: text,
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            senderName: replyingTo.senderName,
            content: replyingTo.content.slice(0, 60),
          }
        : null,
      mentions,
      reactions: [],
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputValue('');
    setReplyingTo(null);
    setShowMentionPicker(false);
    stickToBottomRef.current = true;
    scrollToBottom();

    startTransition(async () => {
      try {
        await sendGroupMessage(group.id, {
          content: text,
          replyToMessageId: replyId,
          mentions,
        });
      } catch (err) {
        console.error('Failed to send group message', err);
      }
    });
  };

  // Toggle Reaction
  const handleReaction = async (messageId: string, emoji: string) => {
    setActiveReactionPickerMsgId(null);
    try {
      await toggleGroupReaction(group.id, messageId, emoji);
      const res = await fetch(`/api/groups/${group.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      }
    } catch (err) {
      console.error('Failed to toggle reaction', err);
    }
  };

  // Insert mention from picker
  const insertMention = (member: GroupMemberView) => {
    const mentionTag = `@${member.name} `;
    setInputValue((prev) => `${prev}${mentionTag}`);
    setShowMentionPicker(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header — friend first, matches private chat structure */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-2 sm:px-4">
        <Link
          href="/messages"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-secondary transition-colors hover:bg-muted lg:hidden"
          aria-label="返回群聊列表"
        >
          <ArrowLeft size={19} />
        </Link>
        <UserAvatar
          name={group.name}
          emoji={group.avatarEmoji}
          color={group.avatarColor}
          url={group.avatarUrl}
          size={36}
        />
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold leading-tight">{group.name}</span>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium text-secondary">
              {members.length}人
            </span>
          </div>
          <Text type="supporting" size="sm" as="div" className="truncate">
            {group.description || `${members.map((m) => m.name).join('、')}`}
          </Text>
        </div>
        <Button
          label="群资料"
          variant="ghost"
          size="sm"
          icon={<Info size={15} />}
          onClick={() => setShowInfoDrawer(true)}
        />
      </header>

      {/* Messages — exactly max-w-[720px] and ChatMessageList as in private chat */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="w-full px-4 py-4 sm:px-6">
          <ChatMessageList gap={2}>
            {messages.map((m) => {
              const isUser = m.senderType === 'user';
              const isSystem = m.senderType === 'system';

              if (isSystem) {
                return (
                  <div key={m.id} className="my-1 flex justify-center">
                    <span className="rounded-full bg-muted px-3 py-1 text-xs text-secondary">
                      {m.content}
                    </span>
                  </div>
                );
              }

              if (isUser) {
                return (
                  <ChatMessage key={m.id} sender="user">
                    {m.replyTo && (
                      <div className="mb-1 flex items-center gap-1 text-xs text-secondary">
                        <Reply size={12} />
                        <span className="truncate max-w-[280px]">
                          回复 @{m.replyTo.senderName}: {m.replyTo.content}
                        </span>
                      </div>
                    )}
                    <ChatMessageBubble variant="filled">
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    </ChatMessageBubble>
                    {m.reactions && m.reactions.length > 0 && (
                      <div className="mt-1 flex flex-wrap justify-end gap-1">
                        {m.reactions.map((rx) => (
                          <button
                            key={rx.emoji}
                            type="button"
                            onClick={() => handleReaction(m.id, rx.emoji)}
                            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-all ${
                              rx.hasReacted
                                ? 'border-accent bg-accent/15 text-accent'
                                : 'border-border bg-surface text-secondary hover:bg-muted'
                            }`}
                          >
                            <span>{rx.emoji}</span>
                            <span className="text-[11px]">{rx.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </ChatMessage>
                );
              }

              const charAvatar = (
                <UserAvatar
                  name={m.senderName}
                  emoji={m.senderAvatarEmoji}
                  color={m.senderAvatarColor}
                  url={m.senderAvatarUrl}
                  size={36}
                />
              );

              return (
                <ChatMessage
                  key={m.id}
                  sender="assistant"
                  name={m.senderName}
                  avatar={charAvatar}
                >
                  {m.replyTo && (
                    <div className="mb-1 flex items-center gap-1 text-xs text-secondary">
                      <Reply size={12} />
                      <span className="truncate max-w-[280px]">
                        回复 @{m.replyTo.senderName}: {m.replyTo.content}
                      </span>
                    </div>
                  )}
                  <ChatMessageBubble variant="ghost">
                    <Markdown className="text-[15px]">{m.content}</Markdown>
                  </ChatMessageBubble>
                  {m.reactions && m.reactions.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {m.reactions.map((rx) => (
                        <button
                          key={rx.emoji}
                          type="button"
                          onClick={() => handleReaction(m.id, rx.emoji)}
                          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-all ${
                            rx.hasReacted
                              ? 'border-accent bg-accent/15 text-accent'
                              : 'border-border bg-surface text-secondary hover:bg-muted'
                          }`}
                        >
                          <span>{rx.emoji}</span>
                          <span className="text-[11px]">{rx.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </ChatMessage>
              );
            })}
          </ChatMessageList>
        </div>
      </div>

      {/* Composer — fixed footer matching private chat */}
      <footer className="shrink-0 border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
        <div className="w-full flex flex-col gap-2">
          {replyingTo && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted px-3 py-1.5 text-xs">
              <div className="flex items-center gap-1.5 truncate">
                <Reply size={12} className="text-secondary" />
                <span className="text-secondary">回复 @{replyingTo.senderName}:</span>
                <span className="truncate max-w-[320px]">{replyingTo.content}</span>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="text-secondary hover:text-primary p-0.5"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {showMentionPicker && (
            <div className="rounded-xl border border-border bg-surface p-2 shadow-lg">
              <div className="mb-1.5 flex items-center justify-between px-1 text-[11px] font-medium text-secondary">
                <span className="flex items-center gap-1">
                  <AtSign size={11} />
                  选择要 @ 的群成员
                </span>
                <button
                  type="button"
                  onClick={() => setShowMentionPicker(false)}
                  className="text-secondary hover:text-primary"
                >
                  关闭
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {members
                  .filter((m) => m.memberType === 'ai')
                  .map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => insertMention(m)}
                      className="flex items-center gap-1.5 rounded-xl border border-border bg-muted px-2.5 py-1 text-xs hover:border-accent hover:bg-muted/80 transition-colors"
                    >
                      <UserAvatar
                        name={m.name}
                        emoji={m.avatarEmoji}
                        color={m.avatarColor}
                        size={20}
                        tooltip={false}
                      />
                      <span className="font-medium">{m.name}</span>
                      <span className="text-[10px] text-secondary">@{m.username}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          <ChatComposer
            elevation="none"
            placeholder={`发消息给群聊「${group.name}」…`}
            value={inputValue}
            onChange={(v) => {
              setInputValue(v);
              if (v.endsWith('@')) {
                setShowMentionPicker(true);
              }
            }}
            onSubmit={(text) => handleSend(text)}
            isDisabled={isPending}
            footerActions={
              <Button
                label="@ 成员"
                variant="ghost"
                size="sm"
                icon={<AtSign size={15} />}
                onClick={() => setShowMentionPicker(!showMentionPicker)}
              />
            }
          />
        </div>
      </footer>

      {/* Group Info Drawer */}
      <GroupInfoDrawer
        group={group}
        members={members}
        allCharacters={allCharacters}
        isOpen={showInfoDrawer}
        onClose={() => setShowInfoDrawer(false)}
      />
    </div>
  );
}
