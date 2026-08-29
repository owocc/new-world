import Link from 'next/link';
import {Avatar} from '@astryxdesign/core/Avatar';
import type {AvatarSize} from '@astryxdesign/core/Avatar';
import {resolveMediaUrl} from '@/lib/utils';

/**
 * App avatar: Astryx Avatar for image avatars, with a gradient + emoji
 * fallback for AI residents. Identity colors live here (not in the theme)
 * since they belong to the characters, not to the UI.
 */
const GRADIENTS: Record<string, string> = {
  violet: 'linear-gradient(135deg,#8b5cf6,#6366f1)',
  rose: 'linear-gradient(135deg,#fb7185,#e11d48)',
  indigo: 'linear-gradient(135deg,#818cf8,#4f46e5)',
  emerald: 'linear-gradient(135deg,#34d399,#059669)',
  amber: 'linear-gradient(135deg,#fbbf24,#d97706)',
  sky: 'linear-gradient(135deg,#38bdf8,#0284c7)',
  teal: 'linear-gradient(135deg,#2dd4bf,#0d9488)',
  fuchsia: 'linear-gradient(135deg,#e879f9,#c026d3)',
};

export const AVATAR_COLORS = Object.keys(GRADIENTS);

// Astryx Avatar only accepts a fixed numeric size scale; snap to the closest.
const ASTRYX_SIZES = [16, 20, 24, 32, 36, 40, 48, 60, 64, 72, 96, 128, 144, 180];
function snapSize(size: number): number {
  return ASTRYX_SIZES.reduce((best, s) =>
    Math.abs(s - size) < Math.abs(best - size) ? s : best,
  );
}

export function UserAvatar({
  name,
  emoji,
  color,
  url,
  size = 40,
  href,
  tooltip = true,
}: {
  name: string;
  emoji?: string | null;
  color?: string | null;
  url?: string | null;
  size?: number;
  href?: string;
  tooltip?: boolean | string;
}) {
  const finalUrl = resolveMediaUrl(url);
  if (finalUrl) {
    return (
      <Avatar name={name} src={finalUrl} size={snapSize(size) as AvatarSize} href={href} tooltip={tooltip} />
    );
  }

  const gradient = GRADIENTS[color ?? 'violet'] ?? GRADIENTS.violet;
  const inner = (
    <span
      className="inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        background: gradient,
        fontSize: Math.round(size * 0.5),
      }}
      role={href ? undefined : 'img'}
      aria-label={name}
      title={tooltip === false ? undefined : tooltip === true ? name : tooltip}
    >
      <span className="leading-none">{emoji || name.slice(0, 1)}</span>
    </span>
  );

  if (!href) return inner;
  return (
    <Link href={href} aria-label={name} className="inline-flex shrink-0 rounded-full">
      {inner}
    </Link>
  );
}
