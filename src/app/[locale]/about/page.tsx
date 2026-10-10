import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buttonVariants } from '@/components/ui/button';
import { Container, Section } from '@/components/ui/container';
import { Badge, Card, Tag } from '@/components/ui/display';
import { CheckIcon, LockIcon } from '@/components/ui/icons';
import type { Tint } from '@/components/ui/tint';
import { Link } from '@/i18n/navigation';
import { toLocale } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'about' });
  return { title: t('title') };
}

const h2 = 'text-[clamp(1.75rem,3.2vw,2.375rem)]';
const PRINCIPLES = [
  { key: 'anon', tint: 'blue' },
  { key: 'safe', tint: 'green' },
  { key: 'peer', tint: 'lav' },
  { key: 'lang', tint: 'sand' }
] as const satisfies readonly { key: string; tint: Tint }[];
const ROLES = ['members', 'therapists', 'moderators'] as const;
const NEVER = ['never1', 'never2', 'never3', 'never4'] as const;
const PRIVATE = ['private1', 'private2', 'private3', 'private4'] as const;

export default async function AboutPage({ params }: Props) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('about');

  return (
    <Container className="flex flex-col py-10">
      <div className="flex flex-col gap-4 pb-6">
        <Tag>{t('tag')}</Tag>
        <h1 className="max-w-250 text-[clamp(2.25rem,5.4vw,4rem)]">{t('title')}</h1>
        <p className="max-w-190 text-lead text-ink-2">{t('lead')}</p>
      </div>

      <Section aria-labelledby="h-why">
        <h2 id="h-why" className={h2}>{t('whyTitle')}</h2>
        <div className="flex max-w-190 flex-col gap-4 text-lg text-ink-2">
          <p>{t('why1')}</p>
          <p>{t('why2')}</p>
        </div>
      </Section>

      <Section aria-labelledby="h-believe">
        <h2 id="h-believe" className={h2}>{t('believeTitle')}</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(260px,100%),1fr))] gap-5">
          {PRINCIPLES.map(({ key, tint }) => (
            <Card key={key} tint={tint}>
              <h3 className="text-2xl">{t(`principles.${key}.title`)}</h3>
              <p className="text-ink-2">{t(`principles.${key}.body`)}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section aria-labelledby="h-who">
        <h2 id="h-who" className={h2}>{t('whoTitle')}</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
          {ROLES.map((key) => (
            <Card key={key}>
              <Badge tone={key === 'therapists' ? 'therapist' : key === 'moderators' ? 'pending' : 'neutral'}>{t(`roles.${key}.badge`)}</Badge>
              <h3 className="text-2xl">{t(`roles.${key}.title`)}</h3>
              <p className="text-ink-2">{t(`roles.${key}.body`)}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section aria-labelledby="h-privacy" id="privacy">
        <div className="flex flex-col gap-2">
          <h2 id="h-privacy" className={h2}>{t('privacyTitle')}</h2>
          <p className="max-w-190 text-ink-2">{t('privacySub')}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <h3 className="text-2xl">{t('neverTitle')}</h3>
            <ul className="flex flex-col gap-3">
              {NEVER.map((k) => (
                <li key={k} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-green-soft text-green-ink">
                    <CheckIcon size={16} />
                  </span>
                  {t(k)}
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h3 className="text-2xl">{t('privateTitle')}</h3>
            <ul className="flex flex-col gap-3">
              {PRIVATE.map((k) => (
                <li key={k} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-soft text-blue-ink">
                    <LockIcon size={16} />
                  </span>
                  {t(k)}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>

      <Section aria-labelledby="h-not">
        <Card className="border-transparent bg-warm-soft">
          <h2 id="h-not" className="text-2xl">{t('notTitle')}</h2>
          <p className="max-w-190">{t('notBody')}</p>
        </Card>
      </Section>

      <div className="flex flex-col items-start gap-4 rounded-card border border-line bg-surface p-6.5 sm:p-10">
        <h2 className={h2}>{t('ctaTitle')}</h2>
        <p className="max-w-190 text-ink-2">{t('ctaBody')}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/communities" className={buttonVariants()}>{t('ctaCommunities')}</Link>
          <Link href="/guidelines" className={buttonVariants({ variant: 'secondary' })}>{t('ctaGuidelines')}</Link>
        </div>
      </div>
    </Container>
  );
}
