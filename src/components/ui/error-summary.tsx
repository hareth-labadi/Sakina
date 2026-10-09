'use client';

import { useEffect, useRef } from 'react';

/**
 * List of problems shown at the top of a form after a failed submit.
 * It takes focus when it appears, so keyboard and screen-reader users land on it.
 * Each item can link to its field (`href="#field-id"`).
 */
export function ErrorSummary({ title, errors }: { title: string; errors: { id?: string; message: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const signature = errors.map((e) => e.message).join('|');

  useEffect(() => {
    if (signature) ref.current?.focus();
  }, [signature]);

  if (!errors.length) return null;
  return (
    <div ref={ref} tabIndex={-1} role="alert" className="flex flex-col gap-2 rounded-tile border border-warm-ink bg-warm-soft px-5 py-4 text-ink outline-none">
      <p className="font-semibold">{title}</p>
      <ul className="flex list-disc flex-col gap-1 ps-6">
        {errors.map((e) =>
          e.id ? (
            <li key={e.message}>
              <a href={`#${e.id}`} className="text-ink underline underline-offset-4">
                {e.message}
              </a>
            </li>
          ) : (
            <li key={e.message}>{e.message}</li>
          )
        )}
      </ul>
    </div>
  );
}
