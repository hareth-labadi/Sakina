'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { Segmented } from '@/components/ui/segmented';
import { usePathname, useRouter } from '@/i18n/navigation';
import { localeLabels, locales, type Locale } from '@/i18n/routing';
import { useTheme, type ThemePreference } from '@/lib/theme';

export function ThemeSwitch({ className }: { className?: string }) {
  const t = useTranslations('theme');
  const { preference, setPreference } = useTheme();
  return (
    <Segmented<ThemePreference>
      label={t('label')}
      value={preference}
      onValueChange={setPreference}
      className={className}
      options={[
        { value: 'light', label: t('light') },
        { value: 'dark', label: t('dark') },
        { value: 'system', label: t('system') }
      ]}
    />
  );
}

export function LanguageSwitch({ className }: { className?: string }) {
  const t = useTranslations('locale');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <Segmented<Locale>
      label={t('label')}
      value={locale}
      className={className}
      onValueChange={(next) => startTransition(() => router.replace(pathname, { locale: next }))}
      options={locales.map((l) => ({ value: l, label: <span lang={l} aria-busy={pending || undefined}>{localeLabels[l]}</span> }))}
    />
  );
}
