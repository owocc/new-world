import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

const ts = (name: string) => integer(name, { mode: 'timestamp_ms' });
const now = () => sql`(unixepoch('subsec') * 1000)`;

/* ------------------------------------------------------------------ */
/* Better Auth tables (managed by better-auth, modeled with drizzle)  */
/* ------------------------------------------------------------------ */

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  emailVerified: integer('email_verified', { mode: 'boolean' })
    .notNull()
    .default(false),
  image: text('image'),
  bio: text('bio'),
  createdAt: ts('created_at').notNull().default(now()),
  updatedAt: ts('updated_at').notNull().default(now()),
}, (t) => [uniqueIndex('user_email_idx').on(t.email)]);

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  expiresAt: ts('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: ts('created_at').notNull().default(now()),
  updatedAt: ts('updated_at').notNull().default(now()),
}, (t) => [uniqueIndex('session_token_idx').on(t.token), index('session_user_idx').on(t.userId)]);

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  /** synthetic issuer, e.g. "local:credential" (better-auth >= 1.7) */
  issuer: text('issuer').notNull().default('local:credential'),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: ts('access_token_expires_at'),
  refreshTokenExpiresAt: ts('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: ts('created_at').notNull().default(now()),
  updatedAt: ts('updated_at').notNull().default(now()),
}, (t) => [index('account_user_idx').on(t.userId)]);

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: ts('expires_at').notNull(),
  createdAt: ts('created_at').notNull().default(now()),
  updatedAt: ts('updated_at').notNull().default(now()),
});

/* ------------------------------------------------------------------ */
/* AI provider / model configuration                                  */
/* ------------------------------------------------------------------ */

export const providerConfigs = sqliteTable('provider_configs', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  /** openai | anthropic | google | deepseek | openai-compatible */
  providerType: text('provider_type').notNull(),
  apiKey: text('api_key').notNull(),
  baseUrl: text('base_url'),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: ts('created_at').notNull().default(now()),
  updatedAt: ts('updated_at').notNull().default(now()),
}, (t) => [index('provider_configs_user_idx').on(t.userId)]);

export const modelConfigs = sqliteTable('model_configs', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  providerId: text('provider_id')
    .notNull()
    .references(() => providerConfigs.id, { onDelete: 'cascade' }),
  /** e.g. "gpt-4o-mini", "claude-sonnet-4-5" */
  modelId: text('model_id').notNull(),
  displayName: text('display_name'),
  /** USD per 1M tokens, used for cost estimation only */
  inputPricePerMTok: real('input_price_per_mtok').notNull().default(0),
  outputPricePerMTok: real('output_price_per_mtok').notNull().default(0),
  createdAt: ts('created_at').notNull().default(now()),
}, (t) => [
  index('model_configs_user_idx').on(t.userId),
  uniqueIndex('model_configs_unique_idx').on(t.providerId, t.modelId),
]);

/* ------------------------------------------------------------------ */
/* AI characters                                                       */
/* ------------------------------------------------------------------ */

export const aiCharacters = sqliteTable('ai_characters', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  username: text('username').notNull(),
  bio: text('bio').notNull().default(''),
  avatarUrl: text('avatar_url'),
  avatarEmoji: text('avatar_emoji').notNull().default('🙂'),
  avatarColor: text('avatar_color').notNull().default('violet'),
  /** long-form persona description */
  persona: text('persona').notNull().default(''),
  /** personality traits, comma separated tags */
  personality: text('personality').notNull().default(''),
  /** interests, comma separated tags */
  interests: text('interests').notNull().default(''),
  /** how they express themselves (style guide) */
  expressionStyle: text('expression_style').notNull().default(''),
  /** relationship with the human owner */
  relationshipToUser: text('relationship_to_user').notNull().default('朋友'),
  /** resolved system prompt (falls back to generated from persona) */
  systemPrompt: text('system_prompt'),
  /** active | paused */
  status: text('status').notNull().default('active'),

  /* behavior tendencies, 0..1 */
  chattiness: real('chattiness').notNull().default(0.5),
  likeRate: real('like_rate').notNull().default(0.5),
  commentRate: real('comment_rate').notNull().default(0.4),
  postRate: real('post_rate').notNull().default(0.15),
  dmRate: real('dm_rate').notNull().default(0.05),

  /* model override (null = inherit user default) */
  providerId: text('provider_id').references(() => providerConfigs.id, { onDelete: 'set null' }),
  modelId: text('model_id'),
  temperature: real('temperature'),
  topP: real('top_p'),
  maxTokens: integer('max_tokens'),

  lastActiveAt: ts('last_active_at'),
  createdAt: ts('created_at').notNull().default(now()),
  updatedAt: ts('updated_at').notNull().default(now()),
}, (t) => [
  index('ai_characters_user_idx').on(t.userId),
  uniqueIndex('ai_characters_username_idx').on(t.userId, t.username),
]);

/** directed AI <-> AI relationship, from one character to another */
export const aiRelationships = sqliteTable('ai_relationships', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  fromCharacterId: text('from_character_id')
    .notNull()
    .references(() => aiCharacters.id, { onDelete: 'cascade' }),
  toCharacterId: text('to_character_id')
    .notNull()
    .references(() => aiCharacters.id, { onDelete: 'cascade' }),
  /** e.g. 好友 | 闺蜜 | 同事 | 室友 | 死对头 … */
  kind: text('kind').notNull().default('朋友'),
  note: text('note'),
  createdAt: ts('created_at').notNull().default(now()),
}, (t) => [
  index('ai_relationships_user_idx').on(t.userId),
  uniqueIndex('ai_relationships_unique_idx').on(t.fromCharacterId, t.toCharacterId),
]);

/* ------------------------------------------------------------------ */
/* Chat                                                                */
/* ------------------------------------------------------------------ */

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  characterId: text('character_id')
    .notNull()
    .references(() => aiCharacters.id, { onDelete: 'cascade' }),
  /** rolling summary of older messages (memory strategy) */
  summary: text('summary'),
  /** number of messages covered by the summary */
  summarizedCount: integer('summarized_count').notNull().default(0),
  lastMessageAt: ts('last_message_at'),
  lastReadAt: ts('last_read_at'),
  createdAt: ts('created_at').notNull().default(now()),
}, (t) => [
  index('conversations_user_idx').on(t.userId),
  uniqueIndex('conversations_user_character_idx').on(t.userId, t.characterId),
]);

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  /** user | assistant */
  role: text('role').notNull(),
  content: text('content').notNull(),
  usageId: text('usage_id'),
  createdAt: ts('created_at').notNull().default(now()),
}, (t) => [index('messages_conversation_idx').on(t.conversationId, t.createdAt)]);

/* ------------------------------------------------------------------ */
/* Community: posts / comments / reactions                             */
/* ------------------------------------------------------------------ */

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  /** user | ai */
  authorType: text('author_type').notNull(),
  characterId: text('character_id').references(() => aiCharacters.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  /** future-proof media field: JSON array of { type, url, width, height } */
  media: text('media'),
  createdAt: ts('created_at').notNull().default(now()),
}, (t) => [index('posts_user_created_idx').on(t.userId, t.createdAt)]);

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  postId: text('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  authorType: text('author_type').notNull(),
  characterId: text('character_id').references(() => aiCharacters.id, { onDelete: 'cascade' }),
  parentCommentId: text('parent_comment_id'),
  content: text('content').notNull(),
  createdAt: ts('created_at').notNull().default(now()),
}, (t) => [index('comments_post_idx').on(t.postId, t.createdAt)]);

export const reactions = sqliteTable('reactions', {
  id: text('id').primaryKey(),
  postId: text('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  authorType: text('author_type').notNull(),
  characterId: text('character_id').references(() => aiCharacters.id, { onDelete: 'cascade' }),
  /** like | love | haha | ... (extensible) */
  type: text('type').notNull().default('like'),
  createdAt: ts('created_at').notNull().default(now()),
}, (t) => [
  index('reactions_post_idx').on(t.postId),
  uniqueIndex('reactions_unique_idx').on(t.postId, t.userId, t.authorType, t.characterId),
]);

/* ------------------------------------------------------------------ */
/* AI memory                                                           */
/* ------------------------------------------------------------------ */

export const aiMemories = sqliteTable('ai_memories', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  characterId: text('character_id')
    .notNull()
    .references(() => aiCharacters.id, { onDelete: 'cascade' }),
  /** fact | preference | event */
  kind: text('kind').notNull().default('fact'),
  content: text('content').notNull(),
  importance: real('importance').notNull().default(0.5),
  createdAt: ts('created_at').notNull().default(now()),
}, (t) => [index('ai_memories_character_idx').on(t.characterId, t.createdAt)]);

/* ------------------------------------------------------------------ */
/* Community event queue (AI behavior engine)                          */
/* ------------------------------------------------------------------ */

export const communityEvents = sqliteTable('community_events', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  /** user_post_created | user_comment_created | ai_comment_created | community_pulse | ai_dm */
  type: text('type').notNull(),
  /** JSON payload: { postId?, commentId?, actorCharacterId?, depth?, dedupeKey? } */
  payload: text('payload').notNull().default('{}'),
  /** pending | processing | done | failed */
  status: text('status').notNull().default('pending'),
  scheduledFor: ts('scheduled_for').notNull().default(now()),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  createdAt: ts('created_at').notNull().default(now()),
  processedAt: ts('processed_at'),
}, (t) => [
  index('community_events_status_idx').on(t.status, t.scheduledFor),
  index('community_events_user_idx').on(t.userId),
]);

/* ------------------------------------------------------------------ */
/* Usage tracking                                                      */
/* ------------------------------------------------------------------ */

export const aiUsage = sqliteTable('ai_usage', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  characterId: text('character_id').references(() => aiCharacters.id, { onDelete: 'set null' }),
  /** chat | post_generation | comment | reply | reaction_decision | memory | summary | system */
  callType: text('call_type').notNull(),
  providerType: text('provider_type').notNull(),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),
  cachedInputTokens: integer('cached_input_tokens').notNull().default(0),
  reasoningTokens: integer('reasoning_tokens').notNull().default(0),
  costUsd: real('cost_usd'),
  durationMs: integer('duration_ms').notNull().default(0),
  success: integer('success', { mode: 'boolean' }).notNull().default(true),
  errorMessage: text('error_message'),
  createdAt: ts('created_at').notNull().default(now()),
}, (t) => [
  index('ai_usage_user_created_idx').on(t.userId, t.createdAt),
  index('ai_usage_character_idx').on(t.characterId),
]);

/* ------------------------------------------------------------------ */
/* Notifications & settings                                            */
/* ------------------------------------------------------------------ */

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  /** dm | comment | like | system */
  type: text('type').notNull(),
  characterId: text('character_id').references(() => aiCharacters.id, { onDelete: 'cascade' }),
  postId: text('post_id'),
  conversationId: text('conversation_id'),
  content: text('content').notNull().default(''),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
  createdAt: ts('created_at').notNull().default(now()),
}, (t) => [index('notifications_user_idx').on(t.userId, t.createdAt)]);

export const appSettings = sqliteTable('app_settings', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: text('value').notNull(),
  updatedAt: ts('updated_at').notNull().default(now()),
}, (t) => [uniqueIndex('app_settings_unique_idx').on(t.userId, t.key)]);
