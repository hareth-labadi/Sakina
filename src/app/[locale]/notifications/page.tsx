import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { NotificationList } from '@/components/sakina/account/notification-list';
import { Container } from '@/components/ui/container';
import { toLocale } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'notifications' });
  return { title: t('title') };
}

export default async function NotificationsPage({ params }: Props) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('notifications');

  return (
    <Container className="flex max-w-220 flex-col gap-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-[clamp(2.25rem,4.6vw,3.5rem)]">{t('title')}</h1>
        <p className="text-lead text-ink-2">{t('sub')}</p>
      </div>
      <NotificationList />
    </Container>
  );
}
