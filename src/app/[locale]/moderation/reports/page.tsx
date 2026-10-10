import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModerationPanel } from '@/components/sakina/panel/moderation';
import { toLocale } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'moderation' });
  // Staff tools: keep them out of search results.
  return { title: t('reports'), robots: { index: false, follow: false } };
}

export default async function ModerationReportsPage({ params }: Props) {
  setRequestLocale(toLocale((await params).locale));
  return <ModerationPanel tab="reports" />;
}
