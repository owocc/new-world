'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { Dialog } from '@astryxdesign/core/Dialog';
import { Layout } from '@astryxdesign/core/Layout';
import { LayoutHeader } from '@astryxdesign/core/Layout';
import { LayoutContent } from '@astryxdesign/core/Layout';
import { LayoutFooter } from '@astryxdesign/core/Layout';
import { TextArea } from '@astryxdesign/core/TextArea';
import { Button } from '@astryxdesign/core/Button';
import { useAppToast } from '@/lib/toast';
import { UserAvatar } from '@/components/user-avatar';
import { createPost } from '@/server/actions/feed';

export interface ComposerProps {
  userName: string;
  userImage?: string | null;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  hideDefaultTrigger?: boolean;
}

export function Composer({
  userName,
  userImage = null,
  isOpen: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
  hideDefaultTrigger = false,
}: ComposerProps) {
  const router = useRouter();
  const toast = useAppToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (isControlled) {
        setControlledOpen?.(nextOpen);
      } else {
        setInternalOpen(nextOpen);
      }
    },
    [isControlled, setControlledOpen],
  );

  const submit = async () => {
    if (!content.trim() || loading) return;
    setLoading(true);
    const fd = new FormData();
    fd.set('content', content);
    const res = await createPost(fd);
    setLoading(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    setOpen(false);
    setContent('');
    toast.success('已发布，社区居民会看到的');
    router.refresh();
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)} className="inline-flex cursor-pointer">
          {trigger}
        </span>
      ) : !hideDefaultTrigger ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-container px-2 py-3 text-left transition-colors hover:bg-muted"
        >
          <UserAvatar name={userName} url={userImage} size={40} />
          <span className="text-[15px] text-placeholder">现在在想什么，{userName}？</span>
        </button>
      ) : null}

      <Dialog isOpen={open} onOpenChange={setOpen} purpose="form" width={520}>
        <Layout
          height="auto"
          header={
            <LayoutHeader hasDivider>
              <h2 className="text-lg font-semibold text-primary">发布朋友圈</h2>
            </LayoutHeader>
          }
          content={
            <LayoutContent>
              <TextArea
                label="内容"
                isLabelHidden
                value={content}
                onChange={setContent}
                rows={5}
                maxLength={2000}
                placeholder={`这一刻的想法，${userName}…`}
                htmlName="content"
                hasAutoFocus
              />
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <Button label="取消" variant="ghost" onClick={() => setOpen(false)} />
              <Button
                label={loading ? '发布中…' : '发表'}
                variant="primary"
                isDisabled={!content.trim() || loading}
                isLoading={loading}
                onClick={submit}
              />
            </LayoutFooter>
          }
        />
      </Dialog>
    </>
  );
}
