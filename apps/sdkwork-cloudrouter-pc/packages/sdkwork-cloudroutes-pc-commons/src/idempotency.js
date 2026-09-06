import { uuid } from '@sdkwork/utils/id';
export function createClientOperationToken(prefix) {
    const normalizedPrefix = prefix.trim() || 'request';
    return `${normalizedPrefix}-${uuid()}`;
}
export function createIdempotencyParams(prefix) {
    const normalizedPrefix = prefix.trim() || 'request';
    return {
        idempotencyKey: createClientOperationToken(normalizedPrefix),
    };
}
//# sourceMappingURL=idempotency.js.map