'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { Checkbox, RadioCard } from '@/components/ui/choice';
import { Avatar } from '@/components/ui/display';
import { ErrorSummary } from '@/components/ui/error-summary';
import { Field, Input, Select } from '@/components/ui/field';
import { BackIcon } from '@/components/ui/icons';
import { PasswordInput, PasswordStrength } from '@/components/ui/password-input';
import { Steps } from '@/components/ui/steps';
import { useToast } from '@/components/ui/toast';
import { CONDITIONS } from '@/data/conditions';
import { CRISIS_COUNTRIES } from '@/data/crisis';
import { Link, useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { AVATAR_COUNT } from '@/lib/avatar';
import { MIN_PASSWORD_LEVEL, passwordLevel } from '@/lib/password';
import { generateRecoveryCode, isValidEmail } from '@/lib/recovery';
import { setSession } from '@/lib/session';
import { auth } from '@/services';
import { NicknameField, type NicknameStatus } from '../account/nickname-field';
import { RecoveryCodeBox } from '../account/recovery-code';

const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55+'];
type Errors = Partial<Record<'communities' | 'nickname' | 'password' | 'password2' | 'email' | 'saved' | 'adult' | 'care' | 'form', string>>;

/** Field ids, so the error summary can link to each field. */
const IDS = { communities: 'su-communities', nickname: 'su-nickname', password: 'su-password', password2: 'su-password2', email: 'su-email' } as const;

export function SignUpForm() {
  const t = useTranslations('auth.signup');
  const tc = useTranslations('auth.common');
  const tn = useTranslations('account.nickname');
  const tp = useTranslations('password');
  const tCountry = useTranslations('crisis.countries');
  const tCommon = useTranslations('common');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [communities, setCommunities] = useState<string[]>([]);
  const [nickname, setNickname] = useState('');
  const [nickStatus, setNickStatus] = useState<NicknameStatus>('idle');
  const [avatar, setAvatar] = useState(0);
  const [ageRange, setAgeRange] = useState('');
  const [country, setCountry] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [recovery, setRecovery] = useState<'code' | 'email'>('code');
  const [code, setCode] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState('');
  const [adult, setAdult] = useState(false);
  const [care, setCare] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const toggleCommunity = (id: string) => {
    setCommunities((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
    setErrors((e) => ({ ...e, communities: undefined }));
  };

  const validate = (s: number): Errors => {
    const e: Errors = {};
    if (s === 1 && !communities.length) e.communities = t('errors.pickCommunity');
    if (s === 2) {
      if (!nickname.trim()) e.nickname = t('errors.nicknameRequired');
      else if (nickStatus === 'checking' || nickStatus === 'idle') e.nickname = t('errors.nicknameChecking');
      else if (nickStatus === 'taken') e.nickname = tn('taken');
      else if (nickStatus === 'invalid') e.nickname = tn('invalid');
    }
    if (s === 3) {
      if (!password) e.password = t('errors.passwordRequired');
      else if (passwordLevel(password) < MIN_PASSWORD_LEVEL) e.password = t('errors.passwordWeak');
      if (password2 !== password) e.password2 = t('errors.passwordMatch');
      if (recovery === 'email' && !isValidEmail(email)) e.email = t('errors.email');
      if (recovery === 'code' && !saved) e.saved = t('errors.saved');
      if (!adult) e.adult = t('errors.adult');
      if (!care) e.care = t('errors.care');
    }
    return e;
  };

  const goTo = (next: number) => {
    setErrors({});
    // The recovery code is generated when it's first needed (client only, so no hydration mismatch).
    if (next === 3 && !code) setCode(generateRecoveryCode());
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length) return;
    if (step < 3) return goTo(step + 1);

    setSubmitting(true);
    try {
      const res = await auth.signUp({
        nickname: nickname.trim(),
        password,
        avatar,
        communities,
        ageRange: ageRange || null,
        country: country || null,
        recovery: recovery === 'code' ? { type: 'code', code: code! } : { type: 'email', email }
      });
      if (!res.ok) {
        if (res.error === 'nickname_taken') {
          setNickStatus('taken');
          setStep(2);
          setErrors({ nickname: tn('taken') });
        } else setErrors({ form: tc('generic') });
        return;
      }
      setSession(res.user);
      toast(t('welcome', { nickname: res.user.nickname }));
      router.push(res.emailToVerify ? '/verify-email' : '/');
    } catch {
      setErrors({ form: tc('generic') });
    } finally {
      setSubmitting(false);
    }
  };

  const summary = [
    errors.communities && { id: IDS.communities, message: errors.communities },
    errors.nickname && { id: IDS.nickname, message: errors.nickname },
    errors.password && { id: IDS.password, message: errors.password },
    errors.password2 && { id: IDS.password2, message: errors.password2 },
    errors.email && { id: IDS.email, message: errors.email },
    errors.saved && { message: errors.saved },
    errors.adult && { message: errors.adult },
    errors.care && { message: errors.care },
    errors.form && { message: errors.form }
  ].filter(Boolean) as { id?: string; message: string }[];

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <Steps label={t('stepsLabel')} steps={[t('step1'), t('step2'), t('step3')]} current={step} />
      <ErrorSummary title={tc('fixBelow')} errors={summary} />

      {step === 1 ? (
        <fieldset id={IDS.communities} tabIndex={-1} className="flex flex-col gap-4 outline-none">
          <legend className="mb-2 text-2xl font-semibold">{t('s1Title')}</legend>
          <p className="text-ink-2">{t('s1Body')}</p>
          <ChipGroup>
            {CONDITIONS.filter((c) => c.status === 'active').map((c) => (
              <Chip key={c.id} pressed={communities.includes(c.id)} onClick={() => toggleCommunity(c.id)}>
                {c.name[locale]}
              </Chip>
            ))}
          </ChipGroup>
          <p className="text-caption text-mute" aria-live="polite">
            {t('picked', { count: communities.length })}
          </p>
        </fieldset>
      ) : null}

      {step === 2 ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl">{t('s2Title')}</h2>
            <p className="text-ink-2">{t('s2Body')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Avatar index={avatar} size="xl" label={t('avatarLabel')} />
            <div className="flex flex-col gap-2">
              <Button variant="secondary" size="sm" onClick={() => setAvatar((a) => (a + 1 + Math.floor(Math.random() * (AVATAR_COUNT - 1))) % AVATAR_COUNT)}>
                {t('shuffle')}
              </Button>
              <span className="text-caption text-mute">{t('avatarHint')}</span>
            </div>
          </div>
          <NicknameField
            id={IDS.nickname}
            value={nickname}
            onChange={(v) => {
              setNickname(v);
              setErrors((e) => ({ ...e, nickname: undefined }));
            }}
            onStatusChange={setNickStatus}
            error={errors.nickname}
          />
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(220px,100%),1fr))] gap-4">
            <Field label={t('ageRange')} labelAside={tCommon('optional')}>
              <Select value={ageRange} onChange={(e) => setAgeRange(e.target.value)}>
                <option value="">{t('preferNot')}</option>
                {AGE_RANGES.map((a) => (
                  <option key={a} value={a} dir="ltr">
                    {a}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('country')} labelAside={tCommon('optional')}>
              <Select value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="">{t('preferNot')}</option>
                {CRISIS_COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {tCountry(c)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <p className="text-caption text-mute">{t('privateDefault')}</p>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl">{t('s3Title')}</h2>
            <p className="text-ink-2">{t('s3Body')}</p>
          </div>
          <Field id={IDS.password} label={t('password')} hint={tp('hint')} error={errors.password}>
            <PasswordInput
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((x) => ({ ...x, password: undefined }));
              }}
              autoComplete="new-password"
              showLabel={tp('show')}
              hideLabel={tp('hide')}
            />
          </Field>
          <PasswordStrength value={password} labels={[tp('empty'), tp('weak'), tp('okay'), tp('strong')]} />
          <Field id={IDS.password2} label={t('password2')} error={errors.password2}>
            <Input
              type="password"
              value={password2}
              onChange={(e) => {
                setPassword2(e.target.value);
                setErrors((x) => ({ ...x, password2: undefined }));
              }}
              autoComplete="new-password"
            />
          </Field>
          <p className="text-caption text-mute">{t('passkeyLater')}</p>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-[1.0625rem] font-semibold">{t('recTitle')}</legend>
            <p className="text-caption text-mute">{t('recBody')}</p>
            <RadioCard name="recovery" title={t('recCode')} description={t('recCodeHint')} checked={recovery === 'code'} onChange={() => setRecovery('code')} />
            <RadioCard name="recovery" title={t('recEmail')} description={t('recEmailHint')} checked={recovery === 'email'} onChange={() => setRecovery('email')} />
          </fieldset>

          {recovery === 'code' && code ? (
            <RecoveryCodeBox code={code} saved={saved} onSavedChange={(v) => { setSaved(v); setErrors((x) => ({ ...x, saved: undefined })); }} error={errors.saved} />
          ) : null}
          {recovery === 'email' ? (
            <Field id={IDS.email} label={t('email')} hint={t('emailHint')} error={errors.email}>
              <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, email: undefined })); }} autoComplete="email" dir="ltr" />
            </Field>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-line pt-5">
            <Checkbox label={t('adult')} checked={adult} onChange={(e) => { setAdult(e.target.checked); setErrors((x) => ({ ...x, adult: undefined })); }} aria-invalid={errors.adult ? true : undefined} />
            <Checkbox label={t('care')} checked={care} onChange={(e) => { setCare(e.target.checked); setErrors((x) => ({ ...x, care: undefined })); }} aria-invalid={errors.care ? true : undefined} />
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        {step > 1 ? (
          <Button variant="secondary" onClick={() => goTo(step - 1)}>
            <BackIcon size={18} />
            {tc('back')}
          </Button>
        ) : null}
        <Button type="submit" className="ms-auto" disabled={submitting} aria-busy={submitting || undefined}>
          {submitting ? tc('working') : step === 3 ? t('create') : tc('continue')}
        </Button>
      </div>
      <p className="text-caption text-mute">
        {t('haveAccount')}{' '}
        <Link href="/signin" className="font-semibold text-ink underline underline-offset-4">
          {t('signInLink')}
        </Link>
      </p>
    </form>
  );
}
