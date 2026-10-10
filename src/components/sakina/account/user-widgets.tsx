'use client';

import { useTranslations } from 'next-intl';
import { Avatar } from '@/components/ui/display';
import { BellIcon } from '@/components/ui/icons';
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { Link, useRouter } from '@/i18n/navigation';
import type { SessionUser } from '@/types/domain';

/** Bell linking to notifications. The count is part of the accessible name. */
export function NotificationBell({ unread }: { unread: number }) {
  const t = useTranslations('account.menu');
  return (
    <Link
      href="/notifications"
      aria-label={t('notifications', { count: unread })}
      className="relative inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink hover:bg-surface-2"
    >
      <BellIcon />
      {unread > 0 ? (
        <span aria-hidden className="absolute -end-1.5 -top-1.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-warm-ink px-1.5 text-[0.8125rem] font-bold text-danger-fg">
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </Link>
  );
}

/** Avatar button opening the account menu. */
export function UserMenu({ user, onSignOut }: { user: SessionUser; onSignOut: () => void }) {
  const t = useTranslations('account.menu');
  const router = useRouter();
  return (
    <Menu>
      <MenuTrigger
        aria-label={t('open', { nickname: user.nickname })}
        className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-line bg-surface data-[state=open]:shadow-[0_0_0_3px_var(--glow-a)]"
      >
        <Avatar index={user.avatar} className="size-10 border-0" />
      </MenuTrigger>
      <MenuContent>
        <MenuLabel>
          <b className="block text-[1.0625rem]" dir="auto">{user.nickname}</b>
          <span className="text-caption text-mute">{t('anonymous')}</span>
        </MenuLabel>
        <MenuSeparator />
        <MenuItem onSelect={() => router.push('/profile')}>{t('profile')}</MenuItem>
        <MenuItem onSelect={() => router.push('/saved')}>{t('saved')}</MenuItem>
        {user.role === 'moderator' || user.role === 'admin' ? <MenuItem onSelect={() => router.push('/moderation')}>{t('moderation')}</MenuItem> : null}
        <MenuSeparator />
        <MenuItem onSelect={onSignOut}>{t('signOut')}</MenuItem>
      </MenuContent>
    </Menu>
  );
}
