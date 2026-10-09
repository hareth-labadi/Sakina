'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/display';
import { RelativeTime } from '@/components/ui/relative-time';
import { useToast } from '@/components/ui/toast';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { updateSession, useSessionState } from '@/lib/session';
import { notifications as service } from '@/services/notifications';
import type { AppNotification } from '@/types/domain';

/** Member-written text (nicknames, titles) keeps its own direction inside the sentence. */
const tags = {
  who: (c: ReactNode) => <bdi className="font-semibold">{c}</bdi>,
  story: (c: ReactNode) => <bdi className="font-semibold">{c}</bdi>
};

/** The member's notifications. Opening one marks it read; the header bell follows the unread count. */
export function NotificationList() {
  const t = useTranslations('notifications');
  const { status, user } = useSessionState();
  const { toast } = useToast();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const nickname = user?.nickname;

  useEffect(() => {
    let live = true;
    if (nickname) {
      service.list(nickname).then((list) => {
        if (!live) return;
        setItems(list);
        updateSession({ unreadNotifications: list.filter((n) => !n.read).length });
      });
    }
    return () => {
      live = false;
    };
  }, [nickname]);

  if (!user && status === 'loading') return <LoadingState caption={t('loading')} />;
  if (!user) {
    return (
      <EmptyState
        as="h2"
        title={t('guestTitle')}
        body={t('guestBody')}
        action={
          <Link href="/signin" className={buttonVariants()}>
            {t('signIn')}
          </Link>
        }
      />
    );
  }
  if (!items) return <LoadingState caption={t('loading')} />;
  if (!items.length) return <EmptyState as="h2" title={t('emptyTitle')} body={t('emptyBody')} />;

  const unread = items.filter((n) => !n.read).length;
  const markRead = async (id?: string) => {
    setItems((list) => list && list.map((n) => (!id || n.id === id ? { ...n, read: true } : n)));
    updateSession({ unreadNotifications: await service.markRead(user.nickname, id) });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-2" aria-live="polite">
          {t('unreadCount', { count: unread })}
        </p>
        {unread ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              await markRead();
              toast(t('allRead'));
            }}
          >
            {t('markAll')}
          </Button>
        ) : null}
      </div>
      <ol className="flex flex-col overflow-hidden rounded-card border border-line bg-surface">
        {items.map((n) => (
          <li key={n.id} className={cn('relative border-b border-line last:border-b-0', !n.read && 'bg-lav-soft/40')}>
            <Link
              href={`/stories/${n.storyId}`}
              onClick={() => !n.read && markRead(n.id)}
              className="flex min-h-16 items-start gap-3.5 px-5 py-4 hover:bg-surface-2"
            >
              <span aria-hidden className={cn('mt-2 size-2.5 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-lav-ink')} />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span>
                  {!n.read ? <span className="sr-only">{t('unread')}: </span> : null}
                  {t.rich(`kinds.${n.kind}`, { ...tags, actor: n.actor ?? '', title: n.storyTitle, count: n.count ?? 0 })}
                </span>
                <RelativeTime date={n.createdAt} className="text-caption text-mute" />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
