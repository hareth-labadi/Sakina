'use client';

import { useTranslations } from 'next-intl';
import { Popover } from 'radix-ui';
import { useState } from 'react';
import { IconButton, buttonVariants } from '@/components/ui/button';
import { CloseIcon, GlobeIcon, MenuIcon } from '@/components/ui/icons';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { CrisisHelp } from './crisis-help';
import { Logo } from './logo';
import { LanguageSwitch, ThemeSwitch } from './preferences';
import { NotificationBell, UserMenu } from './account/user-widgets';
import type { SessionUser } from '@/types/domain';

const NAV = [
  { href: '/', key: 'home' },
  { href: '/communities', key: 'communities' },
  { href: '/design', key: 'design' }
] as const;

/** `user` comes from the session once auth exists; null/undefined = guest. */
export function SiteHeader({ user, onSignOut = () => {} }: { user?: SessionUser | null; onSignOut?: () => void }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isCurrent = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-glass backdrop-blur-lg">
      <div className="mx-auto flex min-h-19 max-w-310 items-center gap-5 px-4 sm:px-8">
        <Link href="/" aria-label={t('logoLabel')} className="rounded-xl">
          <Logo compact />
        </Link>

        <nav aria-label={t('main')} className="hidden flex-1 gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isCurrent(item.href) ? 'page' : undefined}
              className="inline-flex min-h-11.5 items-center rounded-full px-4 text-[1.0625rem] font-semibold whitespace-nowrap text-ink-2 hover:bg-surface-2 aria-[current=page]:bg-surface aria-[current=page]:text-ink aria-[current=page]:shadow-[inset_0_0_0_1px_var(--line)]"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2 sm:gap-2.5">
          <CrisisHelp short />

          <Popover.Root>
            <Popover.Trigger asChild>
              <IconButton label={t('preferences')} className="max-lg:hidden">
                <GlobeIcon size={20} />
              </IconButton>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="end"
                sideOffset={10}
                className="z-50 flex w-80 flex-col gap-4 rounded-tile border border-line bg-surface p-5 text-ink shadow-soft"
              >
                <PreferencesBody />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          {user ? (
            <>
              <NotificationBell unread={user.unreadNotifications} />
              <span className="max-lg:hidden">
                <UserMenu user={user} onSignOut={onSignOut} />
              </span>
            </>
          ) : (
            <>
              <Link href="/signin" className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'max-lg:hidden')}>
                {t('signIn')}
              </Link>
              <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }), 'max-lg:hidden')}>
                {t('join')}
              </Link>
            </>
          )}

          <IconButton label={menuOpen ? t('closeMenu') : t('menu')} aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)} className="lg:hidden">
            {menuOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
          </IconButton>
        </div>
      </div>

      <div className={cn('border-t border-line bg-surface px-4 pt-3 pb-5 lg:hidden', !menuOpen && 'hidden')}>
        <nav aria-label={t('main')} className="flex flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              aria-current={isCurrent(item.href) ? 'page' : undefined}
              className="flex min-h-12 items-center rounded-[14px] px-4 text-[1.0625rem] font-semibold hover:bg-surface-2 aria-[current=page]:bg-surface-2"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-4">
          {user ? (
            <>
              <Link href="/profile" onClick={() => setMenuOpen(false)} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                {t('profile')}
              </Link>
              <button type="button" onClick={onSignOut} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                {t('signOut')}
              </button>
            </>
          ) : (
            <>
              <Link href="/signin" onClick={() => setMenuOpen(false)} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                {t('signIn')}
              </Link>
              <Link href="/signup" onClick={() => setMenuOpen(false)} className={buttonVariants({ size: 'sm' })}>
                {t('join')}
              </Link>
            </>
          )}
        </div>
        <div className="mt-4 flex flex-col gap-4 border-t border-line pt-4">
          <PreferencesBody />
        </div>
      </div>
    </header>
  );
}

function PreferencesBody() {
  const t = useTranslations('nav');
  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="text-caption font-semibold text-mute">{t('language')}</span>
        <LanguageSwitch />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-caption font-semibold text-mute">{t('theme')}</span>
        <ThemeSwitch />
      </div>
    </>
  );
}
