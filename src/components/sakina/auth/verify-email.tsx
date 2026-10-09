'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { buttonVariants, Button } from '@/components/ui/button';
import { Card, Notice, Skeleton, Tag } from '@/components/ui/display';
import { useToast } from '@/components/ui/toast';
import { Link, useRouter } from '@/i18n/navigation';
import { maskEmail } from '@/lib/recovery';
import { useSession } from '@/lib/session';
import { useCountdown } from '@/lib/use-countdown';
import { auth } from '@/services';
import { RecoveryCodeBox } from '../account/recovery-code';

type Info = Awaited<ReturnType<typeof auth.getRecoveryInfo>>;

/** After choosing email recovery: confirm the address, resend, or switch to a recovery code. */
export function VerifyEmail() {
  const t = useTranslations('auth.verify');
  const tc = useTranslations('auth.common');
  const tsu = useTranslations('auth.signup');
  const user = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [info, setInfo] = useState<Info | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedError, setSavedError] = useState<string | undefined>();
  const resendLeft = useCountdown(resendAt);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    auth.getRecoveryInfo(user.nickname).then((i) => alive && setInfo(i));
    return () => {
      alive = false;
    };
  }, [user]);

  if (!user)
    return (
      <div className="flex flex-col gap-4">
        <Notice tone="info" title={t('signedOutTitle')}>{t('signedOutBody')}</Notice>
        <div>
          <Link href="/signin" className={buttonVariants()}>{t('signIn')}</Link>
        </div>
      </div>
    );

  if (info === undefined)
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    );

  if (newCode)
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl">{t('codeTitle')}</h2>
          <p className="text-ink-2">{t('codeBody')}</p>
        </div>
        <RecoveryCodeBox code={newCode} saved={saved} onSavedChange={(v) => { setSaved(v); setSavedError(undefined); }} error={savedError} />
        <div>
          <Button onClick={() => (saved ? router.push('/') : setSavedError(tsu('errors.saved')))}>{t('goHome')}</Button>
        </div>
      </div>
    );

  if (!info || info.type === 'code')
    return (
      <div className="flex flex-col gap-4">
        <Notice tone="info" title={t('noEmailTitle')}>{t('noEmailBody')}</Notice>
        <div>
          <Link href="/" className={buttonVariants()}>{t('goHome')}</Link>
        </div>
      </div>
    );

  if (info.verified)
    return (
      <div className="flex flex-col gap-4">
        <Notice tone="calm" role="status" title={t('doneTitle')}>{t('doneBody')}</Notice>
        <div>
          <Link href="/" className={buttonVariants()}>{t('goHome')}</Link>
        </div>
      </div>
    );

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-ink-2">{t('body', { email: maskEmail(info.email) })}</p>
      <Card flat className="gap-3 p-5">
        <Tag>{tc('prototype')}</Tag>
        <p className="text-ink-2">{t('simulateHint')}</p>
        <div>
          <Button size="sm" disabled={busy} onClick={() => run(async () => { await auth.verifyEmail(user.nickname); setInfo({ ...info, verified: true }); })}>
            {t('openLink')}
          </Button>
        </div>
      </Card>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" disabled={busy || resendLeft > 0} onClick={() => run(async () => { await auth.resendVerification(); setResendAt(Date.now() + 30_000); toast(t('resent')); })}>
          {resendLeft > 0 ? t('resendIn', { seconds: Math.ceil(resendLeft / 1000) }) : t('resend')}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => run(async () => { setNewCode(await auth.switchToRecoveryCode(user.nickname)); })}>
          {t('useCode')}
        </Button>
        <Link href="/" className={buttonVariants({ variant: 'ghost' })}>{t('later')}</Link>
      </div>
      <p className="text-caption text-mute">{t('laterHint')}</p>
    </div>
  );
}
