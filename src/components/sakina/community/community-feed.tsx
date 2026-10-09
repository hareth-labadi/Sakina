'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { StoryCard } from '@/components/sakina/story-card';
import { EmptyState } from '@/components/ui/display';
import { Segmented } from '@/components/ui/segmented';
import { useSession } from '@/lib/session';
import type { PostType, StorySummary } from '@/types/domain';

type Filter = 'all' | PostType;
const FILTERS: Filter[] = ['all', 'story', 'checkin', 'win'];

/** Posts in one community, filterable by type. Cards show "members only" locks to guests. */
export function CommunityFeed({ stories }: { stories: StorySummary[] }) {
  const t = useTranslations('community.page');
  const ts = useTranslations('story.types');
  const user = useSession();
  const [filter, setFilter] = useState<Filter>('all');
  const shown = filter === 'all' ? stories : stories.filter((s) => s.type === filter);

  if (!stories.length) return <EmptyState title={t('emptyTitle')} body={t('emptyBody')} />;

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
    </div>
  );
}
