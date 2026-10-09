'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Segmented } from '@/components/ui/segmented';
import { getPathname, usePathname } from '@/i18n/navigation';
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

/**
 * Switching language does a full page load on purpose: the <html> lang/dir, fonts and the
 * no-flash theme script are set server-side, and re-rendering the root layout in the browser
 * would re-create that script (React warns about it).
 */
export function LanguageSwitch({ className }: { className?: string }) {
  const t = useTranslations('locale');
  const locale = useLocale() as Locale;
  const pathname = usePathname();

  return (
    <Segmented<Locale>
      label={t('label')}
      value={locale}
      className={className}
      onValueChange={(next) => {
        const href = getPathname({ href: pathname, locale: next });
        window.location.assign(href + window.location.search + window.location.hash);
      }}
      options={locales.map((l) => ({ value: l, label: <span lang={l}>{localeLabels[l]}</span> }))}
    />
  );
}
