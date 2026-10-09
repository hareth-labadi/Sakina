import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { CommunityFeed } from '@/components/sakina/community/community-feed';
import { JoinButton } from '@/components/sakina/community/join-button';
import { CrisisHelp } from '@/components/sakina/crisis-help';
import { Container } from '@/components/ui/container';
import { Badge, Card } from '@/components/ui/display';
import { BackIcon } from '@/components/ui/icons';
import { tintBg } from '@/components/ui/tint';
import { CONDITIONS } from '@/data/conditions';
import { Link } from '@/i18n/navigation';
import { toLocale } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import { communities, stories } from '@/services';

type Props = { params: Promise<{ locale: string; id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return CONDITIONS.filter((c) => c.status === 'active').map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, id } = await params;
  const community = await communities.get(id);
  return community ? { title: community.name[toLocale(raw)] } : {};
}

export default async function CommunityPage({ params }: Props) {
  const { locale: raw, id } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const community = await communities.get(id);
  if (!community) notFound();
  const [t, tc, posts] = await Promise.all([getTranslations('community.page'), getTranslations('community'), stories.byCommunity(id)]);
  const name = community.name[locale];

  return (
    <Container className="flex flex-col gap-8 py-10">
      <Link href="/communities" className="inline-flex min-h-11 w-fit items-center gap-2 font-semibold text-ink-2 hover:text-ink">
        <BackIcon size={18} />
        {t('back')}
      </Link>

      <header className={cn('flex flex-col gap-4 rounded-card p-6.5 sm:p-10', tintBg[community.tint])}>
        {community.sensitivity !== 'standard' ? <Badge className="bg-surface">{tc(`sensitivity.${community.sensitivity}`)}</Badge> : null}
        <h1 className="text-[clamp(2.25rem,4.6vw,3.5rem)]">{name}</h1>
        <p className="max-w-190 text-lead text-ink-2">{community.description[locale]}</p>
        <p className="text-caption text-ink-2">{tc('meta', { count: posts.length })}</p>
        <div>
          <JoinButton communityId={community.id} name={name} />
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <section aria-labelledby="h-posts" className="flex min-w-0 flex-col gap-5">
          <h2 id="h-posts" className="text-[clamp(1.75rem,3.2vw,2.375rem)]">
            {t('postsTitle')}
          </h2>
          <CommunityFeed stories={posts} />
        </section>

        <aside className="flex flex-col gap-5" aria-label={t('aboutTitle')}>
          <Card>
            <h2 className="text-2xl">{t('aboutTitle')}</h2>
            {community.sensitivity !== 'standard' ? <p className="text-ink-2">{t(`sensitivityNote.${community.sensitivity}`)}</p> : null}
            <ul className="flex list-disc flex-col gap-1.5 ps-6 text-ink-2">
              <li>{t('rule1')}</li>
              <li>{t('rule2')}</li>
              <li>{t('rule3')}</li>
            </ul>
          </Card>
          <Card className="border-transparent bg-warm-soft">
            <h2 className="text-2xl">{t('crisisTitle')}</h2>
            <p>{t('crisisBody')}</p>
            <div>
              <CrisisHelp size="md" />
            </div>
          </Card>
        </aside>
      </div>
    </Container>
  );
}
