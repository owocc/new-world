'use client';

import { useState, useTransition } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Banknote, Loader2, Gift } from 'lucide-react';
import { Dialog } from '@astryxdesign/core/Dialog';
import { Layout, LayoutHeader, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Button } from '@astryxdesign/core/Button';
import { Text } from '@astryxdesign/core/Text';
import { useAppToast } from '@/lib/toast';
import { nativeAttrs } from '@/lib/native-attrs';
import { formatWalletMoney } from '@/lib/wallet-currency';
import { sendRedPacketAction, sendTransferAction } from '@/server/actions/wallet';
import type { RedPacketStatusView } from '@/server/wallet';

const spin = stylex.keyframes({
  from: { transform: 'rotate(0deg)' },
  to: { transform: 'rotate(360deg)' },
});

const styles = stylex.create({
  card: {
    width: 232,
    borderRadius: 14,
    overflow: 'hidden',
    cursor: 'default',
    textAlign: 'left',
    border: 'none',
    padding: 0,
    color: '#ffffff',
  },
  transferCard: {
    backgroundColor: 'color-mix(in srgb, var(--color-success) 82%, transparent)',
  },
  redPacketCard: {
    backgroundColor: '#e66a3c',
  },
  cardClickable: {
    cursor: 'pointer',
  },
  cardBody: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingInline: 14,
    paddingBlock: 14,
  },
  iconCircle: {
    width: 38,
    height: 38,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  cardTexts: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    minWidth: 0,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardAmount: {
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  cardNote: {
    fontSize: 12,
    opacity: 0.85,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardFooter: {
    fontSize: 11,
    paddingInline: 14,
    paddingBlock: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    opacity: 0.92,
  },
  claimsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    paddingInline: 14,
    paddingBlock: 8,
    fontSize: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  claimRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
  },
  spinner: {
    animationName: spin,
    animationDuration: '1s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear',
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  amountHint: {
    fontSize: 12,
    color: 'var(--color-text-secondary)',
  },
});

export type TransferPayload = {
  amount: number;
  currency: string;
  note: string | null;
};

export type RedPacketPayload = {
  redPacketId: string;
  totalAmount: number;
  currency: string;
  shareCount: number;
  greeting: string;
};

/** 转账消息气泡 */
export function TransferBubble({
  payload,
  senderIsUser,
  characterName,
}: {
  payload: TransferPayload;
  senderIsUser: boolean;
  characterName: string;
}) {
  return (
    <div {...stylex.props(styles.card, styles.transferCard)}>
      <div {...stylex.props(styles.cardBody)}>
        <span {...stylex.props(styles.iconCircle)}>
          <Banknote size={20} />
        </span>
        <span {...stylex.props(styles.cardTexts)}>
          <span {...stylex.props(styles.cardLabel)}>转账</span>
          <span {...stylex.props(styles.cardAmount)}>
            {formatWalletMoney(payload.amount, payload.currency)}
          </span>
          {payload.note ? <span {...stylex.props(styles.cardNote)}>{payload.note}</span> : null}
        </span>
      </div>
      <div {...stylex.props(styles.cardFooter)}>
        {senderIsUser ? `已转账给 ${characterName}` : `${characterName} 给你转账`}
      </div>
    </div>
  );
}

/** 红包消息气泡：点击领取 / 展示领取明细 */
export function RedPacketBubble({
  payload,
  status,
  senderIsUser,
  characterName,
  onClaim,
}: {
  payload: RedPacketPayload;
  status?: RedPacketStatusView;
  senderIsUser: boolean;
  characterName: string;
  onClaim: (redPacketId: string) => void;
}) {
  const claimedOut = status ? status.claimedCount >= status.shareCount : false;
  const myClaimAmount = status?.myClaimAmount ?? null;
  const canClaim = !senderIsUser && !claimedOut && myClaimAmount === null;

  const body = (
    <>
      <div {...stylex.props(styles.cardBody)}>
        <span {...stylex.props(styles.iconCircle)}>
          <Gift size={20} />
        </span>
        <span {...stylex.props(styles.cardTexts)}>
          <span {...stylex.props(styles.cardLabel)}>{payload.greeting || '恭喜发财，大吉大利'}</span>
          <span {...stylex.props(styles.cardNote)}>
            {senderIsUser
              ? `红包 · ${payload.shareCount} 份`
              : myClaimAmount !== null
                ? `已领取 ${formatWalletMoney(myClaimAmount, payload.currency)}`
                : claimedOut
                  ? '红包已被领完'
                  : '点击领取红包'}
          </span>
        </span>
      </div>
      <div {...stylex.props(styles.cardFooter)}>
        {senderIsUser ? `发给 ${characterName} 的红包` : `${characterName} 发的红包`}
        {status ? ` · 已领 ${status.claimedCount}/${status.shareCount}` : ''}
      </div>
      {status && status.claims.length > 0 && (
        <div {...stylex.props(styles.claimsList)}>
          {status.claims.map((c, i) => (
            <span key={i} {...stylex.props(styles.claimRow)}>
              <span>{c.name}</span>
              <span>{formatWalletMoney(c.amount, status.currency)}</span>
            </span>
          ))}
        </div>
      )}
    </>
  );

  if (canClaim) {
    return (
      <button
        type="button"
        onClick={() => onClaim(payload.redPacketId)}
        {...stylex.props(styles.card, styles.redPacketCard, styles.cardClickable)}
      >
        {body}
      </button>
    );
  }

  return <div {...stylex.props(styles.card, styles.redPacketCard)}>{body}</div>;
}

/** 发送转账 / 红包对话框（用户侧） */
export function MoneySendDialog({
  conversationId,
  characterName,
  isOpen,
  onOpenChange,
  onSent,
}: {
  conversationId: string;
  characterName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: () => void;
}) {
  const toast = useAppToast();
  const [kind, setKind] = useState<'transfer' | 'red_packet'>('transfer');
  const [amount, setAmount] = useState<number | null>(8.88);
  const [shareCount, setShareCount] = useState<number | null>(3);
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!amount || amount <= 0 || pending) return;
    startTransition(async () => {
      const res =
        kind === 'transfer'
          ? await sendTransferAction({ conversationId, amountYuan: amount, note: note || undefined })
          : await sendRedPacketAction({
              conversationId,
              amountYuan: amount,
              shareCount: shareCount ?? 1,
              greeting: note || undefined,
            });
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(kind === 'transfer' ? '转账已发送' : '红包已发出');
      setNote('');
      onOpenChange(false);
      onSent();
    });
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width={420}>
      <Layout
        height="auto"
        header={
          <LayoutHeader hasDivider>
            <h2 style={{ fontSize: 17, fontWeight: 600 }}>
              {kind === 'transfer' ? `转账给 ${characterName}` : `给 ${characterName} 发红包`}
            </h2>
          </LayoutHeader>
        }
        content={
          <LayoutContent>
            <div {...stylex.props(styles.formGrid)}>
              <SegmentedControl
                label="类型"
                value={kind}
                onChange={(v) => setKind(v as 'transfer' | 'red_packet')}
                layout="fill"
              >
                <SegmentedControlItem value="transfer" label="转账" />
                <SegmentedControlItem value="red_packet" label="红包" />
              </SegmentedControl>

              <NumberInput
                label="金额（元）"
                value={amount}
                onChange={setAmount}
                min={0.01}
                max={5200}
                step={0.01}
              />

              {kind === 'red_packet' && (
                <NumberInput
                  label="红包份数"
                  value={shareCount}
                  onChange={setShareCount}
                  min={1}
                  max={20}
                  step={1}
                />
              )}

              <TextInput
                label={kind === 'transfer' ? '备注' : '祝福语'}
                value={note}
                onChange={setNote}
                isOptional
                {...nativeAttrs({ maxLength: 50 })}
                placeholder={kind === 'transfer' ? '转个账，随你喜欢～' : '恭喜发财，大吉大利'}
                htmlName="money-note"
              />

              <Text type="supporting" size="sm" as="p" xstyle={styles.amountHint}>
                使用 New World 平台余额（钱包总限额 N$5200.00/笔）。余额可在「设置 → 钱包」查看。
              </Text>
            </div>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <Button label="取消" variant="ghost" onClick={() => onOpenChange(false)} />
            <Button
              label={pending ? '发送中…' : kind === 'transfer' ? '转账' : '塞钱进红包'}
              variant="primary"
              aria-label="确认发送金额"
              isDisabled={!amount || amount <= 0 || pending}
              isLoading={pending}
              onClick={submit}
              icon={pending ? <Loader2 size={14} {...stylex.props(styles.spinner)} /> : undefined}
            />
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
