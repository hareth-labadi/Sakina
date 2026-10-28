import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { RoomView } from '@/components/sakina/discussions/room-view';
import { CrisisHelp } from '@/components/sakina/crisis-help';
import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/display';
import { BackIcon } from '@/components/ui/icons';
import { CONDITIONS } from '@/data/conditions';
import { Link } from '@/i18n/navigation';
import { toLocale } from '@/i18n/routing';
import { rooms } from '@/services';

type Props = { params: Promise<{ locale: string; id: string }> };

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const page = await rooms.get(id).catch(() => null);
  return page ? { title: page.room.title[toLocale(locale)] } : {};
}

export default async function RoomPage({ params }: Props) {
  const { locale: raw, id } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  // Rendered as a guest; the room view fetches again in the browser (with the member's session) and keeps polling.
  const page = await rooms.get(id);
  if (!page) notFound();
  const { room } = page;
  const t = await getTranslations('discussions');
  const community = CONDITIONS.find((c) => c.id === room.communityId);

  return (
    <Container className="flex flex-col gap-6 py-10">
      <Link href="/discussions" className="inline-flex min-h-11 w-fit items-center gap-2 font-semibold text-ink-2 hover:text-ink">
        <BackIcon size={18} />
        {t('back')}
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <RoomView initial={page} communityName={community?.name[locale]} />
        </div>

        <aside className="flex flex-col gap-5" aria-label={t('aboutTitle')}>
          <Card>
            <h2 className="text-2xl">{t('aboutTitle')}</h2>
            <p className="text-ink-2">{room.about[locale]}</p>
            {community ? (
              <Link href={`/communities/${community.id}`} className="w-fit font-semibold underline decoration-line underline-offset-5 hover:decoration-ink">
                {t('community', { name: community.name[locale] })}
              </Link>
            ) : null}
          </Card>
          <Card>
            <h2 className="text-2xl">{t('rulesTitle')}</h2>
            <ul className="flex list-disc flex-col gap-1.5 ps-6 text-ink-2">
              <li>{t('rule1')}</li>
              <li>{t('rule2')}</li>
              <li>{t('rule3')}</li>
            </ul>
            <Link href="/guidelines" className="w-fit font-semibold underline decoration-line underline-offset-5 hover:decoration-ink">
              {t('guidelines')}
            </Link>
          </Card>
          <Card className="border-transparent bg-warm-soft">
            <h2 className="text-2xl">{t('crisisTitle')}</h2>
            <p>{t('crisisBody')}</p>
            <div>
              <CrisisHelp size="md" />
            </div>
          </Card>
        </aside>
      </div>
    </Container>
  );
}
