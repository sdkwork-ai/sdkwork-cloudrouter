import type {
  CloudRouterTransportPayload,
  ConsoleOverviewSnapshot,
} from '@sdkwork/cloudrouter-contracts';
import type { CloudRouterConsolePorts } from '@sdkwork/cloudrouter-sdk-ports';

import { readFiniteNumber, readNonEmptyString, readRecord } from '../read/record.js';

const OVERVIEW_KEYS = [
  'overview',
  'summary',
  'statistics',
  'metrics',
  'data',
] as const;

export function toConsoleOverviewSnapshot(
  payload: CloudRouterTransportPayload,
): ConsoleOverviewSnapshot {
  const record = readRecord(payload, OVERVIEW_KEYS) ?? payload;
  const totalRequests = readFiniteNumber(record, [
    'totalRequests',
    'requestCount',
    'requests',
    'total_requests',
  ]) ?? 0;
  const promptTokens = readFiniteNumber(record, ['promptTokens', 'inputTokens', 'prompt_tokens']);
  const completionTokens = readFiniteNumber(record, [
    'completionTokens',
    'outputTokens',
    'completion_tokens',
  ]);
  const totalTokens = readFiniteNumber(record, ['totalTokens', 'tokens', 'total_tokens'])
    ?? (promptTokens ?? 0) + (completionTokens ?? 0);
  const errorCount = readFiniteNumber(record, ['errorCount', 'errors', 'failedRequests']);
  const explicitErrorRate = readFiniteNumber(record, ['errorRate', 'error_rate', 'failureRate']);
  const errorRate = explicitErrorRate
    ?? (errorCount !== undefined && totalRequests > 0 ? errorCount / totalRequests : 0);

  return {
    totalRequests,
    totalTokens,
    costMinorUnits: readFiniteNumber(record, [
      'costMinorUnits',
      'totalCostMinorUnits',
      'cost',
      'totalCost',
    ]) ?? 0,
    errorRate,
    currency: readNonEmptyString(record, ['currency', 'currencyCode']) ?? 'CNY',
    windowLabel: readNonEmptyString(record, ['window', 'windowLabel', 'period', 'range']) ?? null,
  };
}

/** Single-call entrypoint: fetch and normalize the console overview. */
export async function loadConsoleOverview(
  ports: Pick<CloudRouterConsolePorts, 'overview'>,
): Promise<ConsoleOverviewSnapshot> {
  return toConsoleOverviewSnapshot(await ports.overview.retrieveOverview());
}
