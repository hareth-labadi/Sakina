'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { buttonVariants, Button } from '@/components/ui/button';
import { Card, ErrorState, Notice, Tag } from '@/components/ui/display';
import { Field, Input } from '@/components/ui/field';
import { BackIcon } from '@/components/ui/icons';
import { PasswordInput, PasswordStrength } from '@/components/ui/password-input';
import { Link } from '@/i18n/navigation';
import { MIN_PASSWORD_LEVEL, passwordLevel } from '@/lib/password';
import { isValidEmail, maskEmail, normalizeRecoveryCode } from '@/lib/recovery';
import { auth } from '@/services';
import { RecoveryCodeBox } from '../account/recovery-code';

type Step =
  | { s: 'choose' }
  | { s: 'code' }
  | { s: 'email' }
  | { s: 'sent'; email: string; devToken: string | null }
  | { s: 'badlink' }
  | { s: 'newpw'; token: string }
  | { s: 'done'; newCode: string | null };

/**
 * Account recovery: by recovery code, or by a link sent to the recovery email.
 * Both lead to choosing a new password. Using a code replaces it with a new one, shown once.
 */
export function ForgotForm() {
  const t = useTranslations('auth.forgot');
  const ts = useTranslations('auth.signin');
  const tsu = useTranslations('auth.signup');
  const tc = useTranslations('auth.common');
  const tp = useTranslations('password');

  const [step, setStep] = useState<Step>({ s: 'choose' });
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);

  const restart = () => {
    setStep({ s: 'choose' });
    setErrors({});
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch {
      setErrors({ form: tc('generic') });
    } finally {
      setBusy(false);
    }
  };

  const submitCode = (e: FormEvent) => {
    e.preventDefault();
    const errs = {
      nickname: nickname.trim() ? undefined : ts('errNickname'),
      code: normalizeRecoveryCode(code).length === 12 ? undefined : t('codeFormat')
    };
    setErrors(errs);
    if (errs.nickname || errs.code) return;
    void run(async () => {
      const res = await auth.verifyRecoveryCode(nickname, code);
      if (res.ok) setStep({ s: 'newpw', token: res.token });
      else setErrors({ form: t('codeWrong') });
    });
  };

  const submitEmail = (e: FormEvent) => {
    e.preventDefault();
    const errs = { nickname: nickname.trim() ? undefined : ts('errNickname'), email: isValidEmail(email) ? undefined : tsu('errors.email') };
    setErrors(errs);
    if (errs.nickname || errs.email) return;
    void run(async () => {
      const res = await auth.requestEmailReset(nickname, email);
      setStep({ s: 'sent', email, devToken: res.devToken });
    });
  };

  const openLink = (token: string | null) =>
    run(async () => {
      if (token && (await auth.isResetTokenValid(token))) setStep({ s: 'newpw', token });
      else setStep({ s: 'badlink' });
    });

  const submitNewPassword = (e: FormEvent, token: string) => {
    e.preventDefault();
    const errs = {
      pw: !pw ? tsu('errors.passwordRequired') : passwordLevel(pw) < MIN_PASSWORD_LEVEL ? tsu('errors.passwordWeak') : undefined,
      pw2: pw2 === pw ? undefined : tsu('errors.passwordMatch')
    };
    setErrors(errs);
    if (errs.pw || errs.pw2) return;
    void run(async () => {
      const res = await auth.resetPassword(token, pw);
      if (res.ok) setStep({ s: 'done', newCode: res.newRecoveryCode });
      else setStep({ s: 'badlink' });
    });
  };

  const backRow = (
    <div>
      <Button variant="secondary" onClick={restart}>
        <BackIcon size={18} />
        {tc('back')}
      </Button>
    </div>
  );
  const formError = errors.form ? <Notice tone="warn" role="alert" title={errors.form} /> : null;

  switch (step.s) {
    case 'choose':
      return (
        <div className="flex flex-col gap-5">
          <p className="text-ink-2">{t('choose')}</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(260px,100%),1fr))] gap-3">
            <button type="button" onClick={() => setStep({ s: 'code' })} className="flex flex-col items-start gap-1 rounded-tile border border-line bg-bg p-5 text-start hover:border-[#5E8FC4]">
              <b>{t('useCode')}</b>
              <span className="text-caption text-mute">{t('useCodeHint')}</span>
            </button>
            <button type="button" onClick={() => setStep({ s: 'email' })} className="flex flex-col items-start gap-1 rounded-tile border border-line bg-bg p-5 text-start hover:border-[#5E8FC4]">
              <b>{t('useEmail')}</b>
              <span className="text-caption text-mute">{t('useEmailHint')}</span>
            </button>
          </div>
          <Notice tone="info" title={t('noneTitle')}>
            {t('noneBody')}
          </Notice>
          <Link href="/signin" className="w-fit font-semibold text-ink underline underline-offset-4">
            {t('backToSignIn')}
          </Link>
        </div>
      );

    case 'code':
      return (
        <form onSubmit={submitCode} noValidate className="flex flex-col gap-5">
          <p className="text-ink-2">{t('codeBody')}</p>
          {formError}
          <Field label={ts('nickname')} error={errors.nickname}>
            <Input value={nickname} onChange={(e) => setNickname(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} />
          </Field>
          <Field label={t('codeLabel')} hint={t('codeHint')} error={errors.code}>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXXX-XXXX-XXXX" autoComplete="one-time-code" spellCheck={false} dir="ltr" className="font-mono tracking-widest" />
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy}>{busy ? tc('working') : tc('continue')}</Button>
            <Button variant="secondary" onClick={restart}>{tc('back')}</Button>
          </div>
        </form>
      );

    case 'email':
      return (
        <form onSubmit={submitEmail} noValidate className="flex flex-col gap-5">
          <p className="text-ink-2">{t('emailBody')}</p>
          {formError}
          <Field label={ts('nickname')} error={errors.nickname}>
            <Input value={nickname} onChange={(e) => setNickname(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} />
          </Field>
          <Field label={tsu('email')} error={errors.email}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" dir="ltr" />
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy}>{busy ? tc('working') : t('sendLink')}</Button>
            <Button variant="secondary" onClick={restart}>{tc('back')}</Button>
          </div>
        </form>
      );

    case 'sent':
      return (
        <div className="flex flex-col gap-5">
          <Notice tone="calm" role="status" title={t('sentTitle')}>
            {t('sentBody', { email: maskEmail(step.email) })}
          </Notice>
          <Card flat className="gap-3 p-5">
            <Tag>{tc('prototype')}</Tag>
            <p className="text-ink-2">{t('simulateHint')}</p>
            <div>
              <Button size="sm" onClick={() => void openLink(step.devToken)} disabled={busy}>{t('openLink')}</Button>
            </div>
          </Card>
          <Button variant="ghost" className="w-fit" onClick={restart}>{t('tryOther')}</Button>
        </div>
      );

    case 'badlink':
      return <ErrorState title={t('badLinkTitle')} body={t('badLinkBody')} action={<Button variant="secondary" onClick={restart}>{t('startOver')}</Button>} />;

    case 'newpw':
      return (
        <form onSubmit={(e) => submitNewPassword(e, step.token)} noValidate className="flex flex-col gap-5">
          <h2 className="text-2xl">{t('newTitle')}</h2>
          {formError}
          <Field label={t('newPassword')} hint={tp('hint')} error={errors.pw}>
            <PasswordInput value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" showLabel={tp('show')} hideLabel={tp('hide')} />
          </Field>
          <PasswordStrength value={pw} labels={[tp('empty'), tp('weak'), tp('okay'), tp('strong')]} />
          <Field label={tsu('password2')} error={errors.pw2}>
            <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
          </Field>
          <div>
            <Button type="submit" disabled={busy}>{busy ? tc('working') : t('savePassword')}</Button>
          </div>
        </form>
      );

    case 'done':
      return (
        <div className="flex flex-col gap-5">
          <Notice tone="calm" role="status" title={t('doneTitle')}>
            {t('doneBody')}
          </Notice>
          {step.newCode ? (
            <>
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl">{t('newCodeTitle')}</h2>
                <p className="text-ink-2">{t('newCodeBody')}</p>
              </div>
              <RecoveryCodeBox code={step.newCode} saved={saved} onSavedChange={(v) => { setSaved(v); setErrors({}); }} error={errors.saved} />
            </>
          ) : null}
          <div>
            {step.newCode && !saved ? (
              <Button onClick={() => setErrors({ saved: tsu('errors.saved') })}>{t('goSignIn')}</Button>
            ) : (
              <Link href="/signin" className={buttonVariants()}>{t('goSignIn')}</Link>
            )}
          </div>
        </div>
      );
  }
  return backRow;
}
