'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SendHorizonal } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '@/components/avatar';
import { TimeAgo } from '@/components/ui';
import { addComment } from '@/server/actions/feed';
import type { CommentView } from '@/server/feed';

function CommentItem({
  comment,
  onReply,
  canReply,
}: {
  comment: CommentView;
  onReply?: () => void;
  canReply?: boolean;
}) {
  return (
    <div className="flex gap-2.5 py-2.5">
      <Avatar
        name={comment.authorName}
        emoji={comment.authorAvatarEmoji}
        color={comment.authorAvatarColor}
        url={comment.authorAvatarUrl}
        size={30}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold">{comment.authorName}</span>
          <TimeAgo date={comment.createdAt} className="text-[11px] text-muted" />
        </div>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed">
          {comment.content}
        </p>
        {canReply && (
          <button
            onClick={onReply}
            className="mt-1 text-xs text-muted transition-colors hover:text-[var(--color-accent-500)]"
          >
            回复
          </button>
        )}
      </div>
    </div>
  );
}

export function CommentSection({
  postId,
  topLevel,
  replies,
}: {
  postId: string;
  topLevel: CommentView[];
  replies: CommentView[];
}) {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<CommentView | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!content.trim() || pending) return;
    const parent = replyTo;
    startTransition(async () => {
      const res = await addComment({
        postId,
        content: content.trim(),
        parentCommentId: parent && parent.authorType === 'ai' ? parent.id : null,
      });
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      setContent('');
      setReplyTo(null);
      router.refresh();
    });
  };

  return (
    <div className="mt-4 rounded-3xl border border-line surface p-4 shadow-sm sm:p-5">
      <h3 className="mb-1 text-sm font-semibold text-secondary">
        评论 {topLevel.length + replies.length > 0 && `· ${topLevel.length + replies.length}`}
      </h3>

      {topLevel.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">还没有评论，来说点什么吧</p>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {topLevel.map((comment) => (
            <div key={comment.id}>
              <CommentItem comment={comment} canReply onReply={() => setReplyTo(comment)} />
              {replies
                .filter((r) => r.parentCommentId === comment.id)
                .map((r) => (
                  <div key={r.id} className="ml-8 border-l border-line pl-3">
                    <CommentItem comment={r} />
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      {/* reply hint */}
      {replyTo && (
        <div className="mt-2 flex items-center justify-between rounded-xl surface-2 px-3 py-2 text-xs text-secondary">
          <span>回复 {replyTo.authorName}</span>
          <button onClick={() => setReplyTo(null)} className="text-muted hover:text-rose-500">
            取消
          </button>
        </div>
      )}

      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
          }}
          rows={1}
          placeholder="写评论…"
          className="max-h-28 min-h-10 w-full resize-none rounded-xl border border-line surface-2 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-accent-400)]"
        />
        <button
          onClick={submit}
          disabled={!content.trim() || pending}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-600)] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          aria-label="发送评论"
        >
          <SendHorizonal size={17} />
        </button>
      </div>
    </div>
  );
}
