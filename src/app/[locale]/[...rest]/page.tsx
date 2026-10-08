import { notFound } from 'next/navigation';

/** Sends unknown localized URLs to the localized not-found page. */
export default function CatchAll() {
  notFound();
}
