import Link from 'next/link';

const AVATAR_GRADIENTS: Record<string, string> = {
  violet: 'linear-gradient(135deg,#8b5cf6,#6366f1)',
  rose: 'linear-gradient(135deg,#fb7185,#e11d48)',
  indigo: 'linear-gradient(135deg,#818cf8,#4f46e5)',
  emerald: 'linear-gradient(135deg,#34d399,#059669)',
  amber: 'linear-gradient(135deg,#fbbf24,#d97706)',
  sky: 'linear-gradient(135deg,#38bdf8,#0284c7)',
  teal: 'linear-gradient(135deg,#2dd4bf,#0d9488)',
  fuchsia: 'linear-gradient(135deg,#e879f9,#c026d3)',
};

export const AVATAR_COLORS = Object.keys(AVATAR_GRADIENTS);

export function Avatar({
  name,
  emoji,
  color = 'violet',
  url,
  size = 40,
  ring,
}: {
  name: string;
  emoji?: string | null;
  color?: string | null;
  url?: string | null;
  size?: number;
  ring?: boolean;
}) {
  const gradient = AVATAR_GRADIENTS[color ?? 'violet'] ?? AVATAR_GRADIENTS.violet;
  return (
    <span
      className={`relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full ${
        ring ? 'ring-2 ring-[var(--color-accent-400)] ring-offset-2 ring-offset-[var(--surface)]' : ''
      }`}
      style={{ width: size, height: size, background: url ? undefined : gradient }}
      title={name}
      aria-label={name}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span style={{ fontSize: size * 0.5 }} className="leading-none">
          {emoji || name.slice(0, 1)}
        </span>
      )}
    </span>
  );
}

export function UserLink({
  username,
  children,
  className,
}: {
  username: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (username === 'me') {
    return <span className={className}>{children}</span>;
  }
  return (
    <Link href={`/characters`} className={className}>
      {children}
    </Link>
  );
}
