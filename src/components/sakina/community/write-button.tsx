'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { JoinGate } from '@/components/sakina/account/join-gate';
import { Button, buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { useSession } from '@/lib/session';

/** "Share something" in a community: members go to the composer, guests see the join gate. */
export function WriteButton({ communityId }: { communityId: string }) {
  const t = useTranslations('write');
  const user = useSession();
  const [gate, setGate] = useState(false);

  if (user) {
    return (
      <Link href={{ pathname: '/write', query: { community: communityId } }} className={buttonVariants({ variant: 'secondary' })}>
        {t('share')}
      </Link>
    );
  }
  return (
    <>
      <Button variant="secondary" onClick={() => setGate(true)}>
        {t('share')}
      </Button>
      <JoinGate open={gate} onOpenChange={setGate} action="post" />
    </>
  );
}
