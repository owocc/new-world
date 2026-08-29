'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BreakdownRow, UsageRange, UsageSummary } from '@/server/usage';

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

const RANGES: { value: UsageRange; label: string }[] = [
  { value: 'today', label: '今日' },
  { value: '7d', label: '7 天' },
  { value: '30d', label: '30 天' },
  { value: '90d', label: '90 天' },
  { value: 'all', label: '全部' },
];

export function UsageFilters({
  range,
  characters,
  models,
}: {
  range: UsageRange;
  characters: { id: string; name: string }[];
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

  const selectCls =
    'rounded-xl border border-line surface-2 px-3 py-2 text-sm outline-none focus:border-[var(--color-accent-400)]';

  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex rounded-xl border border-line surface-2 p-0.5">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => update('range', r.value === 'today' ? '' : r.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              range === r.value ? 'bg-[var(--color-accent-600)] text-white' : 'text-secondary'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <select value={params.get('character') ?? ''} onChange={(e) => update('character', e.target.value)} className={selectCls}>
        <option value="">全部 AI</option>
        {characters.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select value={params.get('model') ?? ''} onChange={(e) => update('model', e.target.value)} className={selectCls}>
        <option value="">全部模型</option>
        {models.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SummaryCards({ summary, todaySummary, weekSummary, monthSummary }: {
  summary: UsageSummary;
  todaySummary: UsageSummary;
  weekSummary: UsageSummary;
  monthSummary: UsageSummary;
}) {
  const cards = [
    { label: '今日 Token', value: fmtTokens(todaySummary.totalTokens), sub: `${todaySummary.requests} 次调用` },
    { label: '本周 Token', value: fmtTokens(weekSummary.totalTokens), sub: `${weekSummary.requests} 次调用` },
    { label: '本月 Token', value: fmtTokens(monthSummary.totalTokens), sub: `${monthSummary.requests} 次调用` },
    { label: '总 Token', value: fmtTokens(summary.totalTokens), sub: `${summary.requests} 次调用` },
    { label: '输入 / 输出', value: `${fmtTokens(summary.inputTokens)} / ${fmtTokens(summary.outputTokens)}`, sub: `缓存 ${fmtTokens(summary.cachedTokens)} · 推理 ${fmtTokens(summary.reasoningTokens)}` },
    { label: '预估成本', value: fmtCost(summary.costUsd), sub: summary.failedRequests > 0 ? `${summary.failedRequests} 次失败调用` : '全部成功' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-3xl border border-line surface p-4 shadow-sm">
          <div className="text-xs text-muted">{c.label}</div>
          <div className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">{c.value}</div>
          <div className="mt-0.5 truncate text-[11px] text-muted">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

export function TrendChart({
  data,
}: {
  data: { day: string; inputTokens: number; outputTokens: number; requests: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-3xl border border-line surface p-6 text-center text-sm text-muted shadow-sm">
        所选时间范围内还没有任何 AI 调用
      </div>
    );
  }
  return (
    <div className="rounded-3xl border border-line surface p-4 shadow-sm sm:p-5">
      <h3 className="mb-4 text-sm font-semibold text-secondary">Token 消耗趋势</h3>
      <div className="h-56 w-full sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: 'var(--text-3)' }}
              tickFormatter={(v: string) => v.slice(5)}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-3)' }}
              tickFormatter={(v: number) => fmtTokens(v)}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                fontSize: 12,
                color: 'var(--text)',
              }}
              formatter={(value, name) => [
                fmtTokens(Number(value ?? 0)),
                name === 'inputTokens' ? '输入' : '输出',
              ]}
              labelFormatter={(label) => String(label ?? '')}
            />
            <Bar dataKey="inputTokens" stackId="a" fill="var(--color-accent-500)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="outputTokens" stackId="a" fill="var(--color-accent-300)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
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
    <div className="rounded-3xl border border-line surface p-4 shadow-sm sm:p-5">
      <h3 className="mb-3 text-sm font-semibold text-secondary">{title}</h3>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">暂无数据</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.key}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium">{r.label}</span>
                <span className="shrink-0 text-secondary">
                  {fmtTokens(r.totalTokens)} · {r.requests} 次
                  {r.costUsd > 0 && <span className="ml-1 text-muted">({fmtCost(r.costUsd)})</span>}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full surface-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent-400)] to-[var(--color-accent-600)]"
                  style={{ width: `${(r.totalTokens / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
