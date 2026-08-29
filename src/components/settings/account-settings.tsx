'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {LogOut} from 'lucide-react';
import {Button} from '@astryxdesign/core/Button';
import {Section} from '@astryxdesign/core/Section';
import {TextInput} from '@astryxdesign/core/TextInput';
import {VStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {useAppToast} from '@/lib/toast';
import {authClient} from '@/lib/auth-client';
import {nativeAttrs} from '@/lib/native-attrs';
import {changePassword} from '@/server/actions/settings';

export function AccountSettings({email, createdAt}: {email: string; createdAt: string}) {
  const router = useRouter();
  const toast = useAppToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

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
    <VStack gap={8}>
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
