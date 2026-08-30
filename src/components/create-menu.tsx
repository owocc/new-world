'use client';

import { useEffect, useState } from 'react';
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';
import { Badge } from '@astryxdesign/core/Badge';
import { useRouter } from 'next/navigation';
import { Bell, Plus, UsersRound } from 'lucide-react';
import { useClientSync } from '@/components/client-sync-provider';

// 与 app-nav 底部 Tab 栏的显示断点保持一致
const MOBILE_MEDIA_QUERY = '(max-width: 639px)';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MEDIA_QUERY);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isMobile;
}

// 聊天/群聊列表头部的「新建」入口：+ 号图标按钮，展开为菜单；
// 移动端额外收纳「通知」入口（底部 Tab 栏不再显示通知）
export function CreateMenu() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const sync = useClientSync();
  const unreadNotifications = sync.unread.notifications ?? 0;

  return (
    <DropdownMenu
      button={{
        label: '新建',
        isIconOnly: true,
        variant: 'ghost',
        size: 'sm',
        icon: <Plus size={16} />,
      }}
      hasChevron={false}
      alignment="end"
      items={[
        {
          id: 'new-group',
          label: '新建群聊',
          icon: <UsersRound size={16} />,
          onClick: () => router.push('/groups/new'),
        },
        ...(isMobile
          ? [
              { type: 'divider' as const },
              {
                id: 'notifications',
                label: '通知',
                icon: <Bell size={16} />,
                endContent:
                  unreadNotifications > 0 ? (
                    <Badge
                      variant="orange"
                      label={unreadNotifications > 99 ? '99+' : String(unreadNotifications)}
                    />
                  ) : undefined,
                onClick: () => router.push('/notifications'),
              },
            ]
          : []),
      ]}
    />
  );
}
