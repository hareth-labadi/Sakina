'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Notice } from '@/components/ui/display';
import { Link } from '@/i18n/navigation';
import { formatMmSs, useCountdown } from '@/lib/use-countdown';

/** Sign-in paused after too many tries. Calls `onExpired` once the wait is over. */
export function LockoutNotice({ until, onExpired }: { until: number; onExpired?: () => void }) {
  const t = useTranslations('account.lockout');
  const left = useCountdown(until);
  const expired = left <= 0;

  useEffect(() => {
    if (expired) onExpired?.();
  }, [expired, onExpired]);

  if (expired) return null;
  return (
    <Notice tone="warn" role="alert" title={t('title')}>
      <p>{t('body', { time: formatMmSs(left) })}</p>
      <div className="mt-2">
        <Link href="/forgot" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
          {t('recover')}
        </Link>
      </div>
    </Notice>
  );
}
