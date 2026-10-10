'use client';

import { useTranslations } from 'next-intl';
import { buttonVariants, Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { Switch } from '@/components/ui/choice';
import { Card, Notice } from '@/components/ui/display';
import { Segmented } from '@/components/ui/segmented';
import { Link } from '@/i18n/navigation';
import type { PiiKind } from '@/lib/safety';
import type { Mood, PostType, VeilTopic } from '@/types/domain';
import { CrisisHelp } from '../crisis-help';

export const MOODS: Mood[] = ['heavy', 'low', 'okay', 'steady', 'light'];
export const VEIL_TOPICS: VeilTopic[] = ['selfharm', 'loss', 'violence', 'abuse', 'food', 'substances'];

/** Single choice: how today feels (check-ins). */
export function MoodPicker({ value, onChange, error }: { value: Mood | null; onChange: (m: Mood) => void; error?: string }) {
  const t = useTranslations('composer.mood');
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[1.0625rem] font-semibold">{t('label')}</span>
      <Segmented<Mood> label={t('label')} value={value ?? ('' as Mood)} onValueChange={onChange} options={MOODS.map((m) => ({ value: m, label: t(m) }))} />
      {error ? <p role="alert" className="text-caption font-semibold text-warm-ink">{error}</p> : null}
    </div>
  );
}

/** Starter sentences per post type. Clicking appends the prompt to the text. */
export function PromptChips({ type, onUse }: { type: PostType; onUse: (prompt: string) => void }) {
  const t = useTranslations('composer.prompts');
  const prompts = [t(`${type}.1`), t(`${type}.2`), t(`${type}.3`)];
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[1.0625rem] font-semibold">{t('label')}</span>
      <ChipGroup>
        {prompts.map((p) => (
          <Chip key={p} onClick={() => onUse(p)}>
            {p}
          </Chip>
        ))}
      </ChipGroup>
    </div>
  );
}

/** Content veil switch + which topics it covers (at least one required when on). */
export function VeilPicker({ enabled, onEnabledChange, topics, onTopicsChange, error }: { enabled: boolean; onEnabledChange: (v: boolean) => void; topics: VeilTopic[]; onTopicsChange: (t: VeilTopic[]) => void; error?: string }) {
  const t = useTranslations('composer.veil');
  const tt = useTranslations('story.topics');
  const toggle = (x: VeilTopic) => onTopicsChange(topics.includes(x) ? topics.filter((y) => y !== x) : [...topics, x]);
  return (
    <div className="flex flex-col gap-3">
      <Switch label={t('label')} hint={t('hint')} checked={enabled} onCheckedChange={onEnabledChange} />
      {enabled ? (
        <div className="flex flex-col gap-2">
          <span className="text-[1.0625rem] font-semibold" id="veil-topics">{t('topics')}</span>
          <ChipGroup role="group" aria-labelledby="veil-topics">
            {VEIL_TOPICS.map((x) => (
              <Chip key={x} pressed={topics.includes(x)} onClick={() => toggle(x)}>
                {tt(x)}
              </Chip>
            ))}
          </ChipGroup>
          {error ? <p role="alert" className="text-caption font-semibold text-warm-ink">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

/** Shown before posting when the text may identify someone. */
export function PiiWarning({ kinds, onEdit, onPostAnyway }: { kinds: PiiKind[]; onEdit: () => void; onPostAnyway: () => void }) {
  const t = useTranslations('composer.pii');
  return (
    <Notice tone="warn" role="alert" title={t('title')}>
      <p>{t('body')}</p>
      <ul className="my-2 list-disc ps-6">
        {kinds.map((k) => (
          <li key={k}>{t(`kinds.${k}`)}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2.5">
        <Button size="sm" onClick={onEdit}>{t('edit')}</Button>
        <Button size="sm" variant="secondary" onClick={onPostAnyway}>{t('anyway')}</Button>
      </div>
    </Notice>
  );
}

/** "Draft saved at 21:04" (announced politely). */
export function DraftStatus({ savedAt }: { savedAt: Date | null }) {
  const t = useTranslations('composer.draft');
  const time = savedAt ? savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : null;
  return (
    <p aria-live="polite" className="text-caption text-mute">
      {time ? t('saved', { time }) : t('auto')}
    </p>
  );
}

/** Caring message after the safety check holds a post for review. `backHref`: the post's community. */
export function HeldForReview({ backHref }: { backHref?: string }) {
  const t = useTranslations('composer.held');
  return (
    <Card tint="green" role="status" className="max-w-205 gap-5 p-8 sm:p-10">
      <h2 className="text-[clamp(1.75rem,3.2vw,2.375rem)]">{t('title')}</h2>
      <p className="text-lead">{t('body')}</p>
      <p>{t('body2')}</p>
      <div className="flex flex-wrap gap-3">
        <CrisisHelp size="md" />
        {backHref ? <Link href={backHref} className={buttonVariants({ variant: 'secondary' })}>{t('back')}</Link> : null}
        <Link href="/" className={buttonVariants({ variant: 'ghost' })}>{t('home')}</Link>
      </div>
    </Card>
  );
}
