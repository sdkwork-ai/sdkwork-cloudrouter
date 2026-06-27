import {
  ensureSdkworkApiSuccess,
  getModelsAppSdkClient,
  readApiRecord,
  readNumber,
  readRecordArray,
  readRequiredApiItems,
  readString,
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

const DEFAULT_MODEL_CATALOG_PAGE_SIZE = 200;

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

export interface ModelCatalogResult {
  models: Model[];
  groups: ModelCatalogGroup[];
}

export class ModelService {
  static async fetchModels(filters: ModelCatalogServiceFilters = {}): Promise<Model[]> {
    return (await fetchModelCatalogResult(filters)).models;
  }

  static fetchModelCatalog(filters: ModelCatalogServiceFilters = {}): Promise<ModelCatalogResult> {
    return fetchModelCatalogResult(filters);
  }
}

async function fetchModelCatalogResult(filters: ModelCatalogServiceFilters): Promise<ModelCatalogResult> {
  const pageSize = Math.max(1, Math.min(filters.limit ?? DEFAULT_MODEL_CATALOG_PAGE_SIZE, 1000));
  let offset = Math.max(filters.offset ?? 0, 0);
  const models: Model[] = [];
  let groups: ModelCatalogGroup[] = [];

  while (true) {
    const result = await getModelsAppSdkClient().ai.models.list(buildModelCatalogListParams(filters, pageSize, offset));
    ensureSdkworkApiSuccess(result, 'Failed to fetch models');
    const data = readApiRecord(result);
    const pageModels = resolveRuntimeModelCatalog(readRequiredApiItems(result, 'Failed to fetch models'));
    if (groups.length === 0) {
      groups = resolveRuntimeModelCatalogGroups(readRecordArray(data, 'groups'));
    }
    if (pageModels.length === 0) {
      break;
    }
    models.push(...pageModels);
    if (pageModels.length < pageSize) {
      break;
    }
    offset += pageModels.length;
    if (filters.limit !== undefined && models.length >= filters.limit) {
      break;
    }
  }

  return {
    models: filters.limit === undefined ? models : models.slice(0, filters.limit),
    groups,
  };
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
