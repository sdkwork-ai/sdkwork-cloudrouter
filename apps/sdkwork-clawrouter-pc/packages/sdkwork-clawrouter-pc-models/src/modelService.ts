import {
  ensureSdkworkApiSuccess,
  getModelsAppSdkClient,
  isRecord,
  readApiRecord,
  readNumber,
  readRecordArray,
  readRequiredApiItems,
  readRequiredNonNegativeNumber,
  readString,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import type { Model, ModelCategoryKey, ModelGroupKey } from './data/models';
import {
  findModelByCatalogRouteId,
  mergeRuntimeModelCatalog,
  resolveRuntimeModelCatalog,
  type RuntimeModelCatalogItem,
} from './runtimeModelCatalog.ts';

export type { RuntimeModelCatalogItem };
export { findModelByCatalogRouteId, mergeRuntimeModelCatalog, resolveRuntimeModelCatalog };

const DEFAULT_MODEL_CATALOG_PAGE_SIZE = 20;
const MAX_MODEL_CATALOG_PAGE_SIZE = 200;

export interface ModelCatalogServiceFilters {
  billingMeter?: string;
  vendorCodes?: string[];
  modalities?: string[];
  capabilities?: string[];
  categories?: ModelCategoryKey[] | string[];
  groups?: ModelGroupKey[] | string[];
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export interface ModelCatalogGroup {
  key: ModelGroupKey;
  label: string;
  modelCount: number;
}

export interface ModelCatalogPageInfo {
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface ModelCatalogResult {
  models: Model[];
  groups: ModelCatalogGroup[];
  pageInfo: ModelCatalogPageInfo;
}

export class ModelService {
  static async fetchModels(filters: ModelCatalogServiceFilters = {}): Promise<Model[]> {
    return (await fetchModelCatalogResult(filters)).models;
  }

  static fetchModelCatalog(filters: ModelCatalogServiceFilters = {}): Promise<ModelCatalogResult> {
    return fetchModelCatalogResult(filters);
  }

  static async fetchModelByCatalogRouteId(routeId: string): Promise<Model | null> {
    const normalizedRouteId = routeId.trim();
    if (normalizedRouteId.length === 0) {
      return null;
    }

    const directMatch = findModelByCatalogRouteId(
      (await fetchModelCatalogResult({
        searchQuery: normalizedRouteId,
        limit: MAX_MODEL_CATALOG_PAGE_SIZE,
      })).models,
      normalizedRouteId,
    );
    if (directMatch) {
      return directMatch;
    }

    const slashIndex = normalizedRouteId.indexOf('/');
    if (slashIndex <= 0) {
      return null;
    }

    const vendorCode = normalizedRouteId.slice(0, slashIndex).trim();
    const modelQuery = normalizedRouteId.slice(slashIndex + 1).trim();
    if (vendorCode.length === 0 || modelQuery.length === 0) {
      return null;
    }

    return findModelByCatalogRouteId(
      (await fetchModelCatalogResult({
        vendorCodes: [vendorCode],
        searchQuery: modelQuery,
        limit: MAX_MODEL_CATALOG_PAGE_SIZE,
      })).models,
      normalizedRouteId,
    );
  }
}

async function fetchModelCatalogResult(filters: ModelCatalogServiceFilters): Promise<ModelCatalogResult> {
  const limit = Math.max(
    1,
    Math.min(filters.limit ?? DEFAULT_MODEL_CATALOG_PAGE_SIZE, MAX_MODEL_CATALOG_PAGE_SIZE),
  );
  const offset = Math.max(filters.offset ?? 0, 0);
  const result = await getModelsAppSdkClient().ai.models.list(buildModelCatalogListParams(filters, limit, offset));
  ensureSdkworkApiSuccess(result, 'Failed to fetch models');
  const data = readApiRecord(result);
  const models = resolveRuntimeModelCatalog(readRequiredApiItems(result, 'Failed to fetch models'));
  const groups = resolveRuntimeModelCatalogGroups(readRecordArray(data, 'groups'));
  const pageInfo = readModelCatalogPageInfo(data, { offset, limit, itemCount: models.length });

  return {
    models,
    groups,
    pageInfo,
  };
}

function readModelCatalogPageInfo(
  data: ApiRecord,
  page: { offset: number; limit: number; itemCount: number },
): ModelCatalogPageInfo {
  const total = readModelCatalogListTotal(data, page.itemCount);
  const consumed = page.offset + page.itemCount;
  return {
    total,
    offset: page.offset,
    limit: page.limit,
    hasMore: consumed < total,
  };
}

function readModelCatalogListTotal(data: ApiRecord, fallback: number): number {
  if (data.total !== undefined && data.total !== null && data.total !== '') {
    return readRequiredNonNegativeNumber(data, 'total', 'Model catalog total is required');
  }

  const pageInfo = data.pageInfo;
  if (isRecord(pageInfo)) {
    for (const key of ['totalItems', 'total_items'] as const) {
      const value = pageInfo[key];
      if (value === undefined || value === null || value === '') {
        continue;
      }
      const parsed = typeof value === 'number' ? value : Number(String(value).trim());
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
      throw new Error('Model catalog total must be a non-negative number');
    }
  }

  return fallback;
}

function buildModelCatalogListParams(
  filters: ModelCatalogServiceFilters,
  pageSize: number,
  offset: number,
) {
  return {
    billingMeter: normalizeQueryString(filters.billingMeter),
    vendorCodes: normalizeQueryValues(filters.vendorCodes),
    modalities: normalizeQueryValues(filters.modalities),
    capabilities: normalizeQueryValues(filters.capabilities),
    categories: normalizeQueryValues(filters.categories),
    groups: normalizeQueryValues(filters.groups),
    q: normalizeQueryString(filters.searchQuery),
    limit: String(pageSize),
    offset: String(offset),
  };
}

function resolveRuntimeModelCatalogGroups(records: readonly Record<string, unknown>[]): ModelCatalogGroup[] {
  const groups = new Map<string, ModelCatalogGroup>();
  for (const record of records) {
    const key = readString(record, 'key').trim();
    if (key.length === 0 || groups.has(key)) {
      continue;
    }
    const label = readString(record, 'label').trim() || key;
    const modelCount = Math.max(0, Math.trunc(readNumber(record, 'modelCount', 0)));
    groups.set(key, { key: key as ModelGroupKey, label, modelCount });
  }
  return [...groups.values()];
}

function normalizeQueryString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function normalizeQueryValues(values: readonly string[] | undefined): string[] | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }
  const normalized = values.map((value) => value.trim()).filter((value) => value.length > 0);
  return normalized.length > 0 ? normalized : undefined;
}
