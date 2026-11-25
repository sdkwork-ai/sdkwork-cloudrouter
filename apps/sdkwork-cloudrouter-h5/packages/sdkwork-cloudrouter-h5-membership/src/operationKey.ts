/**
 * Stable per-attempt key for a retry-safe commerce command.
 *
 * Gift-code redemption is idempotent server-side: retrying the exact same code
 * with the same `Idempotency-Key` returns the original outcome instead of
 * consuming the code twice. The screens keep one key per code until the request
 * succeeds.
 */
export function createMembershipOperationKey(prefix: string): string {
  const host = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  const randomUUID = host.crypto?.randomUUID;
  if (typeof randomUUID === 'function') {
    return `${prefix}-${randomUUID.call(host.crypto)}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
