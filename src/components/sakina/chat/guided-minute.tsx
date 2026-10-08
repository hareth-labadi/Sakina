'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatMmSs, useCountdown } from '@/lib/use-countdown';

const LENGTH_MS = 60_000;
const PHASE_MS = 4_000;

/** One guided minute of breathing: a circle that grows (in) and shrinks (out), with a countdown. */
export function GuidedMinute({ onDone }: { onDone: () => void }) {
  const t = useTranslations('chat.minute');
  const [until] = useState(() => Date.now() + LENGTH_MS);
  const left = useCountdown(until);
  const phaseIn = Math.floor((LENGTH_MS - left) / PHASE_MS) % 2 === 0;

  useEffect(() => {
    if (left <= 0) onDone();
  }, [left, onDone]);

  return (
    <div role="timer" aria-label={t('label')} className="flex flex-wrap items-center gap-6 border-b border-line bg-green-soft p-6">
      <div aria-hidden className="size-36 rounded-full bg-[radial-gradient(circle,#A8D5BA,#8BB8E8)] opacity-85 motion-safe:animate-[breathe_8s_ease-in-out_infinite]" />
      <div className="flex flex-col gap-2">
        <b aria-live="polite" className="font-display text-2xl">{phaseIn ? t('in') : t('out')}</b>
        <span className="font-mono" dir="ltr">{formatMmSs(left)}</span>
        <p className="text-caption">{t('hint')}</p>
        <div>
          <Button size="sm" variant="secondary" onClick={onDone}>{t('stop')}</Button>
        </div>
      </div>
    </div>
  );
}
