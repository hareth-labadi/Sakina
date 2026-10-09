'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Link } from '@/i18n/navigation';
import { RelativeTime } from '@/components/ui/relative-time';
import { cn } from '@/lib/cn';
import type { RiskLevel } from '@/types/domain';

const riskStyle: Record<RiskLevel, string> = {
  high: 'border border-warm-ink bg-warm-soft text-warm-ink',
  medium: 'bg-sand-soft text-sand-ink',
  low: 'bg-blue-soft text-blue-ink'
};

/** Risk label. Text, not colour alone, carries the meaning. */
export function RiskPill({ level }: { level: RiskLevel }) {
  const t = useTranslations('panel.risk');
  return <span className={cn('inline-flex w-fit items-center rounded-full px-3 py-1 text-sm font-bold whitespace-nowrap', riskStyle[level])}>{t(level)}</span>;
}

export type QueueItemView = {
  id: string;
  risk: RiskLevel;
  kind: 'post' | 'chat' | 'comment' | 'report';
  status: 'open' | 'checking' | 'escalated' | 'resolved';
  community: string;
  author: string;
  excerpt: string;
  createdAt: string;
};

/** One item in the therapist's priority queue. The whole row is the link. */
export function QueueRow({ item, href }: { item: QueueItemView; href: string }) {
  const t = useTranslations('panel.queue');
  const urgent = item.risk === 'high' && item.status !== 'resolved';
  return (
    <li className={cn('relative flex flex-wrap items-start gap-4 rounded-tile border bg-surface px-5 py-4.5', urgent ? 'border-warm-ink' : 'border-line')}>
      <RiskPill level={item.risk} />
      <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-0.5">
        <span className="text-caption text-mute">
          {t(`kind.${item.kind}`)} · {item.community} · <RelativeTime date={item.createdAt} />
        </span>
        <b dir="auto" className="line-clamp-2">{item.excerpt}</b>
        <span className="text-caption text-mute">
          <span dir="auto">{item.author}</span> · {t(`status.${item.status}`)}
        </span>
      </div>
      <Link href={href} aria-label={t('open', { nickname: item.author })} className={cn(buttonVariants({ size: 'sm' }), 'after:absolute after:inset-0 after:rounded-tile')}>
        {t('openShort')}
      </Link>
    </li>
  );
}

export type Slot = 'mor' | 'aft' | 'eve';
export type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type Availability = Partial<Record<Day, Slot[]>>;
const DAYS: Day[] = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri']; // Algerian week starts on Saturday
const SLOTS: Slot[] = ['mor', 'aft', 'eve'];

/** Weekly availability toggles for therapists. */
export function AvailabilityGrid({ value, onChange }: { value: Availability; onChange: (v: Availability) => void }) {
  const t = useTranslations('panel.availability');
  const toggle = (d: Day, s: Slot) => {
    const cur = value[d] ?? [];
    onChange({ ...value, [d]: cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s] });
  };
  return (
    <div className="overflow-x-auto">
      <div role="group" aria-label={t('label')} className="grid min-w-120 grid-cols-[110px_repeat(3,minmax(0,1fr))] items-center gap-2">
        <span />
        {SLOTS.map((s) => (
          <span key={s} className="text-center text-caption text-mute">{t(`slot.${s}`)}</span>
        ))}
        {DAYS.map((d) => (
          <div key={d} className="contents">
            <span className="text-caption font-semibold">{t(`day.${d}`)}</span>
            {SLOTS.map((s) => {
              const on = value[d]?.includes(s) ?? false;
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={on}
                  aria-label={`${t(`day.${d}`)} · ${t(`slot.${s}`)}`}
                  onClick={() => toggle(d, s)}
                  className="min-h-11 rounded-xl border border-line bg-bg text-sm font-semibold text-mute aria-pressed:border-transparent aria-pressed:bg-green-soft aria-pressed:text-green-ink"
                >
                  {on ? t('on') : t('off')}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export type AuditEntry = { id: string; at: string; actor: string; actorType: 'system' | 'admin' | 'therapist' | 'member'; action: string; detail: string };

/** Audit log: who did what, when. `action` is already translated by the caller. */
export function AuditTable({ entries, caption }: { entries: AuditEntry[]; caption: string }) {
  const t = useTranslations('panel.audit');
  const format = useFormatter();
  return (
    <Table caption={caption} captionHidden>
      <THead>
        <TR>
          <TH>{t('time')}</TH>
          <TH>{t('actor')}</TH>
          <TH>{t('action')}</TH>
          <TH>{t('detail')}</TH>
        </TR>
      </THead>
      <TBody>
        {entries.map((e) => (
          <TR key={e.id}>
            <TD className="font-mono text-sm whitespace-nowrap text-mute">
              <time dateTime={e.at} dir="ltr">{format.dateTime(new Date(e.at), { dateStyle: 'short', timeStyle: 'short' })}</time>
            </TD>
            <TD>
              <b dir="auto">{e.actor}</b>
              <div className="text-caption text-mute">{t(`type.${e.actorType}`)}</div>
            </TD>
            <TD>{e.action}</TD>
            <TD className="text-caption text-ink-2" dir="auto">{e.detail}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
