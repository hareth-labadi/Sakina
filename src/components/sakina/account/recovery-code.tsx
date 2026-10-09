'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/choice';
import { Notice } from '@/components/ui/display';
import { useToast } from '@/components/ui/toast';

/**
 * One-time recovery code. Shown once; the member must confirm they saved it.
 * The parent owns `saved` so it can block "Continue" until it is ticked.
 */
export function RecoveryCodeBox({ code, saved, onSavedChange, error }: { code: string; saved: boolean; onSavedChange: (v: boolean) => void; error?: string }) {
  const t = useTranslations('account.recovery');
  const { toast } = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast(t('copied'));
    } catch {
      toast(t('copyFailed'));
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-tile border border-line bg-bg p-5">
      <Notice tone="warn" title={t('onceTitle')}>
        {t('onceBody')}
      </Notice>
      <p
        aria-label={t('codeLabel')}
        dir="ltr"
        className="rounded-tile border border-dashed border-line bg-surface-2 p-5 text-center font-mono text-[clamp(1.5rem,4vw,2.125rem)] tracking-[0.12em] select-all"
      >
        {code}
      </p>
      <div>
        <Button variant="secondary" size="sm" onClick={copy}>
          {t('copy')}
        </Button>
      </div>
      <Checkbox label={t('saved')} checked={saved} onChange={(e) => onSavedChange(e.target.checked)} aria-invalid={error ? true : undefined} />
      {error ? (
        <p role="alert" className="text-caption font-semibold text-warm-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { generateRecoveryCode } from '@/lib/recovery';
