import type { CSSProperties } from 'react';
import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { CommunityCard } from '@/components/sakina/community-card';
import { CrisisHelp } from '@/components/sakina/crisis-help';
import { RoomCard } from '@/components/sakina/discussions/room-card';
import { StoryCard } from '@/components/sakina/story-card';
import { buttonVariants } from '@/components/ui/button';
import { Container, Section } from '@/components/ui/container';
import { Badge, Card, Tag } from '@/components/ui/display';
import { ArrowIcon } from '@/components/ui/icons';
import { tintBg, type Tint } from '@/components/ui/tint';
import { ROOMS } from '@/data/rooms';
import { Link } from '@/i18n/navigation';
import { toLocale, type Locale } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import { communities, stories } from '@/services';

// Shows the newest stories: rendered on each request, never at build time.
export const dynamic = 'force-dynamic';

const h2 = 'text-[clamp(2rem,3.6vw,2.75rem)]';
const inkFor = { blue: 'text-blue-ink', green: 'text-green-ink', lav: 'text-lav-ink' } as const;
const STEPS = [
  { key: 's1', tint: 'blue' },
  { key: 's2', tint: 'green' },
  { key: 's3', tint: 'lav' }
] as const satisfies readonly { key: string; tint: Tint }[];
const FAQ = [
  ['q1', 'a1'],
  ['q2', 'a2'],
  ['q3', 'a3'],
  ['q4', 'a4'],
  ['q5', 'a5'],
  ['q6', 'a6']
] as const;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const param = toLocale((await params).locale);
  setRequestLocale(param);
  const t = await getTranslations('home');
  const locale = (await getLocale()) as Locale;
  // If the API is briefly unreachable, the home page still shows (without the latest stories).
  const [allCommunities, featured] = await Promise.all([communities.list(), stories.featured().catch(() => [])]);
  const byId = new Map(allCommunities.map((c) => [c.id, c]));
  const liveRooms = ROOMS.filter((r) => r.live).slice(0, 3);

  return (
    <>
      <div className="relative isolate overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-56 left-1/2 h-[760px] w-[1040px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--glow-a),transparent)] motion-safe:animate-[float_18s_ease-in-out_infinite]" />
        <div className="absolute top-20 -right-44 h-[600px] w-[600px] rounded-full bg-[radial-gradient(closest-side,var(--glow-b),transparent)] motion-safe:animate-[float-b_22s_ease-in-out_infinite]" />
      </div>

      <Container className="flex flex-col items-center gap-7 pt-16 pb-16 text-center sm:pt-28 sm:pb-24">
        <Tag className="rise bg-glass backdrop-blur">
          <span aria-hidden className="size-2 rounded-full bg-calm" />
          {t('badge')}
        </Tag>
        <h1 className="rise max-w-275 text-[clamp(2.75rem,7.4vw,6rem)]" style={{ '--d': '90ms' } as CSSProperties}>
          {t('titleA')} <span className="text-gradient">{t('titleB')}</span>
        </h1>
        <p className="rise max-w-190 text-lead text-ink-2" style={{ '--d': '180ms' } as CSSProperties}>
          {t('sub')}
        </p>
        <div className="rise flex flex-wrap justify-center gap-3" style={{ '--d': '270ms' } as CSSProperties}>
          <Link href="/communities" className={cn(buttonVariants({ size: 'lg' }), 'group')}>
            {t('cta')}
            <ArrowIcon size={18} className="transition-[translate] group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
          </Link>
          <Link href="/communities" className={buttonVariants({ size: 'lg', variant: 'secondary' })}>
            {t('readFirst')}
            <ArrowIcon size={18} />
          </Link>
        </div>
        <p className="rise text-caption text-mute" style={{ '--d': '360ms' } as CSSProperties}>
          {t('fine')}
        </p>
      </Container>
      </div>

      <Container>
        <Section className="reveal py-14 sm:py-20" aria-labelledby="h-going">
          <h2 id="h-going" className={h2}>
            {t('going')}
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {allCommunities.map((c) => (
              <Link
                key={c.id}
                href={`/communities/${c.id}`}
                className={cn('lift inline-flex min-h-12 items-center rounded-full px-5 text-[1.0625rem] font-medium', tintBg[c.tint])}
              >
                {c.name[locale]}
              </Link>
            ))}
          </div>
        </Section>

        <Section className="reveal py-14 sm:py-20" aria-labelledby="h-how">
          <h2 id="h-how" className={h2}>
            {t('how.title')}
          </h2>
          <ol className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
            {STEPS.map(({ key, tint }, i) => (
              <li key={key} className={cn('lift flex flex-col gap-3 rounded-card p-7', tintBg[tint])}>
                <span aria-hidden className={cn('grid size-14 place-items-center rounded-full bg-surface font-display text-3xl leading-none', inkFor[tint])}>
                  {i + 1}
                </span>
                <h3 className="text-2xl">{t(`how.${key}`)}</h3>
                <p className="text-ink-2">{t(`how.${key}b`)}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section className="reveal py-14 sm:py-20" aria-labelledby="h-stories">
          <h2 id="h-stories" className={h2}>
            {t('storiesTitle')}
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
            {featured.map((s) => (
              <StoryCard key={s.id} story={s} community={byId.get(s.communityId)} />
            ))}
          </div>
        </Section>

        <Section className="reveal py-14 sm:py-20" aria-labelledby="h-rooms">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h2 id="h-rooms" className={h2}>
                {t('rooms.title')}
              </h2>
              <p className="max-w-190 text-ink-2">{t('rooms.sub')}</p>
            </div>
            <Link href="/discussions" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
              {t('rooms.all')}
              <ArrowIcon size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
            {liveRooms.map((r) => (
              <RoomCard key={r.id} room={r} community={byId.get(r.communityId)} />
            ))}
          </div>
        </Section>

        <Section className="reveal py-14 sm:py-20" aria-labelledby="h-comms">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="h-comms" className={h2}>
              {t('communitiesTitle')}
            </h2>
            <Link href="/communities" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
              {t('allCommunities')}
              <ArrowIcon size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
            {allCommunities.slice(0, 3).map((c) => (
              <CommunityCard key={c.id} community={c} />
            ))}
          </div>
        </Section>

        <Section className="reveal py-14 sm:py-20" aria-labelledby="h-safe">
          <h2 id="h-safe" className={h2}>
            {t('safeTitle')}
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
            <Card className="lift">
              <h3 className="text-2xl">{t('safe1')}</h3>
              <p className="text-ink-2">{t('safe1b')}</p>
            </Card>
            <Card className="lift">
              <h3 className="text-2xl">{t('safe2')}</h3>
              <p className="text-ink-2">{t('safe2b')}</p>
              <Badge tone="therapist">{t('therapistExample')}</Badge>
            </Card>
            <Card className="lift border-transparent bg-warm-soft">
              <h3 className="text-2xl">{t('safe3')}</h3>
              <p>{t('safe3b')}</p>
              <div>
                <CrisisHelp size="md" />
              </div>
            </Card>
          </div>
        </Section>

        <Section className="reveal py-14 sm:py-20" aria-labelledby="h-faq" id="faq">
          <h2 id="h-faq" className={h2}>
            {t('faq.title')}
          </h2>
          <div className="flex max-w-220 flex-col gap-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-tile border border-line bg-surface transition-colors open:border-transparent open:bg-surface-2">
                <summary className="flex min-h-15 cursor-pointer list-none items-center justify-between gap-4 rounded-tile px-6 py-3 text-lg font-semibold transition-colors hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
                  {t(`faq.${q}`)}
                  <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-bg text-2xl leading-none text-ink-2 transition-transform duration-300 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="px-6 pb-6 text-ink-2">{t(`faq.${a}`)}</p>
              </details>
            ))}
          </div>
        </Section>

        <Section className="reveal py-14 sm:py-20" aria-labelledby="h-final">
          <div className="relative isolate flex flex-col items-center gap-5 overflow-hidden rounded-hero border border-line bg-surface px-6 py-14 text-center sm:py-20">
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(closest-side,var(--glow-a),transparent)] opacity-70 motion-safe:animate-[breathe_10s_ease-in-out_infinite]" />
            <h2 id="h-final" className="max-w-200 text-[clamp(2rem,4.4vw,3.25rem)]">
              {t('final.title')}
            </h2>
            <p className="max-w-170 text-lead text-ink-2">{t('final.body')}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/signup" className={buttonVariants({ size: 'lg' })}>
                {t('final.join')}
              </Link>
              <Link href="/about" className={buttonVariants({ size: 'lg', variant: 'secondary' })}>
                {t('final.about')}
              </Link>
            </div>
          </div>
        </Section>
      </Container>
    </>
  );
}
