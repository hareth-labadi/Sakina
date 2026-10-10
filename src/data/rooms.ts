import type { Localized, TherapistKind } from '@/types/domain';

/**
 * Discussion rooms (live group chat).
 * This is mock data: there is no rooms API yet. The screens use it as-is, and messages
 * sent in a room stay in the browser tab. Replace with API calls when the backend has rooms.
 *
 * NOTE: Arabic and French text was written by AI and needs a native-speaker review.
 */

export type RoomHost = { name: string; avatar: number; kind: TherapistKind };

/** A message as stored. Members write in their own language: `text` is never translated. */
export type RoomMessage = { id: string; author: string; avatar: number; text: string; time: string; therapist?: TherapistKind };

export type Room = {
  id: string;
  kind: 'guided' | 'peer';
  communityId: string;
  title: Localized;
  about: Localized;
  /** Guided rooms meet weekly with a therapist; peer rooms are always open. */
  host?: RoomHost;
  /** 0 = Sunday … 6 = Saturday, local time "HH:MM". Only for guided rooms. */
  schedule?: { day: number; time: string };
  live: boolean;
  present: number;
  messages: RoomMessage[];
};

const huda: RoomHost = { name: 'Huda', avatar: 4, kind: 'psychologist' };
const karim: RoomHost = { name: 'Dr. Karim', avatar: 7, kind: 'psychiatrist' };
const sara: RoomHost = { name: 'Sara', avatar: 5, kind: 'psychologist' };

export const ROOMS: Room[] = [
  {
    id: 'grounding',
    kind: 'guided',
    communityId: 'anxiety',
    title: { en: 'Grounding when your mind races', ar: 'التأريض حين يتسارع عقلك', fr: "S'ancrer quand l'esprit s'emballe" },
    about: {
      en: 'A calm half hour of breathing and sharing, guided by a psychologist. Listening without writing is welcome.',
      ar: 'نصف ساعة هادئة من التنفس والمشاركة، بإرشاد أخصائية نفسية. الاستماع دون كتابة مرحّب به.',
      fr: "Une demi-heure calme de respiration et de partage, guidée par une psychologue. Écouter sans écrire, c'est bienvenu."
    },
    host: huda,
    schedule: { day: 4, time: '20:00' },
    live: true,
    present: 14,
    messages: [
      { id: 'g1', author: 'Huda', avatar: 4, therapist: 'psychologist', text: "Welcome, everyone. We'll start with one slow breath together. In for four, out for six.", time: '20:01' },
      { id: 'g2', author: 'quiet_river', avatar: 0, text: 'أسجّل حضوري. يوم طويل، لكنني هنا.', time: '20:03' },
      { id: 'g3', author: 'sea_glass', avatar: 3, text: "First time here. I'll mostly listen if that's okay.", time: '20:04' },
      { id: 'g4', author: 'Huda', avatar: 4, therapist: 'psychologist', text: "That's more than okay, sea_glass. Listening is taking part.", time: '20:05' },
      { id: 'g5', author: 'nour_42', avatar: 6, text: "J'ai remarqué que ma respiration se bloque dès que je pense au travail.", time: '20:07' }
    ]
  },
  {
    id: 'night-owls',
    kind: 'peer',
    communityId: 'loneliness',
    title: { en: 'Night owls', ar: 'ساهرو الليل', fr: 'Oiseaux de nuit' },
    about: {
      en: "For when it's late and everyone else is asleep. Say hello, share how the day went, or just sit with others.",
      ar: 'حين يتأخر الوقت والجميع نائم. ألقِ التحية، شارك كيف مرّ يومك، أو اجلس مع الآخرين فقط.',
      fr: "Pour quand il est tard et que tout le monde dort. Dites bonjour, racontez votre journée, ou restez simplement avec d'autres."
    },
    live: true,
    present: 9,
    messages: [
      { id: 'n1', author: 'moon_tea', avatar: 1, text: 'Can’t sleep again. Anyone else up?', time: '01:12' },
      { id: 'n2', author: 'cedar_path', avatar: 8, text: 'Here. Making some tea and watching the rain.', time: '01:14' },
      { id: 'n3', author: 'yasmine_b', avatar: 2, text: 'موجودة. الليل طويل لكنه أقل وحدة معكم.', time: '01:15' }
    ]
  },
  {
    id: 'small-wins',
    kind: 'peer',
    communityId: 'depression',
    title: { en: 'Small wins', ar: 'انتصارات صغيرة', fr: 'Petites victoires' },
    about: {
      en: 'Got out of bed? Ate something warm? Answered one message? It counts. Share it here.',
      ar: 'نهضت من السرير؟ أكلت شيئًا دافئًا؟ رددت على رسالة واحدة؟ هذا يُحسب. شاركه هنا.',
      fr: 'Sorti du lit ? Mangé quelque chose de chaud ? Répondu à un message ? Ça compte. Partagez-le ici.'
    },
    live: false,
    present: 4,
    messages: [
      { id: 'w1', author: 'olive_light', avatar: 5, text: 'Opened the window this morning. Fresh air helped a little.', time: '09:40' },
      { id: 'w2', author: 'amine_s', avatar: 9, text: 'Took a shower after three days. Proud of it.', time: '10:02' }
    ]
  },
  {
    id: 'after-a-loss',
    kind: 'guided',
    communityId: 'grief',
    title: { en: 'After a loss', ar: 'بعد الفقد', fr: 'Après une perte' },
    about: {
      en: 'A gentle weekly circle for anyone grieving, at any stage. A psychologist keeps the space safe.',
      ar: 'حلقة أسبوعية لطيفة لكل من يعيش الحزن، في أي مرحلة. أخصائية نفسية تحافظ على أمان المساحة.',
      fr: 'Un cercle hebdomadaire et doux pour toute personne en deuil, à tout moment. Une psychologue veille sur l’espace.'
    },
    host: sara,
    schedule: { day: 0, time: '19:00' },
    live: false,
    present: 0,
    messages: [
      { id: 'l1', author: 'Sara', avatar: 5, therapist: 'psychologist', text: 'Last week we talked about anniversaries. This Sunday: the small objects that keep someone close.', time: '19:58' }
    ]
  },
  {
    id: 'steady-days',
    kind: 'guided',
    communityId: 'bipolar',
    title: { en: 'Building steady days', ar: 'بناء أيام مستقرة', fr: 'Construire des journées stables' },
    about: {
      en: 'Routines, sleep and early signs, shared between peers. A psychiatrist listens and guides; no prescriptions here.',
      ar: 'الروتين والنوم والعلامات المبكرة، بين الأقران. طبيب نفسي يستمع ويرشد؛ لا وصفات طبية هنا.',
      fr: "Routines, sommeil et signes précoces, entre pairs. Un psychiatre écoute et oriente ; pas d'ordonnances ici."
    },
    host: karim,
    schedule: { day: 2, time: '21:00' },
    live: false,
    present: 0,
    messages: [
      { id: 's1', author: 'Dr. Karim', avatar: 7, therapist: 'psychiatrist', text: 'Thanks for a good session. Next time: what a "good enough" week looks like for you.', time: '21:45' }
    ]
  },
  {
    id: 'exam-season',
    kind: 'peer',
    communityId: 'burnout',
    title: { en: 'Exam and work pressure', ar: 'ضغط الامتحانات والعمل', fr: 'Pression des examens et du travail' },
    about: {
      en: 'Deadlines, bac, thesis, long shifts. Vent, take a break together, swap what helps.',
      ar: 'المواعيد النهائية، البكالوريا، المذكرة، المناوبات الطويلة. فضفض، خذ استراحة معنا، وتبادل ما يساعد.',
      fr: 'Échéances, bac, mémoire, longues journées. Vider son sac, faire une pause ensemble, partager ce qui aide.'
    },
    live: true,
    present: 6,
    messages: [
      { id: 'e1', author: 'sun_bridge', avatar: 6, text: 'Pomodoro break. 25 minutes done, 5 to breathe.', time: '15:30' },
      { id: 'e2', author: 'lina_k', avatar: 3, text: 'Courage pour le mémoire, on y est presque.', time: '15:31' }
    ]
  }
];

export const getRoom = (id: string) => ROOMS.find((r) => r.id === id);
