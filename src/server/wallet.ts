import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  aiCharacters,
  aiRelationships,
  messages,
  redPacketClaims,
  redPackets,
  transfers,
  user,
  walletAccounts,
  walletTransactions,
} from '@/db/schema';
import { getSetting, setSetting } from '@/server/settings';
import { DEFAULT_WALLET_CURRENCY, formatWalletMoney, getWalletCurrency } from '@/lib/wallet-currency';

/** 新钱包开户赠送（分）：让平台内互相转钱可以先玩起来 */
export const USER_INITIAL_GRANT = 100_000; // N$1000.00
export const AI_INITIAL_GRANT = 50_000; // N$500.00
/** 单笔转账/单个红包上限 */
export const MAX_SINGLE_AMOUNT = 520_000; // N$5200.00
/** 红包份数范围 */
export const MIN_SHARES = 1;
export const MAX_SHARES = 20;
/** 红包有效期 */
export const RED_PACKET_TTL_MS = 24 * 60 * 60 * 1000;
/** 转账有效期（未收款超时退回） */
export const TRANSFER_TTL_MS = 24 * 60 * 60 * 1000;

export type WalletOwnerType = 'user' | 'ai';

export class WalletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletError';
  }
}

async function getName(userId: string, ownerType: WalletOwnerType, characterId: string | null): Promise<string> {
  if (ownerType === 'user') {
    const [u] = await db.select({ name: user.name }).from(user).where(eq(user.id, userId)).limit(1);
    return u?.name ?? '我';
  }
  if (!characterId) return '居民';
  const [c] = await db
    .select({ name: aiCharacters.name })
    .from(aiCharacters)
    .where(eq(aiCharacters.id, characterId))
    .limit(1);
  return c?.name ?? '居民';
}

/**
 * 获取或开通钱包账户（首次开户发放系统初始赠送并记一条流水）。
 * 所有查询都以 userId 为边界，保证多用户数据隔离。
 */
export async function getOrCreateWalletAccount(args: {
  userId: string;
  ownerType: WalletOwnerType;
  characterId?: string | null;
  currency?: string;
}) {
  const currency = args.currency ?? DEFAULT_WALLET_CURRENCY;
  const characterId = args.ownerType === 'ai' ? args.characterId ?? null : null;

  const [existing] = await db
    .select()
    .from(walletAccounts)
    .where(
      and(
        eq(walletAccounts.userId, args.userId),
        eq(walletAccounts.ownerType, args.ownerType),
        eq(walletAccounts.currency, currency),
        characterId === null
          ? sql`${walletAccounts.characterId} IS NULL`
          : eq(walletAccounts.characterId, characterId),
      ),
    )
    .limit(1);
  if (existing) return existing;

  const grant = args.ownerType === 'user' ? USER_INITIAL_GRANT : AI_INITIAL_GRANT;
  const id = crypto.randomUUID();
  const [created] = await db
    .insert(walletAccounts)
    .values({
      id,
      userId: args.userId,
      ownerType: args.ownerType,
      characterId,
      currency,
      balance: grant,
    })
    .onConflictDoNothing()
    .returning();

  const account =
    created ??
    (await db
      .select()
      .from(walletAccounts)
      .where(
        and(
          eq(walletAccounts.userId, args.userId),
          eq(walletAccounts.ownerType, args.ownerType),
          eq(walletAccounts.currency, currency),
          characterId === null
            ? sql`${walletAccounts.characterId} IS NULL`
            : eq(walletAccounts.characterId, characterId),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]));

  if (created) {
    await db.insert(walletTransactions).values({
      id: crypto.randomUUID(),
      userId: args.userId,
      accountId: created.id,
      direction: 'in',
      type: 'system_grant',
      amount: grant,
      currency,
      balanceAfter: grant,
      counterpartyType: 'system',
      note: '开户赠送',
    });
  }

  return account;
}

type OwnerRef = { ownerType: WalletOwnerType; characterId?: string | null };

async function requireAccount(userId: string, owner: OwnerRef, currency: string) {
  const account = await getOrCreateWalletAccount({
    userId,
    ownerType: owner.ownerType,
    characterId: owner.characterId,
    currency,
  });
  return account;
}

/** 内部记账：加/减余额并写流水（必须在事务内使用） */
async function applyLedger(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  args: {
    accountId: string;
    userId: string;
    direction: 'in' | 'out';
    type: string;
    amount: number;
    currency: string;
    counterpartyType?: string | null;
    counterpartyCharacterId?: string | null;
    counterpartyName?: string | null;
    messageId?: string | null;
    redPacketId?: string | null;
    note?: string | null;
  },
) {
  const delta = args.direction === 'in' ? args.amount : -args.amount;
  const [updated] = await tx
    .update(walletAccounts)
    .set({
      balance: sql`${walletAccounts.balance} + ${delta}`,
      updatedAt: new Date(),
    })
    .where(eq(walletAccounts.id, args.accountId))
    .returning({ balance: walletAccounts.balance });

  if (!updated || updated.balance < 0) {
    throw new WalletError('余额不足');
  }

  await tx.insert(walletTransactions).values({
    id: crypto.randomUUID(),
    userId: args.userId,
    accountId: args.accountId,
    direction: args.direction,
    type: args.type,
    amount: args.amount,
    currency: args.currency,
    balanceAfter: updated.balance,
    counterpartyType: args.counterpartyType ?? null,
    counterpartyCharacterId: args.counterpartyCharacterId ?? null,
    counterpartyName: args.counterpartyName ?? null,
    messageId: args.messageId ?? null,
    redPacketId: args.redPacketId ?? null,
    note: args.note ?? null,
  });

  return updated.balance;
}

/**
 * 发红包：立刻扣款，红包金额冻结在红包记录中，被领取时逐份入账。
 */
export async function createRedPacket(args: {
  userId: string;
  sender: OwnerRef;
  totalAmount: number;
  shareCount?: number;
  currency?: string;
  greeting?: string | null;
  messageId?: string | null;
}) {
  const currency = args.currency ?? DEFAULT_WALLET_CURRENCY;
  const shareCount = Math.min(Math.max(args.shareCount ?? 1, MIN_SHARES), MAX_SHARES);
  if (!Number.isInteger(args.totalAmount) || args.totalAmount <= 0) {
    throw new WalletError('红包金额无效');
  }
  if (args.totalAmount > MAX_SINGLE_AMOUNT) {
    throw new WalletError(`单个红包不能超过 ${formatWalletMoney(MAX_SINGLE_AMOUNT, currency)}`);
  }
  if (args.totalAmount < shareCount) {
    throw new WalletError('红包总金额至少要够每份 0.01');
  }

  const senderAccount = await requireAccount(args.userId, args.sender, currency);

  const id = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await applyLedger(tx, {
      accountId: senderAccount.id,
      userId: args.userId,
      direction: 'out',
      type: 'red_packet_send',
      amount: args.totalAmount,
      currency,
      redPacketId: id,
      messageId: args.messageId ?? null,
      note: '发出红包',
    });
    await tx.insert(redPackets).values({
      id,
      userId: args.userId,
      messageId: args.messageId ?? null,
      currency,
      totalAmount: args.totalAmount,
      shareCount,
      senderType: args.sender.ownerType,
      senderCharacterId: args.sender.characterId ?? null,
      greeting: args.greeting ?? null,
      status: 'open',
      expiresAt: new Date(Date.now() + RED_PACKET_TTL_MS),
    });
  });

  return { id };
}

/**
 * 拆红包：首领者随机分一份，最后一份取剩余全部；发完自动关闭。
 * 同一领取者（claimantKey = 'user' 或 characterId）只能领一次。
 */
export async function claimRedPacket(args: {
  userId: string;
  redPacketId: string;
  claimant: OwnerRef;
  messageId?: string | null;
}) {
  const claimantKey = args.claimant.ownerType === 'user' ? 'user' : args.claimant.characterId ?? null;
  if (!claimantKey) throw new WalletError('领取者无效');

  const [packet] = await db
    .select()
    .from(redPackets)
    .where(and(eq(redPackets.id, args.redPacketId), eq(redPackets.userId, args.userId)))
    .limit(1);
  if (!packet) throw new WalletError('红包不存在');
  if (packet.senderType === 'ai' && args.claimant.ownerType === 'ai' && packet.senderCharacterId === args.claimant.characterId) {
    throw new WalletError('不能领自己的红包');
  }
  if (packet.status === 'expired' || (packet.expiresAt && packet.expiresAt.getTime() < Date.now())) {
    throw new WalletError('红包已过期');
  }

  const [already] = await db
    .select({ id: redPacketClaims.id })
    .from(redPacketClaims)
    .where(and(eq(redPacketClaims.redPacketId, args.redPacketId), eq(redPacketClaims.claimantKey, claimantKey)))
    .limit(1);
  if (already) throw new WalletError('已经领取过这个红包了');

  const claimantAccount = await requireAccount(args.userId, args.claimant, packet.currency);
  const senderName = await getName(args.userId, packet.senderType as WalletOwnerType, packet.senderCharacterId);

  return db.transaction(async (tx) => {
    // 事务内重新检查状态与剩余份额
    const [current] = await tx
      .select()
      .from(redPackets)
      .where(eq(redPackets.id, args.redPacketId))
      .limit(1);
    if (!current || current.status !== 'open' || current.claimedCount >= current.shareCount) {
      throw new WalletError('红包已被领完');
    }

    const remainingShares = current.shareCount - current.claimedCount;
    const remainingAmount = current.totalAmount - current.claimedAmount;
    let amount: number;
    if (remainingShares === 1) {
      amount = remainingAmount;
    } else {
      // 经典「两倍均值」随机：每份期望相等
      const avg = remainingAmount / remainingShares;
      const max = Math.max(1, Math.floor(avg * 2));
      amount = 1 + Math.floor(Math.random() * max);
      amount = Math.min(amount, remainingAmount - (remainingShares - 1));
    }

    const balanceAfter = await applyLedger(tx, {
      accountId: claimantAccount.id,
      userId: args.userId,
      direction: 'in',
      type: 'red_packet_claim',
      amount,
      currency: current.currency,
      counterpartyType: current.senderType,
      counterpartyCharacterId: current.senderCharacterId,
      counterpartyName: senderName,
      redPacketId: current.id,
      messageId: args.messageId ?? null,
      note: '领取红包',
    });

    await tx.insert(redPacketClaims).values({
      id: crypto.randomUUID(),
      userId: args.userId,
      redPacketId: current.id,
      claimantKey,
      claimantType: args.claimant.ownerType,
      amount,
    });

    const nextClaimedCount = current.claimedCount + 1;
    await tx
      .update(redPackets)
      .set({
        claimedCount: nextClaimedCount,
        claimedAmount: current.claimedAmount + amount,
        status: nextClaimedCount >= current.shareCount ? 'claimed_out' : 'open',
      })
      .where(eq(redPackets.id, current.id));

    return { amount, balanceAfter, currency: current.currency };
  });
}

/**
 * 发起转账：立即从发送者扣款冻结，收款方确认收款后才入账；
 * 超时未收款自动原路退回。
 */
export async function createTransfer(args: {
  userId: string;
  from: OwnerRef;
  to: OwnerRef;
  amount: number;
  currency?: string;
  note?: string | null;
  messageId?: string | null;
}) {
  const currency = args.currency ?? DEFAULT_WALLET_CURRENCY;
  if (!getWalletCurrency(currency).enabled) {
    throw new WalletError(`货币类型 ${currency} 尚未启用`);
  }
  if (!Number.isInteger(args.amount) || args.amount <= 0) {
    throw new WalletError('转账金额无效');
  }
  if (args.amount > MAX_SINGLE_AMOUNT) {
    throw new WalletError(`单笔转账不能超过 ${formatWalletMoney(MAX_SINGLE_AMOUNT, currency)}`);
  }
  if (args.from.ownerType === args.to.ownerType && (args.from.characterId ?? null) === (args.to.characterId ?? null)) {
    throw new WalletError('不能转给自己');
  }

  const fromAccount = await requireAccount(args.userId, args.from, currency);
  const recipientName = await getName(args.userId, args.to.ownerType, args.to.characterId ?? null);

  const id = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await applyLedger(tx, {
      accountId: fromAccount.id,
      userId: args.userId,
      direction: 'out',
      type: 'transfer_send',
      amount: args.amount,
      currency,
      counterpartyType: args.to.ownerType,
      counterpartyCharacterId: args.to.characterId ?? null,
      counterpartyName: recipientName,
      messageId: args.messageId ?? null,
      note: args.note ?? null,
    });
    await tx.insert(transfers).values({
      id,
      userId: args.userId,
      messageId: args.messageId ?? null,
      currency,
      amount: args.amount,
      note: args.note ?? null,
      senderType: args.from.ownerType,
      senderCharacterId: args.from.characterId ?? null,
      recipientType: args.to.ownerType,
      recipientCharacterId: args.to.characterId ?? null,
      status: 'pending',
      expiresAt: new Date(Date.now() + TRANSFER_TTL_MS),
    });
  });

  return { id };
}

/** 收款方 account key：'user' 或 characterId（与红包 claimantKey 同约定） */
function ownerKey(owner: OwnerRef): string | null {
  return owner.ownerType === 'user' ? 'user' : owner.characterId ?? null;
}

/**
 * 确认收款：核验收款人身份后把冻结金额入账（transfer_receive 流水）。
 */
export async function acceptTransfer(args: {
  userId: string;
  transferId: string;
  acceptor: OwnerRef;
}) {
  const acceptorKey = ownerKey(args.acceptor);
  if (!acceptorKey) throw new WalletError('收款人无效');

  const [transfer] = await db
    .select()
    .from(transfers)
    .where(and(eq(transfers.id, args.transferId), eq(transfers.userId, args.userId)))
    .limit(1);
  if (!transfer) throw new WalletError('转账不存在');
  if (transfer.recipientType !== args.acceptor.ownerType) throw new WalletError('无权收取这笔转账');
  if ((transfer.recipientCharacterId ?? null) !== (args.acceptor.characterId ?? null)) {
    throw new WalletError('无权收取这笔转账');
  }
  if (transfer.senderType === args.acceptor.ownerType && (transfer.senderCharacterId ?? null) === (args.acceptor.characterId ?? null)) {
    throw new WalletError('不能收取自己发出的转账');
  }
  if (transfer.status === 'expired' || (transfer.expiresAt && transfer.expiresAt.getTime() < Date.now())) {
    throw new WalletError('转账已过期退回');
  }

  const acceptorAccount = await requireAccount(args.userId, args.acceptor, transfer.currency);
  const senderName = await getName(args.userId, transfer.senderType as WalletOwnerType, transfer.senderCharacterId);

  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ status: transfers.status })
      .from(transfers)
      .where(eq(transfers.id, args.transferId))
      .limit(1);
    if (!current || current.status !== 'pending') {
      throw new WalletError('这笔转账已收款或已退回');
    }

    const balanceAfter = await applyLedger(tx, {
      accountId: acceptorAccount.id,
      userId: args.userId,
      direction: 'in',
      type: 'transfer_receive',
      amount: transfer.amount,
      currency: transfer.currency,
      counterpartyType: transfer.senderType,
      counterpartyCharacterId: transfer.senderCharacterId,
      counterpartyName: senderName,
      messageId: transfer.messageId,
      note: transfer.note,
    });

    const claimedAt = new Date();
    await tx
      .update(transfers)
      .set({ status: 'claimed', claimedAt })
      .where(eq(transfers.id, args.transferId));

    return { amount: transfer.amount, balanceAfter, currency: transfer.currency, claimedAt };
  });
}

/** 转账过期未收款：原路退回发送者（transfer_refund 流水）。 */
export async function refundExpiredTransfers(userId: string): Promise<number> {
  const expired = await db
    .select()
    .from(transfers)
    .where(
      and(
        eq(transfers.userId, userId),
        eq(transfers.status, 'pending'),
        lt(transfers.expiresAt, new Date()),
      ),
    )
    .limit(50);
  if (expired.length === 0) return 0;

  let refunded = 0;
  for (const transfer of expired) {
    try {
      const senderAccount = await getOrCreateWalletAccount({
        userId,
        ownerType: transfer.senderType as WalletOwnerType,
        characterId: transfer.senderCharacterId,
        currency: transfer.currency,
      });
      await db.transaction(async (tx) => {
        const [current] = await tx
          .select({ status: transfers.status })
          .from(transfers)
          .where(eq(transfers.id, transfer.id))
          .limit(1);
        if (!current || current.status !== 'pending') return;

        await applyLedger(tx, {
          accountId: senderAccount.id,
          userId,
          direction: 'in',
          type: 'transfer_refund',
          amount: transfer.amount,
          currency: transfer.currency,
          messageId: transfer.messageId,
          note: '转账未收款退回',
        });
        await tx
          .update(transfers)
          .set({ status: 'expired' })
          .where(eq(transfers.id, transfer.id));
      });
      refunded++;
    } catch (err) {
      console.error('[wallet] refund expired transfer failed', transfer.id, err);
    }
  }
  return refunded;
}

/** 会话内收款方（指定 AI）待收款的转账（供 AI 决定是否收款） */
export async function getPendingTransfersForCharacter(args: {
  userId: string;
  conversationId: string;
  characterId: string;
  limit?: number;
}) {
  const since = new Date(Date.now() - TRANSFER_TTL_MS);
  const rows = await db
    .select({
      id: transfers.id,
      amount: transfers.amount,
      currency: transfers.currency,
      note: transfers.note,
    })
    .from(transfers)
    .innerJoin(messages, eq(transfers.messageId, messages.id))
    .where(
      and(
        eq(transfers.userId, args.userId),
        eq(transfers.recipientType, 'ai'),
        eq(transfers.recipientCharacterId, args.characterId),
        eq(transfers.status, 'pending'),
        gte(transfers.createdAt, since),
        eq(messages.conversationId, args.conversationId),
      ),
    )
    .orderBy(desc(transfers.createdAt))
    .limit(args.limit ?? 3);
  return rows;
}

export type TransferStatusView = {
  transferId: string;
  amount: number;
  currency: string;
  note: string | null;
  status: string;
  senderType: string;
  /** 当前用户是否已收款 */
  myClaimedAmount: number | null;
  claimedAt: Date | null;
};

/**
 * 批量获取转账消息的收款状态（仅限当前 userId 的转账），供聊天气泡渲染。
 */
export async function getTransferStatuses(
  userId: string,
  transferIds: string[],
): Promise<Map<string, TransferStatusView>> {
  if (transferIds.length === 0) return new Map();

  const rows = await db
    .select()
    .from(transfers)
    .where(and(eq(transfers.userId, userId), inArray(transfers.id, transferIds)));

  const result = new Map<string, TransferStatusView>();
  for (const t of rows) {
    const iClaimed =
      t.status === 'claimed' &&
      ((t.recipientType === 'user' && t.recipientCharacterId === null) ||
        (t.recipientType === 'ai' && t.recipientCharacterId !== null));
    result.set(t.id, {
      transferId: t.id,
      amount: t.amount,
      currency: t.currency,
      note: t.note,
      status: t.status,
      senderType: t.senderType,
      // 「我」视角：只有用户作为收款方领取时才展示收款金额
      myClaimedAmount: iClaimed && t.recipientType === 'user' ? t.amount : null,
      claimedAt: t.claimedAt,
    });
  }
  return result;
}

export type WalletAccountView = {
  id: string;
  ownerType: WalletOwnerType;
  characterId: string | null;
  currency: string;
  balance: number;
  name: string;
  username?: string | null;
  avatarUrl: string | null;
  avatarEmoji: string;
  avatarColor: string;
};

/**
 * 钱包总览：用户 + 全部 AI 居民的账户余额（系统金额统计可查看全部金额）。
 * 所有数据限定在当前 userId 下。
 */
export async function getWalletOverview(userId: string) {
  // 确保用户主钱包存在
  await getOrCreateWalletAccount({ userId, ownerType: 'user' });

  const rows = await db
    .select({
      account: walletAccounts,
      characterName: aiCharacters.name,
      characterUsername: aiCharacters.username,
      characterAvatarUrl: aiCharacters.avatarUrl,
      characterAvatarEmoji: aiCharacters.avatarEmoji,
      characterAvatarColor: aiCharacters.avatarColor,
    })
    .from(walletAccounts)
    .leftJoin(aiCharacters, eq(walletAccounts.characterId, aiCharacters.id))
    .where(eq(walletAccounts.userId, userId))
    .orderBy(walletAccounts.createdAt);

  const accounts: WalletAccountView[] = rows.map((r) => ({
    id: r.account.id,
    ownerType: r.account.ownerType as WalletOwnerType,
    characterId: r.account.characterId,
    currency: r.account.currency,
    balance: r.account.balance,
    name: r.account.ownerType === 'user' ? (r.characterName ?? '我') : r.characterName ?? '居民',
    username: r.characterUsername,
    avatarUrl: r.account.ownerType === 'user' ? null : r.characterAvatarUrl,
    avatarEmoji: r.account.ownerType === 'user' ? '🧑' : r.characterAvatarEmoji ?? '🙂',
    avatarColor: r.account.ownerType === 'user' ? 'violet' : r.characterAvatarColor ?? 'violet',
  }));

  const enabledAccounts = accounts.filter((a) => getWalletCurrency(a.currency).enabled);
  const totalBalance = enabledAccounts.reduce((s, a) => s + a.balance, 0);

  const [stats] = await db
    .select({
      totalIn: sql<number>`COALESCE(SUM(CASE WHEN ${walletTransactions.direction} = 'in' AND ${walletTransactions.type} != 'system_grant' THEN ${walletTransactions.amount} ELSE 0 END), 0)`,
      totalOut: sql<number>`COALESCE(SUM(CASE WHEN ${walletTransactions.direction} = 'out' THEN ${walletTransactions.amount} ELSE 0 END), 0)`,
    })
    .from(walletTransactions)
    .where(eq(walletTransactions.userId, userId));

  return { accounts, totalBalance, totalIn: stats?.totalIn ?? 0, totalOut: stats?.totalOut ?? 0 };
}

export type WalletTransactionView = {
  id: string;
  direction: 'in' | 'out';
  type: string;
  amount: number;
  currency: string;
  balanceAfter: number;
  counterpartyName: string | null;
  note: string | null;
  createdAt: Date;
};

/** 最近交易流水（限当前用户） */
export async function getWalletTransactions(userId: string, limit = 30): Promise<WalletTransactionView[]> {
  const rows = await db
    .select({
      id: walletTransactions.id,
      direction: walletTransactions.direction,
      type: walletTransactions.type,
      amount: walletTransactions.amount,
      currency: walletTransactions.currency,
      balanceAfter: walletTransactions.balanceAfter,
      counterpartyName: walletTransactions.counterpartyName,
      note: walletTransactions.note,
      createdAt: walletTransactions.createdAt,
    })
    .from(walletTransactions)
    .where(eq(walletTransactions.userId, userId))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, direction: r.direction as 'in' | 'out' }));
}

export type RedPacketStatusView = {
  redPacketId: string;
  totalAmount: number;
  shareCount: number;
  claimedCount: number;
  claimedAmount: number;
  status: string;
  currency: string;
  greeting: string | null;
  senderType: string;
  /** 当前用户是否已领取（AI 的领取情况进 claims 列表） */
  myClaimAmount: number | null;
  claims: Array<{ name: string; amount: number }>;
};

/**
 * 批量获取红包消息的红包状态（含领取明细），供聊天气泡渲染。
 * 仅返回属于当前 userId 的红包，保证数据隔离。
 */
export async function getRedPacketStatuses(
  userId: string,
  redPacketIds: string[],
): Promise<Map<string, RedPacketStatusView>> {
  if (redPacketIds.length === 0) return new Map();

  const packets = await db
    .select()
    .from(redPackets)
    .where(and(eq(redPackets.userId, userId), inArray(redPackets.id, redPacketIds)));

  const claims = await db
    .select({
      redPacketId: redPacketClaims.redPacketId,
      claimantType: redPacketClaims.claimantType,
      claimantKey: redPacketClaims.claimantKey,
      amount: redPacketClaims.amount,
      characterName: aiCharacters.name,
    })
    .from(redPacketClaims)
    .leftJoin(aiCharacters, eq(redPacketClaims.claimantKey, aiCharacters.id))
    .where(
      and(
        eq(redPacketClaims.userId, userId),
        inArray(
          redPacketClaims.redPacketId,
          packets.map((p) => p.id),
        ),
      ),
    )
    .orderBy(redPacketClaims.createdAt);

  const result = new Map<string, RedPacketStatusView>();
  for (const p of packets) {
    const packetClaims = claims.filter((c) => c.redPacketId === p.id);
    const myClaim = packetClaims.find((c) => c.claimantKey === 'user');
    result.set(p.id, {
      redPacketId: p.id,
      totalAmount: p.totalAmount,
      shareCount: p.shareCount,
      claimedCount: p.claimedCount,
      claimedAmount: p.claimedAmount,
      status: p.status,
      currency: p.currency,
      greeting: p.greeting,
      senderType: p.senderType,
      myClaimAmount: myClaim?.amount ?? null,
      claims: packetClaims.map((c) => ({
        name: c.claimantType === 'user' ? '我' : c.characterName ?? '居民',
        amount: c.amount,
      })),
    });
  }
  return result;
}

/** 会话内用户发出、且指定 AI 未领取的红包（供 AI 引擎做「是否领取」决策） */
export async function getUnclaimedRedPacketsForCharacter(args: {
  userId: string;
  conversationId: string;
  characterId: string;
  limit?: number;
}) {
  const since = new Date(Date.now() - RED_PACKET_TTL_MS);
  const rows = await db
    .select({
      id: redPackets.id,
      totalAmount: redPackets.totalAmount,
      shareCount: redPackets.shareCount,
      claimedCount: redPackets.claimedCount,
      currency: redPackets.currency,
      greeting: redPackets.greeting,
    })
    .from(redPackets)
    .innerJoin(messages, eq(redPackets.messageId, messages.id))
    .where(
      and(
        eq(redPackets.userId, args.userId),
        eq(redPackets.senderType, 'user'),
        eq(redPackets.status, 'open'),
        gte(redPackets.createdAt, since),
        eq(messages.conversationId, args.conversationId),
      ),
    )
    .orderBy(desc(redPackets.createdAt))
    .limit(args.limit ?? 3);

  const result = [];
  for (const packet of rows) {
    if (packet.claimedCount >= packet.shareCount) continue;
    const [claimed] = await db
      .select({ id: redPacketClaims.id })
      .from(redPacketClaims)
      .where(and(eq(redPacketClaims.redPacketId, packet.id), eq(redPacketClaims.claimantKey, args.characterId)))
      .limit(1);
    if (!claimed) result.push(packet);
  }
  return result;
}

/**
 * 红包过期退回：过期未领完的红包，剩余金额原路退回发送者并记流水（type=red_packet_refund）。
 * 幂等：仅处理 status='open' 且已过期的红包，事务内二次校验。
 */
export async function refundExpiredRedPackets(userId: string): Promise<number> {
  const expired = await db
    .select()
    .from(redPackets)
    .where(
      and(
        eq(redPackets.userId, userId),
        eq(redPackets.status, 'open'),
        lt(redPackets.expiresAt, new Date()),
      ),
    )
    .limit(50);
  if (expired.length === 0) return 0;

  let refunded = 0;
  for (const packet of expired) {
    const remaining = packet.totalAmount - packet.claimedAmount;
    if (remaining <= 0) {
      await db.update(redPackets).set({ status: 'expired' }).where(eq(redPackets.id, packet.id));
      continue;
    }
    try {
      const senderAccount = await getOrCreateWalletAccount({
        userId,
        ownerType: packet.senderType as WalletOwnerType,
        characterId: packet.senderCharacterId,
        currency: packet.currency,
      });
      await db.transaction(async (tx) => {
        // 事务内二次确认仍未被领取
        const [current] = await tx
          .select({ status: redPackets.status, claimedAmount: redPackets.claimedAmount })
          .from(redPackets)
          .where(eq(redPackets.id, packet.id))
          .limit(1);
        if (!current || current.status !== 'open') return;

        await applyLedger(tx, {
          accountId: senderAccount.id,
          userId,
          direction: 'in',
          type: 'red_packet_refund',
          amount: remaining,
          currency: packet.currency,
          redPacketId: packet.id,
          note: '红包未领完退回',
        });
        await tx
          .update(redPackets)
          .set({ status: 'expired' })
          .where(eq(redPackets.id, packet.id));
      });
      refunded++;
    } catch (err) {
      console.error('[wallet] refund expired red packet failed', packet.id, err);
    }
  }
  return refunded;
}

/**
 * AI 之间的好友转账到账通知：查询自上次水印以来该 AI 收到的转账（含用户与 AI 转入），
 * 返回可注入上下文的描述并推进水印，保证每条到账只提示一次。
 */
export async function getWalletNoticesForCharacter(args: {
  userId: string;
  characterId: string;
}): Promise<string[]> {
  const watermarkKey = `wallet_notice_until:${args.characterId}`;
  const lastUntil = await getSetting<string | null>(args.userId, watermarkKey, null);
  const since = lastUntil ? new Date(lastUntil) : new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 只保留「转入到该 AI 账户」的流水
  const [myAccount] = await db
    .select({ id: walletAccounts.id })
    .from(walletAccounts)
    .where(
      and(
        eq(walletAccounts.userId, args.userId),
        eq(walletAccounts.ownerType, 'ai'),
        eq(walletAccounts.characterId, args.characterId),
      ),
    )
    .limit(1);
  if (!myAccount) return [];

  const rows = await db
    .select({
      amount: walletTransactions.amount,
      currency: walletTransactions.currency,
      note: walletTransactions.note,
      counterpartyName: walletTransactions.counterpartyName,
      createdAt: walletTransactions.createdAt,
    })
    .from(walletTransactions)
    .where(
      and(
        eq(walletTransactions.accountId, myAccount.id),
        eq(walletTransactions.direction, 'in'),
        inArray(walletTransactions.type, ['transfer', 'transfer_receive']),
        gte(walletTransactions.createdAt, since),
      ),
    )
    .orderBy(desc(walletTransactions.createdAt))
    .limit(20);

  if (rows.length === 0) return [];

  const notices = rows.map(
    (r) =>
      `你收到来自 ${r.counterpartyName ?? '好友'} 的转账 ${formatWalletMoney(r.amount, r.currency)}${r.note ? `（备注：${r.note}）` : ''}。`,
  );

  const newest = rows[0]?.createdAt ?? new Date();
  await setSetting(args.userId, watermarkKey, new Date(newest.getTime() + 1).toISOString());
  return notices;
}

/** AI 的好友名单（互为好友，任一方向登记即算），供 AI 决定向好友转账 */
export async function getFriendListForCharacter(args: {
  userId: string;
  characterId: string;
}): Promise<Array<{ id: string; name: string }>> {
  const rows = await db
    .select({
      friendId: aiCharacters.id,
      friendName: aiCharacters.name,
    })
    .from(aiRelationships)
    .innerJoin(
      aiCharacters,
      sql`(${aiCharacters.id} = ${aiRelationships.toCharacterId} AND ${aiRelationships.fromCharacterId} = ${args.characterId}) OR (${aiCharacters.id} = ${aiRelationships.fromCharacterId} AND ${aiRelationships.toCharacterId} = ${args.characterId})`,
    )
    .where(and(eq(aiRelationships.userId, args.userId), eq(aiCharacters.status, 'active')))
    .limit(50);
  return rows
    .map((r) => ({ id: r.friendId, name: r.friendName }))
    .filter((f) => f.id !== args.characterId)
    .filter((f, i, arr) => arr.findIndex((x) => x.id === f.id) === i);
}
