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
    <div className="flex flex-wrap items-center gap-2">
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
    <div className="min-w-0">
      <Text type="supporting" size="sm" as="div">
        {label}
      </Text>
      <div className="mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl">{value}</div>
      <Text type="supporting" size="sm" as="div" className="mt-0.5 truncate">
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
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-3">
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
      <div className="rounded-container border border-border p-6 text-center">
        <Text type="supporting">所选时间范围内还没有任何 AI 调用</Text>
      </div>
    );
  }

  return (
    <Card padding={4}>
      <Text weight="medium" as="h3" className="mb-4">
        Token 消耗趋势
      </Text>
      <div className="h-56 w-full sm:h-64" data-mode={mode}>
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
      <Text weight="medium" as="h3" className="mb-3">
        {title}
      </Text>
      {rows.length === 0 ? (
        <Text type="supporting" as="p" className="py-6 text-center">
          暂无数据
        </Text>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.key}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium">{r.label}</span>
                <span className="shrink-0 text-secondary">
                  {fmtTokens(r.totalTokens)} · {r.requests} 次
                  {r.costUsd > 0 && <span className="ml-1 text-secondary">({fmtCost(r.costUsd)})</span>}
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
