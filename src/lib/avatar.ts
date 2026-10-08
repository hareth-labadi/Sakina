/** Abstract gradient avatars. No photos, ever. */
export const AVATAR_GRADIENTS = [
  ['#8BB8E8', '#C8B6FF'],
  ['#A8D5BA', '#8BB8E8'],
  ['#C8B6FF', '#F2C4A8'],
  ['#F2DDB0', '#A8D5BA'],
  ['#8BB8E8', '#A8D5BA'],
  ['#C8B6FF', '#A8D5BA'],
  ['#F2C4A8', '#C8B6FF'],
  ['#A8D5BA', '#F2DDB0']
] as const;

export const AVATAR_COUNT = AVATAR_GRADIENTS.length;

/** Stable index for a nickname, used when an account has no stored avatar. */
export function avatarIndexFor(seed: string): number {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % AVATAR_COUNT;
}

export function avatarBackground(index: number): string {
  const pair = AVATAR_GRADIENTS[((index % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT]!;
  return `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`;
}
