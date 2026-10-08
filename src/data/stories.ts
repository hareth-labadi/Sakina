import type { StorySummary } from '@/types/domain';

/** Mock stories for the front end. Member content is stored as written (one language), not translated. */
export const SAMPLE_STORIES: StorySummary[] = [
  {
    id: 's1', communityId: 'anxiety', authorNickname: 'quiet_river', authorAvatar: 0, type: 'story', visibility: 'public', veil: null,
    title: 'I thought I was the only one feeling this way',
    excerpt: 'For two years, Tuesday mornings started with my heart racing before I even opened my eyes. I told no one.',
    reactionTotal: 47, createdAt: '2026-10-08T18:00:00Z'
  },
  {
    id: 's2', communityId: 'panic', authorNickname: 'sea_glass', authorAvatar: 1, type: 'win', visibility: 'public', veil: null,
    title: 'بقيت في طابور المتجر',
    excerpt: 'انتصار صغير، لكنه حقيقي. بدأت الموجة عند الصندوق. في الشهر الماضي كنت سأترك سلتي وأهرب.',
    reactionTotal: 37, createdAt: '2026-10-08T15:00:00Z'
  },
  {
    id: 's3', communityId: 'grief', authorNickname: 'salt_wind', authorAvatar: 3, type: 'story', visibility: 'members', veil: ['loss'],
    title: 'Le premier Aïd sans ma mère',
    excerpt: "Tout le monde répétait qu'elle aurait voulu me voir sourire.",
    reactionTotal: 65, createdAt: '2026-10-07T20:00:00Z'
  }
];
