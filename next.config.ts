import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const isDev = process.env.NODE_ENV !== 'production';

/** The API origin the browser may call. Empty while the services layer runs on mock data. */
function apiOrigin(): string {
  try {
    return process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL).origin : '';
  } catch {
    return '';
  }
}

/**
 * Content-Security-Policy. Everything is self-hosted (next/font serves the fonts), so nothing
 * outside our own origin is allowed. script-src still needs 'unsafe-inline' for the theme script
 * and Next's inline hydration data; move to a per-request nonce in proxy.ts once real accounts exist.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${apiOrigin()}${isDev ? ' ws:' : ''}`.trim(),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests'])
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Self-contained server in .next/standalone, used by the Docker image.
  output: 'standalone',
  /**
   * The browser reaches the API at /api on this same origin (first-party cookies, no CORS);
   * Next forwards it to the API server, which is never exposed itself. Read at build time, so
   * the Docker image takes API_INTERNAL_URL as a build argument. In development it defaults to
   * the API's own dev server (`cd backend && npm run dev`).
   */
  async rewrites() {
    const target = process.env.API_INTERNAL_URL || (isDev ? 'http://localhost:4000' : '');
    return target ? [{ source: '/api/:path*', destination: `${target}/:path*` }] : [];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
          // Browsers only honour this over HTTPS; harmless on plain-HTTP local runs.
          ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }])
        ]
      }
    ];
  }
};

export default withNextIntl(nextConfig);
