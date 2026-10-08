import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** Page width wrapper: 1240px max, 16px gutter on phones, 32px from `sm`. */
export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mx-auto w-full max-w-310 px-4 sm:px-8', className)} {...props} />;
}

/** Vertical section rhythm. */
export function Section({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('flex flex-col gap-6 py-10', className)} {...props} />;
}
