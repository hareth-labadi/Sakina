'use client';

import { useTranslations } from 'next-intl';
import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, LiveDot } from '@/components/ui/display';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field, Textarea } from '@/components/ui/field';
import { SendIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { detectPii } from '@/lib/safety';
import type { TherapistKind } from '@/types/domain';

export type RoomKind = 'guided' | 'peer' | 'dm';

export type MessageView = {
  id: string;
  author: string;
  avatar: number;
  text: string;
  time: string; // already formatted "20:45"
  mine?: boolean;
  therapist?: TherapistKind;
  held?: boolean;
  /** System line ("Session started…"). `care` adds a crisis link for the author of a held message. */
  system?: boolean;
  care?: boolean;
};

const mini = 'inline-flex min-h-9 items-center rounded-[10px] px-2 text-[0.9375rem] font-semibold text-mute hover:bg-surface-2 hover:text-ink';

/** One chat line. Actions appear only on other members' messages. */
export function MessageBubble({
  message,
  onReport,
  onRequestDm,
  onBlock,
  careAction
}: {
  message: MessageView;
  onReport?: () => void;
  onRequestDm?: () => void;
  onBlock?: () => void;
  /** Rendered after a `care` system line (usually <CrisisHelp/>). */
  careAction?: ReactNode;
}) {
  const t = useTranslations('chat.message');
  const tb = useTranslations('badges');
  const tk = useTranslations('therapistKind');

  if (message.system) {
    return (
      <div className="flex max-w-[90%] flex-col items-center gap-2 self-center rounded-[20px] bg-surface-2 px-4 py-2 text-center text-[0.9375rem] text-ink-2">
        <span>{message.text}</span>
        {message.care ? careAction : null}
      </div>
    );
  }

  const others = !message.mine && !message.therapist;
  return (
    <div className={cn('flex max-w-[94%] items-start gap-3 sm:max-w-[82%]', message.mine && 'flex-row-reverse self-end')}>
      <Avatar index={message.avatar} size="sm" />
      <div
        className={cn(
          'flex min-w-0 flex-col gap-1 rounded-[22px] border px-4 py-3',
          message.held ? 'border-dashed border-warm-ink bg-warm-soft' : message.therapist ? 'border-transparent bg-green-soft' : message.mine ? 'border-transparent bg-blue-soft' : 'border-line bg-surface'
        )}
      >
        <div className="flex flex-wrap items-center gap-2 text-[0.9375rem]">
          <b dir="auto">{message.author}</b>
          {message.therapist ? <Badge tone="therapist">{tb('therapist', { kind: tk(message.therapist) })}</Badge> : null}
          <span className="text-mute" dir="ltr">{message.time}</span>
        </div>
        <p dir="auto" className="whitespace-pre-line">{message.text}</p>
        {message.held ? <span className="text-caption font-semibold text-warm-ink">{t('held')}</span> : null}
        {others && (onReport || onRequestDm || onBlock) ? (
          <div className="flex flex-wrap gap-0.5">
            {onReport ? <button type="button" className={mini} onClick={onReport} aria-label={t('reportFrom', { nickname: message.author })}>{t('report')}</button> : null}
            {onRequestDm ? <button type="button" className={mini} onClick={onRequestDm} aria-label={t('dmWith', { nickname: message.author })}>{t('dm')}</button> : null}
            {onBlock ? <button type="button" className={mini} onClick={onBlock} aria-label={t('blockNamed', { nickname: message.author })}>{t('block')}</button> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Scrolling message log. Polite live region so new messages are announced. */
export function MessageList({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="log" aria-live="polite" aria-label={label} tabIndex={0} className="flex max-h-140 min-h-90 flex-col gap-4 overflow-y-auto bg-bg p-4 sm:p-6">
      {children}
    </div>
  );
}

/** Room title bar + safety rule strip. */
export function RoomHeader({
  kind,
  title,
  community,
  live,
  hostLine,
  muted,
  onGuidedMinute,
  onToggleMute,
  onReport,
  onLeave,
  onBlock,
  titleAs: Title = 'h1'
}: {
  kind: RoomKind;
  title: string;
  community?: string;
  live?: boolean;
  hostLine?: string;
  muted: boolean;
  onGuidedMinute?: () => void;
  onToggleMute: () => void;
  onReport: () => void;
  onLeave: () => void;
  onBlock?: () => void;
  /** h1 on the room page itself; lower when embedded (e.g. the style guide). */
  titleAs?: 'h1' | 'h2' | 'h3';
}) {
  const t = useTranslations('chat.room');
  return (
    <div className="border-b border-line">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{t(`kind.${kind}`)}</Badge>
            {live ? <Badge tone="live"><LiveDot />{t('live')}</Badge> : null}
            {community ? <span className="text-caption text-mute">{community}</span> : null}
          </div>
          <Title className="text-2xl" dir="auto">{title}</Title>
          {hostLine ? <span className="text-caption text-mute">{hostLine}</span> : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {kind !== 'dm' && onGuidedMinute ? <Button size="sm" variant="secondary" onClick={onGuidedMinute}>{t('minute')}</Button> : null}
          <Button size="sm" variant="secondary" aria-pressed={muted} onClick={onToggleMute}>{muted ? t('unmute') : t('mute')}</Button>
          <Button size="sm" variant="secondary" onClick={onReport}>{t('report')}</Button>
          {kind === 'dm' && onBlock ? <Button size="sm" variant="secondary" onClick={onBlock}>{t('block')}</Button> : null}
          <Button size="sm" variant="ghost" onClick={onLeave}>{t('leave')}</Button>
        </div>
      </div>
      <p className="border-t border-line bg-surface-2 px-5 py-3 text-[0.9375rem] text-ink-2 sm:px-6">{t(`rule.${kind}`)}</p>
    </div>
  );
}

/** Message input. Enter sends, Shift+Enter adds a line. Blocks contact details. */
export function MessageComposer({ onSend, disabled }: { onSend: (text: string) => void | Promise<void>; disabled?: boolean }) {
  const t = useTranslations('chat.composer');
  const tp = useTranslations('composer.pii');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const x = text.trim();
    if (!x) return setError(t('empty'));
    if (x.length > 1000) return setError(t('tooLong'));
    const pii = detectPii(x);
    if (pii.length) return setError(t('removePii', { what: pii.map((p) => tp(`kinds.${p}`)).join(', ') }));
    await onSend(x);
    setText('');
    setError(null);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-2.5 border-t border-line p-3 sm:p-4">
      <div className="min-w-0 flex-[1_1_260px]">
        <Field label={<span className="sr-only">{t('label')}</span>} hint={t('hint')} error={error ?? undefined}>
          <Textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setError(null); }}
            onKeyDown={onKey}
            placeholder={t('label')}
            disabled={disabled}
            rows={1}
            className="min-h-14 resize-none"
          />
        </Field>
      </div>
      <Button onClick={send} disabled={disabled} className="mb-7">
        <SendIcon size={18} />
        {t('send')}
      </Button>
    </div>
  );
}

/** "quiet_river is writing…" */
export function TypingIndicator({ name }: { name: string | null }) {
  const t = useTranslations('chat');
  return (
    <div aria-live="polite" className="flex min-h-9 items-center gap-2 px-6 text-[0.9375rem] text-mute">
      {name ? (
        <>
          <span aria-hidden className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <i key={i} className="size-1.5 rounded-full bg-mute motion-safe:animate-[blink_1.2s_infinite]" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </span>
          {t('typing', { name })}
        </>
      ) : null}
    </div>
  );
}

/** Ask someone for a private chat. They can accept or decline. */
export function DmRequestDialog({ nickname, open, onOpenChange, onSend }: { nickname: string; open: boolean; onOpenChange: (o: boolean) => void; onSend: (note: string) => void | Promise<void> }) {
  const t = useTranslations('chat.dm');
  const tc = useTranslations('common');
  const [note, setNote] = useState('');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t('title', { nickname })} description={t('body')} closeLabel={tc('close')}>
        <Field label={t('note')} labelAside={tc('optional')}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className="min-h-24" />
        </Field>
        <div className="flex flex-wrap gap-3">
          <Button onClick={async () => { await onSend(note.trim()); setNote(''); onOpenChange(false); }}>{t('send')}</Button>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{tc('cancel')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
