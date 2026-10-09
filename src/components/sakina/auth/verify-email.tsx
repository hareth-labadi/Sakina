'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { buttonVariants, Button } from '@/components/ui/button';
import { ErrorState, Notice, Skeleton } from '@/components/ui/display';
import { useToast } from '@/components/ui/toast';
import { Link, useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { useSessionState } from '@/lib/session';
import { useCountdown } from '@/lib/use-countdown';
import { auth } from '@/services';
import { RecoveryCodeBox } from '../account/recovery-code';

type Info = Awaited<ReturnType<typeof auth.getRecoveryInfo>>;

/**
 * After choosing email recovery: confirm the address, resend, or switch to a recovery code.
 * The emailed link opens this page with ?token=…, which confirms the address even when signed out
 * (e.g. opened on a phone); the token is then removed from the address bar.
 */
export function VerifyEmail() {
  const t = useTranslations('auth.verify');
  const tsu = useTranslations('auth.signup');
  const { status, user } = useSessionState();
  const nickname = user?.nickname;
  const locale = useLocale() as Locale;
  const [link, setLink] = useState<'checking' | 'ok' | 'bad' | null>(null);
  // The token works once, so it is checked once even if the effect runs twice (React dev mode).
  const linkCheck = useRef<Promise<boolean> | null>(null);
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
    if (!linkCheck.current) {
      const token = new URLSearchParams(window.location.search).get('token');
      if (!token) return;
      window.history.replaceState(null, '', window.location.pathname);
      linkCheck.current = auth.verifyEmail(token).catch(() => false);
    }
    let alive = true;
    setLink('checking');
    void linkCheck.current.then((ok) => alive && setLink(ok ? 'ok' : 'bad'));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!nickname || link) return;
    let alive = true;
    auth.getRecoveryInfo().then((i) => alive && setInfo(i));
    return () => {
      alive = false;
    };
  }, [nickname, link]);

  if (link === 'ok')
    return (
      <div className="flex flex-col gap-4">
        <Notice tone="calm" role="status" title={t('doneTitle')}>{t('doneBody')}</Notice>
        <div>
          <Link href="/" className={buttonVariants()}>{t('goHome')}</Link>
        </div>
      </div>
    );

  if (link === 'bad')
    return (
      <ErrorState
        title={t('badLinkTitle')}
        body={t('badLinkBody')}
        action={
          <Button variant="secondary" onClick={() => setLink(null)}>
            {t('badLinkAction')}
          </Button>
        }
      />
    );

  if (link === 'checking' || (!user && status === 'loading'))
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
      </div>
    );

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
      <p className="text-ink-2">{t('body', { email: info.email })}</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" disabled={busy || resendLeft > 0} onClick={() => run(async () => { await auth.resendVerification(locale); setResendAt(Date.now() + 30_000); toast(t('resent')); })}>
          {resendLeft > 0 ? t('resendIn', { seconds: Math.ceil(resendLeft / 1000) }) : t('resend')}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => run(async () => { setNewCode(await auth.switchToRecoveryCode()); })}>
          {t('useCode')}
        </Button>
        <Link href="/" className={buttonVariants({ variant: 'ghost' })}>{t('later')}</Link>
      </div>
      <p className="text-caption text-mute">{t('laterHint')}</p>
    </div>
  );
}
