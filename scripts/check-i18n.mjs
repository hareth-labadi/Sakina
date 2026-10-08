// Checks that every locale has exactly the same message keys as English.
// Usage: npm run check:i18n
import { readFileSync } from 'node:fs';

const flat = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

const load = (l) => JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), 'utf8'));
const ref = new Set(flat(load('en')));
let failed = false;

for (const locale of ['ar', 'fr']) {
  const keys = new Set(flat(load(locale)));
  const missing = [...ref].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !ref.has(k));
  if (missing.length || extra.length) {
    failed = true;
    if (missing.length) console.error(`${locale}: missing ${missing.length}:\n  ${missing.join('\n  ')}`);
    if (extra.length) console.error(`${locale}: not in en ${extra.length}:\n  ${extra.join('\n  ')}`);
  } else {
    console.log(`${locale}: ${keys.size} keys, in sync with en`);
  }
}

process.exit(failed ? 1 : 0);
