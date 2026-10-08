import { Bricolage_Grotesque, Cairo, IBM_Plex_Sans_Arabic, Instrument_Sans, JetBrains_Mono, Reem_Kufi } from 'next/font/google';

// Latin: display + UI + labels
const bricolage = Bricolage_Grotesque({ subsets: ['latin', 'latin-ext'], variable: '--font-bricolage', display: 'swap' });
const instrument = Instrument_Sans({ subsets: ['latin', 'latin-ext'], variable: '--font-instrument', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains', display: 'swap' });

// Arabic: display + UI + wordmark
const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-cairo', display: 'swap' });
const plexArabic = IBM_Plex_Sans_Arabic({ subsets: ['arabic'], weight: ['400', '500', '600', '700'], variable: '--font-plex-ar', display: 'swap' });
const reemKufi = Reem_Kufi({ subsets: ['arabic'], weight: ['500', '700'], variable: '--font-reem', display: 'swap' });

/** All font CSS variables, applied once on <html>. */
export const fontVariables = [bricolage, instrument, jetbrains, cairo, plexArabic, reemKufi].map((f) => f.variable).join(' ');
