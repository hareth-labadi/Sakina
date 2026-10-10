'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { StoryCard } from '@/components/sakina/story-card';
import { EmptyState } from '@/components/ui/display';
import { LoadMore } from '@/components/ui/load-more';
import { Segmented } from '@/components/ui/segmented';
import { useToast } from '@/components/ui/toast';
import { useSession } from '@/lib/session';
import { stories as storiesApi } from '@/services';
import type { PostType, StorySummary } from '@/types/domain';

type Filter = 'all' | PostType;
const FILTERS: Filter[] = ['all', 'story', 'checkin', 'win'];
type Feed = { stories: StorySummary[]; next: string | null };

/**
 * Posts in one community, newest first, filterable by type, 20 at a time. Rendered as a guest on
 * the server; once a member is signed in the first page is fetched again (members-only previews,
 * their own posts waiting for review).
 */
export function CommunityFeed({ communityId, initial }: { communityId: string; initial: Feed }) {
  const t = useTranslations('community.page');
  const ts = useTranslations('story.types');
  const user = useSession();
  const nickname = user?.nickname;
  const { toast } = useToast();
  const [feed, setFeed] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!nickname) return;
    let live = true;
    storiesApi
      .byCommunity(communityId)
      .then((f) => live && setFeed(f))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [nickname, communityId]);

  const loadMore = async () => {
    if (!feed.next) return;
    setLoading(true);
    try {
      const more = await storiesApi.byCommunity(communityId, feed.next);
      setFeed((f) => ({ stories: [...f.stories, ...more.stories.filter((s) => !f.stories.some((x) => x.id === s.id))], next: more.next }));
    } catch {
      toast(t('failed'));
    } finally {
      setLoading(false);
    }
  };

  const shown = filter === 'all' ? feed.stories : feed.stories.filter((s) => s.type === filter);
  if (!feed.stories.length) return <EmptyState title={t('emptyTitle')} body={t('emptyBody')} />;

  return (
    <div className="flex flex-col gap-5">
      <Segmented
        label={t('filterLabel')}
        value={filter}
        onValueChange={setFilter}
        options={FILTERS.map((f) => ({ value: f, label: f === 'all' ? t('all') : ts(f) }))}
        className="self-start"
      />
      {shown.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
          {shown.map((s) => (
            <StoryCard key={s.id} story={s} signedIn={Boolean(user)} />
          ))}
        </div>
      ) : (
        <EmptyState title={t('emptyFiltered')} />
      )}
      {feed.next || feed.stories.length > 20 ? (
        <LoadMore onClick={() => void loadMore()} loading={loading} done={!feed.next} label={t('loadMore')} loadingLabel={t('loadingMore')} doneLabel={t('allLoaded')} />
      ) : null}
    </div>
  );
}
