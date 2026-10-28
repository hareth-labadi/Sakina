'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { JoinGate, type GateAction } from '@/components/sakina/account/join-gate';
import { MessageBubble, MessageComposer, MessageList, RoomHeader, type MessageView } from '@/components/sakina/chat/chat-widgets';
import { GuidedMinute } from '@/components/sakina/chat/guided-minute';
import { CrisisHelp } from '@/components/sakina/crisis-help';
import { ReportDialog } from '@/components/sakina/story/report-dialog';
import { useToast } from '@/components/ui/toast';
import { useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { useSession } from '@/lib/session';
import { report, rooms } from '@/services';
import type { RoomPage } from '@/services/rooms';
import type { RoomMessage } from '@/types/domain';
import { weekday } from './room-card';

/** How often an open room page fetches new messages. */
const POLL_MS = 5_000;

const noSubscribe = () => () => {};
/** False during the server render and hydration, true after: times use the reader's own clock. */
const useHydrated = () => useSyncExternalStore(noSubscribe, () => true, () => false);

/** "20:05" today, "22 Oct, 20:05" before. */
function formatTime(iso: string, locale: Locale) {
  const at = new Date(iso);
  const today = at.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat(locale, { ...(!today && { day: 'numeric', month: 'short' }), hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at);
}

/**
 * A live room. Starts from the server-rendered (guest) page, then fetches again with the member's
 * session and every few seconds while the tab is visible. Messages, reports and blocks all go
 * through the API.
 */
export function RoomView({ initial, communityName }: { initial: RoomPage; communityName?: string }) {
  const t = useTranslations('discussions');
  const tch = useTranslations('chat');
  const tk = useTranslations('therapistKind');
  const locale = useLocale() as Locale;
  const user = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const hydrated = useHydrated();

  const [room, setRoom] = useState(initial.room);
  const [messages, setMessages] = useState<RoomMessage[]>(initial.messages);
  const [muted, setMuted] = useState(false);
  const [minute, setMinute] = useState(false);
  const [sending, setSending] = useState(false);
  // undefined: closed; the message being reported otherwise.
  const [reporting, setReporting] = useState<RoomMessage | undefined>(undefined);
  const [gate, setGate] = useState<GateAction | null>(null);
  const endMinute = useCallback(() => setMinute(false), []);

  const refresh = useCallback(async () => {
    const page = await rooms.get(room.id).catch(() => null);
    if (!page) return;
    setRoom(page.room);
    setMessages(page.messages);
  }, [room.id]);

  // Fetch now (with the session, which the server render didn't have), then poll while visible.
  // `user?.nickname` re-fetches after signing in or out, so "mine" and held messages are right.
  const nickname = user?.nickname;
  useEffect(() => {
    let timer: number | undefined;
    const tick = () => {
      window.clearTimeout(timer);
      if (document.visibilityState !== 'visible') return;
      void refresh().finally(() => {
        timer = window.setTimeout(tick, POLL_MS);
      });
    };
    tick();
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [refresh, nickname]);

  const schedule = room.schedule ? { day: weekday(locale, room.schedule.day), time: room.schedule.time } : null;
  const hostLine = room.host
    ? [t('host', { name: room.host.nickname, kind: tk(room.host.kind) }), schedule && t('weekly', schedule)].filter(Boolean).join(' · ')
    : undefined;
  // The host may leave a note before or after the session.
  const canWrite = room.live || (user !== null && room.host?.nickname === user.nickname);

  // Guests can read; taking part needs an anonymous account.
  const asMember = (action: GateAction, run: () => void) => (user ? run() : setGate(action));

  /** False keeps the text in the composer. */
  const send = async (text: string) => {
    if (!user) {
      setGate('chat');
      return false;
    }
    setSending(true);
    try {
      const res = await rooms.send(room.id, text);
      if (res.ok) {
        setMessages((m) => [...m.filter((x) => x.id !== res.message.id), res.message]);
        return true;
      }
      toast(res.error === 'closed' ? t('closedShort') : res.error === 'post_limit' ? t('postLimit') : t('sendFailed'));
      if (res.error === 'closed') void refresh();
      return false;
    } catch {
      toast(t('sendFailed'));
      return false;
    } finally {
      setSending(false);
    }
  };

  const block = async (nickname: string) => {
    const ok = await rooms.block(nickname).catch(() => false);
    if (!ok) return toast(t('failed'));
    setMessages((m) => m.filter((x) => x.authorNickname !== nickname));
    toast(t('blocked', { nickname }));
  };

  const view = (m: RoomMessage): MessageView => ({
    id: m.id,
    author: m.authorNickname,
    avatar: m.authorAvatar,
    text: m.text,
    time: hydrated ? formatTime(m.createdAt, locale) : '',
    mine: m.mine,
    therapist: m.therapist,
    held: m.held
  });

  return (
    <div className="flex flex-col gap-5">
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
          onReport={() => toast(t('reportPick'))}
          onLeave={() => {
            toast(t('left'));
            router.push('/discussions');
          }}
        />
        {minute ? <GuidedMinute onDone={endMinute} /> : null}
        <MessageList label={tch('messages')}>
          {messages.length ? (
            messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={view(m)}
                careAction={<CrisisHelp />}
                onReport={() => asMember('report', () => setReporting(m))}
                onBlock={() => asMember('generic', () => void block(m.authorNickname))}
              />
            ))
          ) : (
            <p className="m-auto text-ink-2">{t('empty')}</p>
          )}
        </MessageList>
        {canWrite ? (
          <MessageComposer onSend={send} disabled={sending} />
        ) : (
          <p className="border-t border-line bg-surface-2 px-5 py-4 text-ink-2 sm:px-6">{schedule ? t('closed', schedule) : t('closedShort')}</p>
        )}
      </div>

      <ReportDialog
        open={reporting !== undefined}
        onOpenChange={(o) => !o && setReporting(undefined)}
        offerBlock={reporting?.authorNickname}
        onSubmit={async ({ reason, note, block: alsoBlock }) => {
          if (!reporting) return;
          const res = await report({ roomMessageId: reporting.id }, { reason, note, block: alsoBlock }).catch(() => ({ ok: false, blocked: false }));
          if (res.blocked) setMessages((m) => m.filter((x) => x.authorNickname !== reporting.authorNickname));
          setReporting(undefined);
          toast(res.ok ? t('reported') : t('failed'));
        }}
      />
      <JoinGate open={gate !== null} onOpenChange={(o) => !o && setGate(null)} action={gate ?? 'generic'} />
    </div>
  );
}
