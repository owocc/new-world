import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  BreakdownTable,
  SummaryCards,
  TrendChart,
  UsageFilters,
} from '@/components/usage/dashboard';
import { requireUserId } from '@/lib/session';
import {
  CALL_TYPE_LABELS,
  PROVIDER_TYPE_LABELS,
  getBreakdown,
  getDailyTrend,
  getFilterOptions,
  getUsageSummary,
  type UsageRange,
} from '@/server/usage';

export const metadata = { title: '用量统计' };
export const dynamic = 'force-dynamic';

type SearchParams = { range?: string; character?: string; model?: string };

function parseRange(v?: string): UsageRange {
  if (v === '7d' || v === '30d' || v === '90d' || v === 'all') return v;
  return 'today';
}

export default async function SettingsUsagePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const userId = await requireUserId();
  const filters = {
    range: parseRange(sp.range),
    characterId: sp.character || undefined,
    model: sp.model || undefined,
  };

  const [summary, today, week, month, trend, byCharacter, byModel, byProvider, byCallType, options] =
    await Promise.all([
      getUsageSummary(userId, filters),
      getUsageSummary(userId, { range: 'today' }),
      getUsageSummary(userId, { range: '7d' }),
      getUsageSummary(userId, { range: '30d' }),
      getDailyTrend(userId, filters),
      getBreakdown(userId, filters, 'character'),
      getBreakdown(userId, filters, 'model'),
      getBreakdown(userId, filters, 'provider'),
      getBreakdown(userId, filters, 'callType'),
      getFilterOptions(userId),
    ]);

  const callTypeRows = byCallType.map((r) => ({
    ...r,
    label: CALL_TYPE_LABELS[r.label] ?? r.label,
  }));
  const providerRows = byProvider.map((r) => ({
    ...r,
    label: PROVIDER_TYPE_LABELS[r.label] ?? r.label,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-secondary hover:bg-muted lg:hidden"
            aria-label="返回设置菜单"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">用量统计</h1>
            <p className="text-xs text-secondary">查看 Token 与 API 调用明细分析</p>
          </div>
        </div>
        <Suspense fallback={null}>
          <UsageFilters range={filters.range} characters={options.characters} models={options.models} />
        </Suspense>
      </div>

      <SummaryCards summary={summary} todaySummary={today} weekSummary={week} monthSummary={month} />

      <TrendChart data={trend} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BreakdownTable title="各 AI 消耗" rows={byCharacter} />
        <BreakdownTable title="各模型消耗" rows={byModel} />
        <BreakdownTable title="各 Provider 消耗" rows={providerRows} />
        <BreakdownTable title="各功能消耗" rows={callTypeRows} />
      </div>
    </div>
  );
}
