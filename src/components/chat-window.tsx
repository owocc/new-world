'use client';

import { useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
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

const spin = stylex.keyframes({
  from: {transform: 'rotate(0deg)'},
  to: {transform: 'rotate(360deg)'},
});
const bounce = stylex.keyframes({
  '0%, 100%': {transform: 'translateY(-25%)', animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)'},
  '50%': {transform: 'translateY(0)', animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)'},
});

const styles = stylex.create({
  root: {display: 'flex', height: '100%', minHeight: 0, flexDirection: 'column'},
  header: {
    display: 'flex',
    height: '56px',
    flexShrink: 0,
    alignItems: 'center',
    gap: 'var(--spacing-2)',
    borderBottom: 'var(--border-width) solid var(--color-border)',
    backgroundColor: 'var(--color-background-surface)',
    paddingInline: 'var(--spacing-2)',
    '@media (min-width: 640px)': {paddingInline: 'var(--spacing-4)'},
  },
  mobileBack: {
    display: 'flex',
    width: '36px',
    height: '36px',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-full)',
    color: 'var(--color-text-secondary)',
    transition: 'color 175ms ease, background-color 175ms ease',
    ':hover': {'@media (hover: hover)': {backgroundColor: 'var(--color-background-muted)'}},
    '@media (min-width: 1024px)': {display: 'none'},
  },
  headerInfo: {minWidth: 0, flex: 1, overflow: 'hidden'},
  headerName: {overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '15px', fontWeight: 'var(--font-weight-semibold)', lineHeight: 1.25},
  shrink: {flexShrink: 0},
  headerBio: {overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'},
  scrollArea: {minHeight: 0, flex: 1, overflowY: 'auto', overscrollBehavior: 'contain'},
  messagesInner: {
    width: '100%',
    padding: 'var(--spacing-4)',
    '@media (min-width: 640px)': {paddingInline: 'var(--spacing-6)'},
  },
  emptyState: {
    display: 'flex',
    minHeight: '50vh',
    height: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--spacing-3)',
    textAlign: 'center',
  },
  spinner: {
    animationName: spin,
    animationDuration: '1s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
  },
  emptyName: {fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)'},
  emptyBio: {maxWidth: '20rem'},
  attachmentSingle: {maxWidth: '340px', marginBottom: 'var(--spacing-2)'},
  attachmentGrid: {
    display: 'grid',
    maxWidth: '380px',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 'var(--spacing-1-5)',
    marginBottom: 'var(--spacing-2)',
  },
  attachmentImage: {
    width: '100%',
    height: 'auto',
    maxHeight: '280px',
    objectFit: 'cover',
    transition: 'transform 200ms ease',
    ':hover': {'@media (hover: hover)': {transform: 'scale(1.02)'}},
  },
  userMessage: {whiteSpace: 'pre-wrap', overflowWrap: 'break-word'},
  assistantMarkdown: {fontSize: '15px'},
  typing: {display: 'flex', alignItems: 'center', gap: '6px', paddingBlock: '4px', paddingInline: '2px'},
  typingDot: {
    width: '6px',
    height: '6px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-text-secondary)',
    animationName: bounce,
    animationDuration: '1s',
    animationTimingFunction: 'cubic-bezier(0.8, 0, 0.2, 1)',
    animationIterationCount: 'infinite',
  },
  footer: {
    flexShrink: 0,
    borderTop: 'var(--border-width) solid var(--color-border)',
    backgroundColor: 'var(--color-background-surface)',
    paddingInline: 'var(--spacing-4)',
    paddingTop: 'var(--spacing-3)',
    paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
    '@media (min-width: 640px)': {paddingInline: 'var(--spacing-6)'},
  },
  fullWidth: {width: '100%'},
  hidden: {display: 'none'},
  drawerList: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--spacing-2)', paddingBlock: 'var(--spacing-1)'},
  pendingItem: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-2)',
    border: 'var(--border-width) solid var(--color-border)',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--color-background-surface)',
    padding: '6px 8px 6px 6px',
    fontSize: 'var(--font-size-xs)',
  },
  thumbnail: {
    position: 'relative',
    display: 'flex',
    width: '48px',
    height: '48px',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 'var(--radius-element)',
    backgroundColor: 'var(--color-background-muted)',
  },
  thumbnailImage: {width: '100%', height: '100%', objectFit: 'cover'},
  uploadOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: 'white',
  },
  errorOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'color-mix(in srgb, var(--color-error) 70%, transparent)',
    color: 'white',
  },
  fileInfo: {maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'},
  fileName: {overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 'var(--font-weight-medium)'},
  fileStatus: {color: 'var(--color-text-secondary)', fontSize: '11px'},
  iconButton: {
    border: 0,
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'transparent',
    padding: 'var(--spacing-1)',
    color: 'var(--color-text-secondary)',
    ':hover': {'@media (hover: hover)': {color: 'var(--color-text-primary)', backgroundColor: 'var(--color-background-muted)'}},
  },
  iconButtonError: {':hover': {'@media (hover: hover)': {color: 'var(--color-error)', backgroundColor: 'var(--color-background-muted)'}}},
  footerActions: {display: 'flex', alignItems: 'center', gap: '6px'},
});

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
    <div {...stylex.props(styles.root)}>
      {/* Lightbox Modal */}
      <MediaLightbox
        media={activeLightboxMedia}
        onClose={() => setActiveLightboxMedia(null)}
      />

      {/* header — friend first */}
      <header {...stylex.props(styles.header)}>
        <Link
          href="/messages"
          {...stylex.props(styles.mobileBack)}
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
        <div {...stylex.props(styles.headerInfo)}>
          <div {...stylex.props(styles.headerName)}>{character.name}</div>
          {character.bio && (
            <Text type="supporting" size="sm" as="div" xstyle={styles.headerBio}>
              {character.bio}
            </Text>
          )}
        </div>
        <Link href={`/characters/${character.id}`} {...stylex.props(styles.shrink)}>
          <Button label="查看资料" variant="ghost" size="sm" />
        </Link>
      </header>

      {/* messages */}
      <div ref={scrollRef} onScroll={onScroll} {...stylex.props(styles.scrollArea)}>
        <div {...stylex.props(styles.messagesInner)}>
          {messages.length === 0 ? (
            <div {...stylex.props(styles.emptyState)}>
              <UserAvatar
                name={character.name}
                emoji={character.avatarEmoji}
                color={character.avatarColor}
                url={character.avatarUrl}
                size={72}
              />
              <div {...stylex.props(styles.emptyName)}>{character.name}</div>
              <Text type="supporting" as="p" xstyle={styles.emptyBio}>
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
                          {...stylex.props(attachments.length === 1 ? styles.attachmentSingle : styles.attachmentGrid)}
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
                                {...stylex.props(styles.attachmentImage)}
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Message text */}
                      {text && text.trim() ? (
                        isUser ? (
                          <p {...stylex.props(styles.userMessage)}>{text}</p>
                        ) : (
                          <Markdown xstyle={styles.assistantMarkdown}>{text}</Markdown>
                        )
                      ) : null}
                    </ChatMessageBubble>
                  </ChatMessage>
                );
              })}

              {status === 'submitted' && (
                <ChatMessage sender="assistant" avatar={avatar}>
                  <ChatMessageBubble variant="filled">
                    <span {...stylex.props(styles.typing)} aria-label="正在输入">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          {...stylex.props(styles.typingDot)}
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
      <footer {...stylex.props(styles.footer)}>
        <div {...stylex.props(styles.fullWidth)}>
          {/* Hidden File Picker */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            {...stylex.props(styles.hidden)}
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
                  <div {...stylex.props(styles.drawerList)}>
                    {pendingImages.map((img) => (
                      <div
                        key={img.id}
                        {...stylex.props(styles.pendingItem)}
                      >
                        <div {...stylex.props(styles.thumbnail)}>
                          <img
                            src={img.previewUrl}
                            alt="preview"
                            {...stylex.props(styles.thumbnailImage)}
                          />
                          {img.status === 'uploading' && (
                            <div {...stylex.props(styles.uploadOverlay)}>
                              <Loader2 {...stylex.props(styles.spinner)} size={16} />
                            </div>
                          )}
                          {img.status === 'error' && (
                            <div {...stylex.props(styles.errorOverlay)}>
                              <X size={16} />
                            </div>
                          )}
                        </div>

                        <div {...stylex.props(styles.fileInfo)}>
                          <div {...stylex.props(styles.fileName)}>{img.file.name}</div>
                          <div {...stylex.props(styles.fileStatus)}>
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
                            {...stylex.props(styles.iconButton)}
                            title="重试"
                          >
                            <RefreshCw size={14} />
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => removePendingImage(img.id)}
                          {...stylex.props(styles.iconButton, styles.iconButtonError)}
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
              <div {...stylex.props(styles.footerActions)}>
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
