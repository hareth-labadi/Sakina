'use client';

import { ToggleGroup } from 'radix-ui';
import { cn } from '@/lib/cn';

export type SegmentedOption<T extends string> = { value: T; label: React.ReactNode };

/** Single-choice pill group (filters, post type, theme). Arrow keys move between options. */
export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  label,
  className
}: {
  value: T;
  onValueChange: (v: T) => void;
  options: SegmentedOption<T>[];
  /** Accessible name for the group. */
  label: string;
  className?: string;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v as T)}
      aria-label={label}
      className={cn('inline-flex max-w-full flex-wrap gap-1 rounded-full border border-line bg-surface-2 p-1', className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          className="min-h-10.5 cursor-pointer rounded-full px-4 text-base font-semibold text-ink-2 transition-colors data-[state=on]:bg-primary data-[state=on]:text-primary-fg"
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
