import { getModelsAppSdkClient } from '@sdkwork/cloudroutes-pc-commons/runtime';
import type { OfficialPricingRate } from '../types/pricing';
import { compareKeyOf } from '../types/compare';

/** Minimal projection of the models catalog item fields the comparator needs. */
export interface CompareModelReferencePrice {
  regionCode: string;
  billingMeter: string;
  unitPrice: string;
  currency: string;
}

export interface CompareModel {
  key: string;
  vendorCode: string;
  modelId: string;
  displayName: string;
  vendor: string;
  inputModalities: string[];
  outputModalities: string[];
  contextTokens: string | null;
  maxOutputTokens: string | null;
  supportsStreaming: boolean | null;
  supportsTools: boolean | null;
  supportsJsonSchema: boolean | null;
  usageScopes: string[];
  prices: CompareModelReferencePrice[];
}

interface CompareModelItem {
  model?: unknown;
  vendorCode?: unknown;
  displayName?: unknown;
  vendor?: unknown;
  inputModalities?: unknown;
  outputModalities?: unknown;
  contextTokens?: unknown;
  maxOutputTokens?: unknown;
  supportsStreaming?: unknown;
  supportsTools?: unknown;
  supportsJsonSchema?: unknown;
  usageScopes?: unknown;
  officialReferencePrices?: unknown;
}

const MAX_COMPARE_MODELS = 6;

/**
 * Loads model capability and reference price details for the selected rates
 * from the models catalog API (`models.list` matched by model id). Returns one
 * entry per selection that resolves to an exact catalog match.
 */
export async function fetchCompareModels(
  selections: readonly OfficialPricingRate[],
  signal?: AbortSignal,
): Promise<CompareModel[]> {
  const models = await Promise.all(
    selections.slice(0, MAX_COMPARE_MODELS).map((rate) => fetchCompareModel(rate, signal)),
  );
  return models.filter((model): model is CompareModel => model !== null);
}

async function fetchCompareModel(
  rate: OfficialPricingRate,
  signal?: AbortSignal,
): Promise<CompareModel | null> {
  const result = await getModelsAppSdkClient().ai.models.list(
    { q: rate.resourceCode, vendorCodes: [rate.vendorCode], pageSize: 200 },
    { signal, timeout: undefined },
  );
  const data = readComparePageData(result);
  const items = Array.isArray(data?.items) ? (data.items as CompareModelItem[]) : [];
  const item = items.find(
    (candidate) => candidate.model === rate.resourceCode && candidate.vendorCode === rate.vendorCode,
  );
  if (!item || typeof item.model !== 'string' || typeof item.vendorCode !== 'string') {
    return null;
  }
  return {
    key: compareKeyOf(rate),
    vendorCode: item.vendorCode,
    modelId: item.model,
    displayName: readString(item.displayName) || item.model,
    vendor: readString(item.vendor) || item.vendorCode,
    inputModalities: readStringArray(item.inputModalities),
    outputModalities: readStringArray(item.outputModalities),
    contextTokens: readNullableString(item.contextTokens),
    maxOutputTokens: readNullableString(item.maxOutputTokens),
    supportsStreaming: readNullableBoolean(item.supportsStreaming),
    supportsTools: readNullableBoolean(item.supportsTools),
    supportsJsonSchema: readNullableBoolean(item.supportsJsonSchema),
    usageScopes: readStringArray(item.usageScopes),
    prices: readReferencePrices(item.officialReferencePrices),
  };
}

function readComparePageData(result: unknown): { items?: unknown } | null {
  if (!result || typeof result !== 'object') return null;
  const record = result as Record<string, unknown>;
  const data = record.data ?? result;
  if (!data || typeof data !== 'object') return null;
  return data as { items?: unknown };
}

function readReferencePrices(value: unknown): CompareModelReferencePrice[] {
  if (!Array.isArray(value)) return [];
  const prices: CompareModelReferencePrice[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const regionCode = readString(record.regionCode);
    const billingMeter = readString(record.billingMeter);
    const unitPrice = readString(record.unitPrice);
    const currency = readString(record.currency);
    if (regionCode && billingMeter && unitPrice && currency) {
      prices.push({ regionCode, billingMeter, unitPrice, currency });
    }
  }
  return prices;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function readNullableBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}
