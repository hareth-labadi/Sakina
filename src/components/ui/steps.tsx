import { cn } from '@/lib/cn';
import { CheckIcon } from './icons';

/** Multi-step progress (sign-up). `current` is 1-based. The current step gets aria-current="step". */
export function Steps({ steps, current, label, className }: { steps: string[]; current: number; label: string; className?: string }) {
  return (
    <ol aria-label={label} className={cn('flex flex-wrap items-center gap-2', className)}>
      {steps.map((s, i) => {
        const n = i + 1;
        const state = n < current ? 'done' : n === current ? 'current' : 'todo';
        return (
          <li key={s} aria-current={state === 'current' ? 'step' : undefined} className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex size-8 items-center justify-center rounded-full border text-sm font-semibold',
                state === 'done' && 'border-transparent bg-green-soft text-green-ink',
                state === 'current' && 'border-primary bg-primary text-primary-fg',
                state === 'todo' && 'border-line bg-surface text-mute'
              )}
            >
              {state === 'done' ? <CheckIcon size={16} /> : n}
            </span>
            <span className={cn('text-caption font-semibold', state === 'todo' ? 'text-mute' : 'text-ink')}>{s}</span>
            {n < steps.length ? <span aria-hidden className="mx-1 h-px w-7 bg-line" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
