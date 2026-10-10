import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONDITIONS } from './conditions';

/**
 * The communities exist twice: here (names, descriptions, tint: UI copy) and in the API database
 * (id + sensitivity, from the migration). This keeps the two lists from drifting apart.
 */
describe('communities', () => {
  it('match the API migration: same ids, same sensitivity', () => {
    const sql = readFileSync(new URL('../../backend/drizzle/0002_content.sql', import.meta.url), 'utf8');
    const inApi = [...sql.matchAll(/\('([a-z0-9-]+)', '(standard|sensitive|high)'\)/g)].map(([, id, sensitivity]) => ({ id, sensitivity }));
    expect(inApi.length).toBeGreaterThan(0);
    expect(CONDITIONS.map((c) => ({ id: c.id, sensitivity: c.sensitivity })).sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      inApi.sort((a, b) => a.id!.localeCompare(b.id!))
    );
  });

  it('have every text in the three languages', () => {
    for (const c of CONDITIONS) {
      for (const l of ['ar', 'fr', 'en'] as const) {
        expect(c.name[l], `${c.id} name ${l}`).toBeTruthy();
        expect(c.description[l], `${c.id} description ${l}`).toBeTruthy();
      }
    }
  });
});
