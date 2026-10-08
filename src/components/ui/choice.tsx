'use client';

import { Switch as SwitchPrimitive } from 'radix-ui';
import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Checkbox with its label. Native input for full keyboard and screen-reader support. */
export function Checkbox({ label, className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode }) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3 text-[1.0625rem] leading-normal', className)}>
      <input type="checkbox" className="mt-0.5 size-5.5 shrink-0 cursor-pointer accent-blue-ink" {...props} />
      <span>{label}</span>
    </label>
  );
}

/** Large radio option with a title and description. Group several with the same `name` inside a <fieldset>. */
export function RadioCard({
  title,
  description,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'title'> & { title: ReactNode; description?: ReactNode }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3.5 rounded-tile border border-line bg-bg p-4.5 transition-shadow',
        'has-[:checked]:border-[#5E8FC4] has-[:checked]:shadow-[0_0_0_3px_var(--glow-a)]',
        'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-focus',
        className
      )}
    >
      <input type="radio" className="mt-1 size-5.5 shrink-0 cursor-pointer accent-blue-ink focus-visible:outline-none" {...props} />
      <span className="flex flex-col gap-1">
        <span className="font-semibold">{title}</span>
        {description ? <span className="text-caption text-mute">{description}</span> : null}
      </span>
    </label>
  );
}

/** Toggle switch with label and optional hint. */
export function Switch({
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
  className
}: {
  label: ReactNode;
  hint?: ReactNode;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn('flex min-h-13 items-center justify-between gap-4', className)}>
      <label htmlFor={id} className="flex cursor-pointer flex-col gap-0.5">
        <span className="font-semibold">{label}</span>
        {hint ? <span className="text-caption text-mute">{hint}</span> : null}
      </label>
      <SwitchPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="relative h-7.5 w-13 shrink-0 cursor-pointer rounded-full bg-line transition-colors data-[state=checked]:bg-[#5E8FC4] disabled:cursor-not-allowed disabled:opacity-45"
      >
        <SwitchPrimitive.Thumb className="block size-6 translate-x-[3px] rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[25px] rtl:-translate-x-[3px] rtl:data-[state=checked]:-translate-x-[25px]" />
      </SwitchPrimitive.Root>
    </div>
  );
}
