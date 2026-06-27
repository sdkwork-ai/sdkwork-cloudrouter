export type ApiRecord = Record<string, unknown>;

export function readApiData(result: unknown): unknown {
  if (Array.isArray(result)) {
    return result;
  }
  if (!isRecord(result)) {
    return undefined;
  }
  return isApiEnvelope(result) ? result.data : result;
}

export function readApiItems(result: unknown, keys: string[] = ["items", "records", "list", "data"]): unknown[] {
  const data = readApiData(result);
  if (Array.isArray(data)) {
    return data;
  }
  if (!isRecord(data)) {
    return [];
  }
  for (const key of keys) {
    const value = data[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

export function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isApiEnvelope(record: ApiRecord): boolean {
  return isSuccessCode(record.code) && "data" in record;
}

function isSuccessCode(value: unknown): boolean {
  return value === undefined
    || value === null
    || value === 0
    || value === 200
    || value === 2000
    || value === "0"
    || value === "200"
    || value === "2000";
}
