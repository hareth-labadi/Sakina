'use client';

import { Toast as T } from 'radix-ui';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CloseIcon } from './icons';

type ToastItem = { id: number; message: ReactNode };
type ToastApi = { toast: (message: ReactNode) => void };

const ToastContext = createContext<ToastApi | null>(null);

/** Calm, short confirmations ("Saved", "Reply posted"). Never use toasts for errors that need action. */
export function ToastProvider({ closeLabel, children }: { closeLabel: string; children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: ReactNode) => {
    setItems((prev) => [...prev.slice(-2), { id: Date.now() + Math.random(), message }]);
  }, []);

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      <T.Provider duration={4200} swipeDirection="down">
        {children}
        {items.map((item) => (
          <T.Root
            key={item.id}
            onOpenChange={(open) => !open && setItems((prev) => prev.filter((x) => x.id !== item.id))}
            className="flex items-center justify-between gap-3 rounded-[18px] bg-primary py-3 ps-5 pe-3 text-base font-semibold text-primary-fg shadow-soft"
          >
            <T.Description>{item.message}</T.Description>
            <T.Close aria-label={closeLabel} className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
              <CloseIcon size={18} />
            </T.Close>
          </T.Root>
        ))}
        <T.Viewport className="fixed bottom-5 start-1/2 z-90 flex w-[min(560px,calc(100%-32px))] flex-col gap-2 outline-none ltr:-translate-x-1/2 rtl:translate-x-1/2" />
      </T.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
