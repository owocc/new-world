import { cn } from '@/lib/utils';

/** Standard content width for non-chat pages. */
export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-2xl px-4 pb-10 sm:px-0 xl:max-w-3xl', className)}>
      {children}
    </div>
  );
}
