import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { tintBg, type Tint } from './tint';

/**
 * Number tile for overviews. `value` may be a real count or the "000" placeholder:
 * never invent statistics. Pass `href`-less `onClick` via `action` if the tile links somewhere.
 */
export function StatTile({ label, value, tint, note, action, className }: { label: ReactNode; value: ReactNode; tint?: Tint; note?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1.5 rounded-[24px] p-5.5', tint ? tintBg[tint] : 'border border-line bg-surface', className)}>
      <span className="text-caption text-ink-2">{label}</span>
      <b className="font-display text-[2.5rem] leading-none font-semibold">{value}</b>
      {note ? <span className="text-caption text-ink-2">{note}</span> : null}
      {action}
    </div>
  );
}
