'use client';

import {useRouter, useSearchParams} from 'next/navigation';
import {useMemo} from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {Card} from '@astryxdesign/core/Card';
import {Text} from '@astryxdesign/core/Text';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {Selector} from '@astryxdesign/core/Selector';
import {ProgressBar} from '@astryxdesign/core/ProgressBar';
import {useTheme} from '@astryxdesign/core/theme';
import type {BreakdownRow, UsageRange, UsageSummary} from '@/server/usage';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  filters: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px'},
  stat: {minWidth: 0},
  statValue: {marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', letterSpacing: '-0.01em', '@media (min-width: 640px)': {fontSize: 'var(--font-size-2xl)'}},
  statSub: {marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'},
  summaryGrid: {display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: '16px', rowGap: '24px', '@media (min-width: 1024px)': {gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'}},
  emptyTrend: {borderRadius: 'var(--radius-container)', border: '1px solid var(--color-border)', padding: '24px', textAlign: 'center'},
  chartTitle: {marginBottom: '16px'},
  chart: {width: '100%', height: '224px', '@media (min-width: 640px)': {height: '256px'}},
  breakdownTitle: {marginBottom: '12px'},
  emptyBreakdown: {paddingBlock: '24px', textAlign: 'center'},
  breakdownRows: {display: 'flex', flexDirection: 'column', gap: '12px'},
  breakdownHeader: {display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', fontSize: 'var(--font-size-sm)'},
  truncate: {overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'},
  medium: {fontWeight: 'var(--font-weight-medium)'},
  secondary: {color: 'var(--color-text-secondary)'},
  cost: {marginInlineStart: '4px', color: 'var(--color-text-secondary)'},
});
export function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function fmtCost(n: number): string {
  if (n === 0) return '$0.00';
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

const RANGES: {value: UsageRange; label: string}[] = [
  {value: 'today', label: '今日'},
  {value: '7d', label: '7 天'},
  {value: '30d', label: '30 天'},
  {value: '90d', label: '90 天'},
  {value: 'all', label: '全部'},
];

export function UsageFilters({
  range,
  characters,
  models,
}: {
  range: UsageRange;
  characters: {id: string; name: string}[];
  models: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/usage?${next.toString()}`);
  };

  return (
    <div {...stylex.props(styles.filters)}>
      <SegmentedControl
        label="时间范围"
        value={range}
        onChange={(v) => update('range', v === 'today' ? '' : v)}
        size="sm"
      >
        {RANGES.map((r) => (
          <SegmentedControlItem key={r.value} value={r.value} label={r.label} />
        ))}
      </SegmentedControl>
      <Selector
        label="筛选 AI"
        isLabelHidden
        size="sm"
        width={160}
        placeholder="全部 AI"
        value={params.get('character') ?? ''}
        onChange={(v) => update('character', v ?? '')}
        options={characters.map((c) => ({value: c.id, label: c.name}))}
      />
      <Selector
        label="筛选模型"
        isLabelHidden
        size="sm"
        width={180}
        placeholder="全部模型"
        value={params.get('model') ?? ''}
        onChange={(v) => update('model', v ?? '')}
        options={models.map((m) => ({value: m, label: m}))}
      />
    </div>
  );
}

function Stat({label, value, sub}: {label: string; value: string; sub: string}) {
  return (
    <div {...stylex.props(styles.stat)}>
      <Text type="supporting" size="sm" as="div">
        {label}
      </Text>
      <div {...stylex.props(styles.statValue)}>{value}</div>
      <Text type="supporting" size="sm" as="div" xstyle={styles.statSub}>
        {sub}
      </Text>
    </div>
  );
}

export function SummaryCards({summary, todaySummary, weekSummary, monthSummary}: {
  summary: UsageSummary;
  todaySummary: UsageSummary;
  weekSummary: UsageSummary;
  monthSummary: UsageSummary;
}) {
  return (
    <Card padding={4}>
      <div {...stylex.props(styles.summaryGrid)}>
        <Stat label="总 Token" value={fmtTokens(summary.totalTokens)} sub={`${summary.requests} 次调用`} />
        <Stat label="输入 / 输出" value={`${fmtTokens(summary.inputTokens)} / ${fmtTokens(summary.outputTokens)}`} sub={`缓存 ${fmtTokens(summary.cachedTokens)} · 推理 ${fmtTokens(summary.reasoningTokens)}`} />
        <Stat label="预估成本" value={fmtCost(summary.costUsd)} sub={summary.failedRequests > 0 ? `${summary.failedRequests} 次失败调用` : '全部成功'} />
        <Stat label="今日" value={fmtTokens(todaySummary.totalTokens)} sub={`${todaySummary.requests} 次调用`} />
        <Stat label="本周" value={fmtTokens(weekSummary.totalTokens)} sub={`${weekSummary.requests} 次调用`} />
        <Stat label="本月" value={fmtTokens(monthSummary.totalTokens)} sub={`${monthSummary.requests} 次调用`} />
      </div>
    </Card>
  );
}

export function TrendChart({
  data,
}: {
  data: {day: string; inputTokens: number; outputTokens: number; requests: number}[];
}) {
  const {mode, tokens} = useTheme();

  const chartColors = useMemo(
    () => ({
      grid: tokens['--color-border'] ?? 'transparent',
      axis: tokens['--color-text-secondary'] ?? 'gray',
      input: tokens['--color-accent'] ?? '#B5531F',
      output: tokens['--color-accent-muted'] ?? '#E8935A',
      surface: tokens['--color-background-card'] ?? 'white',
      text: tokens['--color-text-primary'] ?? 'black',
    }),
    [tokens],
  );

  if (data.length === 0) {
    return (
      <div {...stylex.props(styles.emptyTrend)}>
        <Text type="supporting">所选时间范围内还没有任何 AI 调用</Text>
      </div>
    );
  }

  return (
    <Card padding={4}>
      <Text weight="medium" as="h3" xstyle={styles.chartTitle}>
        Token 消耗趋势
      </Text>
      <div {...stylex.props(styles.chart)} data-mode={mode}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{top: 4, right: 4, left: -14, bottom: 0}}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
            <XAxis
              dataKey="day"
              tick={{fontSize: 11, fill: chartColors.axis}}
              tickFormatter={(v: string) => v.slice(5)}
              tickLine={false}
              axisLine={{stroke: chartColors.grid}}
            />
            <YAxis
              tick={{fontSize: 11, fill: chartColors.axis}}
              tickFormatter={(v: number) => fmtTokens(v)}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: chartColors.surface,
                border: `1px solid ${chartColors.grid}`,
                borderRadius: 12,
                fontSize: 12,
                color: chartColors.text,
              }}
              formatter={(value, name) => [
                fmtTokens(Number(value ?? 0)),
                name === 'inputTokens' ? '输入' : '输出',
              ]}
              labelFormatter={(label) => String(label ?? '')}
            />
            <Bar dataKey="inputTokens" stackId="a" fill={chartColors.input} />
            <Bar dataKey="outputTokens" stackId="a" fill={chartColors.output} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function BreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: BreakdownRow[];
}) {
  const max = Math.max(...rows.map((r) => r.totalTokens), 1);
  return (
    <Card padding={4}>
      <Text weight="medium" as="h3" xstyle={styles.breakdownTitle}>
        {title}
      </Text>
      {rows.length === 0 ? (
        <Text type="supporting" as="p" xstyle={styles.emptyBreakdown}>
          暂无数据
        </Text>
      ) : (
        <div {...stylex.props(styles.breakdownRows)}>
          {rows.map((r) => (
            <div key={r.key}>
              <div {...stylex.props(styles.breakdownHeader)}>
                <span {...stylex.props(styles.truncate, styles.medium)}>{r.label}</span>
                <span {...stylex.props(styles.truncate, styles.secondary)}>
                  {fmtTokens(r.totalTokens)} · {r.requests} 次
                  {r.costUsd > 0 && <span {...stylex.props(styles.cost)}>({fmtCost(r.costUsd)})</span>}
                </span>
              </div>
              <ProgressBar
                label={`${r.label} Token 占比`}
                isLabelHidden
                value={r.totalTokens}
                max={max}
                variant="accent"
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
