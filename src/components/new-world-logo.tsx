import Image from 'next/image';

export function NewWorldLogo({size = 48}: {size?: number}) {
  return (
    <Image
      src="/new-world-planet-logo.png"
      alt="新世界居民"
      width={size}
      height={size}
      priority
    />
  );
}
