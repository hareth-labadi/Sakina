import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { StoryReader } from '@/components/sakina/story/story-reader';
import { Container } from '@/components/ui/container';
import { Avatar, Badge } from '@/components/ui/display';
import { BackIcon } from '@/components/ui/icons';
import { RelativeTime } from '@/components/ui/relative-time';
import { Link } from '@/i18n/navigation';
import { toLocale } from '@/i18n/routing';
import { communities, storyPages } from '@/services';

type Props = { params: Promise<{ locale: string; id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return storyPages.ids().map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const story = await storyPages.get((await params).id);
  return story ? { title: story.title } : {};
}

const typeTone = { story: 'story', checkin: 'checkin', win: 'win' } as const;

export default async function StoryPage({ params }: Props) {
  const { locale: raw, id } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const story = await storyPages.get(id);
  if (!story) notFound();
  const [t, ts, tm, community] = await Promise.all([
    getTranslations('story.page'),
    getTranslations('story'),
    getTranslations('composer.mood'),
    communities.get(story.communityId)
  ]);
  const communityHref = community ? `/communities/${community.id}` : '/communities';

  return (
    <Container className="flex max-w-220 flex-col gap-8 py-10">
      <Link href={communityHref} className="inline-flex min-h-11 w-fit items-center gap-2 font-semibold text-ink-2 hover:text-ink">
        <BackIcon size={18} />
        {community ? t('back', { community: community.name[locale] }) : t('backAll')}
      </Link>

      <article className="flex flex-col gap-8">
        <header className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Avatar index={story.authorAvatar} />
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <b className="self-start text-[1.0625rem]" dir="auto">{story.authorNickname}</b>
              <span className="text-caption text-mute">
                {community ? `${community.name[locale]} · ` : ''}
                <RelativeTime date={story.createdAt} />
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={typeTone[story.type]}>{ts(`types.${story.type}`)}</Badge>
            {story.mood ? <Badge>{t('mood', { mood: tm(story.mood) })}</Badge> : null}
            {story.visibility === 'members' ? <Badge>{ts('membersOnly')}</Badge> : null}
          </div>
          <h1 className="text-[clamp(2rem,4.4vw,3.25rem)] leading-tight" dir="auto">
            {story.title}
          </h1>
        </header>

        <StoryReader story={story} communityHref={communityHref} />
      </article>
    </Container>
  );
}
