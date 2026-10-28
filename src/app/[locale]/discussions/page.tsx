import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RoomCard } from '@/components/sakina/discussions/room-card';
import { Container, Section } from '@/components/ui/container';
import { Notice } from '@/components/ui/display';
import { CONDITIONS } from '@/data/conditions';
import { Link } from '@/i18n/navigation';
import { toLocale } from '@/i18n/routing';
import { rooms } from '@/services';

type Props = { params: Promise<{ locale: string }> };

// Live numbers (who is here, which rooms are open): rendered on each request.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'discussions' });
  return { title: t('title') };
}

const grid = 'grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-5';

export default async function DiscussionsPage({ params }: Props) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('discussions');
  const byId = new Map(CONDITIONS.map((c) => [c.id, c]));
  // Live rooms first within each group.
  const all = await rooms.list().catch(() => null);
  const sorted = [...(all ?? [])].sort((a, b) => Number(b.live) - Number(a.live));
  const guided = sorted.filter((r) => r.kind === 'guided');
  const peer = sorted.filter((r) => r.kind === 'peer');

  return (
    <Container className="flex flex-col gap-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-[clamp(2.25rem,4.6vw,3.5rem)]">{t('title')}</h1>
        <p className="max-w-190 text-lead text-ink-2">{t('sub')}</p>
      </div>
      <Notice tone="info" className="max-w-190">
        {t('watched')}{' '}
        <Link href="/guidelines" className="font-semibold underline underline-offset-4">
          {t('guidelines')}
        </Link>
      </Notice>
      {all ? null : <Notice tone="warn" className="max-w-190">{t('unavailable')}</Notice>}

      <Section aria-labelledby="h-guided" className="pb-4">
        <div className="flex flex-col gap-1">
          <h2 id="h-guided" className="text-[clamp(1.75rem,3.2vw,2.375rem)]">{t('guidedTitle')}</h2>
          <p className="text-ink-2">{t('guidedSub')}</p>
        </div>
        <div className={grid}>
          {guided.map((r) => (
            <RoomCard key={r.id} room={r} community={byId.get(r.communityId)} />
          ))}
        </div>
      </Section>

      <Section aria-labelledby="h-peer" className="pt-4">
        <div className="flex flex-col gap-1">
          <h2 id="h-peer" className="text-[clamp(1.75rem,3.2vw,2.375rem)]">{t('peerTitle')}</h2>
          <p className="text-ink-2">{t('peerSub')}</p>
        </div>
        <div className={grid}>
          {peer.map((r) => (
            <RoomCard key={r.id} room={r} community={byId.get(r.communityId)} />
          ))}
        </div>
      </Section>
    </Container>
  );
}
