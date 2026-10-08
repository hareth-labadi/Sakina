import { useLocale, useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/display';
import { tintBg } from '@/components/ui/tint';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import type { Community } from '@/types/domain';

export function CommunityCard({ community, storyCount }: { community: Community; storyCount?: number }) {
  const t = useTranslations('community');
  const locale = useLocale() as Locale;
  const name = community.name[locale];

  return (
    <article className={cn('flex min-h-60 flex-col gap-3 rounded-card p-6.5', tintBg[community.tint])}>
      {community.sensitivity !== 'standard' ? <Badge className="bg-surface">{t(`sensitivity.${community.sensitivity}`)}</Badge> : null}
      <h3 className="text-[1.75rem]">{name}</h3>
      <p className="text-ink-2">{community.description[locale]}</p>
      {storyCount !== undefined ? <p className="text-caption text-ink-2">{t('meta', { count: storyCount })}</p> : null}
      <div className="mt-auto pt-2">
        <Link href={`/communities/${community.id}`} aria-label={t('openNamed', { name })} className={buttonVariants({ size: 'sm' })}>
          {t('open')}
        </Link>
      </div>
    </article>
  );
}
