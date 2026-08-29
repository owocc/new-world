'use client';

import {useState, useTransition} from 'react';
import * as stylex from '@stylexjs/stylex';
import {useRouter} from 'next/navigation';
import {SendHorizonal} from 'lucide-react';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Section} from '@astryxdesign/core/Section';
import {Text} from '@astryxdesign/core/Text';
import {TextArea} from '@astryxdesign/core/TextArea';
import {useAppToast} from '@/lib/toast';
import {UserAvatar} from '@/components/user-avatar';
import {TimeAgo} from '@/components/time-ago';
import {addComment} from '@/server/actions/feed';
import type {CommentView} from '@/server/feed';

const styles = stylex.create({
  item: {
    display: 'flex',
    gap: 10,
    paddingBlock: 12,
  },
  content: {
    minWidth: 0,
    flex: 1,
  },
  authorRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
  },
  author: {
    fontSize: 13,
    fontWeight: 600,
  },
  time: {
    fontSize: 12,
    color: 'var(--color-text-secondary)',
  },
  commentText: {
    marginTop: 2,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    lineHeight: 1.625,
  },
  replyButton: {
    marginTop: 4,
    fontSize: 12,
    color: 'var(--color-text-secondary)',
    transitionProperty: 'color',
    transitionDuration: '125ms',
    ':hover': {
      color: 'var(--color-text-accent)',
    },
  },
  commentDivider: {
    borderTop: '1px solid var(--color-border)',
  },
  nestedReply: {
    marginLeft: 32,
    borderLeft: '1px solid var(--color-border)',
    paddingLeft: 12,
  },
  empty: {
    paddingBlock: 24,
    textAlign: 'center',
  },
  heading: {
    marginBottom: 4,
  },
  replyNotice: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: 'var(--color-background-muted)',
    paddingBlock: 8,
    paddingInline: 12,
    fontSize: 12,
    color: 'var(--color-text-secondary)',
  },
  cancel: {
    transitionProperty: 'color',
    transitionDuration: '125ms',
    ':hover': {
      color: 'var(--color-error)',
    },
  },
  composer: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
});

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
    <div {...stylex.props(styles.item)}>
      <UserAvatar
        name={comment.authorName}
        emoji={comment.authorAvatarEmoji}
        color={comment.authorAvatarColor}
        url={comment.authorAvatarUrl}
        size={30}
      />
      <div {...stylex.props(styles.content)}>
        <div {...stylex.props(styles.authorRow)}>
          <span {...stylex.props(styles.author)}>{comment.authorName}</span>
          <span {...stylex.props(styles.time)}>
            <TimeAgo date={comment.createdAt} />
          </span>
        </div>
        <Text as="p" size="sm" textWrap="wrap" xstyle={styles.commentText}>
          {comment.content}
        </Text>
        {canReply && (
          <button onClick={onReply} {...stylex.props(styles.replyButton)}>
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
      <Text weight="medium" as="h3" xstyle={styles.heading}>
        评论 {topLevel.length + replies.length > 0 && `· ${topLevel.length + replies.length}`}
      </Text>

      {topLevel.length === 0 ? (
        <Text type="supporting" as="p" xstyle={styles.empty}>
          还没有评论，来说点什么吧
        </Text>
      ) : (
        <div>
          {topLevel.map((comment, index) => (
            <div key={comment.id} {...stylex.props(index > 0 && styles.commentDivider)}>
              <CommentItem comment={comment} canReply onReply={() => setReplyTo(comment)} />
              {replies
                .filter((r) => r.parentCommentId === comment.id)
                .map((r) => (
                  <div key={r.id} {...stylex.props(styles.nestedReply)}>
                    <CommentItem comment={r} />
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      {replyTo && (
        <div {...stylex.props(styles.replyNotice)}>
          <span>回复 {replyTo.authorName}</span>
          <button onClick={() => setReplyTo(null)} {...stylex.props(styles.cancel)}>
            取消
          </button>
        </div>
      )}

      <div {...stylex.props(styles.composer)}>
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
