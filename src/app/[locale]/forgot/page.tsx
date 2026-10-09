import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthShell } from '@/components/sakina/auth/auth-shell';
import { ForgotForm } from '@/components/sakina/auth/forgot-form';
import { toLocale } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'auth.forgot' });
  return { title: t('title') };
}

export default async function Page({ params }: Props) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('auth');
  return (
    <AuthShell eyebrow={t('common.recoveryEyebrow')} title={t('forgot.title')} aside="recovery">
      <ForgotForm />
    </AuthShell>
  );
}
