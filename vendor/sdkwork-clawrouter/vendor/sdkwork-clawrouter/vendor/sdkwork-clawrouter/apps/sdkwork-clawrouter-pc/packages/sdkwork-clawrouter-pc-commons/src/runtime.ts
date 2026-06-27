import { appApiPath } from '@sdkwork/clawrouter-app-sdk';
import type { RuntimeEventItem } from '@sdkwork/clawrouter-app-sdk';
import type { ClawRouterAppSdkClient } from './sdk-clients.ts';

export * from './user-agent.ts';

export type RuntimeStreamEvent = RuntimeEventItem;

export async function* streamRuntimeInvocationEvents(
  client: ClawRouterAppSdkClient,
  invocationId: string,
  afterEventNo = 0,
): AsyncIterable<RuntimeStreamEvent> {
  const eventCursor = Number.isFinite(afterEventNo) && afterEventNo > 0
    ? `?after_event_no=${Math.trunc(afterEventNo)}`
    : '';
  const streamPath = appApiPath(
    `/runtime/invocations/${encodeURIComponent(invocationId)}/events/stream${eventCursor}`,
  );
  yield* client.http.streamJson<RuntimeStreamEvent>(streamPath);
}

export function readRuntimeTextDelta(event: RuntimeStreamEvent): string {
  if (!isRuntimeTextDeltaEvent(event)) {
    return '';
  }
  if (typeof event.textDelta === 'string' && event.textDelta.length > 0) {
    return event.textDelta;
  }
  return readRuntimePayloadTextDelta(event.payloadJson);
}

export interface RuntimeUsageSnapshot {
  cachedTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export function emptyRuntimeUsageSnapshot(): RuntimeUsageSnapshot {
  return {
    cachedTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };
}

export function readRuntimeUsageSnapshot(value: unknown): Partial<RuntimeUsageSnapshot> | null {
  return readRuntimeUsageSnapshotFromUnknown(value);
}

export function mergeRuntimeUsageSnapshots(
  current: RuntimeUsageSnapshot,
  next: Partial<RuntimeUsageSnapshot> | null,
): RuntimeUsageSnapshot {
  if (!hasRuntimeUsageSnapshotValue(next)) {
    return current;
  }
  const previousDerivedTotal = current.inputTokens + current.outputTokens + current.cachedTokens;
  const merged: RuntimeUsageSnapshot = {
    ...current,
    ...compactRuntimeUsageSnapshot(next),
  };
  if (
    next?.totalTokens === undefined
    && (
      next?.inputTokens !== undefined
      || next?.outputTokens !== undefined
      || next?.cachedTokens !== undefined
      || merged.totalTokens === 0
    )
    && (current.totalTokens === 0 || current.totalTokens === previousDerivedTotal)
  ) {
    merged.totalTokens = merged.inputTokens + merged.outputTokens + merged.cachedTokens;
  }
  return merged;
}

export function readPreferredRuntimeUsageCount(primary: number | null | undefined, fallback: number): number {
  if (primary !== undefined && primary !== null && primary > 0) {
    return primary;
  }
  return fallback;
}

function isRuntimeTextDeltaEvent(event: RuntimeStreamEvent): boolean {
  const eventType = event.eventType.trim().toLowerCase();
  return eventType === 'message.delta'
    || eventType === 'response.delta'
    || eventType === 'runtime.delta'
    || eventType.endsWith('.delta');
}

function readRuntimePayloadTextDelta(payload: unknown): string {
  return readRuntimePayloadTextDeltaFromUnknown(payload, 0);
}

function readRuntimePayloadTextDeltaFromUnknown(value: unknown, depth: number): string {
  if (depth > 8 || value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value !== 'object') {
    return '';
  }

  if (Array.isArray(value)) {
    const textParts = value
      .map((item) => readRuntimePayloadTextDeltaFromUnknown(item, depth + 1))
      .filter((item) => item.length > 0);
    return joinRuntimeTextParts(textParts);
  }

  const record = value as Record<string, unknown>;

  for (const key of ['textDelta', 'text_delta', 'outputText', 'output_text', 'delta', 'content', 'text']) {
    const item = record[key];
    if (typeof item === 'string' && item.length > 0) {
      return item;
    }
  }

  for (const key of [
    'delta',
    'content',
    'parts',
    'output',
    'choices',
    'candidates',
    'message',
    'response',
    'data',
    'result',
    'payload',
    'payloadJson',
    'gatewayEvent',
    'providerEvent',
    'gatewayResponse',
    'providerResponse',
  ]) {
    const text = readRuntimePayloadTextDeltaFromUnknown(record[key], depth + 1);
    if (text) {
      return text;
    }
  }

  return '';
}

function joinRuntimeTextParts(parts: string[]): string {
  if (parts.length === 0) {
    return '';
  }
  let result = parts[0] || '';
  for (const part of parts.slice(1)) {
    if (shouldInsertRuntimeTextPartBoundary(result, part)) {
      result += '\n';
    }
    result += part;
  }
  return result;
}

function shouldInsertRuntimeTextPartBoundary(left: string, right: string): boolean {
  if (!left || !right) {
    return false;
  }
  if (/[\s]$/.test(left) || /^[\s]/.test(right)) {
    return false;
  }
  return true;
}

function readRuntimeUsageSnapshotFromUnknown(value: unknown, depth = 0): Partial<RuntimeUsageSnapshot> | null {
  if (depth > 5 || !isRuntimeRecord(value)) {
    return null;
  }

  const direct = readDirectRuntimeUsageSnapshot(value);
  if (hasRuntimeUsageSnapshotValue(direct)) {
    return direct;
  }

  for (const key of ['usage', 'usageJson', 'usage_json', 'tokenUsage', 'token_usage', 'metrics', 'payloadJson', 'gatewayResponse', 'gatewayEvent', 'providerEvent', 'providerResponse', 'payload', 'data', 'result', 'output', 'response']) {
    const nested = readRuntimeUsageSnapshotFromUnknown(value[key], depth + 1);
    if (nested) {
      return nested;
    }
  }
  return null;
}

function readDirectRuntimeUsageSnapshot(record: Record<string, unknown>): Partial<RuntimeUsageSnapshot> {
  const inputTokens = readFirstRuntimeUsageNumber(record, ['inputTokens', 'input_tokens', 'promptTokens', 'prompt_tokens']);
  const outputTokens = readFirstRuntimeUsageNumber(record, ['outputTokens', 'output_tokens', 'completionTokens', 'completion_tokens']);
  const cachedTokens = readFirstRuntimeUsageNumber(record, ['cachedTokens', 'cached_tokens'])
    ?? readNestedRuntimeUsageNumber(record.promptTokensDetails, ['cachedTokens', 'cached_tokens'])
    ?? readNestedRuntimeUsageNumber(record.prompt_tokens_details, ['cachedTokens', 'cached_tokens']);
  const totalTokens = readFirstRuntimeUsageNumber(record, ['totalTokens', 'total_tokens']);
  return compactRuntimeUsageSnapshot({
    cachedTokens,
    inputTokens,
    outputTokens,
    totalTokens,
  });
}

function readFirstRuntimeUsageNumber(record: Record<string, unknown>, keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const value = readOptionalRuntimeUsageNumber(record[key]);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

function readNestedRuntimeUsageNumber(value: unknown, keys: readonly string[]): number | undefined {
  return isRuntimeRecord(value) ? readFirstRuntimeUsageNumber(value, keys) : undefined;
}

function readOptionalRuntimeUsageNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const number = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value.trim())
      : Number.NaN;
  return Number.isFinite(number) && number >= 0 ? Math.trunc(number) : undefined;
}

function compactRuntimeUsageSnapshot(snapshot: Partial<RuntimeUsageSnapshot>): Partial<RuntimeUsageSnapshot> {
  return Object.fromEntries(
    Object.entries(snapshot).filter(([, value]) => value !== undefined),
  ) as Partial<RuntimeUsageSnapshot>;
}

function hasRuntimeUsageSnapshotValue(snapshot: Partial<RuntimeUsageSnapshot> | null): boolean {
  return Boolean(snapshot && Object.values(snapshot).some((value) => value !== undefined));
}

function isRuntimeRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export * from './auth-projection.ts';
export * from './api-result.ts';
export * from './api-request-url.ts';
export * from './admin-category-types.ts';
export * from './admin-resource-options.ts';
export * from './app-session-token.ts';
export * from './decimal.ts';
export * from './iam-runtime.ts';
export * from './json-value.ts';
export * from './load-error.ts';
export * from './media-resource.ts';
export * from './notificationService.ts';
export * from './portal-auth.ts';
export * from './portal-session.ts';
export * from './portal-permission-scope.ts';
export * from './recharge-math.ts';
export * from './idempotency.ts';
export * from './sdk-request-boundary.ts';
export * from './sdk-clients.ts';
export * from './sessionService.ts';
export * from './siteBranding.ts';
export * from './utils/index.ts';
export * from './utils/env.ts';
