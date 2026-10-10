import { useLocale, useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/display';
import { tintBg } from '@/components/ui/tint';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import type { Community } from '@/types/domain';

/** `headingLevel` keeps the page outline valid: h3 under a section heading (default), h2 directly under the page h1. */
export function CommunityCard({
  community,
  storyCount,
  memberCount,
  headingLevel: H = 'h3'
}: {
  community: Community;
  /** Live numbers from the API; nothing is shown when they're unknown. */
  storyCount?: number;
  memberCount?: number;
  headingLevel?: 'h2' | 'h3';
}) {
  const t = useTranslations('community');
  const locale = useLocale() as Locale;
  const name = community.name[locale];

  return (
    <article className={cn('flex min-h-60 flex-col gap-3 rounded-card p-6.5', tintBg[community.tint])}>
      {community.sensitivity !== 'standard' ? <Badge className="bg-surface">{t(`sensitivity.${community.sensitivity}`)}</Badge> : null}
      <H className="text-[1.75rem]">{name}</H>
      <p className="text-ink-2">{community.description[locale]}</p>
      <CommunityMeta storyCount={storyCount} memberCount={memberCount} />
      <div className="mt-auto pt-2">
        <Link href={`/communities/${community.id}`} aria-label={t('openNamed', { name })} className={buttonVariants({ size: 'sm' })}>
          {t('open')}
        </Link>
      </div>
    </article>
  );
}

/** "4 members · 3 stories", from live numbers. Parts that aren't known are left out (no placeholder numbers). */
export function CommunityMeta({ storyCount, memberCount }: { storyCount?: number; memberCount?: number }) {
  const t = useTranslations('community');
  const parts = [memberCount !== undefined && t('members', { count: memberCount }), storyCount !== undefined && t('meta', { count: storyCount })].filter(Boolean);
  return parts.length ? <p className="text-caption text-ink-2">{parts.join(' · ')}</p> : null;
}
