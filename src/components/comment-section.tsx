'use client';

import {useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {SendHorizonal} from 'lucide-react';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Section} from '@astryxdesign/core/Section';
import {Text} from '@astryxdesign/core/Text';
import {TextArea} from '@astryxdesign/core/TextArea';
import {VStack} from '@astryxdesign/core/Stack';
import {useAppToast} from '@/lib/toast';
import {UserAvatar} from '@/components/user-avatar';
import {TimeAgo} from '@/components/time-ago';
import {addComment} from '@/server/actions/feed';
import type {CommentView} from '@/server/feed';

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
    <div className="flex gap-2.5 py-3">
      <UserAvatar
        name={comment.authorName}
        emoji={comment.authorAvatarEmoji}
        color={comment.authorAvatarColor}
        url={comment.authorAvatarUrl}
        size={30}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold">{comment.authorName}</span>
          <TimeAgo date={comment.createdAt} className="text-xs text-secondary" />
        </div>
        <Text as="p" size="sm" textWrap="wrap" className="mt-0.5 whitespace-pre-wrap break-words leading-relaxed">
          {comment.content}
        </Text>
        {canReply && (
          <button
            onClick={onReply}
            className="mt-1 text-xs text-secondary transition-colors hover:text-accent"
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
  const toast = useAppToast();
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
    <Section variant="transparent" padding={0}>
      <Text weight="medium" as="h3" className="mb-1">
        评论 {topLevel.length + replies.length > 0 && `· ${topLevel.length + replies.length}`}
      </Text>

      {topLevel.length === 0 ? (
        <Text type="supporting" as="p" className="py-6 text-center">
          还没有评论，来说点什么吧
        </Text>
      ) : (
        <div className="divide-y divide-border">
          {topLevel.map((comment) => (
            <div key={comment.id}>
              <CommentItem comment={comment} canReply onReply={() => setReplyTo(comment)} />
              {replies
                .filter((r) => r.parentCommentId === comment.id)
                .map((r) => (
                  <div key={r.id} className="ml-8 border-l border-border pl-3">
                    <CommentItem comment={r} />
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      {replyTo && (
        <div className="mt-2 flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-xs text-secondary">
          <span>回复 {replyTo.authorName}</span>
          <button onClick={() => setReplyTo(null)} className="transition-colors hover:text-error">
            取消
          </button>
        </div>
      )}

      <div className="mt-3 flex items-end gap-2">
        <TextArea
          label="评论"
          isLabelHidden
          width="100%"
          value={content}
          onChange={setContent}
          rows={2}
          placeholder="写评论…"
          htmlName="comment"
        />
        <IconButton
          label="发送评论"
          variant="primary"
          icon={<SendHorizonal size={17} />}
          isDisabled={!content.trim() || pending}
          onClick={submit}
        />
      </div>
    </Section>
  );
}
