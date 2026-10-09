import { useLocale, useTranslations } from 'next-intl';
import { Avatar, Badge } from '@/components/ui/display';
import { ArrowIcon, EyeOffIcon, LockIcon } from '@/components/ui/icons';
import { RelativeTime } from '@/components/ui/relative-time';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { Community, StorySummary } from '@/types/domain';

const typeTone = { story: 'story', checkin: 'checkin', win: 'win' } as const;

/**
 * Story preview. Member text keeps its own direction (`dir="auto"`): an Arabic story
 * reads right-to-left even inside the French or English interface.
 */
export function StoryCard({ story, community, signedIn = false, headingLevel: H = 'h3' }: { story: StorySummary; community?: Community; signedIn?: boolean; headingLevel?: 'h2' | 'h3' }) {
  const t = useTranslations('story');
  const locale = useLocale() as Locale;
  const locked = !signedIn && story.visibility === 'members';
  const veiled = Boolean(story.veil?.length);

  return (
    <article className="relative flex flex-col gap-3 rounded-card border border-line bg-surface p-6 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex items-center gap-3">
        <Avatar index={story.authorAvatar} size="sm" />
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <b className="text-[1.0625rem]" dir="auto">{story.authorNickname}</b>
          <span className="text-caption text-mute">
            {community ? `${community.name[locale]} · ` : ''}
            <RelativeTime date={story.createdAt} />
          </span>
        </div>
        <Badge tone={typeTone[story.type]}>{t(`types.${story.type}`)}</Badge>
      </div>

      {veiled ? (
        <span className="inline-flex w-fit items-center gap-2 rounded-[14px] bg-lav-soft px-3.5 py-2 text-caption font-semibold text-lav-ink">
          <EyeOffIcon size={16} />
          {t('veilNote', { topics: story.veil!.map((v) => t(`topics.${v}`)).join(', ') })}
        </span>
      ) : null}

      <H className="text-2xl leading-tight" dir="auto">{story.title}</H>
      {!veiled ? (
        <p className="line-clamp-3 text-ink-2" dir="auto">
          {story.excerpt}
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
        <span className="text-caption text-mute">{t('reactions', { count: story.reactionTotal })}</span>
        {locked ? (
          <Badge>
            <LockIcon size={14} />
            {t('membersOnly')}
          </Badge>
        ) : null}
        {/* The link covers the whole card; its label names the story for screen readers. */}
        <Link
          href={`/stories/${story.id}`}
          aria-label={t('readStoryNamed', { title: story.title })}
          className="inline-flex min-h-11 items-center gap-1.5 font-semibold underline decoration-line underline-offset-5 after:absolute after:inset-0 after:rounded-card hover:decoration-ink"
        >
          {t('read')}
          <ArrowIcon size={18} />
        </Link>
      </div>
    </article>
  );
}
