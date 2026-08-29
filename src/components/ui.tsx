'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function TimeAgo({
  date,
  className,
}: {
  date: Date | string;
  className?: string;
}) {
  const [label, setLabel] = useState<string>(() => formatTime(date));

  useEffect(() => {
    const update = () => {
      const d = typeof date === 'string' ? new Date(date) : date;
      const diff = Date.now() - d.getTime();
      const min = Math.floor(diff / 60000);
      if (min < 1) setLabel('刚刚');
      else if (min < 60) setLabel(`${min} 分钟前`);
      else if (min < 60 * 24) setLabel(`${Math.floor(min / 60)} 小时前`);
      else if (min < 60 * 24 * 7) setLabel(`${Math.floor(min / 60 / 24)} 天前`);
      else setLabel(formatTime(d));
    };
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, [date]);

  return (
    <time className={className} suppressHydrationWarning dateTime={new Date(date).toISOString()}>
      {label}
    </time>
  );
}

export function EmptyState({
  icon = '🌱',
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center animate-fade-in">
      <div className="text-4xl">{icon}</div>
      <div className="text-base font-medium">{title}</div>
      {description && <p className="max-w-xs text-sm text-muted">{description}</p>}
      {action &&
        (action.href ? (
          <Link
            href={action.href}
            className="mt-2 rounded-full bg-[var(--color-accent-600)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="mt-2 rounded-full bg-[var(--color-accent-600)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {action.label}
          </button>
        ))}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse-soft rounded-xl bg-[var(--surface-2)] ${className ?? ''}`} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className ?? 'h-4 w-4'}`}
    />
  );
}
