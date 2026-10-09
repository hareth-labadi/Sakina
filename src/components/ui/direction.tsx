'use client';

import { Direction } from 'radix-ui';
import type { ReactNode } from 'react';

/**
 * Tells every Radix primitive (tabs, toggle groups, menus, popovers…) the reading direction.
 * Without it Radix renders dir="ltr" on its elements, which breaks order and arrow keys in Arabic.
 */
export function DirectionProvider({ dir, children }: { dir: 'ltr' | 'rtl'; children: ReactNode }) {
  return <Direction.Provider dir={dir}>{children}</Direction.Provider>;
}
