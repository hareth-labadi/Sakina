import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { StoryComposer } from '@/components/sakina/composer/story-composer';
import { Container } from '@/components/ui/container';
import { toLocale } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ community?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'write' });
  return { title: t('title') };
}

export default async function WritePage({ params, searchParams }: Props) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('write');
  const { community } = await searchParams;

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-[clamp(2.25rem,4.6vw,3.5rem)]">{t('title')}</h1>
        <p className="max-w-190 text-lead text-ink-2">{t('sub')}</p>
      </div>
      <StoryComposer initialCommunity={typeof community === 'string' ? community : undefined} />
    </Container>
  );
}
