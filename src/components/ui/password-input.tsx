'use client';

import { useState, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { passwordLevel, type PasswordLevel } from '@/lib/password';
import { Input } from './field';
import { EyeIcon, EyeOffIcon } from './icons';

export type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  showLabel: string;
  hideLabel: string;
};

/** Password input with a show/hide toggle. Place inside <Field>. */
export function PasswordInput({ showLabel, hideLabel, className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className={cn('pe-28', className)} />
      <button
        type="button"
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        className="absolute end-1.5 top-1.5 inline-flex min-h-10.5 items-center gap-1.5 rounded-xl bg-surface-2 px-3.5 text-caption font-semibold text-ink"
      >
        {visible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
        {visible ? hideLabel : showLabel}
      </button>
    </div>
  );
}

const barTone: Record<PasswordLevel, string> = { 0: '', 1: 'bg-warm-ink', 2: 'bg-[#D9A441]', 3: 'bg-[#2F9E6B]' };

/** Three-bar strength hint. `labels` = [empty, weak, okay, strong]. */
export function PasswordStrength({ value, labels }: { value: string; labels: [string, string, string, string] }) {
  const level = passwordLevel(value);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-3 gap-1.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={cn('h-1.5 rounded-full bg-line', level >= i && barTone[level])} />
        ))}
      </div>
      <p className="min-h-[1.4em] text-caption text-mute" aria-live="polite">
        {labels[level]}
      </p>
    </div>
  );
}
