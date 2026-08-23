import { uuid } from '@sdkwork/utils/id';

export function createClientOperationToken(prefix: string): string {
  const normalizedPrefix = prefix.trim() || 'request';
  return `${normalizedPrefix}-${uuid()}`;
}

export function createIdempotencyParams(prefix: string): { idempotencyKey: string } {
  const normalizedPrefix = prefix.trim() || 'request';
  return {
    idempotencyKey: createClientOperationToken(normalizedPrefix),
  };
}
