import { WalletSettings } from '@/components/settings/wallet-settings';
import { requireUserId } from '@/lib/session';
import { getWalletOverview, getWalletTransactions } from '@/server/wallet';

export const metadata = { title: '钱包' };
export const dynamic = 'force-dynamic';

export default async function WalletPage() {
  const userId = await requireUserId();
  const [overview, transactions] = await Promise.all([
    getWalletOverview(userId),
    getWalletTransactions(userId, 30),
  ]);

  return (
    <WalletSettings
      accounts={overview.accounts}
      totalBalance={overview.totalBalance}
      totalIn={overview.totalIn}
      totalOut={overview.totalOut}
      transactions={transactions}
    />
  );
}
