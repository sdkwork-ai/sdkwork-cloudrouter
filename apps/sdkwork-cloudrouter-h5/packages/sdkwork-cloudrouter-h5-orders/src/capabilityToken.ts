/**
 * Capability-token wire shape for the anonymous cashier.
 *
 * Kept dependency-free so the H5 route plan can decide "token vs legacy link"
 * without loading the order UI/runtime modules.
 */

/** Wire prefix of a cashier capability token (`v1.<payload>.<signature>`). */
export const CASHIER_TOKEN_PREFIX = 'v1.';

/** Wire prefix of a short cashier link (`s1.<22 base64url chars>`). */
export const CASHIER_SHORT_LINK_PREFIX = 's1.';

/** Base64url length of the 128-bit short-link id. */
export const CASHIER_SHORT_LINK_ID_LENGTH = 22;

/**
 * True when `value` has the capability-token or short-link wire shape.
 *
 * `v1.` is the legacy signed token; `s1.` is the short id the server resolves to
 * the signed token (the URL shape stays `/cashier/{segment}`). The token's
 * presence in the deep link is the rollout switch: a legacy `/cashier/{orderId}`
 * link is exchanged for a token instead. Anything that is not well-formed must
 * never be treated as one.
 */
export function isCashierCapabilityToken(value: string | undefined | null): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.startsWith(CASHIER_TOKEN_PREFIX)) {
    const parts = trimmed.split('.');
    return parts.length === 3 && parts.every((part) => part.length > 0);
  }
  if (trimmed.startsWith(CASHIER_SHORT_LINK_PREFIX)) {
    const id = trimmed.slice(CASHIER_SHORT_LINK_PREFIX.length);
    return (
      id.length === CASHIER_SHORT_LINK_ID_LENGTH &&
      /^[A-Za-z0-9_-]+$/.test(id)
    );
  }
  return false;
}
