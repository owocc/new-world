'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Reply,
  X,
  AtSign,
  Info,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  ChatMessageList,
  ChatMessage,
  ChatMessageBubble,
  ChatSystemMessage,
  ChatComposer,
  ChatComposerDrawer,
} from '@astryxdesign/core/Chat';
import { Markdown } from '@astryxdesign/core/Markdown';
import { Button } from '@astryxdesign/core/Button';
import { Text } from '@astryxdesign/core/Text';
import { UserAvatar } from '@/components/user-avatar';
import { MediaLightbox } from '@/components/media-lightbox';
import { GroupInfoDrawer } from './group-info-drawer';
import { useAppToast } from '@/lib/toast';
import { resolveMediaUrl } from '@/lib/utils';
import {
  sendGroupMessage,
  toggleGroupReaction,
  markGroupAsRead,
} from '@/server/actions/groups';
import type { GroupMemberView, GroupMessageView } from '@/server/groups';
import type { aiCharacters, groups } from '@/db/schema';
import type { MediaAssetView } from '@/server/media';

type CharacterRow = typeof aiCharacters.$inferSelect;
type GroupRow = typeof groups.$inferSelect;

type PendingImage = {
  id: string;
  file: File;
  previewUrl: string;
  assetId?: string;
  blobUrl?: string;
  status: 'uploading' | 'ready' | 'error';
  error?: string;
};

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
  const toast = useAppToast();
  const [messages, setMessages] = useState<GroupMessageView[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [replyingTo, setReplyingTo] = useState<GroupMessageView | null>(null);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [activeLightboxMedia, setActiveLightboxMedia] = useState<{
    url: string;
    originalFilename?: string | null;
    width?: number | null;
    height?: number | null;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stickToBottomRef = useRef(true);

  // Sync initial messages when props change
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Mark group read on mount and when group changes
  useEffect(() => {
    markGroupAsRead(group.id).catch(console.error);
  }, [group.id]);

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

  // Real-time polling for group messages
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

  // Image Upload helper
  const uploadImageFile = async (file: File) => {
    const tempId = crypto.randomUUID();
    const previewUrl = URL.createObjectURL(file);

    const newPending: PendingImage = {
      id: tempId,
      file,
      previewUrl,
      status: 'uploading',
    };

    setPendingImages((prev) => [...prev, newPending]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', 'attachment');

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setPendingImages((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? { ...item, status: 'error', error: data.error || '上传失败' }
              : item,
          ),
        );
        toast.error(data.error || '图片上传失败');
        return;
      }

      setPendingImages((prev) =>
        prev.map((item) =>
          item.id === tempId
            ? {
                ...item,
                status: 'ready',
                assetId: data.media.id,
                blobUrl: data.media.blobUrl,
              }
            : item,
        ),
      );
    } catch (err) {
      console.error('Failed to upload image', err);
      setPendingImages((prev) =>
        prev.map((item) =>
          item.id === tempId ? { ...item, status: 'error', error: '网络错误' } : item,
        ),
      );
      toast.error('网络错误，图片上传失败');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    for (const file of files) {
      uploadImageFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const retryUpload = (img: PendingImage) => {
    setPendingImages((prev) => prev.filter((i) => i.id !== img.id));
    uploadImageFile(img.file);
  };

  const removePendingImage = (id: string) => {
    setPendingImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const isUploadingAny = pendingImages.some((i) => i.status === 'uploading');

  // Handle Send Message
  const handleSend = async (rawText?: string) => {
    const text = (rawText ?? inputValue).trim();
    if (isUploadingAny || isPending) return;

    const readyAttachments: MediaAssetView[] = pendingImages
      .filter((i) => i.status === 'ready' && i.assetId && i.blobUrl)
      .map((i) => ({
        id: i.assetId!,
        userId: '',
        mediaType: 'image' as const,
        blobUrl: i.blobUrl!,
        pathname: '',
        downloadUrl: null,
        mimeType: i.file.type || 'image/jpeg',
        fileSize: i.file.size,
        originalFilename: i.file.name,
        width: null,
        height: null,
        duration: null,
        status: 'ready' as const,
        purpose: 'attachment' as const,
        createdAt: new Date(),
      }));

    const mediaAssetIds = readyAttachments.map((a) => a.id);

    if (!text && mediaAssetIds.length === 0) return;

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
      content: text || (mediaAssetIds.length > 0 ? '[图片]' : ''),
      attachments: readyAttachments,
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
    setPendingImages([]);
    stickToBottomRef.current = true;
    scrollToBottom();

    startTransition(async () => {
      try {
        await sendGroupMessage(group.id, {
          content: text,
          mediaAssetIds,
          replyToMessageId: replyId,
          mentions,
        });
      } catch (err) {
        console.error('Failed to send group message', err);
        toast.error('发送失败，请重试');
      }
    });
  };

  // Toggle Reaction
  const handleReaction = async (messageId: string, emoji: string) => {
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

  const insertMention = (member: GroupMemberView) => {
    const mentionTag = `@${member.name} `;
    setInputValue((prev) => `${prev}${mentionTag}`);
    setShowMentionPicker(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Lightbox */}
      <MediaLightbox
        media={activeLightboxMedia}
        onClose={() => setActiveLightboxMedia(null)}
      />

      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-2 sm:px-4 bg-surface">
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

      {/* Messages list */}
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
                  <ChatSystemMessage key={m.id} variant="default">
                    {m.content}
                  </ChatSystemMessage>
                );
              }

              const attachments = m.attachments || [];

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
                      {/* Attachments rendering */}
                      {attachments.length > 0 && (
                        <div
                          className={`mb-2 ${
                            attachments.length === 1
                              ? 'max-w-[320px]'
                              : 'grid grid-cols-2 gap-1.5 max-w-[360px]'
                          }`}
                        >
                          {attachments.map((att) => (
                            <div
                              key={att.id}
                              onClick={() =>
                                setActiveLightboxMedia({
                                  url: att.blobUrl,
                                  originalFilename: att.originalFilename,
                                  width: att.width,
                                  height: att.height,
                                })
                              }
                              className="group/img relative overflow-hidden rounded-xl border border-border/40 bg-surface/50 cursor-pointer transition-all hover:opacity-95 hover:shadow-md"
                            >
                              <img
                                src={resolveMediaUrl(att.blobUrl) || att.blobUrl}
                                alt={att.originalFilename || '图片'}
                                className="w-full h-auto max-h-[260px] object-cover transition-transform duration-200 group-hover/img:scale-[1.02]"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      {m.content && m.content !== '[图片]' ? (
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      ) : null}
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
                  <ChatMessageBubble variant="filled">
                    {/* Attachments rendering */}
                    {attachments.length > 0 && (
                      <div
                        className={`mb-2 ${
                          attachments.length === 1
                            ? 'max-w-[320px]'
                            : 'grid grid-cols-2 gap-1.5 max-w-[360px]'
                        }`}
                      >
                        {attachments.map((att) => (
                          <div
                            key={att.id}
                            onClick={() =>
                              setActiveLightboxMedia({
                                url: att.blobUrl,
                                originalFilename: att.originalFilename,
                                width: att.width,
                                height: att.height,
                              })
                            }
                            className="group/img relative overflow-hidden rounded-xl border border-border/40 bg-surface/50 cursor-pointer transition-all hover:opacity-95 hover:shadow-md"
                          >
                            <img
                              src={resolveMediaUrl(att.blobUrl) || att.blobUrl}
                              alt={att.originalFilename || '图片'}
                              className="w-full h-auto max-h-[260px] object-cover transition-transform duration-200 group-hover/img:scale-[1.02]"
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {m.content && m.content !== '[图片]' ? (
                      <Markdown className="text-[15px]">{m.content}</Markdown>
                    ) : null}
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

      {/* Composer */}
      <footer className="shrink-0 border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
        <div className="w-full flex flex-col gap-2">
          {/* Hidden File Picker */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            className="hidden"
            onChange={handleFileSelect}
          />

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
            placeholder={
              pendingImages.length > 0
                ? '添加说明，或直接发送图片…'
                : `发消息给群聊「${group.name}」…`
            }
            value={inputValue}
            onChange={(v) => {
              setInputValue(v);
              if (v.endsWith('@')) {
                setShowMentionPicker(true);
              }
            }}
            onSubmit={(text) => handleSend(text)}
            isDisabled={isPending || isUploadingAny}
            drawer={
              pendingImages.length > 0 ? (
                <ChatComposerDrawer count={pendingImages.length}>
                  <div className="flex flex-wrap items-center gap-2 py-1">
                    {pendingImages.map((img) => (
                      <div
                        key={img.id}
                        className="relative group flex items-center gap-2 p-1.5 pr-2 rounded-xl bg-surface border border-border text-xs"
                      >
                        <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                          <img
                            src={img.previewUrl}
                            alt="preview"
                            className="h-full w-full object-cover"
                          />
                          {img.status === 'uploading' && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                              <Loader2 className="animate-spin" size={16} />
                            </div>
                          )}
                          {img.status === 'error' && (
                            <div className="absolute inset-0 bg-error/70 flex items-center justify-center text-white">
                              <X size={16} />
                            </div>
                          )}
                        </div>

                        <div className="max-w-[120px] truncate">
                          <div className="font-medium truncate">{img.file.name}</div>
                          <div className="text-[11px] text-secondary">
                            {img.status === 'uploading'
                              ? '上传中…'
                              : img.status === 'error'
                              ? '上传失败'
                              : `${(img.file.size / 1024).toFixed(0)} KB`}
                          </div>
                        </div>

                        {img.status === 'error' ? (
                          <button
                            type="button"
                            onClick={() => retryUpload(img)}
                            className="p-1 rounded-full text-secondary hover:text-primary hover:bg-muted"
                            title="重试"
                          >
                            <RefreshCw size={14} />
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => removePendingImage(img.id)}
                          className="p-1 rounded-full text-secondary hover:text-error hover:bg-muted"
                          title="移除"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </ChatComposerDrawer>
              ) : undefined
            }
            footerActions={
              <div className="flex items-center gap-1.5">
                <Button
                  label="图片"
                  variant="ghost"
                  size="sm"
                  icon={<ImageIcon size={16} />}
                  aria-label="发送图片"
                  onClick={() => fileInputRef.current?.click()}
                  isDisabled={isUploadingAny || isPending}
                />
                <Button
                  label="@ 成员"
                  variant="ghost"
                  size="sm"
                  icon={<AtSign size={15} />}
                  onClick={() => setShowMentionPicker(!showMentionPicker)}
                />
              </div>
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
