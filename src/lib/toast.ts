'use client';

import {useToast} from '@astryxdesign/core/Toast';

/** App toast API on top of Astryx toasts. Usage: const t = useAppToast(); t.success('已保存'). */
export function useAppToast() {
  const show = useToast();
  return {
    success: (body: string) => show({body}),
    info: (body: string) => show({body}),
    error: (body: string) => show({body, type: 'error'}),
  };
}
