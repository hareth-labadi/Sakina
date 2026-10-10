'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, type FormEvent } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { RadioCard } from '@/components/ui/choice';
import { EmptyState, LoadingState, Notice } from '@/components/ui/display';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';
import { useToast } from '@/components/ui/toast';
import { CONDITIONS } from '@/data/conditions';
import { Link, useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { detectPii, type PiiKind } from '@/lib/safety';
import { useSessionState } from '@/lib/session';
import { stories } from '@/services';
import type { Mood, PostType, VeilTopic, Visibility } from '@/types/domain';
import { DraftStatus, HeldForReview, MoodPicker, PiiWarning, PromptChips, VeilPicker } from './composer-widgets';

const TYPES: PostType[] = ['story', 'checkin', 'win'];
const DRAFT_KEY = 'sakina-draft-v1';

type Draft = { communityId: string; type: PostType; title: string; body: string; visibility: Visibility; mood: Mood | null; veilOn: boolean; veil: VeilTopic[] };
type Errors = Partial<Record<'communityId' | 'title' | 'body' | 'mood' | 'veil', string>>;

const empty = (communityId: string): Draft => ({ communityId, type: 'story', title: '', body: '', visibility: 'members', mood: null, veilOn: false, veil: [] });

/** The draft is a convenience in this browser only; any failure just means no draft. */
function readDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}
function writeDraft(d: Draft | null) {
  try {
    if (d) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage blocked: no draft */
  }
}

/**
 * Write a story, check-in or small win. Anonymous, like everything on Sakina.
 *
 * The identifying-details check runs here as a hint (the member can edit or post anyway); the API
 * runs the real one and holds the post for a moderator, as it does for every post in a
 * high-sensitivity community. The draft saves itself in this browser.
 */
export function StoryComposer({ initialCommunity }: { initialCommunity?: string }) {
  const t = useTranslations('write');
  const ts = useTranslations('story.types');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { toast } = useToast();
  const { status, user } = useSessionState();
  const communities = CONDITIONS.filter((c) => c.status === 'active');
  const known = (id?: string) => (id && communities.some((c) => c.id === id) ? id : '');

  // An unfinished draft comes back (the community from the link wins over the draft's). The form
  // only shows once the session is known, which never happens during server rendering, so reading
  // localStorage here can't cause a hydration mismatch.
  const [draft, setDraft] = useState<Draft>(() => {
    const d = typeof window === 'undefined' ? null : readDraft();
    return d ? { ...d, communityId: known(initialCommunity) || d.communityId } : empty(known(initialCommunity));
  });
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [pii, setPii] = useState<PiiKind[]>([]);
  const [busy, setBusy] = useState(false);
  const [held, setHeld] = useState<string | null>(null);

  // Save the draft while writing (a moment after the last change).
  useEffect(() => {
    const id = window.setTimeout(() => {
      const hasText = draft.title.trim() || draft.body.trim();
      writeDraft(hasText ? draft : null);
      if (hasText) setSavedAt(new Date());
    }, 800);
    return () => window.clearTimeout(id);
  }, [draft]);

  if (!user && status === 'loading') return <LoadingState caption={t('loading')} />;
  if (!user) {
    return (
      <EmptyState
        as="h2"
        title={t('guestTitle')}
        body={t('guestBody')}
        action={
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className={buttonVariants()}>
              {t('join')}
            </Link>
            <Link href="/signin" className={buttonVariants({ variant: 'secondary' })}>
              {t('signIn')}
            </Link>
          </div>
        }
      />
    );
  }

  if (held) return <HeldForReview backHref={`/communities/${held}`} />;

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors((e) => ({ ...e, ...Object.fromEntries(Object.keys(patch).map((k) => [k, undefined])) }));
  };
  const community = communities.find((c) => c.id === draft.communityId);

  const validate = (): Errors => ({
    communityId: draft.communityId ? undefined : t('errors.community'),
    title: draft.title.trim().length >= 3 ? undefined : t('errors.title'),
    body: draft.body.trim() ? undefined : t('errors.body'),
    mood: draft.type === 'checkin' && !draft.mood ? t('errors.mood') : undefined,
    veil: draft.veilOn && !draft.veil.length ? t('errors.veil') : undefined
  });

  const post = async () => {
    setBusy(true);
    try {
      const res = await stories.create({
        communityId: draft.communityId,
        type: draft.type,
        title: draft.title.trim(),
        body: draft.body.trim(),
        visibility: draft.visibility,
        veil: draft.veilOn ? draft.veil : [],
        ...(draft.type === 'checkin' && draft.mood && { mood: draft.mood })
      });
      if (!res.ok) return toast(res.error === 'post_limit' ? t('postLimit') : t('failed'));
      writeDraft(null);
      if (res.story.status === 'held') return setHeld(res.story.communityId);
      toast(t('published'));
      router.push(`/stories/${res.story.id}`);
    } catch {
      toast(t('failed'));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    // A hint, not a block: the member decides; the API holds it for a moderator if needed.
    const kinds = detectPii(`${draft.title}\n${draft.body}`);
    if (kinds.length && !pii.length) return setPii(kinds);
    void post();
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-205 flex-col gap-7">
      <Field label={t('community')} error={errors.communityId}>
        <Select value={draft.communityId} onChange={(e) => set({ communityId: e.target.value })}>
          <option value="">{t('communityPick')}</option>
          {communities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name[locale]}
            </option>
          ))}
        </Select>
      </Field>
      {community?.sensitivity === 'high' ? <Notice tone="info" title={t('reviewNote', { community: community.name[locale] })} /> : null}

      <div className="flex flex-col gap-2">
        <span className="text-[1.0625rem] font-semibold">{t('type')}</span>
        <Segmented<PostType> label={t('type')} value={draft.type} onValueChange={(type) => set({ type })} options={TYPES.map((x) => ({ value: x, label: ts(x) }))} />
      </div>

      {draft.type === 'checkin' ? <MoodPicker value={draft.mood} onChange={(mood) => set({ mood })} error={errors.mood} /> : null}

      <Field label={t('titleLabel')} hint={t('titleHint')} error={errors.title}>
        <Input value={draft.title} onChange={(e) => set({ title: e.target.value })} maxLength={120} dir="auto" />
      </Field>

      <div className="flex flex-col gap-3">
        <Field label={t('body')} hint={t('bodyHint')} error={errors.body}>
          <Textarea
            value={draft.body}
            onChange={(e) => {
              set({ body: e.target.value });
              setPii([]);
            }}
            className="min-h-60"
            maxLength={10_000}
            dir="auto"
          />
        </Field>
        <PromptChips type={draft.type} onUse={(p) => set({ body: draft.body ? `${draft.body.trimEnd()}\n\n${p} ` : `${p} ` })} />
        <DraftStatus savedAt={savedAt} />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-[1.0625rem] font-semibold">{t('audience')}</legend>
        <RadioCard name="visibility" title={t('members')} description={t('membersHint')} checked={draft.visibility === 'members'} onChange={() => set({ visibility: 'members' })} />
        <RadioCard name="visibility" title={t('everyone')} description={t('everyoneHint')} checked={draft.visibility === 'public'} onChange={() => set({ visibility: 'public' })} />
      </fieldset>

      <VeilPicker enabled={draft.veilOn} onEnabledChange={(veilOn) => set({ veilOn })} topics={draft.veil} onTopicsChange={(veil) => set({ veil })} error={errors.veil} />

      {pii.length ? <PiiWarning kinds={pii} onEdit={() => setPii([])} onPostAnyway={() => void post()} /> : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? t('posting') : t('submit')}
        </Button>
        {draft.title || draft.body ? (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              writeDraft(null);
              setSavedAt(null);
              setPii([]);
              setDraft(empty(draft.communityId));
            }}
          >
            {t('discard')}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
