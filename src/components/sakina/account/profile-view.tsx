'use client';

import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Avatar, Badge, Card, EmptyState, LoadingState } from '@/components/ui/display';
import { CheckIcon } from '@/components/ui/icons';
import { tintBg } from '@/components/ui/tint';
import { useToast } from '@/components/ui/toast';
import { CONDITIONS } from '@/data/conditions';
import { Link, useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import { refreshSession, signOut, useSessionState } from '@/lib/session';
import { profile as service, type OwnProfile } from '@/services/profile';

/** The member's own account: identity, communities, recovery method. Nothing here is public. */
export function ProfileView() {
  const t = useTranslations('profile');
  const tn = useTranslations('nav');
  const format = useFormatter();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { toast } = useToast();
  const { status, user } = useSessionState();
  const nickname = user?.nickname;
  const [data, setData] = useState<OwnProfile | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    if (nickname)
      service.get().then((p) => {
        if (!live) return;
        setData(p);
        // Signed out elsewhere or expired: let the session catch up (shows the guest view).
        if (!p) void refreshSession();
      });
    return () => {
      live = false;
    };
  }, [nickname]);

  if (!user && status === 'loading') return <LoadingState caption={t('loading')} count={2} />;
  if (!user) {
    return (
      <EmptyState
        as="h2"
        title={t('guestTitle')}
        body={t('guestBody')}
        action={
          <Link href="/signin" className={buttonVariants()}>
            {tn('signIn')}
          </Link>
        }
      />
    );
  }
  if (data === undefined) return <LoadingState caption={t('loading')} count={2} />;
  if (data === null) return <EmptyState as="h2" title={t('missingTitle')} body={t('missingBody')} />;

  const joined = CONDITIONS.filter((c) => data.communities.includes(c.id));
  const onSignOut = async () => {
    await signOut();
    toast(tn('signedOut'));
    router.push('/');
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex-row flex-wrap items-center gap-5">
        <Avatar index={data.avatar} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="self-start text-[clamp(1.75rem,3.2vw,2.375rem)] leading-tight" dir="auto">
            {data.nickname}
          </h2>
          <p className="text-ink-2">
            {t('since', { date: format.dateTime(new Date(data.createdAt), { month: 'long', year: 'numeric' }) })}
          </p>
        </div>
        <Badge>{t('anonymous')}</Badge>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-2xl">{t('communitiesTitle')}</h2>
          {joined.length ? (
            <ul className="flex flex-wrap gap-2.5">
              {joined.map((c) => (
                <li key={c.id}>
                  <Link href={`/communities/${c.id}`} className={cn('inline-flex min-h-11 items-center rounded-full px-4.5 font-medium hover:opacity-90', tintBg[c.tint])}>
                    {c.name[locale]}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-2">{t('noCommunities')}</p>
          )}
          <div>
            <Link href="/communities" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
              {t('browse')}
            </Link>
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl">{t('recoveryTitle')}</h2>
          {data.recovery.type === 'code' ? (
            <p className="text-ink-2">{t('recoveryCode')}</p>
          ) : (
            <>
              <p className="text-ink-2">
                {t('recoveryEmail')} <bdi className="font-semibold text-ink">{data.recovery.masked}</bdi>
              </p>
              {data.recovery.verified ? (
                <Badge tone="win">
                  <CheckIcon size={14} />
                  {t('confirmed')}
                </Badge>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone="pending">{t('notConfirmed')}</Badge>
                  <Link href="/verify-email" className={buttonVariants({ size: 'sm' })}>
                    {t('confirmNow')}
                  </Link>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      <Card flat>
        <h2 className="text-2xl">{t('privacyTitle')}</h2>
        <ul className="flex list-disc flex-col gap-1.5 ps-6 text-ink-2">
          <li>{t('privacy1')}</li>
          <li>{t('privacy2')}</li>
        </ul>
      </Card>

      <div>
        <Button variant="secondary" onClick={onSignOut}>
          {tn('signOut')}
        </Button>
      </div>
    </div>
  );
}
