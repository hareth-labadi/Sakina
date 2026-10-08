/**
 * Crisis resources per country.
 * DO NOT add numbers until they are verified with local partners. Empty value = placeholder shown in the UI.
 */
export const CRISIS_COUNTRIES = ['DZ', 'FR', 'MA', 'TN', 'OTHER'] as const;
export type CrisisCountry = (typeof CRISIS_COUNTRIES)[number];

export type CrisisLineKind = 'emergency' | 'listening' | 'hospital';

export const CRISIS_RESOURCES: Record<CrisisCountry, { kind: CrisisLineKind; value: string }[]> = {
  DZ: [{ kind: 'emergency', value: '' }, { kind: 'listening', value: '' }, { kind: 'hospital', value: '' }],
  FR: [{ kind: 'emergency', value: '' }, { kind: 'listening', value: '' }, { kind: 'hospital', value: '' }],
  MA: [{ kind: 'emergency', value: '' }, { kind: 'listening', value: '' }, { kind: 'hospital', value: '' }],
  TN: [{ kind: 'emergency', value: '' }, { kind: 'listening', value: '' }, { kind: 'hospital', value: '' }],
  OTHER: [{ kind: 'emergency', value: '' }, { kind: 'listening', value: '' }]
};
