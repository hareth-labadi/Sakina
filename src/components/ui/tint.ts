/** The four brand pastels, used for community colours, cards and tiles. */
export type Tint = 'blue' | 'green' | 'lav' | 'sand';

export const tintBg: Record<Tint, string> = {
  blue: 'bg-blue-soft',
  green: 'bg-green-soft',
  lav: 'bg-lav-soft',
  sand: 'bg-sand-soft'
};

export const tintInk: Record<Tint, string> = {
  blue: 'text-blue-ink',
  green: 'text-green-ink',
  lav: 'text-lav-ink',
  sand: 'text-sand-ink'
};
