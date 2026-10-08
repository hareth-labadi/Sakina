'use client';

import { useTranslations } from 'next-intl';
import { buttonVariants, Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Link } from '@/i18n/navigation';

export type GateAction = 'generic' | 'react' | 'reply' | 'post' | 'join' | 'save' | 'report' | 'room' | 'chat' | 'dm';

/** Shown when a guest tries to take part. Reading stays open; joining is anonymous. */
export function JoinGate({ open, onOpenChange, action = 'generic' }: { open: boolean; onOpenChange: (o: boolean) => void; action?: GateAction }) {
  const t = useTranslations('account.gate');
  const tc = useTranslations('common');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t(`title.${action}`)} description={t('body')} closeLabel={tc('close')}>
        <ul className="flex list-disc flex-col gap-1 ps-6 text-ink-2">
          <li>{t('never1')}</li>
          <li>{t('never2')}</li>
          <li>{t('only')}</li>
        </ul>
        <div className="flex flex-wrap gap-3">
          <Link href="/signup" className={buttonVariants()}>
            {t('join')}
          </Link>
          <Link href="/signin" className={buttonVariants({ variant: 'secondary' })}>
            {t('signIn')}
          </Link>
          <DialogClose asChild>
            <Button variant="ghost">{t('keepReading')}</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
