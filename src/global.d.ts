import type messages from '../messages/en.json';
import type { routing } from '@/i18n/routing';

// English is the reference catalogue: every t('…') key is type-checked against it.
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
