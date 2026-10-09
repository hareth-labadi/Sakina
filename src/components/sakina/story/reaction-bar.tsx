'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';
import type { Reaction } from '@/types/domain';

export const REACTIONS: Reaction[] = ['relate', 'strength', 'helped', 'thanks'];

/** The four caring reactions. No downvotes. Toggle buttons announce their pressed state. */
export function ReactionBar({ counts, mine, onToggle }: { counts: Record<Reaction, number>; mine: Reaction[]; onToggle: (r: Reaction) => void }) {
  const t = useTranslations('story.react');
  const id = useId();
  return (
    <div className="flex flex-col gap-2.5">
      <span id={id} className="text-[1.0625rem] font-semibold">
        {t('prompt')}
      </span>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2.5">
        {REACTIONS.map((r) => {
          const on = mine.includes(r);
          return (
            <button
              key={r}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(r)}
              className="inline-flex min-h-12 items-center gap-2.5 rounded-full border border-line bg-surface px-4.5 font-semibold transition-colors hover:bg-surface-2 aria-pressed:border-lav-ink aria-pressed:bg-lav-soft aria-pressed:text-lav-ink"
            >
              {t(r)}
              <span className="font-mono text-sm">{counts[r]}</span>
            </button>
          );
        })}
      </div>
      <p className="text-caption text-mute">{t('note')}</p>
    </div>
  );
}
