import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { CommunityCard } from '@/components/sakina/community-card';
import { CrisisHelp } from '@/components/sakina/crisis-help';
import { StoryCard } from '@/components/sakina/story-card';
import { buttonVariants } from '@/components/ui/button';
import { Container, Section } from '@/components/ui/container';
import { Badge, Card, Tag } from '@/components/ui/display';
import { ArrowIcon } from '@/components/ui/icons';
import { tintBg } from '@/components/ui/tint';
import { Link } from '@/i18n/navigation';
import { toLocale, type Locale } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import { communities, stories } from '@/services';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const param = toLocale((await params).locale);
  setRequestLocale(param);
  const t = await getTranslations('home');
  const locale = (await getLocale()) as Locale;
  const [allCommunities, featured] = await Promise.all([communities.list(), stories.featured()]);
  const byId = new Map(allCommunities.map((c) => [c.id, c]));

  return (
    <>
      <div className="relative isolate overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-56 left-1/2 h-[760px] w-[1040px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--glow-a),transparent)]" />
        <div className="absolute top-20 -right-44 h-[600px] w-[600px] rounded-full bg-[radial-gradient(closest-side,var(--glow-b),transparent)]" />
      </div>

      <Container className="flex flex-col items-center gap-6 pt-14 pb-12 text-center sm:pt-20">
        <Tag className="bg-glass backdrop-blur">
          <span aria-hidden className="size-2 rounded-full bg-calm" />
          {t('badge')}
        </Tag>
        <h1 className="max-w-275 text-[clamp(2.75rem,7.4vw,6rem)]">
          {t('titleA')} <span className="text-gradient">{t('titleB')}</span>
        </h1>
        <p className="max-w-190 text-lead text-ink-2">{t('sub')}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/communities" className={buttonVariants({ size: 'lg' })}>
            {t('cta')}
          </Link>
          <Link href="/communities" className={buttonVariants({ size: 'lg', variant: 'secondary' })}>
            {t('readFirst')}
            <ArrowIcon size={18} />
          </Link>
        </div>
        <p className="text-caption text-mute">{t('fine')}</p>
      </Container>
      </div>

      <Container>
        <Section aria-labelledby="h-going">
          <h2 id="h-going" className="text-[clamp(1.75rem,3.2vw,2.375rem)]">
            {t('going')}
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {allCommunities.map((c) => (
              <Link
                key={c.id}
                href={`/communities/${c.id}`}
                className={cn('inline-flex min-h-11 items-center rounded-full px-4.5 text-base font-medium hover:opacity-90', tintBg[c.tint])}
              >
                {c.name[locale]}
              </Link>
            ))}
          </div>
        </Section>

        <Section aria-labelledby="h-stories">
          <h2 id="h-stories" className="text-[clamp(1.75rem,3.2vw,2.375rem)]">
            {t('storiesTitle')}
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
            {featured.map((s) => (
              <StoryCard key={s.id} story={s} community={byId.get(s.communityId)} />
            ))}
          </div>
        </Section>

        <Section aria-labelledby="h-comms">
          <h2 id="h-comms" className="text-[clamp(1.75rem,3.2vw,2.375rem)]">
            {t('communitiesTitle')}
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
            {allCommunities.slice(0, 3).map((c) => (
              <CommunityCard key={c.id} community={c} />
            ))}
          </div>
        </Section>

        <Section aria-labelledby="h-safe">
          <h2 id="h-safe" className="text-[clamp(1.75rem,3.2vw,2.375rem)]">
            {t('safeTitle')}
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
            <Card>
              <h3 className="text-2xl">{t('safe1')}</h3>
              <p className="text-ink-2">{t('safe1b')}</p>
            </Card>
            <Card>
              <h3 className="text-2xl">{t('safe2')}</h3>
              <p className="text-ink-2">{t('safe2b')}</p>
              <Badge tone="therapist">{t('therapistExample')}</Badge>
            </Card>
            <Card className="border-transparent bg-warm-soft">
              <h3 className="text-2xl">{t('safe3')}</h3>
              <p>{t('safe3b')}</p>
              <div>
                <CrisisHelp size="md" />
              </div>
            </Card>
          </div>
        </Section>
      </Container>
    </>
  );
}
