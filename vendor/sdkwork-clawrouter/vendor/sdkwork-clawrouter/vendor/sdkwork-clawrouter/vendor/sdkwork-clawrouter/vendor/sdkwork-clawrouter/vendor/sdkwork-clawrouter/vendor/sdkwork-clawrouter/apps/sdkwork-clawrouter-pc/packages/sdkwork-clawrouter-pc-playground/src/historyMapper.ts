import {
  isRecord,
  readRequiredString,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import {
  readMediaResource,
  type ClawRouterMediaResource,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import { normalizeSdkworkGenerationHistoryType } from '@sdkwork/generations-pc-workspace/generation-history';
import type { PlaygroundHistoryItem, PlaygroundMedia } from './playgroundTypes.ts';

export function mapGenerationHistoryItems(
  items: unknown[],
): PlaygroundHistoryItem[] {
  return items.map(mapGenerationHistoryItem);
}

function mapGenerationHistoryItem(value: unknown): PlaygroundHistoryItem {
  const item = readRequiredRecord(value, 'Playground history record is required');
  const itemType = normalizePlaygroundHistoryType(item.type);
  const createdAt = normalizeTimestamp(item.createdAt);
  const updatedAt = normalizeTimestamp(item.updatedAt);
  const date = normalizeHistoryDate(item.date) ?? readDatePrefix(createdAt);
  if (!date) {
    throw new Error('Playground history date is required');
  }

  return {
    id: readRequiredString(item, 'id', 'Playground history id is required'),
    date,
    prompt: readRequiredString(item, 'prompt', 'Playground history prompt is required'),
    type: itemType,
    asset: normalizeOptionalMediaResource(item.asset),
    modelInfo: normalizeOptionalString(item.modelInfo),
    modelCatalogKey: normalizeOptionalString(item.modelCatalogKey),
    images: normalizeMediaResourceArray(item.images),
    videos: normalizeMediaResourceArray(item.videos),
    aspectRatio: normalizeAspectRatio(item.aspectRatio),
    durationSeconds: normalizeDurationSeconds(item.durationSeconds),
    status: normalizeOptionalString(item.status),
    outputText: normalizeOptionalString(item.outputText ?? item.outputMessage),
    createdAt,
    updatedAt,
  };
}

function normalizeAspectRatio(value: unknown): PlaygroundHistoryItem['aspectRatio'] | undefined {
  return value === '1:1' || value === '16:9' || value === '9:16' ? value : undefined;
}

function normalizePlaygroundHistoryType(value: unknown): PlaygroundHistoryItem['type'] {
  try {
    return normalizeSdkworkGenerationHistoryType(value);
  } catch {
    throw new Error('Playground history type is required');
  }
}

function normalizeDurationSeconds(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const duration = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(duration) && duration >= 0 ? duration : undefined;
}

function normalizeOptionalMediaResource(value: unknown): ClawRouterMediaResource | undefined {
  return readMediaResource(value);
}

function normalizeMediaResourceArray(values: unknown): PlaygroundMedia[] | undefined {
  if (values === undefined) {
    return undefined;
  }
  if (!Array.isArray(values)) {
    throw new Error('Playground history media must be an array');
  }
  const result = values
    .map(readMediaResource)
    .filter((value): value is ClawRouterMediaResource => value !== undefined);
  return result.length > 0 ? result : undefined;
}

function normalizeOptionalString(value: unknown): string | undefined {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized : undefined;
}

function normalizeHistoryDate(value: unknown): string | undefined {
  const normalized = normalizeOptionalString(value);
  return normalized && /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : undefined;
}

function normalizeTimestamp(value: unknown): string | undefined {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return undefined;
  }
  const match = normalized.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.\d+)?(?:\s*(Z|[+-]\d{2}(?::?\d{2})?))?$/i,
  );
  if (!match) {
    return undefined;
  }

  const [, date, time, rawOffset] = match;
  const offset = normalizeTimezoneOffset(rawOffset);
  if (!offset) {
    return undefined;
  }
  if (offset === 'Z') {
    return `${date}T${time}Z`;
  }

  const timestamp = new Date(`${date}T${time}${offset}`);
  if (Number.isNaN(timestamp.getTime())) {
    return undefined;
  }
  return timestamp.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function normalizeTimezoneOffset(value: string | undefined): string | undefined {
  if (!value || value.toUpperCase() === 'Z') {
    return 'Z';
  }
  if (/^[+-]\d{2}$/.test(value)) {
    return `${value}:00`;
  }
  if (/^[+-]\d{4}$/.test(value)) {
    return `${value.slice(0, 3)}:${value.slice(3)}`;
  }
  return /^[+-]\d{2}:\d{2}$/.test(value) ? value : undefined;
}

function readDatePrefix(value: unknown): string | undefined {
  return normalizeOptionalString(value)?.slice(0, 10);
}

function readRequiredRecord(value: unknown, message: string): ApiRecord {
  if (!isRecord(value)) {
    throw new Error(message);
  }
  return value;
}
