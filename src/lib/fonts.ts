import localFont from 'next/font/local';

/**
 * Self-hosted fonts (OFL-1.1), from the Fontsource npm packages. The build never downloads a font,
 * so it can't fail because Google Fonts is slow or unreachable, and visitors' browsers never
 * contact Google. Dependabot updates the packages like any other dependency.
 *
 * Variable fonts carry every weight in one file. Only the subsets the site needs: latin for
 * en/fr, arabic for ar. Characters outside them use the fallback fonts in globals.css.
 * (next/font needs these options written out literally: no shared path constants.)
 */

// Latin: display + UI + labels
const bricolage = localFont({
  src: '../../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2',
  weight: '200 800',
  variable: '--font-bricolage',
  display: 'swap'
});
const instrument = localFont({
  src: '../../node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2',
  weight: '400 700',
  variable: '--font-instrument',
  display: 'swap'
});
const jetbrains = localFont({
  src: '../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2',
  weight: '100 800',
  variable: '--font-jetbrains',
  display: 'swap'
});

// Arabic: display + UI + wordmark
// Cairo's Arabic and Latin letters are two files, so two families; globals.css lists both, Arabic
// first. No metric-matched fallback on the Arabic one, or Latin letters would stop at that fallback
// (Arial) instead of reaching Cairo's own Latin.
const cairo = localFont({
  src: '../../node_modules/@fontsource-variable/cairo/files/cairo-arabic-wght-normal.woff2',
  weight: '200 1000',
  variable: '--font-cairo',
  display: 'swap',
  adjustFontFallback: false
});
const cairoLatin = localFont({
  src: '../../node_modules/@fontsource-variable/cairo/files/cairo-latin-wght-normal.woff2',
  weight: '200 1000',
  variable: '--font-cairo-latin',
  display: 'swap'
});
const plexArabic = localFont({
  src: [
    { path: '../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-400-normal.woff2', weight: '400' },
    { path: '../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-500-normal.woff2', weight: '500' },
    { path: '../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-600-normal.woff2', weight: '600' },
    { path: '../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-700-normal.woff2', weight: '700' }
  ],
  variable: '--font-plex-ar',
  display: 'swap'
});
const reemKufi = localFont({
  src: '../../node_modules/@fontsource-variable/reem-kufi/files/reem-kufi-arabic-wght-normal.woff2',
  weight: '400 700',
  variable: '--font-reem',
  display: 'swap'
});

/** All font CSS variables, applied once on <html>. */
export const fontVariables = [bricolage, instrument, jetbrains, cairo, cairoLatin, plexArabic, reemKufi].map((f) => f.variable).join(' ');
