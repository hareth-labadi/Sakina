import { cn } from '@/lib/cn';

export function LogoMark({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden focusable="false" className={className}>
      <path d="M10 58V30a22 22 0 0 1 44 0v28Z" fill="#8BB8E8" />
      <circle cx="32" cy="42" r="9" fill="#C8B6FF" />
      <path d="M6 58h52" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Mark + Latin wordmark + Arabic wordmark (Reem Kufi). Both names always show, in every locale. */
export function Logo({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 text-ink', className)}>
      <LogoMark />
      <span lang="en" dir="ltr" className="font-[family-name:var(--font-bricolage)] text-[1.625rem] font-semibold tracking-[-0.012em]">
        Sakina
      </span>
      <span lang="ar" dir="rtl" className={cn('font-wordmark text-[1.375rem] font-medium text-blue-ink', compact && 'max-sm:hidden')}>
        سكينة
      </span>
    </span>
  );
}
