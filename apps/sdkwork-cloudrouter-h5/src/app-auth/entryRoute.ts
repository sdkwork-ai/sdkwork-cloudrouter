/**
 * Hash-entry adoption for the H5 renderer.
 *
 * The platform serves the hosted app sign-in paths as ordinary pathnames
 * (`/iam/v3/oauth/authorize`, `/auth/login`, `/auth/desktop/launch`), while the
 * H5 renderer routes with `HashRouter`. The bootstrap rewrites such a
 * navigation into its hash route before the first render, so one URL shape
 * works for both the native application's initial navigation and the IAM
 * authorization server's return.
 */
import { resolveAppAuthEntryHash } from './appAuthorizeEntry.js';

/**
 * Rewrite a real navigation pathname into the equivalent hash route.
 *
 * A navigation that already carries a hash route is left untouched, and a
 * pathname outside the hosted auth entries is ignored — the console router owns
 * everything else.
 * @param location - the window location to inspect (defaults to the live one).
 * @param history - the history object used for the replacement (defaults to the live one).
 * @returns the adopted hash route, or null when nothing changed.
 */
export function adoptAppAuthHashEntry(
  location: { hash: string; pathname: string; search: string } = window.location,
  history: Pick<History, 'state' | 'replaceState'> = window.history,
): string | null {
  if (location.hash.startsWith('#/')) return null;
  const hash = resolveAppAuthEntryHash(location.pathname, location.search);
  if (hash === null) return null;
  history.replaceState(history.state, '', `${location.pathname}${location.search}${hash}`);
  return hash;
}
