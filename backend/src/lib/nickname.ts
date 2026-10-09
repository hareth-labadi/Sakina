/** Same pattern as the web app (src/lib/safety.ts). */
export const NICKNAME_PATTERN = /^[\p{L}\p{N}_.]{3,20}$/u;

/** Staff and system names members can't take. Staff accounts are created with the CLI instead. */
export const RESERVED_NICKNAMES = ['admin', 'sakina', 'therapist', 'moderator', 'support', 'staff', 'system'];

/**
 * The comparison key: NFKC folds look-alike forms (full-width letters, ligatures) and lowercasing
 * makes "Amal" and "amal" the same account.
 */
export const nicknameKey = (nickname: string) => nickname.trim().normalize('NFKC').toLowerCase();

export const isReserved = (key: string) => RESERVED_NICKNAMES.includes(key);
