'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { Field, Input } from '@/components/ui/field';
import { CheckIcon } from '@/components/ui/icons';
import { isValidNickname } from '@/lib/safety';
import { accounts } from '@/services';

export type NicknameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

/**
 * Nickname input with a debounced availability check and suggestions when taken.
 * `error` (e.g. from submit validation) takes precedence over the live status.
 */
export function NicknameField({
  value,
  onChange,
  onStatusChange,
  error,
  current,
  id
}: {
  value: string;
  onChange: (v: string) => void;
  onStatusChange?: (s: NicknameStatus) => void;
  error?: string;
  /** The member's own nickname (profile edit): unchanged counts as fine. */
  current?: string;
  /** Lets an error summary link to this field. */
  id?: string;
}) {
  const t = useTranslations('account.nickname');
  const [status, setStatus] = useState<NicknameStatus>('idle');
  const trimmed = value.trim();

  useEffect(() => {
    let cancelled = false;
    const report = (s: NicknameStatus) => {
      if (cancelled) return;
      setStatus(s);
      onStatusChange?.(s);
    };
    if (!trimmed || (current && trimmed.toLowerCase() === current.toLowerCase())) {
      const id = window.setTimeout(() => report('idle'), 0);
      return () => { cancelled = true; window.clearTimeout(id); };
    }
    if (!isValidNickname(trimmed)) {
      const id = window.setTimeout(() => report('invalid'), 0);
      return () => { cancelled = true; window.clearTimeout(id); };
    }
    const id = window.setTimeout(async () => {
      report('checking');
      const ok = await accounts.isNicknameAvailable(trimmed);
      report(ok ? 'available' : 'taken');
    }, 450);
    return () => { cancelled = true; window.clearTimeout(id); };
    // onStatusChange is a callback prop; re-running on its identity would re-check needlessly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, current]);

  const liveError = status === 'taken' ? t('taken') : status === 'invalid' ? t('invalid') : undefined;

  return (
    <Field id={id} label={t('label')} hint={t('hint')} error={error ?? liveError}>
      <Input value={value} onChange={(e) => onChange(e.target.value)} autoComplete="username" spellCheck={false} autoCapitalize="none" maxLength={20} />
      <p aria-live="polite" className="min-h-6 text-caption">
        {status === 'checking' ? <span className="text-mute">{t('checking')}</span> : null}
        {status === 'available' && !error ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-green-ink">
            <CheckIcon size={16} />
            {t('available')}
          </span>
        ) : null}
      </p>
      {status === 'taken' ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption text-mute">{t('tryOne')}</span>
          <ChipGroup>
            {accounts.suggestNicknames(trimmed).map((s) => (
              <Chip key={s} onClick={() => onChange(s)} dir="ltr">
                {s}
              </Chip>
            ))}
          </ChipGroup>
        </div>
      ) : null}
    </Field>
  );
}
