function createSecureUuid(): string {
  const crypto = globalThis.crypto;
  if (!crypto) {
    throw new Error('Secure random source is unavailable for idempotency token generation.');
  }

  if (!crypto.getRandomValues) {
    throw new Error('Secure random source is unavailable for idempotency token generation.');
  }

  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  if (randomBytes.every((byte) => byte === 0)) {
    throw new Error('Secure random source returned an invalid token seed.');
  }

  randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40;
  randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80;
  const hex = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}

export function createClientOperationToken(prefix: string): string {
  const normalizedPrefix = prefix.trim() || 'request';
  return `${normalizedPrefix}-${createSecureUuid()}`;
}

export function createIdempotencyParams(prefix: string): { idempotencyKey: string } {
  const normalizedPrefix = prefix.trim() || 'request';
  return {
    idempotencyKey: createClientOperationToken(normalizedPrefix),
  };
}
