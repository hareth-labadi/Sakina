'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { StoryCard } from '@/components/sakina/story-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/display';
import { useToast } from '@/components/ui/toast';
import { Link } from '@/i18n/navigation';
import { refreshSession, useSessionState } from '@/lib/session';
import { savedStories } from '@/services';
import type { StorySummary } from '@/types/domain';

/** The member's saved stories, most recently saved first. Private to them. */
export function SavedList() {
  const t = useTranslations('saved');
  const { status, user } = useSessionState();
  const { toast } = useToast();
  const [items, setItems] = useState<StorySummary[] | null>(null);
  const nickname = user?.nickname;

  useEffect(() => {
    if (!nickname) return;
    let live = true;
    savedStories
      .list()
      .then((list) => live && setItems(list))
      .catch(() => {
        if (!live) return;
        // Most likely the session ended: let it catch up (shows the signed-out view).
        setItems([]);
        void refreshSession();
      });
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
  if (!items.length) {
    return (
      <EmptyState
        as="h2"
        title={t('emptyTitle')}
        body={t('emptyBody')}
        action={
          <Link href="/communities" className={buttonVariants({ variant: 'secondary' })}>
            {t('browse')}
          </Link>
        }
      />
    );
  }

  const remove = async (story: StorySummary) => {
    // Take it off the list at once; put it back if the API refuses.
    setItems((list) => list && list.filter((s) => s.id !== story.id));
    const res = await savedStories.setSaved(story.id, false).catch(() => ({ ok: false }));
    if (res.ok) return toast(t('removed'));
    setItems((list) => (list ? [story, ...list.filter((s) => s.id !== story.id)] : list));
    toast(t('failed'));
  };

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
      {items.map((s) => (
        <li key={s.id} className="flex flex-col gap-2">
          <StoryCard story={s} signedIn />
          <Button variant="ghost" size="sm" className="self-start" onClick={() => void remove(s)} aria-label={t('removeNamed', { title: s.title })}>
            {t('remove')}
          </Button>
        </li>
      ))}
    </ul>
  );
}
