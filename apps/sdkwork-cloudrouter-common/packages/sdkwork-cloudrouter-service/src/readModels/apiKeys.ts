import type {
  CloudRouterTransportPayload,
  ConsoleApiKeyStatus,
  ConsoleApiKeySummary,
} from '@sdkwork/cloudrouter-contracts';
import type { CloudRouterConsolePorts } from '@sdkwork/cloudrouter-sdk-ports';

import { maskApiKey } from '../format/units.js';
import { readCollection, readNonEmptyString, toRecord } from '../read/record.js';

const STATUS_ALIASES: Record<string, ConsoleApiKeyStatus> = {
  active: 'active',
  enabled: 'active',
  disabled: 'disabled',
  inactive: 'disabled',
  revoked: 'revoked',
  deleted: 'revoked',
};

function toApiKeyStatus(value: string | undefined): ConsoleApiKeyStatus {
  if (!value) return 'unknown';
  return STATUS_ALIASES[value.toLowerCase()] ?? 'unknown';
}

export function toConsoleApiKeySummary(payload: unknown): ConsoleApiKeySummary {
  const record = toRecord(payload);
  const rawKey = readNonEmptyString(record, ['key', 'apiKey', 'secret', 'token', 'value']);
  const masked = readNonEmptyString(record, ['maskedKey', 'masked', 'obfuscatedKey']);
  return {
    id: readNonEmptyString(record, ['id', 'apiKeyId', 'keyId']) ?? 'unknown',
    name: readNonEmptyString(record, ['name', 'title', 'label']) ?? 'unknown',
    maskedKey: masked ?? (rawKey ? maskApiKey(rawKey) : ''),
    status: toApiKeyStatus(readNonEmptyString(record, ['status', 'state'])),
    createdAt: readNonEmptyString(record, ['createdAt', 'created_at']) ?? null,
    lastUsedAt: readNonEmptyString(record, ['lastUsedAt', 'last_used_at', 'lastUsed']) ?? null,
  };
}

export function toConsoleApiKeySummaries(
  payload: CloudRouterTransportPayload,
): readonly ConsoleApiKeySummary[] {
  return readCollection(payload).map(toConsoleApiKeySummary);
}

/** Single-call entrypoint: list API keys and normalize them for display. */
export async function loadConsoleApiKeys(
  ports: Pick<CloudRouterConsolePorts, 'apiKeys'>,
): Promise<readonly ConsoleApiKeySummary[]> {
  return toConsoleApiKeySummaries(await ports.apiKeys.listApiKeys({}));
}
