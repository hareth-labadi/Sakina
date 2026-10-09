import type { Reaction, Reply } from '@/types/domain';

/**
 * Mock full text, reaction split and replies for the sample stories (keyed by story id).
 * Member content is stored as written, in one language. Stories without an entry here
 * fall back to their excerpt with no replies.
 */
export const STORY_DETAILS: Record<string, { body: string; reactions: Record<Reaction, number>; replies: Reply[] }> = {
  s1: {
    body: `For two years, Tuesday mornings started with my heart racing before I even opened my eyes. I told no one. I thought if I said it out loud it would become real, or people would think I was being dramatic.

What changed wasn't one big thing. I started writing down what I was worried about the night before, so it was on paper instead of in my head. Some weeks that helped, some weeks it didn't.

Reading other people's stories here was the first time I realised the racing, the tight chest, the "something bad is about to happen" feeling had a name, and that other people woke up with it too. I'm not fixed. But I'm not alone with it any more, and that matters more than I expected.`,
    reactions: { relate: 24, strength: 11, helped: 7, thanks: 5 },
    replies: [
      {
        id: 'r1', authorNickname: 'sea_glass', authorAvatar: 1, text: 'Tuesday mornings. Same. Thank you for writing this.', createdAt: '2026-10-08T19:10:00Z', relateCount: 3,
        replies: [{ id: 'r2', authorNickname: 'blue_hour', authorAvatar: 5, text: 'The writing-it-down thing works for me too, on the good weeks.', createdAt: '2026-10-08T20:00:00Z', relateCount: 1 }]
      },
      {
        id: 'r3', authorNickname: 'Huda', authorAvatar: 4, therapist: 'psychologist',
        text: 'Naming the feeling is a real skill, and you built it. This is a support note, not clinical advice.', createdAt: '2026-10-08T21:30:00Z', relateCount: 6
      }
    ]
  },
  s2: {
    body: `انتصار صغير، لكنه حقيقي. بدأت الموجة عند الصندوق. في الشهر الماضي كنت سأترك سلتي وأهرب.

هذه المرة تنفست ببطء، وعددت الأشياء الزرقاء حولي، وبقيت في مكاني. يداي كانتا ترتجفان وأنا أدفع، لكنني دفعت وخرجت ومعي أغراضي.

أكتب هذا لأتذكره في المرة القادمة.`,
    reactions: { relate: 15, strength: 12, helped: 6, thanks: 4 },
    replies: [
      { id: 'r4', authorNickname: 'quiet_river', authorAvatar: 0, text: 'هذا ليس صغيرًا أبدًا. مبروك.', createdAt: '2026-10-08T16:20:00Z', relateCount: 4 }
    ]
  },
  s3: {
    body: `Tout le monde répétait qu'elle aurait voulu me voir sourire. J'ai mis son assiette sur la table sans réfléchir, et personne n'a rien dit.

J'ai passé la journée entre les visites et la cuisine, en souriant comme on me l'avait demandé. Le soir, j'ai pleuré dans la voiture pendant une heure.

Je ne sais pas si ça devient plus facile. J'avais juste besoin de l'écrire quelque part où on comprend.`,
    reactions: { relate: 30, strength: 22, helped: 5, thanks: 8 },
    replies: [
      { id: 'r5', authorNickname: 'sea_glass', authorAvatar: 1, text: "La voiture, c'est aussi là que je pleure. Je pense à vous.", createdAt: '2026-10-07T22:00:00Z', relateCount: 7 }
    ]
  }
};
