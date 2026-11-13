/**
 * Console sidebar active-entry resolution.
 *
 * Sidebar entries map to route prefixes: `/console/hardware` is a prefix of
 * `/console/hardware/firmware`, and a plain `startsWith` would light up the parent
 * *and* the child at the same time. The longest matching path wins, so exactly one
 * leaf entry is active for the current location.
 *
 * Kept in its own module (no React imports) so the shell and its regression tests
 * can exercise the rule in isolation.
 */

/** Returns the most specific sidebar path matching `pathname`, or `null`. */
export function resolveConsoleSidebarActivePath(
  pathname: string,
  paths: readonly string[],
): string | null {
  const normalized = pathname.split(/[?#]/u)[0] ?? pathname;
  let activePath: string | null = null;
  for (const path of paths) {
    const matches = normalized === path || normalized.startsWith(`${path}/`);
    if (!matches) {
      continue;
    }
    if (activePath === null || path.length > activePath.length) {
      activePath = path;
    }
  }
  return activePath;
}
