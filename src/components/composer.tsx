'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Image as ImageIcon, Sparkles } from 'lucide-react';
import { createPost } from '@/server/actions/feed';

export function Composer({ userName }: { userName: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    setContent('');
    toast.success('已发布，社区居民会看到的');
    router.refresh();
  };

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      className="rounded-3xl border border-line surface p-4 shadow-sm"
    >
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent-400)] to-[var(--color-accent-600)] text-white">
          🧑
        </span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`有什么新鲜事，${userName}？`}
          rows={content.length > 60 ? 4 : 2}
          maxLength={2000}
          className="w-full resize-none bg-transparent py-1.5 text-[15px] outline-none placeholder:text-[var(--text-3)]"
        />
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
        <div className="flex items-center gap-1 text-muted">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full cursor-not-allowed"
            title="图片功能即将推出"
          >
            <ImageIcon size={18} />
          </span>
          <span className="hidden text-xs sm:inline">图片功能即将推出</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">{content.length}/2000</span>
          <button
            type="submit"
            disabled={!content.trim() || loading}
            className="flex items-center gap-1.5 rounded-full bg-[var(--color-accent-600)] px-4 py-1.5 text-sm font-semibold text-white transition-all hover:bg-[var(--color-accent-700)] disabled:opacity-40"
          >
            <Sparkles size={14} />
            {loading ? '发布中…' : '发布'}
          </button>
        </div>
      </div>
    </form>
  );
}
