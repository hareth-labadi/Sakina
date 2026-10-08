'use client';

import { Tooltip as T } from 'radix-ui';
import type { ReactNode } from 'react';

/** Wrap the app once (done in the locale layout). */
export const TooltipProvider = T.Provider;

/**
 * Short supplementary hint on hover/focus. Never put essential information only in a tooltip:
 * touch screens can't hover. Icon buttons still need their own aria-label.
 */
export function Tooltip({ content, children, side = 'top' }: { content: ReactNode; children: ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <T.Root delayDuration={300}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content side={side} sideOffset={8} className="z-90 max-w-70 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-fg shadow-soft">
          {content}
          <T.Arrow className="fill-primary" />
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
