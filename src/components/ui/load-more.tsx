'use client';

import { Button } from './button';

/** "Load more" for long lists (calmer than infinite scroll, and keyboard-friendly). */
export function LoadMore({ onClick, loading, done, label, loadingLabel, doneLabel }: { onClick: () => void; loading?: boolean; done?: boolean; label: string; loadingLabel: string; doneLabel: string }) {
  if (done) return <p className="text-center text-caption text-mute">{doneLabel}</p>;
  return (
    <div className="flex justify-center">
      <Button variant="secondary" onClick={onClick} disabled={loading} aria-busy={loading || undefined}>
        {loading ? loadingLabel : label}
      </Button>
    </div>
  );
}
