import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import type { Tint } from './tint';
import { tintBg } from './tint';

export type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Toggle chips announce their state. Leave undefined for plain link-like chips. */
  pressed?: boolean;
  tint?: Tint;
};

export function Chip({ pressed, tint, className, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        'inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4.5 text-base font-medium text-ink transition-colors hover:bg-surface-2',
        tint && cn(tintBg[tint], 'border-transparent hover:opacity-90'),
        'aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-fg',
        className
      )}
      {...props}
    />
  );
}

export function ChipGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-wrap gap-2.5', className)} {...props} />;
}
