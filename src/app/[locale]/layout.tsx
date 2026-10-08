import type { Metadata, Viewport } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/sakina/site-footer';
import { SiteHeader } from '@/components/sakina/site-header';
import { ToastProvider } from '@/components/ui/toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { isRtl, routing, toLocale } from '@/i18n/routing';
import { fontVariables } from '@/lib/fonts';
import { ThemeProvider, themeInitScript } from '@/lib/theme';
import '../globals.css';

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: { default: t('title'), template: `%s · ${t('short')}` },
    description: t('description'),
    // Mental-health community: don't let crawlers index member areas by accident. Public pages opt in later.
    robots: { index: false, follow: false }
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF8F4' },
    { media: '(prefers-color-scheme: dark)', color: '#080C18' }
  ]
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('common');

  return (
    <html lang={locale} dir={isRtl(locale) ? 'rtl' : 'ltr'} className={fontVariables} suppressHydrationWarning>
      <body>
        {/* Applies light/dark before first paint (no flash). */}
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <NextIntlClientProvider>
          <ThemeProvider>
            <ToastProvider closeLabel={t('close')}>
              <TooltipProvider>
              <a
                href="#main"
                className="absolute start-4 -top-20 z-100 rounded-full bg-primary px-5 py-3 font-semibold text-primary-fg focus:top-3"
              >
                {t('skip')}
              </a>
              <SiteHeader />
              <main id="main" tabIndex={-1} className="outline-none">
                {children}
              </main>
              <SiteFooter />
              </TooltipProvider>
            </ToastProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
