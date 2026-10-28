'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge, Card, EmptyState, LoadingState, Tag } from '@/components/ui/display';
import { RelativeTime } from '@/components/ui/relative-time';
import { useToast } from '@/components/ui/toast';
import { CONDITIONS } from '@/data/conditions';
import { roomCopy } from '@/data/rooms';
import { Link, useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { signOut, useSessionState } from '@/lib/session';
import { moderation, type HeldMessage, type HeldReply, type HeldStory, type OpenReport } from '@/services/moderation';
import { PanelLayout } from './panel-layout';

type Tab = 'held' | 'reports';

/**
 * The moderator panel: held posts waiting for a decision, and open reports.
 * Moderators and admins only (the API refuses everyone else too). Reporters are never shown.
 */
export function ModerationPanel({ tab }: { tab: Tab }) {
  const t = useTranslations('moderation');
  const { status, user } = useSessionState();
  const router = useRouter();
  const [counts, setCounts] = useState<{ held?: number; reports?: number }>({});
  const allowed = user?.role === 'moderator' || user?.role === 'admin';
  // Stable, so the lists' "report my count" effects run once per load, not on every render.
  const onHeldCount = useCallback((n: number) => setCounts((c) => ({ ...c, held: n })), []);
  const onReportCount = useCallback((n: number) => setCounts((c) => ({ ...c, reports: n })), []);

  if (!user && status === 'loading') return <LoadingState caption={t('loading')} />;
  if (!user || !allowed) {
    return (
      <div className="px-4 py-10">
        <EmptyState
          as="h1"
          title={t('notAllowedTitle')}
          body={t('notAllowedBody')}
          action={
            <Link href="/" className={buttonVariants({ variant: 'secondary' })}>
              {t('home')}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <PanelLayout
      title={t('title')}
      nav={[
        { href: '/moderation', label: t('held'), count: counts.held },
        { href: '/moderation/reports', label: t('reports'), count: counts.reports }
      ]}
      who={{ name: user.nickname, role: t(`role.${user.role === 'admin' ? 'admin' : 'moderator'}`), avatar: user.avatar }}
      onSignOut={async () => {
        await signOut().catch(() => undefined);
        router.push('/');
      }}
    >
      {tab === 'held' ? (
        <HeldQueue onCount={onHeldCount} />
      ) : (
        <ReportList onCount={onReportCount} />
      )}
    </PanelLayout>
  );
}

function useCommunityName() {
  const locale = useLocale() as Locale;
  return (id: string) => CONDITIONS.find((c) => c.id === id)?.name[locale] ?? id;
}

function useRoomTitle() {
  const locale = useLocale() as Locale;
  return (id: string) => roomCopy(id)?.title[locale] ?? id;
}

/** Load a list once, with loading and error states. */
function useLoad<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  const reload = useCallback(() => {
    load()
      .then((d) => {
        setData(d);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [load]);
  useEffect(reload, [reload]);
  return { data, setData, failed, reload };
}

function Header({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-[clamp(1.75rem,3.2vw,2.375rem)]">{title}</h1>
      <p className="text-ink-2">{sub}</p>
    </div>
  );
}

function Reasons({ reasons }: { reasons: string[] }) {
  const t = useTranslations('moderation');
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-caption text-mute">{t('heldBecause')}</span>
      {reasons.map((r) => (
        <Tag key={r}>{isKnownReason(r) ? t(`reasons.${r}`) : r}</Tag>
      ))}
    </div>
  );
}

const REASONS = ['phone', 'email', 'handle', 'social', 'link', 'name', 'place', 'sensitive_community'] as const;
const isKnownReason = (r: string): r is (typeof REASONS)[number] => (REASONS as readonly string[]).includes(r);

type Item = { kind: 'story'; data: HeldStory } | { kind: 'reply'; data: HeldReply } | { kind: 'message'; data: HeldMessage };

/* ---------- held posts ---------- */

function HeldQueue({ onCount }: { onCount: (n: number) => void }) {
  const t = useTranslations('moderation');
  const ts = useTranslations('story.types');
  const { toast } = useToast();
  const community = useCommunityName();
  const roomTitle = useRoomTitle();
  const { data, setData, failed, reload } = useLoad(moderation.queue);
  const [removing, setRemoving] = useState<Item | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const items: Item[] = data
    ? [
        ...data.stories.map((s) => ({ kind: 'story' as const, data: s })),
        ...data.replies.map((r) => ({ kind: 'reply' as const, data: r })),
        ...data.messages.map((m) => ({ kind: 'message' as const, data: m }))
      ].sort((a, b) => a.data.createdAt.localeCompare(b.data.createdAt))
    : [];

  useEffect(() => {
    if (data) onCount(data.stories.length + data.replies.length + data.messages.length);
  }, [data, onCount]);

  const decide = async (item: Item, action: 'approve' | 'remove') => {
    setBusy(item.data.id);
    try {
      const ok = await moderation.decide(item.kind, item.data.id, action);
      toast(ok ? t(action === 'approve' ? 'approved' : 'removed') : t('already'));
      setData(
        (d) =>
          d && {
            stories: d.stories.filter((s) => s.id !== item.data.id),
            replies: d.replies.filter((r) => r.id !== item.data.id),
            messages: d.messages.filter((m) => m.id !== item.data.id)
          }
      );
    } catch {
      toast(t('failed'));
    } finally {
      setBusy(null);
      setRemoving(null);
    }
  };

  return (
    <section className="flex flex-col gap-5">
      <Header title={t('held')} sub={t('heldSub')} />
      {failed ? (
        <EmptyState title={t('failed')} action={<Button variant="secondary" onClick={reload}>{t('retry')}</Button>} />
      ) : !data ? (
        <LoadingState caption={t('loading')} />
      ) : !items.length ? (
        <EmptyState title={t('emptyHeld')} />
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <li key={item.data.id}>
              <Card className="gap-4">
                <div className="flex flex-wrap items-center gap-2 text-caption text-mute">
                  <Badge>{item.kind === 'story' ? ts(item.data.type) : t(item.kind)}</Badge>
                  {item.kind === 'story' ? (
                    <span>{community(item.data.communityId)}</span>
                  ) : item.kind === 'message' ? (
                    <span>
                      {t('inRoom')}{' '}
                      <Link href={`/discussions/${item.data.roomId}`} className="underline">
                        <bdi>{roomTitle(item.data.roomId)}</bdi>
                      </Link>
                    </span>
                  ) : (
                    <span>
                      {t('replyTo')}{' '}
                      <Link href={`/stories/${item.data.storyId}`} className="underline">
                        <bdi>{item.data.storyTitle}</bdi>
                      </Link>
                    </span>
                  )}
                  <span>·</span>
                  <bdi>{item.data.authorNickname}</bdi>
                  <span>·</span>
                  <RelativeTime date={item.data.createdAt} />
                  {item.kind === 'story' && item.data.visibility === 'members' ? <Tag>{t('membersOnly')}</Tag> : null}
                </div>
                {item.kind === 'story' ? (
                  <h2 className="text-2xl" dir="auto">
                    {item.data.title}
                  </h2>
                ) : null}
                <p dir="auto" className="whitespace-pre-line">
                  {item.kind === 'story' ? item.data.body : item.data.text}
                </p>
                <Reasons reasons={item.data.heldReasons} />
                <div className="flex flex-wrap gap-3">
                  <Button size="sm" disabled={busy === item.data.id} onClick={() => void decide(item, 'approve')}>
                    {t('approve')}
                  </Button>
                  <Button size="sm" variant="secondary" disabled={busy === item.data.id} onClick={() => setRemoving(item)}>
                    {t('remove')}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={t('removeTitle')}
        body={t('removeBody')}
        confirmLabel={t('remove')}
        cancelLabel={t('cancel')}
        closeLabel={t('close')}
        danger
        onConfirm={() => (removing ? decide(removing, 'remove') : undefined)}
      />
    </section>
  );
}

/* ---------- reports ---------- */

function ReportList({ onCount }: { onCount: (n: number) => void }) {
  const t = useTranslations('moderation');
  const tr = useTranslations('report.reasons');
  const { toast } = useToast();
  const { data, setData, failed, reload } = useLoad(moderation.reports);
  const [removing, setRemoving] = useState<OpenReport | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (data) onCount(data.length);
  }, [data, onCount]);

  const done = (id: string) => setData((d) => d && d.filter((r) => r.id !== id));

  const resolve = async (r: OpenReport) => {
    setBusy(r.id);
    try {
      await moderation.resolve(r.id);
      toast(t('resolved'));
      done(r.id);
    } catch {
      toast(t('failed'));
    } finally {
      setBusy(null);
    }
  };

  /** Remove what was reported, then close the report. */
  const removeTarget = async (r: OpenReport) => {
    if (!r.target) return;
    setBusy(r.id);
    try {
      await moderation.removeContent(r.target.type, r.target.id);
      await moderation.resolve(r.id);
      toast(t('removed'));
      done(r.id);
    } catch {
      toast(t('failed'));
    } finally {
      setBusy(null);
      setRemoving(null);
    }
  };

  const targetLink = (r: OpenReport): ReactNode => {
    if (!r.target) return <p className="text-ink-2">{t('targetGone')}</p>;
    const href =
      r.target.type === 'message' ? `/discussions/${r.target.roomId}` : `/stories/${r.target.type === 'story' ? r.target.id : r.target.storyId}`;
    return (
      <div className="flex flex-col gap-1">
        <span className="text-caption text-mute">
          {t(r.target.type)} · <bdi>{r.target.authorNickname}</bdi>
          {r.target.status !== 'published' ? ` · ${t(`status.${r.target.status === 'held' ? 'held' : 'removed'}`)}` : ''}
        </span>
        <p dir="auto" className="line-clamp-4 font-semibold">
          {r.target.type === 'story' ? r.target.title : r.target.text}
        </p>
        <Link href={href} className="w-fit underline">
          {t('open')}
        </Link>
      </div>
    );
  };

  return (
    <section className="flex flex-col gap-5">
      <Header title={t('reports')} sub={t('reportsSub')} />
      {failed ? (
        <EmptyState title={t('failed')} action={<Button variant="secondary" onClick={reload}>{t('retry')}</Button>} />
      ) : !data ? (
        <LoadingState caption={t('loading')} />
      ) : !data.length ? (
        <EmptyState title={t('emptyReports')} />
      ) : (
        <ul className="flex flex-col gap-4">
          {data.map((r) => (
            <li key={r.id}>
              <Card className="gap-4">
                <div className="flex flex-wrap items-center gap-2 text-caption text-mute">
                  <Badge tone={r.reason === 'unsafe' ? 'warm' : undefined}>{tr(r.reason)}</Badge>
                  <RelativeTime date={r.createdAt} />
                </div>
                {r.note ? (
                  <blockquote dir="auto" className="border-s-4 border-line ps-4 text-ink-2">
                    {r.note}
                  </blockquote>
                ) : null}
                {targetLink(r)}
                <div className="flex flex-wrap gap-3">
                  {r.target && r.target.status !== 'removed' ? (
                    <Button size="sm" variant="secondary" disabled={busy === r.id} onClick={() => setRemoving(r)}>
                      {t('removeContent')}
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" disabled={busy === r.id} onClick={() => void resolve(r)}>
                    {t('resolve')}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={t('removeTitle')}
        body={t('removeBody')}
        confirmLabel={t('remove')}
        cancelLabel={t('cancel')}
        closeLabel={t('close')}
        danger
        onConfirm={() => (removing ? removeTarget(removing) : undefined)}
      />
    </section>
  );
}
