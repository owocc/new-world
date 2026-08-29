'use client';

import {useEffect, useState} from 'react';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  root: {
    display: 'inline',
  },
});

function formatTime(d: Date): string {
  return d.toLocaleString('zh-CN', {month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'});
}

function relativeLabel(date: Date, now: number): string {
  const diff = Math.max(0, now - date.getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  if (min < 60 * 24) return `${Math.floor(min / 60)} 小时前`;
  if (min < 60 * 24 * 7) return `${Math.floor(min / 60 / 24)} 天前`;
  return formatTime(date);
}

export function useRelativeTime(date: Date | string, live = false): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const [label, setLabel] = useState(() => relativeLabel(d, Date.now()));

  useEffect(() => {
    if (!live) return;
    const update = () => setLabel(relativeLabel(d, Date.now()));
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, [d, live]);

  return label;
}

/** zh-CN relative timestamp ("3 小时前"), falls back to a date after a week. */
export function TimeAgo({
  date,
  live = false,
  short = false,
  className,
  style,
  xstyle,
}: {
  date: Date | string;
  live?: boolean;
  short?: boolean;
  className?: string;
  style?: React.CSSProperties;
  xstyle?: stylex.StyleXStyles;
}) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const label = useRelativeTime(date, live);
  const display = short && label.includes('前') ? label.replace(' 分钟前', '分').replace(' 小时前', '时').replace(' 天前', '天') : label;
  return (
    <time {...stylex.props(styles.root, xstyle)} className={className} style={style} suppressHydrationWarning dateTime={d.toISOString()}>
      {display}
    </time>
  );
}
