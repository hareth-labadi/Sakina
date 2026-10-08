'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Avatar, Tag } from '@/components/ui/display';
import { Link, usePathname } from '@/i18n/navigation';
import { CrisisHelp } from '../crisis-help';
import { LogoMark } from '../logo';

export type PanelNavItem = { href: string; label: string; count?: number };

/**
 * Therapist / admin shell: sidebar on desktop, a horizontally scrolling bar on phones.
 * Crisis help stays visible in both.
 */
export function PanelLayout({
  title,
  nav,
  who,
  onSignOut,
  children
}: {
  title: string;
  nav: PanelNavItem[];
  who: { name: string; role: string; avatar: number; status?: string };
  onSignOut: () => void;
  children: ReactNode;
}) {
  const t = useTranslations('panel');
  const pathname = usePathname();
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-[calc(100dvh-76px)] flex-wrap items-stretch">
      <nav
        aria-label={title}
        className="flex max-w-full flex-[1_1_100%] gap-1.5 overflow-x-auto border-b border-line bg-surface px-3 py-2.5 lg:flex-[1_1_270px] lg:flex-col lg:overflow-visible lg:border-e lg:border-b-0 lg:px-3.5 lg:py-5"
      >
        <div className="hidden flex-col gap-2 px-2.5 pb-4 lg:flex">
          <span className="flex items-center gap-2 font-[family-name:var(--font-bricolage)] text-[1.375rem] font-semibold" lang="en">
            <LogoMark size={28} /> Sakina
          </span>
          <Tag>{title}</Tag>
        </div>
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isCurrent(item.href) ? 'page' : undefined}
            className="flex min-h-12 shrink-0 items-center gap-3 rounded-[14px] px-3.5 text-[1.0625rem] font-semibold whitespace-nowrap text-ink-2 hover:bg-surface-2 aria-[current=page]:bg-bg aria-[current=page]:text-ink aria-[current=page]:shadow-[inset_0_0_0_1px_var(--line)] lg:w-full"
          >
            <span className="flex-1">{item.label}</span>
            {item.count ? (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-warm-ink px-1.5 text-[0.8125rem] font-bold text-white">
                <span className="sr-only">{t('count', { count: item.count })}</span>
                <span aria-hidden>{item.count}</span>
              </span>
            ) : null}
          </Link>
        ))}
        <div className="flex shrink-0 items-center gap-2 lg:mt-auto lg:flex-col lg:items-stretch lg:border-t lg:border-line lg:px-2.5 lg:pt-4">
          <div className="hidden items-center gap-2.5 lg:flex">
            <Avatar index={who.avatar} />
            <div className="flex min-w-0 flex-col leading-tight">
              <b>{who.name}</b>
              <span className="text-caption text-mute">{who.role}</span>
              {who.status ? <span className="text-caption text-mute">{who.status}</span> : null}
            </div>
          </div>
          <CrisisHelp />
          <button type="button" onClick={onSignOut} className="inline-flex min-h-11 items-center rounded-xl px-3 font-semibold underline decoration-line underline-offset-5 hover:decoration-ink">
            {t('signOut')}
          </button>
        </div>
      </nav>
      <div id="panel-main" className="flex min-w-0 flex-[999_1_600px] flex-col gap-6 px-4 pt-6 pb-14 sm:px-9">
        {children}
      </div>
    </div>
  );
}
