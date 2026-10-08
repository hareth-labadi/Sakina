'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/choice';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field, Textarea } from '@/components/ui/field';
import { RadioCard } from '@/components/ui/choice';

export type ReportReason = 'unsafe' | 'harassment' | 'medical' | 'personal' | 'spam' | 'other';
const REASONS: ReportReason[] = ['unsafe', 'harassment', 'medical', 'personal', 'spam', 'other'];

/**
 * Private report. "Someone may be in danger" goes to a therapist first (the server decides routing).
 * When reporting a member, offers to block them too.
 */
export function ReportDialog({
  open,
  onOpenChange,
  onSubmit,
  offerBlock
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (r: { reason: ReportReason; note: string; block: boolean }) => void | Promise<void>;
  offerBlock?: string;
}) {
  const t = useTranslations('report');
  const tc = useTranslations('common');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [block, setBlock] = useState(false);
  const [error, setError] = useState(false);

  const reset = (o: boolean) => {
    if (!o) {
      setReason(null);
      setNote('');
      setBlock(false);
      setError(false);
    }
    onOpenChange(o);
  };

  const send = async () => {
    if (!reason) {
      setError(true);
      return;
    }
    await onSubmit({ reason, note: note.trim(), block });
    reset(false);
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent title={t('title')} description={t('body')} closeLabel={tc('close')}>
        <fieldset className="flex flex-col gap-2.5" aria-describedby={error ? 'report-err' : undefined}>
          <legend className="mb-2 text-[1.0625rem] font-semibold">{t('why')}</legend>
          {REASONS.map((r) => (
            <RadioCard key={r} name="report-reason" title={t(`reasons.${r}`)} checked={reason === r} onChange={() => { setReason(r); setError(false); }} className="p-3.5" />
          ))}
        </fieldset>
        {error ? (
          <p id="report-err" role="alert" className="text-caption font-semibold text-warm-ink">
            {t('pickReason')}
          </p>
        ) : null}
        <Field label={t('note')} labelAside={tc('optional')}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-24" maxLength={500} />
        </Field>
        {offerBlock ? <Checkbox label={t('alsoBlock', { nickname: offerBlock })} checked={block} onChange={(e) => setBlock(e.target.checked)} /> : null}
        <p className="text-caption text-mute">{t('private')}</p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={send}>{t('send')}</Button>
          <Button variant="secondary" onClick={() => reset(false)}>
            {tc('cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
