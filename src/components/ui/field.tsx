'use client';

import { createContext, useContext, useId, type AriaAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { AlertIcon } from './icons';

type FieldContextValue = { id: string; describedBy?: string; invalid: boolean };
const FieldContext = createContext<FieldContextValue | null>(null);

export type FieldProps = {
  label: ReactNode;
  /** Shown under the control. */
  hint?: ReactNode;
  /** Error message. When set, the control is marked invalid and announced. */
  error?: ReactNode;
  /** Extra text after the label, e.g. "(optional)". */
  labelAside?: ReactNode;
  /** Element placed on the label row's opposite end, e.g. a "Forgot password?" link. */
  labelEnd?: ReactNode;
  id?: string;
  className?: string;
  children: ReactNode;
};

export function Field({ label, hint, error, labelAside, labelEnd, id: idProp, className, children }: FieldProps) {
  const autoId = useId();
  const id = idProp ?? `f${autoId.replace(/:/g, '')}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(error) }}>
      <div className={cn('flex flex-col gap-2', className)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor={id} className="text-[1.0625rem] font-semibold text-ink">
            {label}
            {labelAside ? <span className="ms-1.5 text-caption font-normal text-mute">{labelAside}</span> : null}
          </label>
          {labelEnd}
        </div>
        {children}
        {hint ? (
          <p id={hintId} className="text-caption text-mute">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} role="alert" className="flex items-start gap-1.5 text-caption font-semibold text-warm-ink">
            <AlertIcon size={18} className="mt-0.5" />
            <span>{error}</span>
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

/** Wires a control to the surrounding <Field>. Works standalone too. */
export function useFieldControl(props: { id?: string; 'aria-describedby'?: string; 'aria-invalid'?: AriaAttributes['aria-invalid'] }) {
  const ctx = useContext(FieldContext);
  return {
    id: props.id ?? ctx?.id,
    'aria-describedby': [props['aria-describedby'], ctx?.describedBy].filter(Boolean).join(' ') || undefined,
    'aria-invalid': props['aria-invalid'] ?? (ctx?.invalid ? true : undefined)
  };
}

export const controlClass = cn(
  'w-full rounded-field border border-line bg-bg px-4 text-[1.0625rem] text-ink placeholder:text-mute',
  'transition-[border-color,box-shadow] outline-none',
  'focus:border-dawn focus:shadow-[0_0_0_4px_var(--glow-a)]',
  'aria-invalid:border-warm-ink',
  'disabled:cursor-not-allowed disabled:opacity-60'
);

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const wiring = useFieldControl(props);
  return <input {...props} {...wiring} className={cn(controlClass, 'min-h-13.5', className)} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const wiring = useFieldControl(props);
  return <textarea {...props} {...wiring} className={cn(controlClass, 'min-h-36 resize-y py-3.5 leading-relaxed', className)} />;
}

/** Native select: best accessibility and mobile behaviour for short option lists. */
export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const wiring = useFieldControl(props);
  return (
    <select {...props} {...wiring} className={cn(controlClass, 'min-h-13.5 cursor-pointer px-3', className)}>
      {children}
    </select>
  );
}
