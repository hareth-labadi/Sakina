import type { Community } from '@/types/domain';

/**
 * One community per condition.
 * REPLACE THIS LIST when the owner sends the final list (or playlist).
 * This is mock data: when the backend exists, communities come from the API and this file is only used in tests/storybook.
 *
 * NOTE: Arabic and French text was written by AI and needs a native-speaker review.
 */
export const CONDITIONS: Community[] = [
  {
    id: 'depression', tint: 'blue', sensitivity: 'high', status: 'active',
    name: { en: 'Depression', ar: 'الاكتئاب', fr: 'Dépression' },
    description: { en: "For the heavy days and the grey weeks. You don't have to explain yourself here.", ar: 'للأيام الثقيلة والأسابيع الرمادية. لا تحتاج أن تشرح نفسك هنا.', fr: 'Pour les jours lourds et les semaines grises. Ici, pas besoin de vous justifier.' }
  },
  {
    id: 'anxiety', tint: 'green', sensitivity: 'standard', status: 'active',
    name: { en: 'Anxiety', ar: 'القلق', fr: 'Anxiété' },
    description: { en: "When your mind won't slow down. You are not overreacting.", ar: 'حين لا يهدأ عقلك. أنت لا تبالغ.', fr: "Quand votre esprit ne ralentit pas. Vous n'exagérez pas." }
  },
  {
    id: 'panic', tint: 'lav', sensitivity: 'standard', status: 'active',
    name: { en: 'Panic attacks', ar: 'نوبات الهلع', fr: 'Attaques de panique' },
    description: { en: 'It passes. Hear how others rode out the wave.', ar: 'إنها تمرّ. اسمع كيف تجاوز غيرك الموجة.', fr: "Ça passe. Découvrez comment d'autres ont traversé la vague." }
  },
  {
    id: 'schizophrenia', tint: 'sand', sensitivity: 'high', status: 'active',
    name: { en: 'Schizophrenia', ar: 'الفصام', fr: 'Schizophrénie' },
    description: { en: 'Living with it, caring for someone with it, being more than a label.', ar: 'العيش معه، ورعاية من يعيش معه، وأن تكون أكثر من مجرد تسمية.', fr: "Vivre avec, accompagner un proche, être plus qu'une étiquette." }
  },
  {
    id: 'bipolar', tint: 'blue', sensitivity: 'sensitive', status: 'active',
    name: { en: 'Bipolar', ar: 'الاضطراب ثنائي القطب', fr: 'Bipolarité' },
    description: { en: 'The highs, the lows and the steady days in between.', ar: 'الارتفاعات والانخفاضات والأيام المستقرة بينهما.', fr: 'Les hauts, les bas, et les jours stables entre les deux.' }
  },
  {
    id: 'ocd', tint: 'green', sensitivity: 'standard', status: 'active',
    name: { en: 'OCD', ar: 'الوسواس القهري', fr: 'TOC' },
    description: { en: 'Checking, counting, doubting. Talk with people who get it.', ar: 'التحقق والعدّ والشك. تحدّث مع من يفهم ذلك.', fr: 'Vérifier, compter, douter. Parlez avec des gens qui comprennent.' }
  },
  {
    id: 'trauma', tint: 'lav', sensitivity: 'high', status: 'active',
    name: { en: 'Trauma and PTSD', ar: 'الصدمة واضطراب ما بعد الصدمة', fr: 'Trauma et TSPT' },
    description: { en: 'What happened stays with you. You set the pace here.', ar: 'ما حدث يبقى معك. هنا أنت من يحدد الإيقاع.', fr: "Ce qui s'est passé reste avec vous. Ici, c'est vous qui donnez le rythme." }
  },
  {
    id: 'eating', tint: 'sand', sensitivity: 'high', status: 'active',
    name: { en: 'Eating disorders', ar: 'اضطرابات الأكل', fr: 'Troubles alimentaires' },
    description: { en: 'Food, body and control. No numbers, no judgement.', ar: 'الطعام والجسد والسيطرة. بلا أرقام وبلا أحكام.', fr: 'Nourriture, corps et contrôle. Pas de chiffres, pas de jugement.' }
  },
  {
    id: 'adhd', tint: 'blue', sensitivity: 'standard', status: 'active',
    name: { en: 'ADHD', ar: 'فرط الحركة وتشتت الانتباه', fr: 'TDAH' },
    description: { en: 'Focus, restlessness and forgotten keys. Tips and stories.', ar: 'التركيز والتململ والمفاتيح المنسية. نصائح وقصص.', fr: 'Concentration, agitation et clés oubliées. Astuces et histoires.' }
  },
  {
    id: 'grief', tint: 'green', sensitivity: 'sensitive', status: 'active',
    name: { en: 'Grief', ar: 'الفقد والحزن', fr: 'Deuil' },
    description: { en: 'For anyone missing someone. Grief has no schedule.', ar: 'لكل من يفتقد أحدًا. الحزن لا يتبع جدولًا.', fr: "Pour celles et ceux à qui quelqu'un manque. Le deuil n'a pas d'horaire." }
  },
  {
    id: 'burnout', tint: 'lav', sensitivity: 'standard', status: 'active',
    name: { en: 'Burnout', ar: 'الإرهاق', fr: 'Burn-out' },
    description: { en: "Tired in a way sleep doesn't fix. Rest is allowed.", ar: 'تعب لا يصلحه النوم. الراحة مسموحة.', fr: 'Une fatigue que le sommeil ne répare pas. Se reposer est permis.' }
  },
  {
    id: 'loneliness', tint: 'sand', sensitivity: 'standard', status: 'active',
    name: { en: 'Loneliness', ar: 'الوحدة', fr: 'Solitude' },
    description: { en: 'Surrounded or alone, the feeling is real. Come sit with us.', ar: 'سواء كنت محاطًا بالناس أو وحيدًا، الشعور حقيقي. تعال واجلس معنا.', fr: 'Entouré·e ou seul·e, le sentiment est réel. Venez vous asseoir avec nous.' }
  }
];
