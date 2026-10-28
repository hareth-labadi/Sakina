import { useLocale, useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';
import { Avatar, Badge, LiveDot } from '@/components/ui/display';
import { tintBg } from '@/components/ui/tint';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import type { RoomWithCopy } from '@/services/rooms';
import type { Community } from '@/types/domain';

/** "Thursday", in the page language. `day` is 0 (Sunday) to 6. */
export function weekday(locale: Locale, day: number) {
  // 7 January 2024 was a Sunday.
  return new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 7 + day)));
}

/** One room in the discussions list (and on the home page). */
export function RoomCard({ room, community, headingLevel: H = 'h3' }: { room: RoomWithCopy; community?: Community; headingLevel?: 'h2' | 'h3' }) {
  const t = useTranslations('discussions');
  const tk = useTranslations('therapistKind');
  const tr = useTranslations('chat.room');
  const locale = useLocale() as Locale;
  const title = room.title[locale];

  return (
    <article className="lift flex flex-col gap-3 rounded-card border border-line bg-surface p-6.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={room.kind === 'guided' ? 'therapist' : 'neutral'}>{tr(`kind.${room.kind}`)}</Badge>
        {room.live ? (
          <Badge tone="live">
            <LiveDot />
            {tr('live')}
          </Badge>
        ) : null}
        {community ? <span className={cn('rounded-full px-3 py-1 text-sm font-semibold', tintBg[community.tint])}>{community.name[locale]}</span> : null}
      </div>
      <H className="text-2xl">{title}</H>
      <p className="text-ink-2">{room.about[locale]}</p>
      {room.host ? (
        <div className="flex items-center gap-3">
          <Avatar index={room.host.avatar} size="sm" />
          <div className="flex flex-col leading-tight">
            <b>{t('host', { name: room.host.nickname, kind: tk(room.host.kind) })}</b>
            {room.schedule ? <span className="text-caption text-mute">{t('weekly', { day: weekday(locale, room.schedule.day), time: room.schedule.time })}</span> : null}
          </div>
        </div>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
        <span className="text-caption text-ink-2">{room.live ? t('here', { count: room.present }) : t('closedShort')}</span>
        <Link href={`/discussions/${room.id}`} aria-label={t('enterNamed', { title })} className={buttonVariants({ size: 'sm', variant: room.live ? 'primary' : 'secondary' })}>
          {room.live ? t('enter') : t('look')}
        </Link>
      </div>
    </article>
  );
}
