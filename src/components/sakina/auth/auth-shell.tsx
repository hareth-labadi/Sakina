import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Card, Tag } from '@/components/ui/display';
import { Container } from '@/components/ui/container';

export type AuthAside = 'signup' | 'signin' | 'recovery';

/** Two-column layout for account screens: the form, and a calm reassurance panel. Stacks on phones. */
export function AuthShell({ eyebrow, title, aside, children }: { eyebrow: string; title: string; aside: AuthAside; children: ReactNode }) {
  return (
    <Container className="flex flex-wrap items-start gap-7 py-10 sm:py-14">
      <Card className="max-w-190 min-w-0 flex-[999_1_560px] gap-6">
        <div className="flex flex-col gap-3">
          <Tag>{eyebrow}</Tag>
          <h1 className="text-[clamp(2rem,4vw,2.75rem)]">{title}</h1>
        </div>
        {children}
      </Card>
      <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
        <AsidePanels kind={aside} />
      </aside>
    </Container>
  );
}

function AsidePanels({ kind }: { kind: AuthAside }) {
  const t = useTranslations('auth.aside');
  const never = (
    <Card tint="blue" key="never">
      <h2 className="text-2xl">{t('neverTitle')}</h2>
      <ul className="flex list-disc flex-col gap-1 ps-6">
        <li>{t('never1')}</li>
        <li>{t('never2')}</li>
        <li>{t('never3')}</li>
      </ul>
    </Card>
  );
  // Nicknames, codes and emails stay LTR and unbroken inside Arabic text.
  const x = (chunks: ReactNode) => (
    <bdi dir="ltr" className="font-mono whitespace-nowrap">
      {chunks}
    </bdi>
  );
  // The demo accounts exist only in development databases (`npm run db:seed` in backend/).
  const demo = process.env.NODE_ENV === 'production' ? null : (
    <Card tint="sand" key="demo">
      <Tag className="bg-surface">{t('demoTitle')}</Tag>
      <p>{t.rich('demoBody', { x })}</p>
      <ul className="flex list-disc flex-col gap-1 ps-6 text-caption">
        <li>{t.rich('demo1', { x })}</li>
        <li>{t.rich('demo2', { x })}</li>
        <li>{t.rich('demo3', { x })}</li>
      </ul>
    </Card>
  );
  if (kind === 'signup')
    return [
      never,
      <Card tint="green" key="private">
        <h2 className="text-2xl">{t('privateTitle')}</h2>
        <p>{t('privateBody')}</p>
      </Card>,
      <Card tint="lav" key="limits">
        <h2 className="text-2xl">{t('limitsTitle')}</h2>
        <p>{t('limitsBody')}</p>
      </Card>
    ];
  if (kind === 'signin')
    return [
      demo,
      <Card key="passkey">
        <h2 className="text-2xl">{t('passkeyTitle')}</h2>
        <p className="text-ink-2">{t('passkeyBody')}</p>
      </Card>
    ];
  return [
    <Card tint="blue" key="why">
      <h2 className="text-2xl">{t('whyTitle')}</h2>
      <p>{t('whyBody')}</p>
    </Card>,
    demo
  ];
}
