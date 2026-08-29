import * as stylex from '@stylexjs/stylex';
import {colorVars, fontWeightVars, radiusVars, spacingVars, textSizeVars} from '@astryxdesign/core/theme/tokens.stylex';
import Link from 'next/link';
import {ArrowLeft} from 'lucide-react';
import {desc, eq} from 'drizzle-orm';
import {db} from '@/db';
import {aiCharacters, notifications} from '@/db/schema';
import {requireUserId} from '@/lib/session';
import {NotificationsView} from '@/components/notifications-view';

const styles = stylex.create({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacingVars['--spacing-4'],
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: spacingVars['--spacing-2'],
    paddingBottom: spacingVars['--spacing-3'],
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colorVars['--color-border'],
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
    '@media (min-width: 1024px)': {
      display: 'none',
    },
    '@media (hover: hover)': {
      ':hover': {
        backgroundColor: colorVars['--color-background-muted'],
      },
    },
  },
  heading: {
    fontSize: textSizeVars['--font-size-xl'],
    fontWeight: fontWeightVars['--font-weight-semibold'],
    letterSpacing: '-0.025em',
  },
  description: {
    color: colorVars['--color-text-secondary'],
    fontSize: textSizeVars['--font-size-sm'],
  },
});

export const metadata = { title: '通知中心' };
export const dynamic = 'force-dynamic';

export default async function SettingsNotificationsPage() {
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
    .limit(50);

  return (
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.header)}>
        <Link
          href="/settings"
          {...stylex.props(styles.backLink)}
          aria-label="返回设置菜单"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 {...stylex.props(styles.heading)}>通知中心</h1>
          <p {...stylex.props(styles.description)}>查看来自居民的互动与系统通知</p>
        </div>
      </div>
      <NotificationsView initialNotifications={rows} />
    </div>
  );
}
