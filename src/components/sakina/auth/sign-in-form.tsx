'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/choice';
import { Notice } from '@/components/ui/display';
import { Field, Input } from '@/components/ui/field';
import { PasswordInput } from '@/components/ui/password-input';
import { useToast } from '@/components/ui/toast';
import { Link, useRouter } from '@/i18n/navigation';
import { setSession } from '@/lib/session';
import { auth } from '@/services';
import { LockoutNotice } from '../account/lockout-notice';

type Problem =
  | { kind: 'invalid'; attemptsLeft: number }
  | { kind: 'locked'; until: number }
  | { kind: 'suspended'; reason: string | null }
  | { kind: 'generic' };

export function SignInForm() {
  const t = useTranslations('auth.signin');
  const tc = useTranslations('auth.common');
  const tp = useTranslations('password');
  const router = useRouter();
  const { toast } = useToast();

  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{ nickname?: string; password?: string }>({});
  const [problem, setProblem] = useState<Problem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const clearLock = useCallback(() => setProblem(null), []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = {
      nickname: nickname.trim() ? undefined : t('errNickname'),
      password: password ? undefined : t('errPassword')
    };
    setFieldErrors(errs);
    if (errs.nickname || errs.password) return;

    setSubmitting(true);
    setProblem(null);
    try {
      const res = await auth.signIn(nickname, password, remember);
      if (res.ok) {
        setSession(res.user);
        toast(t('welcomeBack', { nickname: res.user.nickname }));
        router.push('/');
        return;
      }
      setPassword('');
      if (res.error === 'invalid') setProblem({ kind: 'invalid', attemptsLeft: res.attemptsLeft });
      else if (res.error === 'locked') setProblem({ kind: 'locked', until: res.until });
      else setProblem({ kind: 'suspended', reason: res.reason });
    } catch {
      setProblem({ kind: 'generic' });
    } finally {
      setSubmitting(false);
    }
  };

  const locked = problem?.kind === 'locked';

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <p className="text-ink-2">{t('body')}</p>

      {problem?.kind === 'invalid' ? (
        <Notice tone="warn" role="alert" title={problem.attemptsLeft <= 3 ? t('invalidLeft', { count: problem.attemptsLeft }) : t('invalid')}>
          {t('invalidHelp')}
        </Notice>
      ) : null}
      {problem?.kind === 'locked' ? <LockoutNotice until={problem.until} onExpired={clearLock} /> : null}
      {problem?.kind === 'suspended' ? (
        <Notice tone="info" role="alert" title={t('suspendedTitle')}>
          <p>{t('suspendedBody')}</p>
          {problem.reason ? <p className="mt-1 font-semibold">{t('reason', { reason: problem.reason })}</p> : null}
        </Notice>
      ) : null}
      {problem?.kind === 'generic' ? <Notice tone="warn" role="alert" title={tc('generic')} /> : null}

      <Field label={t('nickname')} error={fieldErrors.nickname}>
        <Input
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            setFieldErrors((x) => ({ ...x, nickname: undefined }));
          }}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          disabled={locked}
        />
      </Field>
      <Field
        label={t('password')}
        error={fieldErrors.password}
        labelEnd={
          <Link href="/forgot" className="text-caption font-semibold text-ink underline underline-offset-4">
            {t('forgot')}
          </Link>
        }
      >
        <PasswordInput
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setFieldErrors((x) => ({ ...x, password: undefined }));
          }}
          autoComplete="current-password"
          showLabel={tp('show')}
          hideLabel={tp('hide')}
          disabled={locked}
        />
      </Field>
      <Checkbox label={t('remember')} checked={remember} onChange={(e) => setRemember(e.target.checked)} />
      <Button type="submit" full disabled={submitting || locked} aria-busy={submitting || undefined}>
        {submitting ? tc('working') : t('submit')}
      </Button>
      <p className="text-caption text-mute">
        {t('noAccount')}{' '}
        <Link href="/signup" className="font-semibold text-ink underline underline-offset-4">
          {t('joinLink')}
        </Link>
      </p>
    </form>
  );
}
