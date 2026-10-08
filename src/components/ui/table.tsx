import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * Data table for the admin and therapist panels. Wide tables scroll inside their own box,
 * never the page. Always give the table a caption (visible or `sr-only`).
 */
export function Table({ caption, captionHidden, className, children, minWidth = 720 }: HTMLAttributes<HTMLTableElement> & { caption: string; captionHidden?: boolean; minWidth?: number }) {
  return (
    <div className="overflow-x-auto rounded-tile border border-line bg-surface" tabIndex={0} role="region" aria-label={caption}>
      <table className={cn('w-full border-collapse text-base', className)} style={{ minWidth }}>
        <caption className={cn('px-4 pt-4 text-start text-caption font-semibold text-mute', captionHidden && 'sr-only')}>{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function THead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />;
}

export function TBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

export function TR({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-b border-line last:border-b-0', className)} {...props} />;
}

export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={cn('border-b border-line px-4 py-3.5 text-start text-sm font-semibold whitespace-nowrap text-mute', className)} {...props} />;
}

export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3.5 align-middle', className)} {...props} />;
}
