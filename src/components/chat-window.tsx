'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import Link from 'next/link';
import { ArrowLeft, Image as ImageIcon, Loader2, RefreshCw, X } from 'lucide-react';
import {
  ChatMessageList,
  ChatMessage,
  ChatMessageBubble,
  ChatComposer,
  ChatComposerDrawer,
} from '@astryxdesign/core/Chat';
import { Markdown } from '@astryxdesign/core/Markdown';
import { Button } from '@astryxdesign/core/Button';
import { Text } from '@astryxdesign/core/Text';
import { UserAvatar } from '@/components/user-avatar';
import { MediaLightbox } from '@/components/media-lightbox';
import { useAppToast } from '@/lib/toast';
import { resolveMediaUrl } from '@/lib/utils';
import { markRead } from '@/server/actions/chat';
import type { aiCharacters } from '@/db/schema';
import type { MediaAssetView } from '@/server/media';

type CharacterRow = typeof aiCharacters.$inferSelect;

type InitialMessage = {
  id: string;
  role: string;
  content: string;
  attachments?: MediaAssetView[];
  createdAt: Date;
};

type PendingImage = {
  id: string;
  file: File;
  previewUrl: string;
  assetId?: string;
  blobUrl?: string;
  status: 'uploading' | 'ready' | 'error';
  error?: string;
};

export function ChatWindow({
  conversationId,
  character,
  initialMessages,
}: {
  conversationId: string;
  character: CharacterRow;
  initialMessages: InitialMessage[];
}) {
  const toast = useAppToast();
  const [composerValue, setComposerValue] = useState('');
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [activeLightboxMedia, setActiveLightboxMedia] = useState<{
    url: string;
    originalFilename?: string | null;
    width?: number | null;
    height?: number | null;
  } | null>(null);

  // Map to store attachments for messages (both initial and optimistically sent)
  const [messageAttachmentsMap, setMessageAttachmentsMap] = useState<Record<string, MediaAssetView[]>>(() => {
    const initialMap: Record<string, MediaAssetView[]> = {};
    for (const m of initialMessages) {
      if (m.attachments && m.attachments.length > 0) {
        initialMap[m.id] = m.attachments;
      }
    }
    return initialMap;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImagesRef = useRef<PendingImage[]>([]);
  pendingImagesRef.current = pendingImages;

  const { messages, sendMessage, status, error, regenerate, stop } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { conversationId },
    }),
    messages: initialMessages.map((m) => ({
      id: m.id,
      role: m.role === 'assistant' ? 'assistant' : 'user',
      parts: [{ type: 'text', text: m.content }],
    })),
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

  // keep pinned to bottom when viewport resizes
  useEffect(() => {
    const scrollToBottom = () => {
      const el = scrollRef.current;
      if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
    };
    window.addEventListener('resize', scrollToBottom);
    return () => window.removeEventListener('resize', scrollToBottom);
  }, []);

  // Upload a single selected file
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

  const handleSubmit = (text: string) => {
    if (isUploadingAny || generating) return;

    const readyAttachments = pendingImages
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

    if (!text.trim() && mediaAssetIds.length === 0) return;

    stickToBottomRef.current = true;

    // Send with media asset IDs in body
    sendMessage(
      { text: text.trim() },
      {
        body: {
          conversationId,
          mediaAssetIds,
        },
      },
    );

    // If attachments were sent, attach them to the pending message view
    if (readyAttachments.length > 0) {
      // Clear pending images
      setPendingImages([]);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Lightbox Modal */}
      <MediaLightbox
        media={activeLightboxMedia}
        onClose={() => setActiveLightboxMedia(null)}
      />

      {/* header — friend first */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-2 sm:px-4 bg-surface">
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

      {/* messages */}
      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="w-full px-4 py-4 sm:px-6">
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
                  .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                  .map((p) => p.text)
                  .join('');

                const attachments = messageAttachmentsMap[m.id] || [];

                return (
                  <ChatMessage
                    key={m.id}
                    sender={isUser ? 'user' : 'assistant'}
                    avatar={isUser ? undefined : avatar}
                  >
                    <ChatMessageBubble variant="filled">
                      {/* Image attachments display */}
                      {attachments.length > 0 && (
                        <div
                          className={`mb-2 ${
                            attachments.length === 1
                              ? 'max-w-[340px]'
                              : 'grid grid-cols-2 gap-1.5 max-w-[380px]'
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
                            >
                              <img
                                src={resolveMediaUrl(att.blobUrl) || att.blobUrl}
                                alt={att.originalFilename || '图片'}
                                className="w-full h-auto max-h-[280px] object-cover transition-transform duration-200 group-hover/img:scale-[1.02]"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Message text */}
                      {text && text.trim() ? (
                        isUser ? (
                          <p className="whitespace-pre-wrap break-words">{text}</p>
                        ) : (
                          <Markdown className="text-[15px]">{text}</Markdown>
                        )
                      ) : null}
                    </ChatMessageBubble>
                  </ChatMessage>
                );
              })}

              {status === 'submitted' && (
                <ChatMessage sender="assistant" avatar={avatar}>
                  <ChatMessageBubble variant="filled">
                    <span className="flex items-center gap-1.5 py-1 px-0.5" aria-label="正在输入">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 animate-bounce rounded-full bg-secondary"
                          style={{ animationDelay: `${i * 0.15}s` }}
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

      {/* composer */}
      <footer className="shrink-0 border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
        <div className="w-full">
          {/* Hidden File Picker */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            className="hidden"
            onChange={handleFileSelect}
          />

          <ChatComposer
            elevation="none"
            placeholder={
              pendingImages.length > 0
                ? '添加说明，或直接发送图片…'
                : `给 ${character.name} 发消息…`
            }
            onSubmit={handleSubmit}
            onStop={() => stop()}
            isStopShown={generating}
            isDisabled={status === 'submitted'}
            status={error ? { type: 'error', message: error.message || '消息发送失败' } : undefined}
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
                  isDisabled={isUploadingAny || generating}
                />
                {error ? (
                  <Button label="重试" variant="ghost" size="sm" onClick={() => regenerate()} />
                ) : null}
              </div>
            }
          />
        </div>
      </footer>
    </div>
  );
}
