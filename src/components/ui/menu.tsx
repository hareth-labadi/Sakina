'use client';

import { DropdownMenu as M } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

/** Dropdown menu (account menu, row actions). Arrow keys, typeahead and Escape come from Radix. */
export const Menu = M.Root;
export const MenuTrigger = M.Trigger;

export function MenuContent({ className, align = 'end', sideOffset = 10, ...props }: ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={sideOffset}
        className={cn('z-50 flex min-w-60 flex-col rounded-tile border border-line bg-surface p-2 text-ink shadow-soft', className)}
        {...props}
      />
    </M.Portal>
  );
}

export function MenuItem({ className, tone, ...props }: ComponentProps<typeof M.Item> & { tone?: 'danger' }) {
  return (
    <M.Item
      className={cn(
        'flex min-h-12 cursor-pointer items-center gap-2.5 rounded-[14px] px-4 text-[1.0625rem] font-semibold outline-none select-none',
        'data-highlighted:bg-surface-2 data-disabled:cursor-not-allowed data-disabled:opacity-50',
        tone === 'danger' && 'text-warm-ink',
        className
      )}
      {...props}
    />
  );
}

export function MenuLabel({ className, ...props }: ComponentProps<typeof M.Label>) {
  return <M.Label className={cn('px-4 pt-2.5 pb-1.5', className)} {...props} />;
}

export function MenuSeparator({ className, ...props }: ComponentProps<typeof M.Separator>) {
  return <M.Separator className={cn('my-1.5 h-px bg-line', className)} {...props} />;
}
