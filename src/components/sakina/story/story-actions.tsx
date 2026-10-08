'use client';

import { useTranslations } from 'next-intl';
import { BookmarkIcon, FlagIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';

const action = 'inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-base font-semibold text-mute hover:bg-surface-2 hover:text-ink';

/** Save / copy link / report row under a story. */
export function StoryActions({ saved, onToggleSave, shareUrl, onReport }: { saved: boolean; onToggleSave: () => void; shareUrl: string; onReport: () => void }) {
  const t = useTranslations('story.actions');
  const { toast } = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast(t('copied'));
    } catch {
      toast(t('copyFailed'));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-y border-line py-2">
      <button type="button" aria-pressed={saved} onClick={onToggleSave} className={cn(action, saved && 'text-lav-ink')}>
        <BookmarkIcon size={18} className={saved ? 'fill-current' : undefined} />
        {saved ? t('saved') : t('save')}
      </button>
      <button type="button" onClick={copy} className={action}>
        {t('copy')}
      </button>
      <button type="button" onClick={onReport} className={action}>
        <FlagIcon size={18} />
        {t('report')}
      </button>
    </div>
  );
}
