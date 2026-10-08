'use client';

import { useState, type ReactNode } from 'react';
import { Button } from './button';
import { Dialog, DialogContent } from './dialog';
import { Field, Textarea } from './field';

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
  /** Destructive actions (delete, ban, escalate) use the danger style. */
  danger?: boolean;
  /** When set, a reason must be written before confirming (it goes to the audit log). */
  reason?: { label: string; hint?: string; requiredError: string; minLength?: number };
  /** Extra fields (e.g. a duration select) rendered above the reason. */
  children?: ReactNode;
  onConfirm: (reason: string) => void | Promise<void>;
};

export function ConfirmDialog({ open, onOpenChange, title, body, confirmLabel, cancelLabel, closeLabel, danger, reason, children, onConfirm }: ConfirmDialogProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = (next: boolean) => {
    if (!next) {
      setText('');
      setError(null);
    }
    onOpenChange(next);
  };

  const submit = async () => {
    if (reason && text.trim().length < (reason.minLength ?? 4)) {
      setError(reason.requiredError);
      return;
    }
    setBusy(true);
    try {
      await onConfirm(text.trim());
      close(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent title={title} description={body} closeLabel={closeLabel}>
        {children}
        {reason ? (
          <Field label={reason.label} hint={reason.hint} error={error ?? undefined}>
            <Textarea value={text} onChange={(e) => { setText(e.target.value); setError(null); }} className="min-h-26" />
          </Field>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button variant={danger ? 'danger' : 'primary'} onClick={submit} disabled={busy} aria-busy={busy || undefined}>
            {confirmLabel}
          </Button>
          <Button variant="secondary" onClick={() => close(false)}>
            {cancelLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
