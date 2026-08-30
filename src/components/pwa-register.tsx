'use client';

import {useEffect} from 'react';

/** 注册 PWA Service Worker（仅生产环境生效，失败静默忽略） */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('[pwa] service worker registration failed', err);
      });
    };
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, {once: true});
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
