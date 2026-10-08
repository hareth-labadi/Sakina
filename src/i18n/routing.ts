import { defineRouting } from 'next-intl/routing';

export const locales = ['ar', 'fr', 'en'] as const;
export type Locale = (typeof locales)[number];

/** Right-to-left locales. Darija (ar-DZ) will join here when the UI supports it. */
export const rtlLocales: readonly Locale[] = ['ar'];

export const isRtl = (locale: string) => (rtlLocales as readonly string[]).includes(locale);

export const localeLabels: Record<Locale, string> = {
  ar: 'العربية',
  fr: 'Français',
  en: 'English'
};

/** Narrow a route param to a supported locale (falls back to the default). */
export function toLocale(value: string): Locale {
  return (locales as readonly string[]).includes(value) ? (value as Locale) : routing.defaultLocale;
}

export const routing = defineRouting({
  locales,
  // Launch market is Algeria. Visitors are still redirected by Accept-Language.
  defaultLocale: 'ar',
  localePrefix: 'always'
});
