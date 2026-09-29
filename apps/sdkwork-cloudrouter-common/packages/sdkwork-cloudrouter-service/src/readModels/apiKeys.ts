import type {
  CloudRouterTransportPayload,
  ConsoleApiKeyStatus,
  ConsoleApiKeySummary,
  PagedResult,
} from '@sdkwork/cloudrouter-contracts';
import type { CloudRouterConsolePorts, CloudRouterConsoleQuery } from '@sdkwork/cloudrouter-sdk-ports';

import { maskApiKey } from '../format/units.js';
import { readBoolean, readCollection, readFiniteNumber, readNonEmptyString, readRecord, toRecord } from '../read/record.js';

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

export function toConsoleApiKeyPage(
  payload: CloudRouterTransportPayload,
  query: CloudRouterConsoleQuery = {},
): PagedResult<ConsoleApiKeySummary> {
  const items = readCollection(payload).map(toConsoleApiKeySummary);
  const meta = readRecord(payload, ['page', 'pagination', 'pageInfo']) ?? {};
  const pageSize = readFiniteNumber(meta, ['pageSize', 'size', 'limit']) ?? query.pageSize ?? items.length;
  const page = readFiniteNumber(meta, ['page', 'pageNumber', 'current']) ?? query.page ?? 1;
  const total = readFiniteNumber(meta, ['total', 'totalCount', 'count']) ?? items.length;
  const nextCursor = readNonEmptyString(meta, ['nextCursor', 'next_cursor']) ?? null;
  const hasMore =
    readBoolean(meta, ['hasMore', 'has_more']) ?? (nextCursor !== null || page * pageSize < total);
  return {
    items,
    page,
    pageSize: pageSize === 0 ? items.length : pageSize,
    total,
    nextCursor,
    hasMore,
  };
}

/** Single-call entrypoint: fetch and normalize one API key page. */
export async function loadConsoleApiKeyPage(
  ports: Pick<CloudRouterConsolePorts, 'apiKeys'>,
  query: CloudRouterConsoleQuery = {},
): Promise<PagedResult<ConsoleApiKeySummary>> {
  return toConsoleApiKeyPage(await ports.apiKeys.listApiKeys(query), query);
}
