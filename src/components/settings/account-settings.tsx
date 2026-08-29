'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LogOut } from 'lucide-react';
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
import { changePassword } from '@/server/actions/settings';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '12px',
  },
  backLink: {
    display: 'flex',
    width: '32px',
    height: '32px',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-full, 9999px)',
    color: 'var(--color-text-secondary)',
    '@media (min-width: 1024px)': { display: 'none' },
    ':hover': { backgroundColor: 'var(--color-background-muted)' },
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
        <Link href="/settings" {...stylex.props(styles.backLink)} aria-label="返回设置菜单">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 {...stylex.props(styles.title)}>账户与资料</h1>
          <p {...stylex.props(styles.subtitle)}>管理你的账号信息与安全凭证</p>
        </div>
      </div>

      <Section variant="transparent" padding={0}>
        <VStack gap={4}>
          <h2 {...stylex.props(styles.sectionTitle)}>个人资料 & 头像</h2>
          <AvatarPicker
            name={name || '社区创世者'}
            avatarUrl={currentImage}
            onUrlChange={handleUrlChange}
            showEmojiColorTab={false}
          />
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
