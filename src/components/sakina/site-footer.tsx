import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { CrisisHelp } from './crisis-help';
import { Logo } from './logo';

const COLUMNS = [
  {
    key: 'explore',
    links: [
      { href: '/communities', label: 'explore.communities' },
      { href: '/discussions', label: 'explore.discussions' },
      { href: '/signup', label: 'explore.join' }
    ]
  },
  {
    key: 'sakina',
    links: [
      { href: '/about', label: 'sakina.about' },
      { href: '/guidelines', label: 'sakina.guidelines' },
      { href: '/about#privacy', label: 'sakina.privacy' }
    ]
  }
] as const;

export function SiteFooter() {
  const t = useTranslations('footer');
  return (
    <footer className="mt-12 border-t border-line pt-9 pb-24">
      <div className="mx-auto flex max-w-310 flex-col gap-8 px-4 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="flex flex-col gap-4">
            <Logo />
            <p className="max-w-90 text-ink-2">{t('tagline')}</p>
          </div>
          <div className="flex flex-wrap gap-x-16 gap-y-8">
            {COLUMNS.map((col) => (
              <nav key={col.key} aria-labelledby={`footer-${col.key}`} className="flex flex-col gap-1">
                <h2 id={`footer-${col.key}`} className="pb-1 text-caption font-semibold text-mute">
                  {t(`${col.key}.title`)}
                </h2>
                {col.links.map((l) => (
                  <Link key={l.href} href={l.href} className="inline-flex min-h-10 items-center font-semibold text-ink-2 hover:text-ink">
                    {t(l.label)}
                  </Link>
                ))}
              </nav>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-5 border-t border-line pt-6">
          <p className="max-w-205 text-caption text-mute">{t('note')}</p>
          <CrisisHelp />
        </div>
      </div>
    </footer>
  );
}
