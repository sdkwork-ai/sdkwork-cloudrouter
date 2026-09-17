function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Reads the first key that yields a plain object. */
export function readRecord(source: unknown, keys: readonly string[]): Record<string, unknown> | null {
  const record = asRecord(source);
  if (!record) return null;
  for (const key of keys) {
    const candidate = asRecord(record[key]);
    if (candidate) return candidate;
  }
  return record;
}

/** Reads the first key that yields a finite number; also parses numeric strings. */
export function readFiniteNumber(source: unknown, keys: readonly string[]): number | undefined {
  const record = asRecord(source);
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

/** Reads the first key that yields a non-empty trimmed string. */
export function readNonEmptyString(source: unknown, keys: readonly string[]): string | undefined {
  const record = asRecord(source);
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

export function readBoolean(source: unknown, keys: readonly string[]): boolean | undefined {
  const record = asRecord(source);
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return undefined;
}

/** Unwraps the collection of any SDKWork response envelope shape. */
export function readCollection(
  payload: unknown,
  keys: readonly string[] = ['items', 'records', 'list', 'data', 'results'],
): readonly unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  if (!record) return [];
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
    const nested = asRecord(value);
    if (nested) {
      for (const nestedKey of keys) {
        if (Array.isArray(nested[nestedKey])) return nested[nestedKey] as readonly unknown[];
      }
    }
  }
  return [];
}

export function toRecord(value: unknown): Record<string, unknown> {
  return asRecord(value) ?? {};
}
