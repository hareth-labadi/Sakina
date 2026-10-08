import { useTranslations } from 'next-intl';
import { CrisisHelp } from './crisis-help';
import { Logo } from './logo';

export function SiteFooter() {
  const t = useTranslations('footer');
  return (
    <footer className="mt-12 border-t border-line pt-9 pb-24">
      <div className="mx-auto flex max-w-310 flex-col gap-6 px-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <Logo />
          <CrisisHelp />
        </div>
        <p className="max-w-205 text-caption text-mute">{t('note')}</p>
      </div>
    </footer>
  );
}
