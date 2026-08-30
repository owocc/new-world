import * as stylex from '@stylexjs/stylex';
import { colorVars, fontWeightVars, radiusVars, spacingVars, textSizeVars } from '@astryxdesign/core/theme/tokens.stylex';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { aiCharacters, notifications } from '@/db/schema';
import { requireUserId } from '@/lib/session';
import { NotificationsView } from '@/components/notifications-view';

const styles = stylex.create({
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '860px',
    marginInline: 'auto',
    paddingInline: '16px',
    paddingTop: '24px',
    paddingBottom: '60px',
    gap: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '16px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colorVars['--color-border'],
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  backLink: {
    display: 'flex',
    width: '2rem',
    height: '2rem',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radiusVars['--radius-full'],
    color: colorVars['--color-text-secondary'],
    '@media (hover: hover)': {
      ':hover': {
        backgroundColor: colorVars['--color-background-muted'],
      },
    },
  },
  heading: {
    fontSize: textSizeVars['--font-size-2xl'],
    fontWeight: fontWeightVars['--font-weight-bold'],
    letterSpacing: '-0.025em',
    color: colorVars['--color-text-primary'],
  },
  description: {
    color: colorVars['--color-text-secondary'],
    fontSize: textSizeVars['--font-size-sm'],
    marginTop: '2px',
  },
});

export const metadata = { title: '通知中心' };
export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const userId = await requireUserId();
  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      content: notifications.content,
      read: notifications.read,
      createdAt: notifications.createdAt,
      conversationId: notifications.conversationId,
      postId: notifications.postId,
      characterName: aiCharacters.name,
      characterEmoji: aiCharacters.avatarEmoji,
      characterColor: aiCharacters.avatarColor,
      characterAvatarUrl: aiCharacters.avatarUrl,
    })
    .from(notifications)
    .leftJoin(aiCharacters, eq(notifications.characterId, aiCharacters.id))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(100);

  return (
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.headerLeft)}>
          <div>
            <h1 {...stylex.props(styles.heading)}>通知中心</h1>
            <p {...stylex.props(styles.description)}>查看来自居民的私信回复、互动与系统动态通知</p>
          </div>
        </div>
      </div>
      <NotificationsView initialNotifications={rows} />
    </div>
  );
}
