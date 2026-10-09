/**
 * Email texts, in the member's language. Plain text only: no tracking pixels, no remote images.
 * Nothing in them names the site's subject (mental health), in case someone else sees the inbox.
 * The Arabic and French were written by AI and need native-speaker review, like the UI copy.
 */
export const LOCALES = ['ar', 'fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

type Template = (link: string) => { subject: string; text: string };

const reset: Record<Locale, Template> = {
  en: (link) => ({
    subject: 'Reset your Sakina password',
    text: `Someone asked to reset the password of your Sakina account.\n\nTo choose a new password, open this link within 30 minutes:\n${link}\n\nIf it wasn't you, ignore this email: nothing changes.`
  }),
  fr: (link) => ({
    subject: 'Réinitialiser votre mot de passe Sakina',
    text: `Quelqu'un a demandé à réinitialiser le mot de passe de votre compte Sakina.\n\nPour choisir un nouveau mot de passe, ouvrez ce lien dans les 30 minutes :\n${link}\n\nSi ce n'était pas vous, ignorez cet e-mail : rien ne change.`
  }),
  ar: (link) => ({
    subject: 'إعادة تعيين كلمة مرور سكينة',
    text: `طلب شخص ما إعادة تعيين كلمة مرور حسابك في سكينة.\n\nلاختيار كلمة مرور جديدة، افتح هذا الرابط خلال 30 دقيقة:\n${link}\n\nإن لم تكن أنت، تجاهل هذه الرسالة: لن يتغير شيء.`
  })
};

const verify: Record<Locale, Template> = {
  en: (link) => ({
    subject: 'Confirm your recovery email for Sakina',
    text: `Please confirm this address so you can recover your Sakina account if you forget your password.\n\nOpen this link within 24 hours:\n${link}\n\nIf you didn't create an account, ignore this email.`
  }),
  fr: (link) => ({
    subject: 'Confirmez votre e-mail de récupération Sakina',
    text: `Confirmez cette adresse pour pouvoir récupérer votre compte Sakina si vous oubliez votre mot de passe.\n\nOuvrez ce lien dans les 24 heures :\n${link}\n\nSi vous n'avez pas créé de compte, ignorez cet e-mail.`
  }),
  ar: (link) => ({
    subject: 'أكّد بريد الاسترجاع لحساب سكينة',
    text: `أكّد هذا العنوان حتى تتمكن من استرجاع حسابك في سكينة إذا نسيت كلمة المرور.\n\nافتح هذا الرابط خلال 24 ساعة:\n${link}\n\nإن لم تنشئ حسابًا، تجاهل هذه الرسالة.`
  })
};

export function resetEmail(webUrl: string, locale: Locale, token: string) {
  return reset[locale](`${webUrl}/${locale}/forgot?token=${token}`);
}

export function verifyEmail(webUrl: string, locale: Locale, token: string) {
  return verify[locale](`${webUrl}/${locale}/verify-email?token=${token}`);
}
