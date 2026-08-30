'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Bell, BellOff, Info, Send, Heart, MessageSquare } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Switch } from '@astryxdesign/core/Switch';
import { VStack } from '@astryxdesign/core/Stack';
import { useAppToast } from '@/lib/toast';
import { useClientSync } from '@/components/client-sync-provider';
import { saveNotificationPrefs } from '@/server/actions/settings';
import { requestNotificationPermission, getNotificationPermissionState } from '@/lib/browser-notification';
import type { NotificationPermissionState } from '@/lib/browser-notification';
import type { NotificationPrefs } from '@/server/settings';
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
    borderRadius: '9999px',
    color: 'var(--color-text-secondary)',
    '@media (min-width: 1024px)': { display: 'none' },
    ':hover': { backgroundColor: 'var(--color-background-muted)' },
  },
  title: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-semibold)',
    letterSpacing: '-0.01em',
  },
  subtitle: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-secondary)',
  },
  sectionTitle: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-semibold)',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  rowText: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  permissionBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    backgroundColor: 'var(--color-background-muted)',
    borderRadius: 'var(--radius-container)',
    border: '1px solid var(--color-border)',
  },
  permissionDenied: {
    backgroundColor: 'var(--color-background-red)',
  },
  hint: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: 'var(--color-background-muted)',
    borderRadius: 'var(--radius-container)',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
});

const PERMISSION_LABEL: Record<NotificationPermissionState, string> = {
  granted: '已允许通知',
  default: '尚未授权',
  denied: '已被浏览器拒绝',
  unsupported: '当前浏览器不支持通知',
};

function PermissionIcon({ state }: { state: NotificationPermissionState }) {
  if (state === 'granted') return <Bell size={18} />;
  if (state === 'denied' || state === 'unsupported') return <BellOff size={18} />;
  return <Bell size={18} />;
}

export function NotificationSettings({ initialPrefs }: { initialPrefs: NotificationPrefs }) {
  const router = useRouter();
  const toast = useAppToast();
  const { updateNotificationPrefs } = useClientSync();

  const [prefs, setPrefs] = useState<NotificationPrefs>(initialPrefs);
  // SSR 无 Notification API，挂载后读取真实权限状态
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPermission(getNotificationPermissionState());
  }, []);

  const handleTogglePush = async (checked: boolean) => {
    if (checked) {
      // 开启总开关时先请求浏览器通知权限
      const state = await requestNotificationPermission();
      setPermission(state);
      if (state === 'denied') {
        toast.error('浏览器通知权限被拒绝，请在浏览器设置中手动允许');
        return;
      }
      if (state === 'unsupported') {
        toast.error('当前浏览器不支持通知');
        return;
      }
    }
    setPrefs((s) => ({ ...s, pushEnabled: checked }));
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await saveNotificationPrefs(prefs);
    setSaving(false);
    if (!res?.ok) {
      toast.error('保存失败，请重试');
    } else {
      // 同步到全局轮询，立即生效，无需刷新
      updateNotificationPrefs(prefs);
      toast.success('通知设置已保存');
      router.refresh();
    }
  };

  return (
    <VStack gap={6}>
      <div {...stylex.props(styles.header)}>
        <Link href="/settings" {...stylex.props(styles.backLink)} aria-label="返回设置菜单">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 {...stylex.props(styles.title)}>通知管理</h1>
          <p {...stylex.props(styles.subtitle)}>配置浏览器推送通知及其类别</p>
        </div>
      </div>

      <Card variant="default">
        <VStack gap={5}>
          <VStack gap={0.5}>
            <h2 {...stylex.props(styles.sectionTitle)}>浏览器推送</h2>
            <Text type="supporting" size="sm" as="p">
              开启后，当应用在后台或页面未聚焦时，通过浏览器通知提醒新事件。
            </Text>
          </VStack>

          <div {...stylex.props(styles.row)}>
            <Switch
              label="开启浏览器通知"
              labelPosition="start"
              labelSpacing="spread"
              value={prefs.pushEnabled}
              onChange={handleTogglePush}
            />
            <Text type="supporting" size="sm">
              {PERMISSION_LABEL[permission]}
            </Text>
          </div>

          {prefs.pushEnabled && permission !== 'granted' && permission !== 'unsupported' && (
            <div {...stylex.props(styles.permissionBanner)}>
              <PermissionIcon state={permission} />
              <Text size="sm">
                {permission === 'denied'
                  ? '通知权限已被拒绝，请在浏览器地址栏旁的权限设置中允许通知后重试。'
                  : '需要浏览器授权后通知才会送达。'}
              </Text>
              {permission === 'default' && (
                <Button
                  label="请求通知权限"
                  variant="secondary"
                  size="sm"
                  onClick={async () => setPermission(await requestNotificationPermission())}
                />
              )}
            </div>
          )}

          {prefs.pushEnabled && (
            <VStack gap={4}>
              <div {...stylex.props(styles.row)}>
                <div {...stylex.props(styles.rowText)}>
                  <Send size={16} />
                  <Text size="sm">私信消息</Text>
                </div>
                <Switch
                  label="私信消息通知"
                  isLabelHidden
                  value={prefs.dm}
                  onChange={(checked) => setPrefs((s) => ({ ...s, dm: checked }))}
                />
              </div>
              <div {...stylex.props(styles.row)}>
                <div {...stylex.props(styles.rowText)}>
                  <Heart size={16} />
                  <Text size="sm">朋友圈点赞</Text>
                </div>
                <Switch
                  label="朋友圈点赞通知"
                  isLabelHidden
                  value={prefs.like}
                  onChange={(checked) => setPrefs((s) => ({ ...s, like: checked }))}
                />
              </div>
              <div {...stylex.props(styles.row)}>
                <div {...stylex.props(styles.rowText)}>
                  <MessageSquare size={16} />
                  <Text size="sm">评论回复</Text>
                </div>
                <Switch
                  label="评论回复通知"
                  isLabelHidden
                  value={prefs.comment}
                  onChange={(checked) => setPrefs((s) => ({ ...s, comment: checked }))}
                />
              </div>
            </VStack>
          )}

          <div {...stylex.props(styles.hint)}>
            <Info size={16} />
            <Text type="supporting" size="sm" as="p">
              通知仅在应用未聚焦时发送；点击通知可跳转到对应的消息或帖子。设置保存在服务器，跨设备生效。
            </Text>
          </div>

          <div {...stylex.props(styles.footer)}>
            <Button
              label="保存通知设置"
              variant="primary"
              onClick={handleSave}
              isDisabled={saving}
              isLoading={saving}
            />
          </div>
        </VStack>
      </Card>
    </VStack>
  );
}
