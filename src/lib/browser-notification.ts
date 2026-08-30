/**
 * 浏览器通知（Browser Notification）客户端工具：
 * 权限管理 + 经由 Service Worker 显示通知（PWA standalone 下同样可用）。
 * 通知点击跳转由 public/sw.js 的 notificationclick 处理（data.url）。
 */

export type NotificationPermissionState = NotificationPermission | 'unsupported';

export function getNotificationPermissionState(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/** 请求浏览器通知权限；返回最终权限状态 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  // 已是最终状态（granted/denied）时直接返回，避免无意义的重复弹窗
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export type AppNotificationPayload = {
  title: string;
  body?: string;
  /** 去重标记：相同 tag 的新通知会替换旧的，不会堆积 */
  tag?: string;
  /** 点击通知后打开的站内路径 */
  url?: string;
};

/** 通过 Service Worker 显示系统级通知；SW 不可用时回退到页面内 Notification API */
export async function showAppNotification(payload: AppNotificationPayload): Promise<void> {
  if (getNotificationPermissionState() !== 'granted') return;

  const options: NotificationOptions & {data?: {url?: string}} = {
    body: payload.body,
    tag: payload.tag,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: {url: payload.url ?? '/notifications'},
  };

  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(payload.title, options);
      return;
    }
  } catch {
    // SW 不可用时走下方回退
  }

  if ('Notification' in window) {
    const n = new Notification(payload.title, options);
    n.onclick = () => {
      window.focus();
      if (payload.url) window.location.href = payload.url;
    };
  }
}
