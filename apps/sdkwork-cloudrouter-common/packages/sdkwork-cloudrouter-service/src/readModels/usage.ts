import type {
  CloudRouterTransportPayload,
  ConsoleUsageRecord,
  ConsoleUsageStatus,
  PagedResult,
} from '@sdkwork/cloudrouter-contracts';
import type { CloudRouterConsolePorts, ConsoleUsageQuery } from '@sdkwork/cloudrouter-sdk-ports';

import { readCollection, readFiniteNumber, readNonEmptyString, readRecord, toRecord } from '../read/record.js';

const STATUS_ALIASES: Record<string, ConsoleUsageStatus> = {
  ok: 'succeeded',
  success: 'succeeded',
  succeeded: 'succeeded',
  completed: 'succeeded',
  error: 'failed',
  failed: 'failed',
  failure: 'failed',
  pending: 'processing',
  processing: 'processing',
  running: 'processing',
};

export function toConsoleUsageStatus(value: string | undefined): ConsoleUsageStatus {
  if (!value) return 'unknown';
  return STATUS_ALIASES[value.toLowerCase()] ?? 'unknown';
}

export function toConsoleUsageRecord(payload: unknown): ConsoleUsageRecord {
  const record = toRecord(payload);
  const promptTokens = readFiniteNumber(record, ['promptTokens', 'inputTokens']) ?? 0;
  const completionTokens = readFiniteNumber(record, ['completionTokens', 'outputTokens']) ?? 0;
  return {
    id: readNonEmptyString(record, ['id', 'recordId', 'traceId', 'requestId']) ?? 'unknown',
    model: readNonEmptyString(record, ['model', 'modelName', 'modelCode']) ?? 'unknown',
    promptTokens,
    completionTokens,
    totalTokens: readFiniteNumber(record, ['totalTokens', 'tokens']) ?? promptTokens + completionTokens,
    costMinorUnits: readFiniteNumber(record, ['costMinorUnits', 'cost', 'totalCost']) ?? 0,
    status: toConsoleUsageStatus(readNonEmptyString(record, ['status', 'state', 'result'])),
    occurredAt: readNonEmptyString(record, ['occurredAt', 'createdAt', 'timestamp', 'requestedAt']) ?? null,
  };
}

export function toConsoleUsagePage(
  payload: CloudRouterTransportPayload,
  query: ConsoleUsageQuery = {},
): PagedResult<ConsoleUsageRecord> {
  const items = readCollection(payload).map(toConsoleUsageRecord);
  const meta = readRecord(payload, ['page', 'pagination', 'pageInfo']) ?? {};
  const pageSize = readFiniteNumber(meta, ['pageSize', 'size', 'limit']) ?? query.pageSize ?? items.length;
  return {
    items,
    page: readFiniteNumber(meta, ['page', 'pageNumber', 'current']) ?? query.page ?? 1,
    pageSize: pageSize === 0 ? items.length : pageSize,
    total: readFiniteNumber(meta, ['total', 'totalCount', 'count']) ?? items.length,
  };
}

/** Single-call entrypoint: fetch and normalize one usage page. */
export async function loadConsoleUsagePage(
  ports: Pick<CloudRouterConsolePorts, 'usage'>,
  query: ConsoleUsageQuery = {},
): Promise<PagedResult<ConsoleUsageRecord>> {
  return toConsoleUsagePage(await ports.usage.listUsageLogs(query), query);
}
