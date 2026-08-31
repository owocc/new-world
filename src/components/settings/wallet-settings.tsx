'use client';

import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Text } from '@astryxdesign/core/Text';
import { Token } from '@astryxdesign/core/Token';
import { Badge } from '@astryxdesign/core/Badge';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { UserAvatar } from '@/components/user-avatar';
import { Wallet, Landmark, ArrowDownLeft, ArrowUpRight, TrendingUp } from 'lucide-react';
import * as stylex from '@stylexjs/stylex';
import {
  RESERVED_WALLET_CURRENCIES,
  WALLET_CURRENCIES,
  formatWalletMoney,
} from '@/lib/wallet-currency';
import type { WalletAccountView, WalletTransactionView } from '@/server/wallet';

const styles = stylex.create({
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '12px',
  },
  title: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-semibold)',
    letterSpacing: '-0.01em',
  },
  subtitle: { fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' },
  heroCard: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    borderRadius: 'var(--radius-container)',
    border: '1px solid var(--color-border)',
    background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 12%, var(--color-background-surface)), var(--color-background-surface))',
  },
  heroAmount: {
    fontSize: 'var(--font-size-3xl)',
    fontWeight: 'var(--font-weight-bold)',
    letterSpacing: '-0.03em',
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '12px',
    flex: 1,
    minWidth: 220,
  },
  statCard: {
    padding: '12px 16px',
    borderRadius: 'var(--radius-element)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-background-surface)',
  },
  accountRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    borderRadius: 'var(--radius-container)',
    transitionProperty: 'background-color',
    transitionDuration: '150ms',
    ':hover': {backgroundColor: 'var(--color-background-muted)'},
  },
  accountMeta: {display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0},
  accountName: {fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)'},
  accountSub: {fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)'},
  accountBalance: {fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)'},
  txRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingBlock: '10px',
    borderBottom: '1px solid var(--color-border)',
  },
  txLast: {borderBottom: 'none'},
  txIcon: {
    width: 30,
    height: 30,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-full)',
  },
  txIconIn: {backgroundColor: 'rgba(34, 197, 94, 0.14)', color: 'rgb(22, 163, 74)'},
  txIconOut: {backgroundColor: 'rgba(239, 68, 68, 0.12)', color: 'rgb(220, 38, 38)'},
  txMeta: {display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0},
  txTitle: {fontSize: 'var(--font-size-sm)'},
  txSub: {fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)'},
  txAmountIn: {fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'rgb(22, 163, 74)'},
  txAmountOut: {fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'rgb(220, 38, 38)'},
  reservedRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: 'var(--radius-element)',
    border: '1px dashed var(--color-border)',
  },
});

const TX_TYPE_LABELS: Record<string, string> = {
  system_grant: '开户赠送',
  transfer: '转账',
  transfer_send: '转出',
  transfer_receive: '收到转账',
  transfer_refund: '转账退回',
  red_packet_send: '发出红包',
  red_packet_claim: '领取红包',
  red_packet_refund: '红包退回',
};

export function WalletSettings({
  accounts,
  totalBalance,
  totalIn,
  totalOut,
  transactions,
}: {
  accounts: WalletAccountView[];
  totalBalance: number;
  totalIn: number;
  totalOut: number;
  transactions: WalletTransactionView[];
}) {
  const userAccount = accounts.find((a) => a.ownerType === 'user');
  const aiAccounts = accounts.filter((a) => a.ownerType === 'ai');
  const currency = WALLET_CURRENCIES.nw;

  return (
    <VStack gap={6}>
      {/* Page Header */}
      <div {...stylex.props(styles.header)}>
        <div>
          <h1 {...stylex.props(styles.title)}>钱包 (Wallet)</h1>
          <p {...stylex.props(styles.subtitle)}>
            每位居民都有自己的钱包；当前使用 {currency.label}
          </p>
        </div>
      </div>

      {/* 总览 */}
      <div {...stylex.props(styles.heroCard)}>
        <VStack gap={1}>
          <HStack gap={2} vAlign="center">
            <Wallet size={16} color="var(--color-accent)" />
            <Text type="supporting" size="sm" as="span">
              全部资产（可查看全部居民的钱包）
            </Text>
          </HStack>
          <span {...stylex.props(styles.heroAmount)}>{formatWalletMoney(totalBalance)}</span>
        </VStack>
        <div {...stylex.props(styles.statGrid)}>
          <div {...stylex.props(styles.statCard)}>
            <HStack gap={1.5} vAlign="center">
              <ArrowDownLeft size={14} color="rgb(22, 163, 74)" />
              <Text type="supporting" size="sm" as="span">
                累计收入（不含赠送）
              </Text>
            </HStack>
            <Text weight="medium" as="div">{formatWalletMoney(totalIn)}</Text>
          </div>
          <div {...stylex.props(styles.statCard)}>
            <HStack gap={1.5} vAlign="center">
              <ArrowUpRight size={14} color="rgb(220, 38, 38)" />
              <Text type="supporting" size="sm" as="span">
                累计支出
              </Text>
            </HStack>
            <Text weight="medium" as="div">{formatWalletMoney(totalOut)}</Text>
          </div>
        </div>
      </div>

      {/* 我的钱包 */}
      {userAccount && (
        <Card variant="default">
          <VStack gap={3}>
            <HStack gap={2} vAlign="center">
              <Landmark size={16} color="var(--color-accent)" />
              <Text weight="medium" as="span">
                我的钱包
              </Text>
              <Token label={currency.label} color="teal" />
            </HStack>
            <span {...stylex.props(styles.heroAmount)} style={{fontSize: 28}}>
              {formatWalletMoney(userAccount.balance)}
            </span>
          </VStack>
        </Card>
      )}

      {/* 居民钱包 */}
      <Card variant="default">
        <VStack gap={3}>
          <HStack hAlign="between" vAlign="center" width="100%">
            <Text weight="medium" as="span">
              居民钱包 ({aiAccounts.length})
            </Text>
            <Text type="supporting" size="sm" as="span">
              在聊天中互发转账 / 红包即会变动
            </Text>
          </HStack>
          {aiAccounts.length === 0 ? (
            <Text type="supporting" size="sm" as="p">
              还没有居民开通钱包。与居民聊天时系统会自动为其开户（含开户赠送）。
            </Text>
          ) : (
            <VStack gap={1}>
              {aiAccounts.map((a) => (
                <div key={a.id} {...stylex.props(styles.accountRow)}>
                  <UserAvatar
                    name={a.name}
                    emoji={a.avatarEmoji}
                    color={a.avatarColor}
                    url={a.avatarUrl}
                    size={34}
                    href={a.characterId ? `/characters/${a.characterId}` : undefined}
                  />
                  <div {...stylex.props(styles.accountMeta)}>
                    <span {...stylex.props(styles.accountName)}>{a.name}</span>
                    <span {...stylex.props(styles.accountSub)}>
                      {a.username ? `@${a.username} · ` : ''}
                      {currency.label}
                    </span>
                  </div>
                  <span {...stylex.props(styles.accountBalance)}>
                    {formatWalletMoney(a.balance)}
                  </span>
                </div>
              ))}
            </VStack>
          )}
        </VStack>
      </Card>

      {/* 交易流水 */}
      <Card variant="default">
        <VStack gap={3}>
          <HStack gap={2} vAlign="center">
            <TrendingUp size={16} color="var(--color-accent)" />
            <Text weight="medium" as="span">
              交易流水
            </Text>
          </HStack>
          {transactions.length === 0 ? (
            <Text type="supporting" size="sm" as="p">
              暂无交易记录。去和居民互发转账或红包试试。
            </Text>
          ) : (
            <VStack gap={0}>
              {transactions.map((tx, i) => {
                const isIn = tx.direction === 'in';
                return (
                  <div key={tx.id} {...stylex.props(styles.txRow, i === transactions.length - 1 && styles.txLast)}>
                    <span {...stylex.props(styles.txIcon, isIn ? styles.txIconIn : styles.txIconOut)}>
                      {isIn ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                    </span>
                    <div {...stylex.props(styles.txMeta)}>
                      <span {...stylex.props(styles.txTitle)}>
                        {TX_TYPE_LABELS[tx.type] ?? tx.type}
                        {tx.counterpartyName ? ` · ${tx.counterpartyName}` : ''}
                      </span>
                      <span {...stylex.props(styles.txSub)}>
                        {tx.note ? `${tx.note} · ` : ''}
                        余额 {formatWalletMoney(tx.balanceAfter, tx.currency)}
                      </span>
                    </div>
                    <span {...stylex.props(isIn ? styles.txAmountIn : styles.txAmountOut)}>
                      {isIn ? '+' : '-'}
                      {formatWalletMoney(tx.amount, tx.currency)}
                    </span>
                  </div>
                );
              })}
            </VStack>
          )}
        </VStack>
      </Card>

      {/* 多平台统一钱包（预留接口） */}
      <Card variant="default">
        <VStack gap={3}>
          <Text weight="medium" as="span">
            多平台统一钱包（预留）
          </Text>
          <Text type="supporting" size="sm" as="p">
            钱包层按货币类型（currency）天然支持多账本并存：账户、流水、红包均已带上货币字段。
            未来通过统一钱包接口注册新的货币类型即可接入，无需迁移数据。
          </Text>
          <VStack gap={2}>
            {RESERVED_WALLET_CURRENCIES.map((c) => (
              <div key={c.label} {...stylex.props(styles.reservedRow)}>
                <HStack gap={2} vAlign="center">
                  <StatusDot variant="neutral" label="未接入" />
                  <VStack gap={0}>
                    <span {...stylex.props(styles.accountName)}>{c.label}</span>
                    <span {...stylex.props(styles.accountSub)}>{c.description}</span>
                  </VStack>
                </HStack>
                <Badge label={c.status} variant="neutral" />
              </div>
            ))}
          </VStack>
        </VStack>
      </Card>
    </VStack>
  );
}
