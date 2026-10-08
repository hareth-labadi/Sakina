'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Field, Select } from '@/components/ui/field';
import { HeartIcon } from '@/components/ui/icons';
import { CRISIS_COUNTRIES, CRISIS_RESOURCES, type CrisisCountry } from '@/data/crisis';

/**
 * "Get help now". Must be reachable from every screen, signed in or not.
 * `short` shows the compact label on small screens (header).
 */
export function CrisisHelp({ short, size = 'sm', className }: { short?: boolean; size?: ButtonProps['size']; className?: string }) {
  const t = useTranslations('crisis');
  const tc = useTranslations('common');
  const [country, setCountry] = useState<CrisisCountry>('DZ');

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="crisis" size={size} className={className}>
          <HeartIcon size={18} />
          {short ? (
            <>
              <span className="max-sm:hidden">{t('button')}</span>
              <span className="sm:hidden">{t('buttonShort')}</span>
            </>
          ) : (
            t('button')
          )}
        </Button>
      </DialogTrigger>
      <DialogContent title={t('title')} description={t('body')} closeLabel={tc('close')} wide>
        <Field label={t('whereAreYou')}>
          <Select value={country} onChange={(e) => setCountry(e.target.value as CrisisCountry)}>
            {CRISIS_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {t(`countries.${c}`)}
              </option>
            ))}
          </Select>
        </Field>
        <ul className="flex flex-col gap-3">
          {CRISIS_RESOURCES[country].map((line) => (
            <li key={line.kind} className="flex flex-col gap-0.5 rounded-tile bg-warm-soft px-5 py-4">
              <span className="font-semibold">{t(`lines.${line.kind}`)}</span>
              <span className={line.value ? 'font-mono text-lg' : 'text-ink-2'} dir={line.value ? 'ltr' : undefined}>
                {line.value || t('placeholder')}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3 rounded-tile border border-line bg-bg p-5">
          <p className="font-semibold">{t('groundTitle')}</p>
          <ol className="flex list-decimal flex-col gap-2 ps-6 text-ink-2">
            <li>{t('ground1')}</li>
            <li>{t('ground2')}</li>
            <li>{t('ground3')}</li>
          </ol>
        </div>
        <p className="text-caption text-mute">{t('notEmergency')}</p>
      </DialogContent>
    </Dialog>
  );
}
