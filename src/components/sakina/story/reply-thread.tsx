'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, Badge } from '@/components/ui/display';
import { Field, Textarea } from '@/components/ui/field';
import { detectPii } from '@/lib/safety';
import { cn } from '@/lib/cn';
import type { TherapistKind } from '@/types/domain';

export type ReplyView = {
  id: string;
  author: string;
  avatar: number;
  text: string;
  createdAt: string;
  therapist?: TherapistKind;
  /** Held by the safety check: only the author (and therapists) see it. */
  held?: boolean;
  relateCount: number;
  related: boolean;
  children?: ReplyView[];
};

/** Reply box with the shared validation (length + identifying-details hint). Returns true when posted. */
export function ReplyComposer({ onSubmit, onCancel, autoFocus, label }: { onSubmit: (text: string) => Promise<void> | void; onCancel?: () => void; autoFocus?: boolean; label?: string }) {
  const t = useTranslations('replies');
  const tc = useTranslations('common');
  const tp = useTranslations('composer.pii');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const x = text.trim();
    if (x.length < 2) return setError(t('tooShort'));
    const pii = detectPii(x);
    if (pii.length) return setError(t('removePii', { what: pii.map((p) => tp(`kinds.${p}`)).join(', ') }));
    setBusy(true);
    try {
      await onSubmit(x);
      setText('');
      setError(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Field label={label ?? t('write')} hint={t('hint')} error={error ?? undefined}>
        <Textarea value={text} onChange={(e) => { setText(e.target.value); setError(null); }} placeholder={t('placeholder')} className="min-h-28" autoFocus={autoFocus} maxLength={2000} />
      </Field>
      <div className="flex flex-wrap gap-3">
        <Button size="sm" onClick={submit} disabled={busy} aria-busy={busy || undefined}>
          {t('post')}
        </Button>
        {onCancel ? (
          <Button size="sm" variant="secondary" onClick={onCancel}>
            {tc('cancel')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** Two-level threaded replies. Therapist replies carry their badge. */
export function ReplyThread({
  replies,
  canInteract,
  onRelate,
  onReply,
  onReport
}: {
  replies: ReplyView[];
  canInteract: boolean;
  onRelate: (id: string) => void;
  onReply: (parentId: string, text: string) => Promise<void> | void;
  onReport: (id: string) => void;
}) {
  const t = useTranslations('replies');
  if (!replies.length) return <p className="text-caption text-mute">{t('none')}</p>;
  return (
    <ol className="flex flex-col">
      {replies.map((r) => (
        <ReplyItem key={r.id} reply={r} level={0} canInteract={canInteract} onRelate={onRelate} onReply={onReply} onReport={onReport} />
      ))}
    </ol>
  );
}

function ReplyItem({ reply, level, canInteract, onRelate, onReply, onReport }: { reply: ReplyView; level: 0 | 1 } & Omit<Parameters<typeof ReplyThread>[0], 'replies'>) {
  const t = useTranslations('replies');
  const tb = useTranslations('badges');
  const tk = useTranslations('therapistKind');
  const format = useFormatter();
  const [replying, setReplying] = useState(false);
  const mini = 'inline-flex min-h-10 items-center rounded-[10px] px-2 text-[0.9375rem] font-semibold text-mute hover:bg-surface-2 hover:text-ink';

  return (
    <li className={cn('flex flex-col', level === 0 ? 'border-t border-line py-4.5' : 'ms-6 border-s-2 border-line ps-5 pt-4 sm:ms-12')}>
      <div className="flex gap-3.5">
        <Avatar index={reply.avatar} size="sm" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <b dir="auto">{reply.author}</b>
            {reply.therapist ? <Badge tone="therapist">{tb('therapist', { kind: tk(reply.therapist) })}</Badge> : null}
            <time dateTime={reply.createdAt} className="text-caption text-mute">{format.relativeTime(new Date(reply.createdAt))}</time>
            {reply.held ? <Badge tone="warm">{t('heldOnlyYou')}</Badge> : null}
          </div>
          <p dir="auto" className="whitespace-pre-line text-ink">{reply.text}</p>
          {canInteract ? (
            <div className="flex flex-wrap gap-1">
              <button type="button" aria-pressed={reply.related} onClick={() => onRelate(reply.id)} className={cn(mini, 'aria-pressed:text-lav-ink')}>
                {t('relate', { count: reply.relateCount })}
              </button>
              {level === 0 ? (
                <button type="button" onClick={() => setReplying(true)} aria-label={t('replyTo', { nickname: reply.author })} className={mini}>
                  {t('reply')}
                </button>
              ) : null}
              <button type="button" onClick={() => onReport(reply.id)} aria-label={t('reportFrom', { nickname: reply.author })} className={mini}>
                {t('report')}
              </button>
            </div>
          ) : null}
          {replying ? (
            <ReplyComposer
              autoFocus
              label={t('replyTo', { nickname: reply.author })}
              onCancel={() => setReplying(false)}
              onSubmit={async (text) => {
                await onReply(reply.id, text);
                setReplying(false);
              }}
            />
          ) : null}
        </div>
      </div>
      {reply.children?.length ? (
        <ol className="flex flex-col">
          {reply.children.map((c) => (
            <ReplyItem key={c.id} reply={c} level={1} canInteract={canInteract} onRelate={onRelate} onReply={onReply} onReport={onReport} />
          ))}
        </ol>
      ) : null}
    </li>
  );
}
