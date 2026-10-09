'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { JoinGate } from '@/components/sakina/account/join-gate';
import { Button } from '@/components/ui/button';
import { CheckIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';
import { useSession } from '@/lib/session';
import { memberships } from '@/services';

/** Join / leave a community. Guests get the join gate instead; reading never needs an account. */
export function JoinButton({ communityId, name }: { communityId: string; name: string }) {
  const t = useTranslations('community.page');
  const user = useSession();
  const nickname = user?.nickname;
  const { toast } = useToast();
  const [gateOpen, setGateOpen] = useState(false);
  const [member, setMember] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    if (nickname) memberships.isMember(communityId).then((m) => live && setMember(m));
    return () => {
      live = false;
    };
  }, [nickname, communityId]);

  if (!user) {
    return (
      <>
        <Button onClick={() => setGateOpen(true)}>{t('join')}</Button>
        <JoinGate open={gateOpen} onOpenChange={setGateOpen} action="join" />
      </>
    );
  }

  const toggle = async () => {
    const next = !member;
    setBusy(true);
    const res = await memberships.setMember(communityId, next);
    setBusy(false);
    if (!res.ok) return toast(t('failed'));
    setMember(next);
    toast(t(next ? 'joinedToast' : 'leftToast', { name }));
  };

  return member ? (
    <Button variant="secondary" onClick={toggle} disabled={busy} aria-label={t('leaveNamed', { name })}>
      <CheckIcon size={18} />
      {t('joined')}
    </Button>
  ) : (
    <Button onClick={toggle} disabled={busy || member === null}>
      {t('join')}
    </Button>
  );
}
