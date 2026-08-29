import { and, eq, gte, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { aiCharacters, aiUsage } from '@/db/schema';

export type UsageRange = 'today' | '7d' | '30d' | '90d' | 'all';

function rangeStart(range: UsageRange): Date | null {
  const now = new Date();
  switch (range) {
    case 'today': {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case '7d':
      return new Date(now.getTime() - 7 * 86400_000);
    case '30d':
      return new Date(now.getTime() - 30 * 86400_000);
    case '90d':
      return new Date(now.getTime() - 90 * 86400_000);
    default:
      return null;
  }
}

export type UsageFilters = {
  range: UsageRange;
  characterId?: string;
  model?: string;
};

export type UsageSummary = {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  requests: number;
  failedRequests: number;
  costUsd: number;
};

export async function getUsageSummary(
  userId: string,
  filters: UsageFilters,
): Promise<UsageSummary> {
  const conds = condsFor(userId, filters);
  const [row] = await db
    .select({
      totalTokens: sql<number>`CAST(COALESCE(SUM(${aiUsage.totalTokens}), 0) AS INTEGER)`,
      inputTokens: sql<number>`CAST(COALESCE(SUM(${aiUsage.inputTokens}), 0) AS INTEGER)`,
      outputTokens: sql<number>`CAST(COALESCE(SUM(${aiUsage.outputTokens}), 0) AS INTEGER)`,
      cachedTokens: sql<number>`CAST(COALESCE(SUM(${aiUsage.cachedInputTokens}), 0) AS INTEGER)`,
      reasoningTokens: sql<number>`CAST(COALESCE(SUM(${aiUsage.reasoningTokens}), 0) AS INTEGER)`,
      requests: sql<number>`CAST(COUNT(*) AS INTEGER)`,
      failedRequests: sql<number>`CAST(COALESCE(SUM(CASE WHEN ${aiUsage.success} = 0 THEN 1 ELSE 0 END), 0) AS INTEGER)`,
      costUsd: sql<number>`CAST(COALESCE(SUM(${aiUsage.costUsd}), 0) AS REAL)`,
    })
    .from(aiUsage)
    .where(conds);
  return row;
}

function condsFor(userId: string, filters: UsageFilters): SQL | undefined {
  const conds = [eq(aiUsage.userId, userId)];
  const start = rangeStart(filters.range);
  if (start) conds.push(gte(aiUsage.createdAt, start));
  if (filters.characterId) conds.push(eq(aiUsage.characterId, filters.characterId));
  if (filters.model) conds.push(eq(aiUsage.model, filters.model));
  return and(...conds);
}

export async function getDailyTrend(userId: string, filters: UsageFilters) {
  const conds = condsFor(userId, filters);
  const rows = await db
    .select({
      createdAt: aiUsage.createdAt,
      inputTokens: aiUsage.inputTokens,
      outputTokens: aiUsage.outputTokens,
      costUsd: aiUsage.costUsd,
    })
    .from(aiUsage)
    .where(conds)
    .orderBy(aiUsage.createdAt)
    .limit(5000);

  // group by local calendar day in JS (portable across SQLite builds)
  const byDay = new Map<
    string,
    { day: string; inputTokens: number; outputTokens: number; totalTokens: number; costUsd: number; requests: number }
  >();
  for (const r of rows) {
    const day = r.createdAt.toLocaleDateString('sv-SE'); // YYYY-MM-DD in local time
    const agg = byDay.get(day) ?? {
      day,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      requests: 0,
    };
    agg.inputTokens += r.inputTokens;
    agg.outputTokens += r.outputTokens;
    agg.totalTokens += r.inputTokens + r.outputTokens;
    agg.costUsd += r.costUsd ?? 0;
    agg.requests += 1;
    byDay.set(day, agg);
  }
  return [...byDay.values()].slice(-120);
}

export type BreakdownRow = {
  key: string;
  label: string;
  totalTokens: number;
  requests: number;
  costUsd: number;
};

export async function getBreakdown(
  userId: string,
  filters: UsageFilters,
  dimension: 'character' | 'model' | 'provider' | 'callType',
): Promise<BreakdownRow[]> {
  const conds = condsFor(userId, filters);
  let keyExpr: SQL;
  let join: 'character' | null = null;

  switch (dimension) {
    case 'character':
      keyExpr = sql`${aiUsage.characterId}`;
      join = 'character';
      break;
    case 'model':
      keyExpr = sql`${aiUsage.model}`;
      break;
    case 'provider':
      keyExpr = sql`${aiUsage.providerType}`;
      break;
    case 'callType':
      keyExpr = sql`${aiUsage.callType}`;
      break;
  }

  if (join === 'character') {
    const rows = await db
      .select({
        key: sql<string>`COALESCE(${aiUsage.characterId}, 'none')`,
        label: sql<string>`COALESCE(${aiCharacters.name}, '（系统/未指定）')`,
        totalTokens: sql<number>`CAST(COALESCE(SUM(${aiUsage.totalTokens}), 0) AS INTEGER)`,
        requests: sql<number>`CAST(COUNT(*) AS INTEGER)`,
        costUsd: sql<number>`CAST(COALESCE(SUM(${aiUsage.costUsd}), 0) AS REAL)`,
      })
      .from(aiUsage)
      .leftJoin(aiCharacters, eq(aiUsage.characterId, aiCharacters.id))
      .where(conds)
      .groupBy(sql`1`, sql`2`)
      .orderBy(sql`3 DESC`)
      .limit(15);
    return rows;
  }

  const rows = await db
    .select({
      key: sql<string>`${keyExpr}`,
      label: sql<string>`${keyExpr}`,
      totalTokens: sql<number>`CAST(COALESCE(SUM(${aiUsage.totalTokens}), 0) AS INTEGER)`,
      requests: sql<number>`CAST(COUNT(*) AS INTEGER)`,
      costUsd: sql<number>`CAST(COALESCE(SUM(${aiUsage.costUsd}), 0) AS REAL)`,
    })
    .from(aiUsage)
    .where(conds)
    .groupBy(sql`1`)
    .orderBy(sql`2 DESC`)
    .limit(15);
  return rows;
}

export async function getFilterOptions(userId: string) {
  const [characters, models] = await Promise.all([
    db
      .select({ id: aiCharacters.id, name: aiCharacters.name })
      .from(aiCharacters)
      .where(eq(aiCharacters.userId, userId)),
    db
      .selectDistinct({ model: aiUsage.model })
      .from(aiUsage)
      .where(eq(aiUsage.userId, userId)),
  ]);
  return {
    characters,
    models: models.map((m) => m.model),
  };
}

export const CALL_TYPE_LABELS: Record<string, string> = {
  chat: '私聊',
  post_generation: 'AI 发帖',
  comment: 'AI 评论',
  reply: 'AI 回复',
  reaction_decision: '互动决策',
  memory: '记忆提取',
  summary: '对话摘要',
  system: '系统',
};

export const PROVIDER_TYPE_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  deepseek: 'DeepSeek',
  'openai-compatible': '自定义',
};
