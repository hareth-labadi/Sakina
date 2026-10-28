import type { Localized } from '@/types/domain';

/**
 * What the discussion rooms say about themselves, in each language. Which rooms exist, their
 * schedule, host and messages come from the API (backend `rooms` table); a room needs an entry
 * here to be shown.
 *
 * NOTE: Arabic and French text was written by AI and needs a native-speaker review.
 */

export type RoomCopy = { id: string; title: Localized; about: Localized };

export const ROOM_COPY: RoomCopy[] = [
  {
    id: 'grounding',
    title: { en: 'Grounding when your mind races', ar: 'التأريض حين يتسارع عقلك', fr: "S'ancrer quand l'esprit s'emballe" },
    about: {
      en: 'A calm half hour of breathing and sharing, guided by a psychologist. Listening without writing is welcome.',
      ar: 'نصف ساعة هادئة من التنفس والمشاركة، بإرشاد أخصائية نفسية. الاستماع دون كتابة مرحّب به.',
      fr: "Une demi-heure calme de respiration et de partage, guidée par une psychologue. Écouter sans écrire, c'est bienvenu."
    }
  },
  {
    id: 'night-owls',
    title: { en: 'Night owls', ar: 'ساهرو الليل', fr: 'Oiseaux de nuit' },
    about: {
      en: "For when it's late and everyone else is asleep. Say hello, share how the day went, or just sit with others.",
      ar: 'حين يتأخر الوقت والجميع نائم. ألقِ التحية، شارك كيف مرّ يومك، أو اجلس مع الآخرين فقط.',
      fr: "Pour quand il est tard et que tout le monde dort. Dites bonjour, racontez votre journée, ou restez simplement avec d'autres."
    }
  },
  {
    id: 'small-wins',
    title: { en: 'Small wins', ar: 'انتصارات صغيرة', fr: 'Petites victoires' },
    about: {
      en: 'Got out of bed? Ate something warm? Answered one message? It counts. Share it here.',
      ar: 'نهضت من السرير؟ أكلت شيئًا دافئًا؟ رددت على رسالة واحدة؟ هذا يُحسب. شاركه هنا.',
      fr: 'Sorti du lit ? Mangé quelque chose de chaud ? Répondu à un message ? Ça compte. Partagez-le ici.'
    }
  },
  {
    id: 'after-a-loss',
    title: { en: 'After a loss', ar: 'بعد الفقد', fr: 'Après une perte' },
    about: {
      en: 'A gentle weekly circle for anyone grieving, at any stage. A psychologist keeps the space safe.',
      ar: 'حلقة أسبوعية لطيفة لكل من يعيش الحزن، في أي مرحلة. أخصائية نفسية تحافظ على أمان المساحة.',
      fr: 'Un cercle hebdomadaire et doux pour toute personne en deuil, à tout moment. Une psychologue veille sur l’espace.'
    }
  },
  {
    id: 'steady-days',
    title: { en: 'Building steady days', ar: 'بناء أيام مستقرة', fr: 'Construire des journées stables' },
    about: {
      en: 'Routines, sleep and early signs, shared between peers. A psychiatrist listens and guides; no prescriptions here.',
      ar: 'الروتين والنوم والعلامات المبكرة، بين الأقران. طبيب نفسي يستمع ويرشد؛ لا وصفات طبية هنا.',
      fr: "Routines, sommeil et signes précoces, entre pairs. Un psychiatre écoute et oriente ; pas d'ordonnances ici."
    }
  },
  {
    id: 'exam-season',
    title: { en: 'Exam and work pressure', ar: 'ضغط الامتحانات والعمل', fr: 'Pression des examens et du travail' },
    about: {
      en: 'Deadlines, bac, thesis, long shifts. Vent, take a break together, swap what helps.',
      ar: 'المواعيد النهائية، البكالوريا، المذكرة، المناوبات الطويلة. فضفض، خذ استراحة معنا، وتبادل ما يساعد.',
      fr: 'Échéances, bac, mémoire, longues journées. Vider son sac, faire une pause ensemble, partager ce qui aide.'
    }
  }
];

export const roomCopy = (id: string) => ROOM_COPY.find((r) => r.id === id);
