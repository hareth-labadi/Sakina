'use client';

import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { EyeOffIcon } from '@/components/ui/icons';
import type { VeilTopic } from '@/types/domain';
import { CrisisHelp } from '../crisis-help';

/**
 * Hides heavy content behind a gentle note until the reader chooses to open it.
 * With no topics, children render directly.
 */
export function ContentVeil({ topics, onDecline, children }: { topics: VeilTopic[] | null | undefined; onDecline?: () => void; children: ReactNode }) {
  const t = useTranslations('story');
  const tv = useTranslations('story.veil');
  const [open, setOpen] = useState(false);
  if (!topics?.length || open) return <>{children}</>;

  return (
    <section aria-label={tv('label')} className="flex flex-col items-start gap-4 rounded-card bg-lav-soft p-7 sm:p-9">
      <EyeOffIcon size={32} className="text-lav-ink" />
      <h2 className="text-2xl">{tv('title', { topics: topics.map((x) => t(`topics.${x}`)).join(', ') })}</h2>
      <p>{tv('body')}</p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setOpen(true)}>{tv('show')}</Button>
        {onDecline ? (
          <Button variant="secondary" onClick={onDecline}>
            {tv('notNow')}
          </Button>
        ) : null}
        <CrisisHelp size="md" />
      </div>
    </section>
  );
}
