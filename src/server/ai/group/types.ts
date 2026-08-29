import type { aiCharacters, groups, groupMembers, groupMessages, groupReactions, groupAttentionEvents } from '@/db/schema';

export type AiCharacter = typeof aiCharacters.$inferSelect;
export type GroupRow = typeof groups.$inferSelect;
export type GroupMemberRow = typeof groupMembers.$inferSelect;
export type GroupMessageRow = typeof groupMessages.$inferSelect;
export type GroupReactionRow = typeof groupReactions.$inferSelect;
export type GroupAttentionEventRow = typeof groupAttentionEvents.$inferSelect;

export type ReadingFrequency = 'frequent' | 'moderate' | 'rare' | 'lurker';
export type CatchUpStyle = 'skimmer' | 'careful' | 'selective';

export type SocialBehaviorProfile = {
  /** How often this AI checks the group when idle */
  readingFrequency: ReadingFrequency;
  /** Baseline check interval range in milliseconds [min, max] during active hours */
  idleCheckIntervalMs: [number, number];
  /** Probability of checking quickly on @mention (0..1) */
  mentionResponsiveness: number;
  /** Delay range in milliseconds when @mentioned [min, max] */
  mentionDelayMs: [number, number];
  /** Probability of speaking when unread messages are found */
  replyProbability: number;
  /** Probability of reacting with emoji instead of / alongside speaking */
  reactionProbability: number;
  /** Daily active time window in 24h format e.g. ["18:00", "04:30"] */
  activeHours: [string, string];
  /** How to process large message backlogs */
  catchUpStyle: CatchUpStyle;
  /** Whether they occasionally send 2 short messages in a row */
  multiMessageTendency: number;
  /** Emoji preferences / favorites */
  preferredEmojis: string[];
  /** Topic keywords that boost interest */
  topicKeywords: string[];
};

export type MentionEntity = {
  type: 'user' | 'ai';
  id: string;
  name: string;
  username: string;
};

export type PerceptionContext = {
  /** Current real-world time formatted nicely for the AI */
  currentTimeFormatted: string;
  /** User/local timezone e.g. "Asia/Shanghai" */
  timezone: string;
  /** When this AI last checked the group */
  lastReadAtFormatted: string;
  /** Duration in human words since last check */
  timeSinceLastRead: string;
  /** Total count of unread messages */
  unreadCount: number;
  /** Whether the AI was @mentioned in the unread batch */
  isMentioned: boolean;
  /** Whether a message directly replied to this AI in the unread batch */
  isDirectlyReplied: boolean;
  /** Context leading up to the unread batch (last 3-5 read messages) */
  precedingMessages: {
    id: string;
    senderName: string;
    senderUsername: string;
    isSelf: boolean;
    isUser: boolean;
    content: string;
    timeFormatted: string;
  }[];
  /** Unread messages structured for model consumption */
  unreadDigest: {
    /** Structured overview of older backlog if unreadCount > 12 */
    summaryText?: string;
    /** Key messages to see verbatim (mentions, replies, user msgs, recent msgs) */
    keyMessages: {
      id: string;
      senderName: string;
      senderUsername: string;
      isSelf: boolean;
      isUser: boolean;
      content: string;
      timeFormatted: string;
      isMentioningMe: boolean;
      isReplyingToMe: boolean;
      replyQuote?: string;
      reactions: { emoji: string; reactorName: string }[];
    }[];
  };
  /** Group metadata */
  group: {
    id: string;
    name: string;
    description: string;
    memberCount: number;
    membersSummary: string;
  };
};

export type GroupDecisionAction = 'none' | 'react' | 'reply' | 'multi_message';

export type GroupDecisionResult = {
  action: GroupDecisionAction;
  reasoning?: string;
  /** Target message ID for reaction or reply */
  targetMessageId?: string;
  /** Emoji if action === 'react' */
  reactionEmoji?: string;
  /** Message content if action === 'reply' */
  replyContent?: string;
  /** Array of 2-3 short messages if action === 'multi_message' */
  multiMessages?: string[];
  /** Mentioned IDs/usernames in reply */
  mentionedEntityIds?: string[];
  /** Whether this interaction should form a durable long-term memory */
  shouldFormMemory?: boolean;
  memoryFact?: string;
  memoryImportance?: number;
};
