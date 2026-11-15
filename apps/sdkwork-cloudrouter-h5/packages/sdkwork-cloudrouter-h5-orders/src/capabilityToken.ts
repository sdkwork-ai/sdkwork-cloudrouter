/**
 * Capability-token wire shape for the anonymous cashier.
 *
 * Kept dependency-free so the H5 route plan can decide "token vs legacy link"
 * without loading the order UI/runtime modules.
 */

/** Wire prefix of a cashier capability token (`v1.<payload>.<signature>`). */
export const CASHIER_TOKEN_PREFIX = 'v1.';

/**
 * True when `value` has the capability-token wire shape.
 *
 * The token's presence in the deep link is the rollout switch: a legacy
 * `/cashier/{orderId}` link is exchanged for a token instead. Anything that is
 * not a well-formed token must never be treated as one.
 */
export function isCashierCapabilityToken(value: string | undefined | null): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed.startsWith(CASHIER_TOKEN_PREFIX)) return false;
  const parts = trimmed.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
}
