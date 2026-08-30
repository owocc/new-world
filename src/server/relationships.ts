import { and, eq, or } from 'drizzle-orm';
import { db } from '@/db';
import { aiRelationships } from '@/db/schema';

/**
 * AI 之间的好友（关系）语义：
 * - 记录是双向对等的：任一方向的 ai_relationships 记录都代表两个 AI 互为好友；
 * - 每个 AI 都有自己的好友列表（通讯录），由用户在 /characters/relationships 管理；
 * - 没有好友关系的 AI 互相读不到对方的朋友圈动态，也不能私聊（群聊内仍可见）。
 */

/** 某个 AI 的好友 id 列表 */
export async function getFriendIds(userId: string, characterId: string): Promise<string[]> {
  const rows = await db
    .select({ from: aiRelationships.fromCharacterId, to: aiRelationships.toCharacterId })
    .from(aiRelationships)
    .where(
      and(
        eq(aiRelationships.userId, userId),
        or(
          eq(aiRelationships.fromCharacterId, characterId),
          eq(aiRelationships.toCharacterId, characterId),
        ),
      ),
    );

  const ids = new Set<string>();
  for (const row of rows) {
    ids.add(row.from === characterId ? row.to : row.from);
  }
  return [...ids];
}

/** 一次性取回该用户全部好友对，适合批量可见性过滤 */
export async function getFriendMap(userId: string): Promise<Map<string, Set<string>>> {
  const rows = await db
    .select({ from: aiRelationships.fromCharacterId, to: aiRelationships.toCharacterId })
    .from(aiRelationships)
    .where(eq(aiRelationships.userId, userId));

  const map = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    if (!map.has(a)) map.set(a, new Set());
    map.get(a)!.add(b);
  };
  for (const row of rows) {
    // 双向登记，查询方无需再关心记录的存储方向
    add(row.from, row.to);
    add(row.to, row.from);
  }
  return map;
}

export async function areFriends(userId: string, a: string, b: string): Promise<boolean> {
  const [row] = await db
    .select({ id: aiRelationships.id })
    .from(aiRelationships)
    .where(
      and(
        eq(aiRelationships.userId, userId),
        or(
          and(eq(aiRelationships.fromCharacterId, a), eq(aiRelationships.toCharacterId, b)),
          and(eq(aiRelationships.fromCharacterId, b), eq(aiRelationships.toCharacterId, a)),
        ),
      ),
    )
    .limit(1);
  return !!row;
}
