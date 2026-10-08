import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes, ReactNode } from 'react';
import { avatarBackground } from '@/lib/avatar';
import { cn } from '@/lib/cn';
import { AlertIcon } from './icons';
import { tintBg, type Tint } from './tint';

/* ---------- Badge ---------- */
export const badgeVariants = cva('inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap', {
  variants: {
    tone: {
      neutral: 'border border-line bg-surface-2 text-ink-2',
      story: 'bg-lav-soft text-lav-ink',
      checkin: 'bg-blue-soft text-blue-ink',
      win: 'bg-green-soft text-green-ink',
      therapist: 'bg-green-soft text-green-ink',
      live: 'bg-green-soft text-green-ink',
      pending: 'bg-sand-soft text-sand-ink',
      warm: 'bg-warm-soft text-warm-ink'
    }
  },
  defaultVariants: { tone: 'neutral' }
});

export function Badge({ tone, className, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Pulsing dot for "live now". */
export function LiveDot() {
  return <span aria-hidden className="inline-block size-2 rounded-full bg-[#2F9E6B] shadow-[0_0_0_4px_rgb(47_158_107/0.2)]" />;
}

/* ---------- Tag (mono uppercase label, plain in Arabic) ---------- */
export function Tag({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('tag-label inline-flex w-fit items-center gap-2 rounded-full border border-line bg-surface-2 px-3.5 py-1.5 text-mute', className)} {...props} />;
}

/* ---------- Avatar (abstract gradient, never a photo) ---------- */
const avatarSizes = { sm: 'size-9', md: 'size-11', lg: 'size-24', xl: 'size-30' } as const;

export function Avatar({ index, size = 'md', label, className }: { index: number; size?: keyof typeof avatarSizes; label?: string; className?: string }) {
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('inline-block shrink-0 rounded-full border-2 border-surface', avatarSizes[size], className)}
      style={{ background: avatarBackground(index) }}
    />
  );
}

/* ---------- Card ---------- */
export function Card({ tint, flat, className, ...props }: HTMLAttributes<HTMLDivElement> & { tint?: Tint; flat?: boolean }) {
  return (
    <div
      className={cn(
        'relative flex flex-col gap-4 rounded-card p-6 sm:p-7',
        tint ? tintBg[tint] : flat ? 'border border-line bg-bg' : 'border border-line bg-surface',
        className
      )}
      {...props}
    />
  );
}

/* ---------- Notice (inline message box) ---------- */
const noticeTone = {
  info: 'bg-blue-soft',
  calm: 'bg-green-soft',
  warn: 'border border-warm-ink bg-warm-soft'
} as const;

export function Notice({
  tone = 'info',
  title,
  children,
  role,
  className
}: {
  tone?: keyof typeof noticeTone;
  title?: ReactNode;
  children?: ReactNode;
  /** Use "alert" for errors that appear after an action, "status" for confirmations. */
  role?: 'alert' | 'status';
  className?: string;
}) {
  return (
    <div role={role} className={cn('flex flex-col gap-1.5 rounded-tile px-5 py-4 text-ink', noticeTone[tone], className)}>
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className="text-base leading-relaxed">{children}</div> : null}
    </div>
  );
}

/* ---------- Empty / loading / error ---------- */
export function EmptyArt() {
  return (
    <svg width="130" height="96" viewBox="0 0 140 100" aria-hidden focusable="false">
      <path d="M30 96V50a40 40 0 0 1 80 0v46Z" fill="var(--lav-soft)" />
      <circle cx="70" cy="62" r="16" fill="#8BB8E8" />
      <path d="M14 96h112" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyState({ title, body, action }: { title: ReactNode; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3.5 rounded-card border border-dashed border-line bg-bg px-6 py-11 text-center">
      <EmptyArt />
      <h3 className="text-2xl">{title}</h3>
      {body ? <p className="max-w-prose text-ink-2">{body}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({ title, body, action }: { title: ReactNode; body?: ReactNode; action?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3.5 rounded-card border border-warm-ink bg-bg px-6 py-11 text-center">
      <span className="flex size-15 items-center justify-center rounded-full bg-warm-soft text-warm-ink">
        <AlertIcon size={28} />
      </span>
      <h3 className="text-2xl">{title}</h3>
      {body ? <p className="max-w-prose text-ink-2">{body}</p> : null}
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'block h-5 rounded-[10px] bg-[linear-gradient(90deg,var(--surface-2),var(--line),var(--surface-2))] bg-size-[200%_100%] motion-safe:animate-[shimmer_1.4s_linear_infinite]',
        className
      )}
    />
  );
}

/** Card-shaped skeletons with a visible caption for screen readers and sighted users. */
export function LoadingState({ caption, count = 3 }: { caption: string; count?: number }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
        {Array.from({ length: count }, (_, i) => (
          <Card key={i}>
            <div className="flex items-center gap-3">
              <Skeleton className="size-11 rounded-full" />
              <Skeleton className="h-3.5 flex-1" />
            </div>
            <Skeleton className="h-6 w-[90%]" />
            <Skeleton className="h-6 w-[70%]" />
            <Skeleton className="h-3" />
          </Card>
        ))}
      </div>
      <p role="status" className="text-caption text-mute">
        {caption}
      </p>
    </div>
  );
}
