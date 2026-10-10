'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { JoinGate, type GateAction } from '@/components/sakina/account/join-gate';
import { DmRequestDialog, MessageBubble, MessageComposer, MessageList, RoomHeader, type MessageView } from '@/components/sakina/chat/chat-widgets';
import { GuidedMinute } from '@/components/sakina/chat/guided-minute';
import { CrisisHelp } from '@/components/sakina/crisis-help';
import { ReportDialog } from '@/components/sakina/story/report-dialog';
import { Notice } from '@/components/ui/display';
import { useToast } from '@/components/ui/toast';
import type { Room } from '@/data/rooms';
import { useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { useSession } from '@/lib/session';
import { weekday } from './room-card';

/**
 * A live room. Front end only for now: there is no rooms API yet, so messages the member
 * sends stay in this tab and reports are not sent anywhere (the page says so).
 */
export function RoomView({ room, communityName }: { room: Room; communityName?: string }) {
  const t = useTranslations('discussions');
  const tch = useTranslations('chat');
  const tk = useTranslations('therapistKind');
  const locale = useLocale() as Locale;
  const user = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [messages, setMessages] = useState<MessageView[]>(() => room.messages.map((m) => ({ ...m })));
  const [blocked, setBlocked] = useState<string[]>([]);
  const [muted, setMuted] = useState(false);
  const [minute, setMinute] = useState(false);
  const [dm, setDm] = useState<string | null>(null);
  // undefined: closed; null: the room itself; a nickname: one member's message.
  const [reporting, setReporting] = useState<string | null | undefined>(undefined);
  const [gate, setGate] = useState<GateAction | null>(null);
  const endMinute = useCallback(() => setMinute(false), []);

  const schedule = room.schedule ? { day: weekday(locale, room.schedule.day), time: room.schedule.time } : null;
  const hostLine = room.host
    ? [t('host', { name: room.host.name, kind: tk(room.host.kind) }), schedule && t('weekly', schedule)].filter(Boolean).join(' · ')
    : undefined;

  // Guests can read; taking part needs an anonymous account.
  const asMember = (action: GateAction, run: () => void) => (user ? run() : setGate(action));

  const send = (text: string) => {
    if (!user) return setGate('chat');
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setMessages((m) => [...m, { id: `me-${now.getTime()}`, author: user.nickname, avatar: user.avatar, text, time, mine: true }]);
  };

  const block = (nickname: string) => {
    setBlocked((b) => [...b, nickname]);
    toast(t('blocked', { nickname }));
  };

  return (
    <div className="flex flex-col gap-5">
      <Notice tone="info">{t('preview')}</Notice>

      <div className="overflow-hidden rounded-card border border-line bg-surface">
        <RoomHeader
          kind={room.kind}
          title={room.title[locale]}
          community={communityName}
          live={room.live}
          hostLine={hostLine}
          muted={muted}
          onGuidedMinute={() => setMinute(true)}
          onToggleMute={() => {
            setMuted((m) => !m);
            toast(muted ? t('unmuted') : t('muted'));
          }}
          onReport={() => asMember('report', () => setReporting(null))}
          onLeave={() => {
            toast(t('left'));
            router.push('/discussions');
          }}
        />
        {minute ? <GuidedMinute onDone={endMinute} /> : null}
        <MessageList label={tch('messages')}>
          {messages
            .filter((m) => !blocked.includes(m.author))
            .map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                careAction={<CrisisHelp />}
                onReport={() => asMember('report', () => setReporting(m.author))}
                onRequestDm={() => asMember('dm', () => setDm(m.author))}
                onBlock={() => asMember('generic', () => block(m.author))}
              />
            ))}
        </MessageList>
        {room.live ? (
          <MessageComposer onSend={send} />
        ) : (
          <p className="border-t border-line bg-surface-2 px-5 py-4 text-ink-2 sm:px-6">{schedule ? t('closed', schedule) : t('closedShort')}</p>
        )}
      </div>

      <DmRequestDialog nickname={dm ?? ''} open={dm !== null} onOpenChange={(o) => !o && setDm(null)} onSend={() => toast(t('dmSent', { nickname: dm ?? '' }))} />
      <ReportDialog
        open={reporting !== undefined}
        onOpenChange={(o) => !o && setReporting(undefined)}
        offerBlock={reporting ?? undefined}
        onSubmit={({ block: alsoBlock }) => {
          if (alsoBlock && reporting) block(reporting);
          setReporting(undefined);
          toast(t('reportPreview'));
        }}
      />
      <JoinGate open={gate !== null} onOpenChange={(o) => !o && setGate(null)} action={gate ?? 'generic'} />
    </div>
  );
}
