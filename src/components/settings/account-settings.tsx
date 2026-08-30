'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@astryxdesign/core/Button';
import { Section } from '@astryxdesign/core/Section';
import { TextInput } from '@astryxdesign/core/TextInput';
import { AvatarPicker } from '@/components/avatar-picker';
import { updateUserImageUrlAction } from '@/server/actions/media';
import { VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { useAppToast } from '@/lib/toast';
import { authClient } from '@/lib/auth-client';
import { nativeAttrs } from '@/lib/native-attrs';
import { changePassword, updateProfile } from '@/server/actions/settings';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '12px',
  },
  title: { fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', letterSpacing: '-0.01em' },
  subtitle: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' },
  sectionTitle: { fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' },
  passwordGrid: {
    display: 'grid',
    gap: '12px',
    '@media (min-width: 640px)': { maxWidth: '28rem', gap: '16px' },
  },
  errorTitle: { fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-error)' },
  row: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '16px', fontSize: 'var(--font-size-sm)' },
  rowValue: { fontWeight: 'var(--font-weight-medium)' },
});

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
  const [currentImage, setCurrentImage] = useState<string | null>(image);
  const [profileName, setProfileName] = useState(name);
  const [profileBio, setProfileBio] = useState(bio);
  const [savingProfile, setSavingProfile] = useState(false);

  const saveProfile = async () => {
    setSavingProfile(true);
    const res = await updateProfile({ name: profileName, bio: profileBio });
    setSavingProfile(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success('资料已保存');
    router.refresh();
  };

  const handleUrlChange = async (url: string | null) => {
    try {
      await updateUserImageUrlAction(url);
      setCurrentImage(url);
      router.refresh();
    } catch (err) {
      console.error('Update avatar error', err);
      toast.error('保存头像失败');
    }
  };

  const change = async () => {
    if (!currentPassword || newPassword.length < 8) {
      toast.error('新密码至少 8 位');
      return;
    }
    setSaving(true);
    const res = await changePassword({ currentPassword, newPassword });
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
      <div {...stylex.props(styles.header)}>
        <div>
          <h1 {...stylex.props(styles.title)}>账户与资料</h1>
          <p {...stylex.props(styles.subtitle)}>管理你的个人资料、账号信息与安全凭证</p>
        </div>
      </div>

      <Section variant="transparent" padding={0}>
        <VStack gap={4}>
          <h2 {...stylex.props(styles.sectionTitle)}>个人资料 & 头像</h2>
          <AvatarPicker
            name={profileName || '社区创世者'}
            avatarUrl={currentImage}
            onUrlChange={handleUrlChange}
            showEmojiColorTab={false}
          />
          <TextInput
            label="昵称"
            value={profileName}
            onChange={setProfileName}
            {...nativeAttrs({ maxLength: 50 })}
            htmlName="profile-name"
          />
          <TextInput
            label="个性签名"
            isOptional
            value={profileBio}
            onChange={setProfileBio}
            {...nativeAttrs({ maxLength: 200 })}
            htmlName="profile-bio"
          />
          <div>
            <Button
              label="保存资料"
              variant="primary"
              onClick={saveProfile}
              isDisabled={savingProfile}
              isLoading={savingProfile}
            />
          </div>
        </VStack>
      </Section>

      <Section variant="transparent" padding={0}>
        <VStack gap={4}>
          <h2 {...stylex.props(styles.sectionTitle)}>账号信息</h2>
          <VStack gap={2}>
            <HRow label="邮箱" value={email} />
            <HRow label="注册时间" value={createdAt} />
          </VStack>
        </VStack>
      </Section>

      <Section variant="transparent" padding={0}>
        <VStack gap={4}>
          <h2 {...stylex.props(styles.sectionTitle)}>修改密码</h2>
          <div {...stylex.props(styles.passwordGrid)}>
            <TextInput
              label="当前密码"
              type="password"
              value={currentPassword}
              onChange={setCurrentPassword}
              {...nativeAttrs({ autoComplete: 'current-password' })}
              htmlName="current-password"
            />
            <TextInput
              label="新密码"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              description="至少 8 位"
              {...nativeAttrs({ autoComplete: 'new-password' })}
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
          <h2 {...stylex.props(styles.errorTitle)}>退出登录</h2>
          <Text type="supporting" color="secondary">
            退出后需要重新输入账号密码登录当前社区
          </Text>
          <div>
            <Button
              label="退出当前账号"
              variant="secondary"
              icon={<LogOut size={15} />}
              onClick={signOut}
            />
          </div>
        </VStack>
      </Section>
    </VStack>
  );
}

function HRow({ label, value }: { label: string; value: string }) {
  return (
    <div {...stylex.props(styles.row)}>
      <Text type="supporting" color="secondary">
        {label}
      </Text>
      <span {...stylex.props(styles.rowValue)}>{value || '未设置'}</span>
    </div>
  );
}
