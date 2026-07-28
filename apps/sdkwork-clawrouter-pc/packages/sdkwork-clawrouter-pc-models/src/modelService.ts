import {
  getModelsAppSdkClient,
  isRecord,
  readApiRecord,
  readNumber,
  readRecordArray,
  readRequiredApiItems,
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
  page?: number;
  pageSize?: number;
}

export interface ModelCatalogGroup {
  key: ModelGroupKey;
  label: string;
  modelCount: number;
}

export interface ModelCatalogProvider {
  code: string;
  label: string;
  modelCount: number;
}

export interface ModelCatalogPageInfo {
  total: number;
  page: number;
  pageSize: number;
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

  static async fetchModelProviders(): Promise<ModelCatalogProvider[]> {
    const result = await getModelsAppSdkClient().ai.modelVendors.list();
    return resolveRuntimeModelCatalogProviders(
      readRequiredApiItems(result, 'Failed to fetch model providers'),
    );
  }

  static async fetchModelByCatalogRouteId(routeId: string): Promise<Model | null> {
    const normalizedRouteId = routeId.trim();
    if (normalizedRouteId.length === 0) {
      return null;
    }

    const directMatch = findModelByCatalogRouteId(
      (await fetchModelCatalogResult({
        searchQuery: normalizedRouteId,
        pageSize: MAX_MODEL_CATALOG_PAGE_SIZE,
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
        pageSize: MAX_MODEL_CATALOG_PAGE_SIZE,
      })).models,
      normalizedRouteId,
    );
  }
}

async function fetchModelCatalogResult(filters: ModelCatalogServiceFilters): Promise<ModelCatalogResult> {
  const pageSize = Math.max(
    1,
    Math.min(filters.pageSize ?? DEFAULT_MODEL_CATALOG_PAGE_SIZE, MAX_MODEL_CATALOG_PAGE_SIZE),
  );
  const page = Math.max(1, Math.trunc(filters.page ?? 1));
  const result = await getModelsAppSdkClient().ai.models.list(buildModelCatalogListParams(filters, pageSize, page));
  const data = readApiRecord(result);
  const models = resolveRuntimeModelCatalog(readRequiredApiItems(result, 'Failed to fetch models'));
  const groups = resolveRuntimeModelCatalogGroups(readRecordArray(data, 'groups'));
  const pageInfo = readModelCatalogPageInfo(data, { page, pageSize, itemCount: models.length });

  return {
    models,
    groups,
    pageInfo,
  };
}

function readModelCatalogPageInfo(
  data: ApiRecord,
  page: { page: number; pageSize: number; itemCount: number },
): ModelCatalogPageInfo {
  const total = readModelCatalogListTotal(data, page.itemCount);
  const consumed = (page.page - 1) * page.pageSize + page.itemCount;
  return {
    total,
    page: page.page,
    pageSize: page.pageSize,
    hasMore: consumed < total,
  };
}

function readModelCatalogListTotal(data: ApiRecord, fallback: number): number {
  const pageInfo = data.pageInfo;
  if (isRecord(pageInfo)) {
    const value = pageInfo.totalItems;
    if (value !== undefined && value !== null && value !== '') {
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
  page: number,
) {
  return {
    page,
    pageSize,
    billingMeter: normalizeQueryString(filters.billingMeter),
    vendorCodes: normalizeQueryValues(filters.vendorCodes),
    modalities: normalizeQueryValues(filters.modalities),
    capabilities: normalizeQueryValues(filters.capabilities),
    categories: normalizeQueryValues(filters.categories),
    groups: normalizeQueryValues(filters.groups),
    q: normalizeQueryString(filters.searchQuery),
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

function resolveRuntimeModelCatalogProviders(items: readonly unknown[]): ModelCatalogProvider[] {
  const providers = new Map<string, ModelCatalogProvider>();
  for (const item of items) {
    if (!isRecord(item)) {
      continue;
    }
    const code = (readString(item, 'code') || readString(item, 'vendorCode')).trim();
    if (code.length === 0 || providers.has(code)) {
      continue;
    }
    const label = (
      readString(item, 'label')
      || readString(item, 'vendor')
      || readString(item, 'name')
      || code
    ).trim();
    const modelCount = Math.max(0, Math.trunc(readNumber(item, 'modelCount', 0)));
    providers.set(code, { code, label: label || code, modelCount });
  }

  return [...providers.values()].sort((first, second) => (
    first.label.localeCompare(second.label, undefined, { sensitivity: 'base' })
    || first.code.localeCompare(second.code)
  ));
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
