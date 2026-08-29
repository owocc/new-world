'use client';

import { useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Camera, Check, Loader2, RefreshCw, Trash2, Upload } from 'lucide-react';
import { Button } from '@astryxdesign/core/Button';
import { UserAvatar, AVATAR_COLORS } from '@/components/user-avatar';
import { AvatarCropModal } from '@/components/avatar-crop-modal';
import { useAppToast } from '@/lib/toast';

export const COMMON_EMOJIS = [
  '🙂', '🌙', '🍜', '🎮', '📚', '💪', '☕️', '🐱', '🐶', '🌸',
  '🎸', '🎧', '✈️', '🎨', '⚽️', '🧋', '🦊', '🐧', '🌻', '⚡️',
  '💬', '🔥', '🎉', '💡', '🚀', '✨', '🍀', '🏖️', '🍩', '🧩',
];

const COLOR_MAP: Record<string, string> = {
  violet: '#8b5cf6',
  rose: '#fb7185',
  indigo: '#818cf8',
  emerald: '#34d399',
  amber: '#fbbf24',
  sky: '#38bdf8',
  teal: '#2dd4bf',
  fuchsia: '#e879f9',
};

const spin = stylex.keyframes({
  from: { transform: 'rotate(0deg)' },
  to: { transform: 'rotate(360deg)' },
});

const styles = stylex.create({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  previewCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    borderRadius: 'var(--radius-container, 12px)',
    backgroundColor: 'var(--color-background-surface)',
    border: '1px solid var(--color-border)',
  },
  avatarContainer: {
    position: 'relative',
    width: '64px',
    height: '64px',
    flexShrink: 0,
    borderRadius: 'var(--radius-container, 12px)',
    overflow: 'hidden',
  },
  avatarOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 0,
    borderRadius: 'var(--radius-container, 12px)',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    color: '#fff',
    opacity: 0,
    transition: 'opacity 175ms ease',
    ':hover': { opacity: 1 },
    ':focus-visible': { opacity: 1 },
    ':disabled': { opacity: 1 },
  },
  avatarOverlayVisible: {
    opacity: 1,
  },
  spinIcon: {
    animationName: spin,
    animationDuration: '1s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
  },
  hidden: {
    display: 'none',
  },
  previewMeta: {
    minWidth: 0,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  previewModeTitle: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text-primary)',
  },
  previewModeSubtitle: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-secondary)',
  },
  actionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '8px',
    marginTop: '2px',
  },
  tabsHeader: {
    display: 'flex',
    borderBottom: '1px solid var(--color-border)',
    gap: '4px',
    paddingBottom: '2px',
  },
  tabBtn: {
    paddingInline: '12px',
    paddingBlock: '6px',
    border: 0,
    backgroundColor: 'transparent',
    borderRadius: 'var(--radius-element, 8px)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    ':hover': {
      backgroundColor: 'var(--color-background-muted)',
      color: 'var(--color-text-primary)',
    },
  },
  tabBtnActive: {
    backgroundColor: 'var(--color-background-muted)',
    color: 'var(--color-text-accent)',
    fontWeight: 'var(--font-weight-semibold)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sectionLabel: {
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text-secondary)',
  },
  emojiGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    maxHeight: '136px',
    overflowY: 'auto',
    padding: '2px',
  },
  emojiButton: {
    display: 'flex',
    width: '38px',
    height: '38px',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-element, 8px)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-background-surface)',
    fontSize: '18px',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    ':hover': {
      backgroundColor: 'var(--color-background-muted)',
      transform: 'scale(1.06)',
    },
  },
  emojiSelected: {
    borderColor: 'var(--color-accent)',
    backgroundColor: 'var(--color-accent-muted)',
    boxShadow: 'var(--shadow-low)',
    transform: 'scale(1.05)',
  },
  colorGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '2px',
  },
  colorButton: {
    display: 'flex',
    width: '34px',
    height: '34px',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-element, 8px)',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    ':hover': {
      transform: 'scale(1.08)',
    },
  },
  colorSelected: {
    borderColor: 'var(--color-accent)',
    boxShadow: '0 0 0 2px var(--color-background-surface), 0 0 0 4px var(--color-accent)',
    transform: 'scale(1.05)',
  },
  checkIcon: {
    color: '#fff',
    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
  },
});

export interface AvatarPickerProps {
  name: string;
  avatarUrl?: string | null;
  avatarEmoji?: string | null;
  avatarColor?: string | null;
  onUrlChange?: (url: string | null) => void;
  onEmojiChange?: (emoji: string) => void;
  onColorChange?: (color: string) => void;
  /** Custom upload handler, defaults to posting to /api/media/upload */
  onUpload?: (blob: Blob) => Promise<string>;
  showEmojiColorTab?: boolean;
}

export function AvatarPicker({
  name,
  avatarUrl,
  avatarEmoji = '🙂',
  avatarColor = 'violet',
  onUrlChange,
  onEmojiChange,
  onColorChange,
  onUpload,
  showEmojiColorTab = true,
}: AvatarPickerProps) {
  const toast = useAppToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'image' | 'emoji'>(
    avatarUrl ? 'image' : 'emoji',
  );
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setCropImageSrc(objectUrl);
    setCropModalOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropConfirm = async (croppedBlob: Blob) => {
    setUploading(true);
    try {
      if (onUpload) {
        const url = await onUpload(croppedBlob);
        onUrlChange?.(url);
      } else {
        const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('purpose', 'avatar');

        const res = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          throw new Error('上传失败');
        }

        const data = await res.json();
        onUrlChange?.(data.media.blobUrl);
      }
      toast.success('头像上传成功');
      setActiveTab('image');
    } catch (err) {
      console.error('[AvatarPicker] Upload error:', err);
      toast.error('头像上传失败，请重试');
    } finally {
      setUploading(false);
      setCropModalOpen(false);
      if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
      setCropImageSrc(null);
    }
  };

  const handleRemoveImage = () => {
    onUrlChange?.(null);
    toast.success('已切换为 Emoji 默认头像');
    setActiveTab('emoji');
  };

  return (
    <div {...stylex.props(styles.root)}>
      <AvatarCropModal
        isOpen={cropModalOpen}
        imageSrc={cropImageSrc}
        onClose={() => {
          setCropModalOpen(false);
          if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
          setCropImageSrc(null);
        }}
        onConfirm={handleCropConfirm}
      />

      {/* Live Preview Card */}
      <div {...stylex.props(styles.previewCard)}>
        <div {...stylex.props(styles.avatarContainer)}>
          <UserAvatar
            name={name || '头像'}
            url={avatarUrl}
            emoji={avatarEmoji}
            color={avatarColor}
            size={64}
            tooltip={false}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            {...stylex.props(styles.avatarOverlay, uploading && styles.avatarOverlayVisible)}
            title="点击更换图片头像"
          >
            {uploading ? (
              <Loader2 size={20} {...stylex.props(styles.spinIcon)} />
            ) : (
              <Camera size={20} />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            {...stylex.props(styles.hidden)}
            onChange={handleFileSelect}
          />
        </div>

        <div {...stylex.props(styles.previewMeta)}>
          <div {...stylex.props(styles.previewModeTitle)}>
            {avatarUrl ? '当前使用：自定义图片头像' : `当前使用：Emoji 渐变头像 (${avatarEmoji || '🙂'})`}
          </div>
          <div {...stylex.props(styles.previewModeSubtitle)}>
            {avatarUrl ? '可直接上传新图片替换，或切换为 Emoji 图标' : '支持选取喜欢的 Emoji 与渐变色彩背景'}
          </div>

          <div {...stylex.props(styles.actionRow)}>
            <Button
              label={uploading ? '上传中…' : avatarUrl ? '更换图片' : '上传图片头像'}
              size="sm"
              variant="secondary"
              icon={uploading ? <Loader2 size={14} {...stylex.props(styles.spinIcon)} /> : <Upload size={14} />}
              isDisabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            />

            {avatarUrl ? (
              <Button
                label="恢复 Emoji 头像"
                size="sm"
                variant="ghost"
                icon={<RefreshCw size={14} />}
                onClick={handleRemoveImage}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* Mode Configuration Tabs */}
      {showEmojiColorTab && (
        <>
          <div {...stylex.props(styles.tabsHeader)}>
            <button
              type="button"
              onClick={() => setActiveTab('emoji')}
              {...stylex.props(styles.tabBtn, activeTab === 'emoji' && styles.tabBtnActive)}
            >
              Emoji & 渐变底色配置
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              {...stylex.props(styles.tabBtn, activeTab === 'image' && styles.tabBtnActive)}
            >
              图片上传
            </button>
          </div>

          {activeTab === 'emoji' && (
            <div {...stylex.props(styles.section)}>
              <div>
                <label {...stylex.props(styles.sectionLabel)}>选择 Emoji 图标</label>
                <div {...stylex.props(styles.emojiGrid)}>
                  {COMMON_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      aria-label={`选择 Emoji ${emoji}`}
                      onClick={() => onEmojiChange?.(emoji)}
                      {...stylex.props(
                        styles.emojiButton,
                        avatarEmoji === emoji && styles.emojiSelected,
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label {...stylex.props(styles.sectionLabel)}>选择底色配色</label>
                <div {...stylex.props(styles.colorGrid)}>
                  {AVATAR_COLORS.map((color) => {
                    const bg = COLOR_MAP[color] || '#8b5cf6';
                    const isSelected = avatarColor === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        aria-label={`选择底色 ${color}`}
                        onClick={() => onColorChange?.(color)}
                        style={{ backgroundColor: bg }}
                        {...stylex.props(
                          styles.colorButton,
                          isSelected && styles.colorSelected,
                        )}
                      >
                        {isSelected && <Check size={16} {...stylex.props(styles.checkIcon)} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
