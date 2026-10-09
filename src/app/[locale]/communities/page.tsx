import type { Metadata } from 'next';
import { toLocale } from '@/i18n/routing';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CommunityCard } from '@/components/sakina/community-card';
import { Container } from '@/components/ui/container';
import { SAMPLE_STORIES } from '@/data/stories';
import { communities } from '@/services';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'communities' });
  return { title: t('title') };
}

export default async function CommunitiesPage({ params }: Props) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('communities');
  const list = await communities.list();

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-[clamp(2.25rem,4.6vw,3.5rem)]">{t('title')}</h1>
        <p className="max-w-190 text-lead text-ink-2">{t('sub')}</p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
        {list.map((c) => (
          <CommunityCard key={c.id} community={c} headingLevel="h2" storyCount={SAMPLE_STORIES.filter((s) => s.communityId === c.id).length} />
        ))}
      </div>
    </Container>
  );
}
