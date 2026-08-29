import type { AiCharacter, SocialBehaviorProfile } from './types';

const KNOWN_PROFILES: Record<string, Partial<SocialBehaviorProfile>> = {
  linwan: {
    readingFrequency: 'moderate',
    idleCheckIntervalMs: [3 * 60 * 1000, 15 * 60 * 1000],
    mentionResponsiveness: 0.95,
    mentionDelayMs: [8 * 1000, 25 * 1000],
    replyProbability: 0.55,
    reactionProbability: 0.35,
    activeHours: ['18:00', '04:30'],
    catchUpStyle: 'careful',
    multiMessageTendency: 0.15,
    preferredEmojis: ['🌙', '☕️', '🐱', '👀', '🫠'],
    topicKeywords: ['代码', 'bug', '加班', '咖啡', '熬夜', '音乐', '猫', '重构', '后摇'],
  },
  surui: {
    readingFrequency: 'frequent',
    idleCheckIntervalMs: [1 * 60 * 1000, 8 * 60 * 1000],
    mentionResponsiveness: 0.98,
    mentionDelayMs: [5 * 1000, 18 * 1000],
    replyProbability: 0.75,
    reactionProbability: 0.5,
    activeHours: ['09:30', '24:00'],
    catchUpStyle: 'skimmer',
    multiMessageTendency: 0.4,
    preferredEmojis: ['🍜', '🤤', '🎉', '❤️', '✨', '😋'],
    topicKeywords: ['吃', '美食', '探店', '做饭', '火锅', '周末', '聚会', '烤肉', '奶茶'],
  },
  chenmo: {
    readingFrequency: 'rare',
    idleCheckIntervalMs: [15 * 60 * 1000, 60 * 60 * 1000],
    mentionResponsiveness: 0.85,
    mentionDelayMs: [15 * 1000, 60 * 1000],
    replyProbability: 0.22,
    reactionProbability: 0.55,
    activeHours: ['13:00', '03:30'],
    catchUpStyle: 'selective',
    multiMessageTendency: 0.05,
    preferredEmojis: ['🎮', '🐱', '👍', '☕️', '👾'],
    topicKeywords: ['游戏', 'steam', '独立开发', '像素', '猫', '手柄', '科幻'],
  },
  heqing: {
    readingFrequency: 'moderate',
    idleCheckIntervalMs: [5 * 60 * 1000, 25 * 60 * 1000],
    mentionResponsiveness: 0.95,
    mentionDelayMs: [8 * 1000, 30 * 1000],
    replyProbability: 0.5,
    reactionProbability: 0.65,
    activeHours: ['08:30', '23:30'],
    catchUpStyle: 'careful',
    multiMessageTendency: 0.2,
    preferredEmojis: ['📚', '🎸', '🥺', '❤️', '🌸', '✨'],
    topicKeywords: ['书', '小说', '吉他', '歌', '电影', '文学', '手账', '摇滚'],
  },
  zhengbei: {
    readingFrequency: 'moderate',
    idleCheckIntervalMs: [4 * 60 * 1000, 20 * 60 * 1000],
    mentionResponsiveness: 0.95,
    mentionDelayMs: [8 * 1000, 35 * 1000],
    replyProbability: 0.45,
    reactionProbability: 0.6,
    activeHours: ['05:30', '22:30'],
    catchUpStyle: 'skimmer',
    multiMessageTendency: 0.15,
    preferredEmojis: ['💪', '😂', '👍', '🔥', '🏃', '👊'],
    topicKeywords: ['健身', '跑步', '早起', '打球', '运动', '增肌', '深蹲', '卧推'],
  },
  vivian_w: {
    readingFrequency: 'frequent',
    idleCheckIntervalMs: [2 * 60 * 1000, 10 * 60 * 1000],
    mentionResponsiveness: 0.98,
    mentionDelayMs: [5 * 1000, 20 * 1000],
    replyProbability: 0.65,
    reactionProbability: 0.45,
    activeHours: ['08:00', '24:00'],
    catchUpStyle: 'careful',
    multiMessageTendency: 0.3,
    preferredEmojis: ['☕️', '📊', '💼', '💯', '🤝', '👀'],
    topicKeywords: ['会', '开会', '需求', '排期', '产品', '项目', '对齐', 'excel', '汇报'],
  },
};

/**
 * Resolve a rich social behavior profile for any character.
 * Uses known profile for seeded residents, or dynamically computes from character attributes.
 */
export function resolveSocialProfile(character: AiCharacter): SocialBehaviorProfile {
  const username = character.username.toLowerCase();
  const known = KNOWN_PROFILES[username];

  const chattiness = character.chattiness ?? 0.5;
  const commentRate = character.commentRate ?? 0.4;
  const likeRate = character.likeRate ?? 0.5;

  let readingFrequency: SocialBehaviorProfile['readingFrequency'] = 'moderate';
  if (chattiness >= 0.8) readingFrequency = 'frequent';
  else if (chattiness <= 0.35) readingFrequency = 'rare';
  else if (chattiness <= 0.2) readingFrequency = 'lurker';

  let catchUpStyle: SocialBehaviorProfile['catchUpStyle'] = 'careful';
  if (chattiness > 0.7) catchUpStyle = 'skimmer';
  else if (chattiness < 0.4) catchUpStyle = 'selective';

  // Parse custom keywords from character interests / personality
  const keywords = [
    ...(character.interests ? character.interests.split(/[,，\s]+/) : []),
    ...(character.personality ? character.personality.split(/[,，\s]+/) : []),
  ]
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  const fallback: SocialBehaviorProfile = {
    readingFrequency,
    idleCheckIntervalMs:
      readingFrequency === 'frequent'
        ? [1.5 * 60 * 1000, 8 * 60 * 1000]
        : readingFrequency === 'moderate'
          ? [4 * 60 * 1000, 20 * 60 * 1000]
          : [15 * 60 * 1000, 60 * 60 * 1000],
    mentionResponsiveness: Math.min(0.99, 0.8 + chattiness * 0.2),
    mentionDelayMs: [5 * 1000, Math.max(15 * 1000, (1 - chattiness) * 45 * 1000)],
    replyProbability: Math.min(0.9, Math.max(0.1, commentRate * 1.2)),
    reactionProbability: Math.min(0.85, Math.max(0.2, likeRate * 1.1)),
    activeHours: ['08:00', '23:30'],
    catchUpStyle,
    multiMessageTendency: chattiness > 0.75 ? 0.35 : 0.1,
    preferredEmojis: ['👍', '❤️', '😂', '✨', '👀', '☕️'],
    topicKeywords: keywords,
  };

  if (!known) return fallback;

  return {
    ...fallback,
    ...known,
    preferredEmojis: known.preferredEmojis ?? fallback.preferredEmojis,
    topicKeywords: known.topicKeywords ?? fallback.topicKeywords,
  } as SocialBehaviorProfile;
}

/**
 * Check if the given local time is within the character's active window.
 */
export function isWithinActiveHours(
  profile: SocialBehaviorProfile,
  date: Date = new Date(),
  timezone: string = 'Asia/Shanghai',
): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '12', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
    const currentMins = hour * 60 + minute;

    const [startStr, endStr] = profile.activeHours;
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);

    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    if (startMins <= endMins) {
      // Normal range e.g. 08:00 to 22:00
      return currentMins >= startMins && currentMins <= endMins;
    } else {
      // Cross-midnight range e.g. 18:00 to 04:30
      return currentMins >= startMins || currentMins <= endMins;
    }
  } catch {
    return true; // Fallback to active if timezone invalid
  }
}

/**
 * Calculate realistic simulated social latency based on event priority & character profile.
 * Returns scheduled Date for the attention event.
 */
export function calculateScheduledTime(
  profile: SocialBehaviorProfile,
  priority: number, // 3: mention, 2: reply, 1: normal message, 0: pulse
  opts: { now?: Date; timezone?: string } = {},
): Date {
  const baseTime = (opts.now ?? new Date()).getTime();
  const timezone = opts.timezone ?? 'Asia/Shanghai';
  const isActive = isWithinActiveHours(profile, opts.now ?? new Date(), timezone);

  let delayMs: number;

  if (priority >= 3) {
    // High Priority: @Mention
    const [minMs, maxMs] = profile.mentionDelayMs;
    // If active: short delay (e.g. 5s - 25s)
    if (isActive) {
      delayMs = minMs + Math.random() * (maxMs - minMs);
    } else {
      // If sleeping, either quick wake up (30% chance for urgent mentions) or deferred
      if (Math.random() < 0.35) {
        delayMs = 30 * 1000 + Math.random() * 60 * 1000;
      } else {
        delayMs = 20 * 60 * 1000 + Math.random() * 60 * 60 * 1000;
      }
    }
  } else if (priority === 2) {
    // Medium Priority: Direct reply to AI's previous message
    if (isActive) {
      delayMs = 15 * 1000 + Math.random() * 45 * 1000;
    } else {
      delayMs = 30 * 60 * 1000 + Math.random() * 90 * 60 * 1000;
    }
  } else {
    // Normal message in group
    const [minMs, maxMs] = profile.idleCheckIntervalMs;
    if (isActive) {
      delayMs = minMs + Math.random() * (maxMs - minMs);
    } else {
      // Inactive window: check much later
      delayMs = 60 * 60 * 1000 + Math.random() * 180 * 60 * 1000;
    }
  }

  return new Date(baseTime + Math.max(2000, Math.round(delayMs)));
}

/**
 * Score topic affinity between character profile and message content (0..1).
 */
export function calculateTopicAffinity(profile: SocialBehaviorProfile, content: string): number {
  if (!content) return 0;
  const lower = content.toLowerCase();
  let hits = 0;
  for (const kw of profile.topicKeywords) {
    if (lower.includes(kw)) hits++;
  }
  return Math.min(1, hits * 0.35);
}
