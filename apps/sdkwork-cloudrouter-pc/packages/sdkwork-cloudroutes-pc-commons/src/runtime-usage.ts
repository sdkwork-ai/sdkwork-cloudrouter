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
  next: Partial<RuntimeUsageSnapshot> | null | undefined,
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

function hasRuntimeUsageSnapshotValue(
  snapshot: Partial<RuntimeUsageSnapshot> | null | undefined,
): snapshot is Partial<RuntimeUsageSnapshot> {
  return Boolean(snapshot && Object.values(snapshot).some((value) => value !== undefined));
}

function isRuntimeRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
