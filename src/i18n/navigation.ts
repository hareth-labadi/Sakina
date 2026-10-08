import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/** Locale-aware Link, redirect, usePathname and useRouter. Always import navigation from here. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
