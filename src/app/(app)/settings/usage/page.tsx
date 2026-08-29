import * as stylex from '@stylexjs/stylex';
import {colorVars, fontWeightVars, radiusVars, spacingVars, textSizeVars} from '@astryxdesign/core/theme/tokens.stylex';
import {Suspense} from 'react';
import Link from 'next/link';
import {ArrowLeft} from 'lucide-react';
import {
  BreakdownTable,
  SummaryCards,
  TrendChart,
  UsageFilters,
} from '@/components/usage/dashboard';
import {requireUserId} from '@/lib/session';
import {
  CALL_TYPE_LABELS,
  PROVIDER_TYPE_LABELS,
  getBreakdown,
  getDailyTrend,
  getFilterOptions,
  getUsageSummary,
  type UsageRange,
} from '@/server/usage';

const styles = stylex.create({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacingVars['--spacing-4'],
  },
  header: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacingVars['--spacing-3'],
    paddingBottom: spacingVars['--spacing-3'],
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colorVars['--color-border'],
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: spacingVars['--spacing-2'],
  },
  backLink: {
    display: 'flex',
    width: '2rem',
    height: '2rem',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radiusVars['--radius-full'],
    color: colorVars['--color-text-secondary'],
    '@media (min-width: 1024px)': {
      display: 'none',
    },
    '@media (hover: hover)': {
      ':hover': {
        backgroundColor: colorVars['--color-background-muted'],
      },
    },
  },
  heading: {
    fontSize: textSizeVars['--font-size-xl'],
    fontWeight: fontWeightVars['--font-weight-semibold'],
    letterSpacing: '-0.025em',
  },
  description: {
    color: colorVars['--color-text-secondary'],
    fontSize: textSizeVars['--font-size-sm'],
  },
  breakdownGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: spacingVars['--spacing-4'],
    '@media (min-width: 640px)': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },
  },
});

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
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.header)}>
        <div {...stylex.props(styles.headerTitle)}>
          <Link
            href="/settings"
            {...stylex.props(styles.backLink)}
            aria-label="返回设置菜单"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 {...stylex.props(styles.heading)}>用量统计</h1>
            <p {...stylex.props(styles.description)}>查看 Token 与 API 调用明细分析</p>
          </div>
        </div>
        <Suspense fallback={null}>
          <UsageFilters range={filters.range} characters={options.characters} models={options.models} />
        </Suspense>
      </div>

      <SummaryCards summary={summary} todaySummary={today} weekSummary={week} monthSummary={month} />

      <TrendChart data={trend} />

      <div {...stylex.props(styles.breakdownGrid)}>
        <BreakdownTable title="各 AI 消耗" rows={byCharacter} />
        <BreakdownTable title="各模型消耗" rows={byModel} />
        <BreakdownTable title="各 Provider 消耗" rows={providerRows} />
        <BreakdownTable title="各功能消耗" rows={callTypeRows} />
      </div>
    </div>
  );
}
