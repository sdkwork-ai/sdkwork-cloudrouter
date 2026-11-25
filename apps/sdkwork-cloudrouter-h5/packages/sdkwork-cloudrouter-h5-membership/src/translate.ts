import type { MembershipTranslate } from './catalog/membershipDefinition.js';

/** Prefix of the membership copy inside the flat H5 console locale catalog. */
export const CLOUDROUTER_MEMBERSHIP_I18N_PREFIX = 'cloudrouter.console.membership.';

/**
 * Adapts the flat H5 console translator to the membership `translate` contract.
 *
 * The console translator returns the key itself when a message is missing (it
 * only falls back between locales), so an unresolved key falls back to the
 * caller's inline default instead of leaking a dotted key into the UI.
 */
export function createMembershipTranslate(
  translate: (key: string) => string,
): MembershipTranslate {
  return (key, defaultValue) => {
    const resolvedKey = `${CLOUDROUTER_MEMBERSHIP_I18N_PREFIX}${key}`;
    const resolved = translate(resolvedKey);
    if (resolved && resolved !== resolvedKey) {
      return resolved;
    }
    return defaultValue ?? key;
  };
}
