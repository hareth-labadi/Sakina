import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CrisisHelp } from '@/components/sakina/crisis-help';
import { buttonVariants } from '@/components/ui/button';
import { Container, Section } from '@/components/ui/container';
import { Card, Tag } from '@/components/ui/display';
import { Link } from '@/i18n/navigation';
import { toLocale } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'guidelines' });
  return { title: t('title') };
}

const h2 = 'text-[clamp(1.75rem,3.2vw,2.375rem)]';
const RULES = ['anon', 'kind', 'experience', 'veil', 'noContact', 'report', 'danger'] as const;
const STEPS = ['step1', 'step2', 'step3', 'step4'] as const;

export default async function GuidelinesPage({ params }: Props) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('guidelines');

  return (
    <Container className="flex flex-col py-10">
      <div className="flex flex-col gap-4 pb-6">
        <Tag>{t('tag')}</Tag>
        <h1 className="max-w-250 text-[clamp(2.25rem,5.4vw,4rem)]">{t('title')}</h1>
        <p className="max-w-190 text-lead text-ink-2">{t('lead')}</p>
      </div>

      <Section aria-labelledby="h-rules">
        <h2 id="h-rules" className={h2}>{t('rulesTitle')}</h2>
        <ol className="grid grid-cols-[repeat(auto-fill,minmax(min(340px,100%),1fr))] gap-5">
          {RULES.map((key, i) => (
            <li key={key}>
              <Card className="h-full">
                <span aria-hidden className="inline-flex size-10 items-center justify-center rounded-full bg-surface-2 font-mono font-semibold text-ink-2">
                  {i + 1}
                </span>
                <h3 className="text-2xl">{t(`rules.${key}.title`)}</h3>
                <p className="text-ink-2">{t(`rules.${key}.body`)}</p>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      <Section aria-labelledby="h-mods">
        <div className="flex flex-col gap-2">
          <h2 id="h-mods" className={h2}>{t('modsTitle')}</h2>
          <p className="max-w-190 text-ink-2">{t('modsSub')}</p>
        </div>
        <ol className="flex max-w-190 flex-col gap-3">
          {STEPS.map((k, i) => (
            <li key={k} className="flex items-start gap-4 rounded-tile border border-line bg-surface px-5 py-4">
              <span aria-hidden className="font-mono font-semibold text-mute">{String(i + 1).padStart(2, '0')}</span>
              <span>{t(k)}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section aria-labelledby="h-danger">
        <Card className="border-transparent bg-warm-soft">
          <h2 id="h-danger" className="text-2xl">{t('dangerTitle')}</h2>
          <p className="max-w-190">{t('dangerBody')}</p>
          <div>
            <CrisisHelp size="md" />
          </div>
        </Card>
      </Section>

      <div className="flex flex-wrap gap-3">
        <Link href="/communities" className={buttonVariants()}>{t('ctaCommunities')}</Link>
        <Link href="/about" className={buttonVariants({ variant: 'secondary' })}>{t('ctaAbout')}</Link>
      </div>
    </Container>
  );
}
