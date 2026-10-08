'use client';

import { Dialog as D } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { CloseIcon } from './icons';

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  closeLabel,
  wide,
  dismissible = true,
  className,
  children
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Label for the corner close button. Omit together with `dismissible={false}` for must-confirm dialogs. */
  closeLabel?: string;
  wide?: boolean;
  /** When false, Escape and outside clicks don't close it (e.g. "I saved my recovery code"). */
  dismissible?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const block = (e: Event) => {
    if (!dismissible) e.preventDefault();
  };
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-80 bg-[rgb(8_12_24/0.5)]" />
      <D.Content
        onEscapeKeyDown={block}
        onPointerDownOutside={block}
        onInteractOutside={block}
        className={cn(
          'fixed start-1/2 top-1/2 z-80 flex max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-card bg-surface p-6 text-ink shadow-lift ltr:-translate-x-1/2 rtl:translate-x-1/2 sm:p-8',
          wide ? 'max-w-180' : 'max-w-140',
          className
        )}
      >
        <D.Title className="pe-10 text-2xl">{title}</D.Title>
        {description ? <D.Description className="text-ink-2">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
        {children}
        {dismissible && closeLabel ? (
          <D.Close
            aria-label={closeLabel}
            className="absolute end-4 top-4 inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink hover:bg-surface-2"
          >
            <CloseIcon size={18} />
          </D.Close>
        ) : null}
      </D.Content>
    </D.Portal>
  );
}
