import type { StorySummary } from '@/types/domain';

/**
 * Example story cards for the style guide (/design) only. The site's stories come from the API;
 * the same sample stories are in the database through backend/drizzle/0003_sample_content.sql.
 */
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
  },
  {
    id: 's4', communityId: 'depression', authorNickname: 'amal_dawn', authorAvatar: 2, type: 'checkin', visibility: 'public', veil: null, mood: 'low',
    title: 'Got out of bed, opened the curtains',
    excerpt: "That's it, that's the check-in. Some days the list is short and that has to be enough.",
    reactionTotal: 21, createdAt: '2026-10-08T09:30:00Z'
  },
  {
    id: 's5', communityId: 'anxiety', authorNickname: 'blue_hour', authorAvatar: 5, type: 'win', visibility: 'public', veil: null,
    title: "J'ai passé l'appel que je repoussais depuis un mois",
    excerpt: "Trois minutes au téléphone. J'avais écrit ce que je voulais dire sur un papier, et ça a suffi.",
    reactionTotal: 18, createdAt: '2026-10-06T11:00:00Z'
  },
  {
    id: 's6', communityId: 'anxiety', authorNickname: 'soft_morning', authorAvatar: 4, type: 'checkin', visibility: 'members', veil: null, mood: 'okay',
    title: 'Slept better this week',
    excerpt: 'Phone out of the bedroom at ten. Still waking at four sometimes, but falling back asleep now.',
    reactionTotal: 9, createdAt: '2026-10-05T07:15:00Z'
  }
];
