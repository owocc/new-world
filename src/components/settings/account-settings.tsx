'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Camera, Loader2, LogOut, Trash2, Upload } from 'lucide-react';
import { Button } from '@astryxdesign/core/Button';
import { Section } from '@astryxdesign/core/Section';
import { TextInput } from '@astryxdesign/core/TextInput';
import { UserAvatar } from '@/components/user-avatar';
import { AvatarCropModal } from '@/components/avatar-crop-modal';
import { updateUserImageUrlAction } from '@/server/actions/media';
import {VStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {useAppToast} from '@/lib/toast';
import {authClient} from '@/lib/auth-client';
import {nativeAttrs} from '@/lib/native-attrs';
import {changePassword} from '@/server/actions/settings';

export function AccountSettings({
  name,
  email,
  bio,
  image,
  createdAt,
}: {
  name: string;
  email: string;
  bio: string;
  image: string | null;
  createdAt: string;
}) {
  const router = useRouter();
  const toast = useAppToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(image);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setCropImageSrc(objectUrl);
    setCropModalOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropConfirm = async (croppedBlob: Blob) => {
    setUploadingAvatar(true);
    try {
      const file = new File([croppedBlob], 'user-avatar.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', 'avatar');

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || '头像上传失败');
        return;
      }

      await updateUserImageUrlAction(data.media.blobUrl);
      setCurrentImage(data.media.blobUrl);
      toast.success('头像已更新');
      router.refresh();
    } catch (err) {
      console.error('Avatar upload error', err);
      toast.error('网络错误，上传头像失败');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await updateUserImageUrlAction(null);
      setCurrentImage(null);
      toast.success('已恢复默认头像');
      router.refresh();
    } catch {
      toast.error('操作失败');
    }
  };
  const change = async () => {
    if (!currentPassword || newPassword.length < 8) {
      toast.error('新密码至少 8 位');
      return;
    }
    setSaving(true);
    const res = await changePassword({currentPassword, newPassword});
    setSaving(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success('密码已修改');
    setCurrentPassword('');
    setNewPassword('');
  };

  const signOut = async () => {
    await authClient.signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <VStack gap={6}>
      {/* 1:1 Avatar Crop Modal */}
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

      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Link
          href="/settings"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-secondary hover:bg-muted lg:hidden"
          aria-label="返回设置菜单"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">账户与资料</h1>
          <p className="text-xs text-secondary">管理你的账号信息与安全凭证</p>
        </div>
      </div>
      <Section variant="transparent" padding={0}>
        <VStack gap={4}>
          <h2 className="text-base font-semibold">个人资料 & 头像</h2>
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface border border-border">
            <div className="relative group">
              <UserAvatar name={name || '我'} url={currentImage} size={64} />
              <button
                type="button"
                disabled={uploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
                title="点击更换头像"
              >
                {uploadingAvatar ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Camera size={20} />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                className="hidden"
                onChange={handleAvatarFileSelect}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold">{name || '社区创世者'}</div>
              <div className="truncate text-sm text-secondary">{email}</div>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  label={uploadingAvatar ? '上传中…' : '更换头像'}
                  size="sm"
                  variant="secondary"
                  icon={uploadingAvatar ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                  isDisabled={uploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                />
                {currentImage ? (
                  <Button
                    label="恢复默认"
                    size="sm"
                    variant="ghost"
                    icon={<Trash2 size={14} />}
                    onClick={handleRemoveAvatar}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </VStack>
      </Section>

      <Section variant="transparent" padding={0}>
        <VStack gap={4}>
          <h2 className="text-base font-semibold">账号信息</h2>
          <VStack gap={2}>
            <HRow label="邮箱" value={email} />
            <HRow label="注册时间" value={createdAt} />
          </VStack>
        </VStack>
      </Section>

      <Section variant="transparent" padding={0}>
        <VStack gap={4}>
          <h2 className="text-base font-semibold">修改密码</h2>
          <div className="grid gap-3 sm:max-w-md sm:gap-4">
            <TextInput
              label="当前密码"
              type="password"
              value={currentPassword}
              onChange={setCurrentPassword}
              {...nativeAttrs({autoComplete: 'current-password'})}
              htmlName="current-password"
            />
            <TextInput
              label="新密码"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              description="至少 8 位"
              {...nativeAttrs({autoComplete: 'new-password'})}
              htmlName="new-password"
            />
            <div>
              <Button label="修改密码" variant="primary" onClick={change} isDisabled={saving} isLoading={saving} />
            </div>
          </div>
        </VStack>
      </Section>

      <Section variant="transparent" padding={0}>
        <VStack gap={3}>
          <h2 className="text-base font-semibold text-error">退出登录</h2>
          <Text type="supporting" size="sm" as="p">
            退出后需要重新登录才能回到你的社区。
          </Text>
          <div>
            <Button
              label="退出登录"
              variant="destructive"
              icon={<LogOut size={15} />}
              onClick={signOut}
            />
          </div>
        </VStack>
      </Section>
    </VStack>
  );
}

function HRow({label, value}: {label: string; value: string}) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <Text type="supporting" as="span">
        {label}
      </Text>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
