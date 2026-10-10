import type { Metadata } from 'next';
import { toLocale } from '@/i18n/routing';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CommunityCard } from '@/components/sakina/community-card';
import { Container } from '@/components/ui/container';
import { communities, communityStats } from '@/services';

type Props = { params: Promise<{ locale: string }> };

// Live story counts: rendered on each request, never at build time.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'communities' });
  return { title: t('title') };
}

export default async function CommunitiesPage({ params }: Props) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('communities');
  // Without the API (briefly down), the list still shows, just without counts.
  const [list, stats] = await Promise.all([communities.list(), communityStats().catch(() => ({}) as Awaited<ReturnType<typeof communityStats>>)]);

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-[clamp(2.25rem,4.6vw,3.5rem)]">{t('title')}</h1>
        <p className="max-w-190 text-lead text-ink-2">{t('sub')}</p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
        {list.map((c) => (
          <CommunityCard key={c.id} community={c} headingLevel="h2" storyCount={stats[c.id]?.storyCount} memberCount={stats[c.id]?.memberCount} />
        ))}
      </div>
    </Container>
  );
}
