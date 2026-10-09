import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap select-none',
    'transition-[transform,opacity,background-color] duration-150 active:scale-[0.97]',
    'disabled:cursor-not-allowed disabled:border disabled:border-line disabled:bg-surface-2 disabled:text-mute disabled:active:scale-100',
    'aria-disabled:cursor-not-allowed aria-disabled:bg-surface-2 aria-disabled:text-mute'
  ],
  {
    variants: {
      variant: {
        /** Ink pill in light mode, Dawn Blue pill in dark mode. One per view. */
        primary: 'bg-primary text-primary-fg hover:opacity-90',
        secondary: 'border border-line bg-surface text-ink hover:bg-surface-2',
        ghost: 'bg-transparent px-2.5 text-ink underline decoration-line underline-offset-[6px] hover:decoration-ink',
        soft: 'bg-dawn text-[#0B1224] hover:opacity-90',
        /** Crisis help. Terracotta, never alarm red. */
        crisis: 'border border-warm-ink bg-warm-soft text-warm-ink hover:opacity-90',
        /** Destructive confirm (delete, ban). */
        danger: 'bg-warm-ink text-danger-fg hover:opacity-90'
      },
      size: {
        sm: 'min-h-11 px-4.5 text-base',
        md: 'min-h-13 px-6.5 text-[1.0625rem]',
        lg: 'min-h-15 px-8 text-lg'
      },
      full: { true: 'w-full' }
    },
    compoundVariants: [{ variant: 'ghost', className: 'px-2.5' }],
    defaultVariants: { variant: 'primary', size: 'md' }
  }
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (e.g. a Link) with button styles. */
    asChild?: boolean;
  };

export function Button({ className, variant, size, full, asChild, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, full }), className)}
      {...(asChild ? {} : { type: type ?? 'button' })}
      {...props}
    />
  );
}

/** Round icon-only button. Always pass an accessible `label`. */
export function IconButton({ label, className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'relative inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:bg-surface-2',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
