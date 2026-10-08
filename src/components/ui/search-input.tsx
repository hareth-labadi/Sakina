'use client';

import { useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { controlClass } from './field';
import { CloseIcon, SearchIcon } from './icons';

/** Search box with a visually hidden label and an optional clear button. */
export function SearchInput({
  label,
  clearLabel,
  onClear,
  className,
  value,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string; clearLabel?: string; onClear?: () => void }) {
  const id = useId();
  const hasValue = typeof value === 'string' && value.length > 0;
  return (
    <div className={cn('relative min-w-0 flex-1', className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <SearchIcon size={20} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-mute" />
      <input
        id={id}
        type="search"
        placeholder={label}
        autoComplete="off"
        value={value}
        className={cn(controlClass, 'min-h-13.5 ps-12 pe-12 [&::-webkit-search-cancel-button]:hidden')}
        {...props}
      />
      {hasValue && onClear && clearLabel ? (
        <button
          type="button"
          onClick={onClear}
          aria-label={clearLabel}
          className="absolute end-2 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-mute hover:bg-surface-2 hover:text-ink"
        >
          <CloseIcon size={18} />
        </button>
      ) : null}
    </div>
  );
}
