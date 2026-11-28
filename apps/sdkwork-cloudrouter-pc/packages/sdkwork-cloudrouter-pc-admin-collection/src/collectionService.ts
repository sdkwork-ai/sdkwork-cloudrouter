import type {
  AiCollectionCategoryCreateRequest,
  AiCollectionCategoryUpdateRequest,
  AiCollectionCreateRequest,
  AiCollectionItemInput,
  AiCollectionItemsReplaceRequest,
  AiCollectionStatusUpdateRequest,
  AiCollectionUpdateRequest,
  JsonValue,
} from '@sdkwork/cloudrouter-backend-sdk';
import {
  ensureSdkworkApiSuccess,
  isRecord,
  readNumber,
  readRequiredApiItem,
  readRequiredApiItems,
  readRequiredString,
  readString,
  readStringArray,
  requiredSafePathSegment,
  type ApiRecord,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import { getCloudRouterBackendSdkClient } from '@sdkwork/cloudroutes-pc-commons/sdk-clients';
import {
  COLLECTION_CAPABILITY_TYPES,
  COLLECTION_MAX_ITEMS,
  COLLECTION_MAX_TAGS,
  COLLECTION_CATEGORY_CODE_PATTERN,
  COLLECTION_KEY_PATTERN,
  type AdminCollection,
  type AdminCollectionCapabilityCounts,
  type AdminCollectionCategory,
  type AdminCollectionItem,
  type AdminCollectionRelease,
  type CollectionCapabilityType,
  type CollectionCategoryInput,
  type CollectionCategoryListParams,
  type CollectionCategoryListResult,
  type CollectionInput,
  type CollectionItemDraft,
  type CollectionKind,
  type CollectionListParams,
  type CollectionListResult,
  type CollectionPageInfo,
  type CollectionPublishStatus,
  type CollectionRecordStatus,
  type CollectionReleaseListParams,
  type CollectionReleaseListResult,
  type CollectionReleaseStatus,
  type CollectionStatusInput,
  type CollectionStatusUpdateTarget,
  type CollectionVisibility,
} from './collectionTypes.ts';

/**
 * AI capability collection admin service.
 *
 * Every operation goes through the generated `@sdkwork/cloudrouter-backend-sdk`
 * client (`ai.collectionCategories` / `ai.collections`). The service owns the
 * client-side validation contract so the pages and drawers stay presentational:
 * wire ids and counts stay decimal strings (API_SPEC §13.6), and any field the
 * backend rejects is rejected here first with the same limits.
 *
 * Domain types, generated wire-model aliases, and the validation limits are
 * declared in `collectionTypes.ts`; this file re-exports the whole vocabulary so
 * consumers keep importing domain types from the service boundary.
 */
export * from './collectionTypes.ts';

const TEXT_LIMITS = {
  name: 255,
  summary: 1024,
  description: 8000,
  iconRef: 512,
  tag: 64,
  categoryCode: 128,
  categoryDescription: 4000,
  capabilityKey: 191,
  capabilityName: 255,
  capabilityVersion: 64,
  releaseNotes: 1024,
  search: 256,
} as const;

type BackendSdkClient = ReturnType<typeof getCloudRouterBackendSdkClient>;
type CategoryListSdkParams = NonNullable<
  Parameters<BackendSdkClient['ai']['collectionCategories']['list']>[0]
>;
type CollectionListSdkParams = NonNullable<Parameters<BackendSdkClient['ai']['collections']['list']>[0]>;
type CollectionReleaseListSdkParams = NonNullable<
  Parameters<BackendSdkClient['ai']['collections']['releases']['list']>[1]
>;

export class CollectionService {
  static async listCollectionCategories(
    params: CollectionCategoryListParams = {},
  ): Promise<CollectionCategoryListResult> {
    const page = normalizePageNumber(params.page);
    const pageSize = normalizePageSize(params.pageSize);
    const query: CategoryListSdkParams = { page, pageSize };
    if (params.collectionKind !== undefined) {
      query.collectionKind = normalizeCollectionKind(params.collectionKind);
    }
    if (params.status !== undefined) {
      query.status = normalizeRecordStatus(params.status);
    }
    const search = normalizeVisibleText(params.search, 'search', TEXT_LIMITS.search);
    if (search) {
      query.q = search;
    }
    const result = await getCloudRouterBackendSdkClient().ai.collectionCategories.list(query);
    ensureSdkworkApiSuccess(result, 'Collection categories could not be loaded');
    const items = readRequiredApiItems(result, 'Collection categories could not be loaded')
      .map(normalizeCollectionCategory);
    return { items, pageInfo: normalizePageInfo(result, page, pageSize, items.length) };
  }

  static async createCollectionCategory(input: CollectionCategoryInput): Promise<AdminCollectionCategory> {
    const request = toCategoryCreateRequest(input);
    const result = await getCloudRouterBackendSdkClient().ai.collectionCategories.create(request);
    ensureSdkworkApiSuccess(result, 'Collection category could not be created');
    return normalizeCollectionCategory(
      readRequiredApiItem(result, 'Created collection category response is missing data'),
    );
  }

  static async updateCollectionCategory(
    categoryId: string,
    input: CollectionCategoryInput,
  ): Promise<AdminCollectionCategory> {
    const request = toCategoryUpdateRequest(input);
    const result = await getCloudRouterBackendSdkClient().ai.collectionCategories.update(
      requiredCategoryId(categoryId),
      request,
    );
    ensureSdkworkApiSuccess(result, 'Collection category could not be updated');
    return normalizeCollectionCategory(
      readRequiredApiItem(result, 'Updated collection category response is missing data'),
    );
  }

  static async deleteCollectionCategory(categoryId: string): Promise<void> {
    await getCloudRouterBackendSdkClient().ai.collectionCategories.delete(requiredCategoryId(categoryId));
  }

  static async initializeCollectionCategories(): Promise<CollectionCategoryListResult> {
    const result = await getCloudRouterBackendSdkClient().ai.collectionCategories.defaults.create();
    ensureSdkworkApiSuccess(result, 'Standard collection categories could not be initialized');
    const items = readRequiredApiItems(result, 'Standard collection categories could not be initialized')
      .map(normalizeCollectionCategory);
    return {
      items,
      pageInfo: normalizePageInfo(result, 1, Math.min(Math.max(items.length, 1), COLLECTION_MAX_ITEMS), items.length),
    };
  }

  static async listCollections(params: CollectionListParams = {}): Promise<CollectionListResult> {
    const page = normalizePageNumber(params.page);
    const pageSize = normalizePageSize(params.pageSize);
    const query: CollectionListSdkParams = { page, pageSize };
    if (params.collectionKind !== undefined) {
      query.collectionKind = normalizeCollectionKind(params.collectionKind);
    }
    if (params.categoryId !== undefined && params.categoryId !== '') {
      query.categoryId = requiredInt64String(params.categoryId, 'category id');
    }
    if (params.publishStatus !== undefined) {
      query.publishStatus = normalizePublishStatus(params.publishStatus);
    }
    if (params.status !== undefined) {
      query.status = normalizeRecordStatus(params.status);
    }
    if (params.featured !== undefined) {
      query.featured = params.featured;
    }
    const search = normalizeVisibleText(params.search, 'search', TEXT_LIMITS.search);
    if (search) {
      query.q = search;
    }
    const result = await getCloudRouterBackendSdkClient().ai.collections.list(query);
    ensureSdkworkApiSuccess(result, 'Collections could not be loaded');
    const items = readRequiredApiItems(result, 'Collections could not be loaded')
      .map(normalizeCollection);
    return { items, pageInfo: normalizePageInfo(result, page, pageSize, items.length) };
  }

  static async createCollection(input: CollectionInput): Promise<AdminCollection> {
    const request = toCollectionCreateRequest(input);
    const result = await getCloudRouterBackendSdkClient().ai.collections.create(request);
    ensureSdkworkApiSuccess(result, 'Collection could not be created');
    return normalizeCollection(readRequiredApiItem(result, 'Created collection response is missing data'));
  }

  static async getCollection(collectionId: string): Promise<AdminCollection> {
    const result = await getCloudRouterBackendSdkClient().ai.collections.retrieve(
      requiredCollectionId(collectionId),
    );
    ensureSdkworkApiSuccess(result, 'Collection could not be loaded');
    return normalizeCollection(readRequiredApiItem(result, 'Collection response is missing data'));
  }

  static async updateCollection(collectionId: string, input: CollectionInput): Promise<AdminCollection> {
    const request = toCollectionUpdateRequest(input);
    const result = await getCloudRouterBackendSdkClient().ai.collections.update(
      requiredCollectionId(collectionId),
      request,
    );
    ensureSdkworkApiSuccess(result, 'Collection could not be updated');
    return normalizeCollection(readRequiredApiItem(result, 'Updated collection response is missing data'));
  }

  static async deleteCollection(collectionId: string): Promise<void> {
    await getCloudRouterBackendSdkClient().ai.collections.delete(requiredCollectionId(collectionId));
  }

  static async replaceCollectionItems(
    collectionId: string,
    items: CollectionItemDraft[],
    collectionKind?: CollectionKind,
  ): Promise<AdminCollection> {
    const request: AiCollectionItemsReplaceRequest = {
      items: toCollectionItemInputs(items, collectionKind),
    };
    const result = await getCloudRouterBackendSdkClient().ai.collections.items.update(
      requiredCollectionId(collectionId),
      request,
    );
    ensureSdkworkApiSuccess(result, 'Collection capabilities could not be saved');
    return normalizeCollection(readRequiredApiItem(result, 'Updated collection response is missing data'));
  }

  static async updateCollectionStatus(
    collectionId: string,
    input: CollectionStatusInput,
  ): Promise<AdminCollection> {
    const request: AiCollectionStatusUpdateRequest = { publishStatus: normalizeStatusTarget(input.publishStatus) };
    const notes = normalizeVisibleText(input.notes, 'release notes', TEXT_LIMITS.releaseNotes);
    if (notes) {
      request.notes = notes;
    }
    const result = await getCloudRouterBackendSdkClient().ai.collections.status.update(
      requiredCollectionId(collectionId),
      request,
    );
    ensureSdkworkApiSuccess(result, 'Collection status could not be updated');
    return normalizeCollection(readRequiredApiItem(result, 'Updated collection response is missing data'));
  }

  static async listCollectionReleases(
    collectionId: string,
    params: CollectionReleaseListParams = {},
  ): Promise<CollectionReleaseListResult> {
    const page = normalizePageNumber(params.page);
    const pageSize = normalizePageSize(params.pageSize);
    const query: CollectionReleaseListSdkParams = { page, pageSize };
    const result = await getCloudRouterBackendSdkClient().ai.collections.releases.list(
      requiredCollectionId(collectionId),
      query,
    );
    ensureSdkworkApiSuccess(result, 'Collection releases could not be loaded');
    const items = readRequiredApiItems(result, 'Collection releases could not be loaded')
      .map(normalizeCollectionRelease);
    return { items, pageInfo: normalizePageInfo(result, page, pageSize, items.length) };
  }
}

export function isCapabilityAllowedForCollectionKind(
  collectionKind: CollectionKind,
  capabilityType: CollectionCapabilityType,
): boolean {
  return collectionKind === 'mixed' || collectionKind === capabilityType;
}

/**
 * Number of enabled capability items.
 *
 * Publishing requires at least one enabled item: a release whose every item is
 * disabled carries no usable capability even though `itemCount` is non-zero.
 */
export function enabledCapabilityCount(collection: Pick<AdminCollection, 'items'>): number {
  return collection.items.filter((item) => item.enabled).length;
}

export function collectionKindCapabilityTypes(collectionKind: CollectionKind): readonly CollectionCapabilityType[] {
  return collectionKind === 'mixed'
    ? COLLECTION_CAPABILITY_TYPES
    : COLLECTION_CAPABILITY_TYPES.filter((type) => type === collectionKind);
}

export function toCollectionItemDrafts(items: readonly AdminCollectionItem[]): CollectionItemDraft[] {
  return [...items]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((item) => ({
      capabilityType: item.capabilityType,
      capabilityKey: item.capabilityKey,
      capabilityName: item.capabilityName,
      capabilityVersion: item.capabilityVersion,
      capabilityIconRef: item.capabilityIconRef,
      config: item.config,
      enabled: item.enabled,
    }));
}

export function sameCollectionItemDrafts(
  left: readonly CollectionItemDraft[],
  right: readonly CollectionItemDraft[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((item, index) => {
    const candidate = right[index];
    return candidate !== undefined
      && item.capabilityType === candidate.capabilityType
      && item.capabilityKey === candidate.capabilityKey
      && item.capabilityName === candidate.capabilityName
      && item.capabilityVersion === candidate.capabilityVersion
      && item.capabilityIconRef === candidate.capabilityIconRef
      && item.enabled === candidate.enabled
      && JSON.stringify(item.config) === JSON.stringify(candidate.config);
  });
}

export function parseCollectionConfigJson(text: string): Record<string, JsonValue> {
  const trimmed = text.trim();
  if (!trimmed) {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('Config must be valid JSON');
  }
  if (!isJsonObject(parsed)) {
    throw new Error('Config must be a JSON object');
  }
  return parsed;
}

export function formatCollectionConfigJson(config: Record<string, JsonValue>): string {
  return Object.keys(config).length === 0 ? '' : JSON.stringify(config, null, 2);
}

function requiredCategoryId(value: string): string {
  return requiredSafePathSegment(value, 'category id');
}

function requiredCollectionId(value: string): string {
  return requiredSafePathSegment(value, 'collection id');
}

function toCategoryCreateRequest(input: CollectionCategoryInput): AiCollectionCategoryCreateRequest {
  const name = requiredText(input.name, 'name', TEXT_LIMITS.name);
  const request: AiCollectionCategoryCreateRequest = {
    collectionKind: normalizeCollectionKind(input.collectionKind),
    categoryCode: requiredCategoryCode(input.categoryCode),
    name,
  };
  const description = normalizeVisibleText(input.description, 'description', TEXT_LIMITS.categoryDescription);
  if (description) {
    request.description = description;
  }
  const iconRef = normalizeVisibleText(input.iconRef, 'icon reference', TEXT_LIMITS.iconRef);
  if (iconRef) {
    request.iconRef = iconRef;
  }
  const parentId = normalizeNullableId(input.parentId, 'parent id');
  if (parentId !== undefined) {
    request.parentId = parentId;
  }
  if (input.sortOrder !== undefined) {
    request.sortOrder = normalizeSortOrder(input.sortOrder);
  }
  if (input.status !== undefined) {
    request.status = normalizeRecordStatus(input.status);
  }
  return request;
}

function toCategoryUpdateRequest(input: CollectionCategoryInput): AiCollectionCategoryUpdateRequest {
  const request: AiCollectionCategoryUpdateRequest = {};
  if (input.name !== undefined) {
    request.name = requiredText(input.name, 'name', TEXT_LIMITS.name);
  }
  if (input.description !== undefined) {
    request.description = editableText(input.description, 'description', TEXT_LIMITS.categoryDescription);
  }
  if (input.iconRef !== undefined) {
    request.iconRef = editableText(input.iconRef, 'icon reference', TEXT_LIMITS.iconRef);
  }
  const parentId = normalizeNullableId(input.parentId, 'parent id');
  if (parentId !== undefined) {
    request.parentId = parentId;
  }
  if (input.sortOrder !== undefined) {
    request.sortOrder = normalizeSortOrder(input.sortOrder);
  }
  if (input.status !== undefined) {
    request.status = normalizeRecordStatus(input.status);
  }
  if (Object.keys(request).length === 0) {
    throw new Error('collection category update fields are required');
  }
  return request;
}

function toCollectionCreateRequest(input: CollectionInput): AiCollectionCreateRequest {
  const collectionKind = normalizeCollectionKind(input.collectionKind);
  const request: AiCollectionCreateRequest = {
    name: requiredText(input.name, 'name', TEXT_LIMITS.name),
    collectionKind,
  };
  if (input.collectionKey !== undefined && input.collectionKey.trim() !== '') {
    request.collectionKey = requiredCollectionKey(input.collectionKey);
  }
  const summary = normalizeVisibleText(input.summary, 'summary', TEXT_LIMITS.summary);
  if (summary) {
    request.summary = summary;
  }
  const description = normalizeVisibleText(input.description, 'description', TEXT_LIMITS.description);
  if (description) {
    request.description = description;
  }
  const iconRef = normalizeVisibleText(input.iconRef, 'icon reference', TEXT_LIMITS.iconRef);
  if (iconRef) {
    request.iconRef = iconRef;
  }
  const categoryId = normalizeNullableId(input.categoryId, 'category id');
  if (categoryId !== undefined) {
    request.categoryId = categoryId;
  }
  if (input.visibility !== undefined) {
    request.visibility = normalizeVisibility(input.visibility);
  }
  const tags = normalizeTags(input.tags);
  if (tags) {
    request.tags = tags;
  }
  if (input.featured !== undefined) {
    request.featured = input.featured;
  }
  if (input.sortOrder !== undefined) {
    request.sortOrder = normalizeSortOrder(input.sortOrder);
  }
  if (input.items !== undefined) {
    request.items = toCollectionItemInputs(input.items, collectionKind);
  }
  return request;
}

function toCollectionUpdateRequest(input: CollectionInput): AiCollectionUpdateRequest {
  const request: AiCollectionUpdateRequest = {};
  if (input.name !== undefined) {
    request.name = requiredText(input.name, 'name', TEXT_LIMITS.name);
  }
  if (input.summary !== undefined) {
    request.summary = editableText(input.summary, 'summary', TEXT_LIMITS.summary);
  }
  if (input.description !== undefined) {
    request.description = editableText(input.description, 'description', TEXT_LIMITS.description);
  }
  if (input.iconRef !== undefined) {
    request.iconRef = editableText(input.iconRef, 'icon reference', TEXT_LIMITS.iconRef);
  }
  const categoryId = normalizeNullableId(input.categoryId, 'category id');
  if (categoryId !== undefined) {
    request.categoryId = categoryId;
  }
  if (input.visibility !== undefined) {
    request.visibility = normalizeVisibility(input.visibility);
  }
  if (input.tags !== undefined) {
    request.tags = normalizeTags(input.tags) ?? [];
  }
  if (input.featured !== undefined) {
    request.featured = input.featured;
  }
  if (input.sortOrder !== undefined) {
    request.sortOrder = normalizeSortOrder(input.sortOrder);
  }
  if (input.status !== undefined) {
    request.status = normalizeRecordStatus(input.status);
  }
  if (Object.keys(request).length === 0) {
    throw new Error('collection update fields are required');
  }
  return request;
}

function toCollectionItemInputs(
  items: readonly CollectionItemDraft[],
  collectionKind?: CollectionKind,
): AiCollectionItemInput[] {
  if (items.length > COLLECTION_MAX_ITEMS) {
    throw new Error(`a collection accepts at most ${COLLECTION_MAX_ITEMS} capabilities`);
  }
  const kind = collectionKind === undefined ? 'mixed' : normalizeCollectionKind(collectionKind);
  const seen = new Set<string>();
  return items.map((item, index) => {
    const capabilityType = normalizeCapabilityType(item.capabilityType);
    if (!isCapabilityAllowedForCollectionKind(kind, capabilityType)) {
      throw new Error(`a ${kind} collection only accepts ${kind} capabilities`);
    }
    const capabilityKey = requiredText(item.capabilityKey, 'capability key', TEXT_LIMITS.capabilityKey);
    const identity = `${capabilityType}:${capabilityKey}`;
    if (seen.has(identity)) {
      throw new Error(`duplicate capability: ${identity}`);
    }
    seen.add(identity);
    if (!isJsonObject(item.config)) {
      throw new Error('capability config must be a JSON object');
    }
    if (new TextEncoder().encode(JSON.stringify(item.config)).byteLength > 16 * 1024) {
      throw new Error('capability config must be at most 16384 bytes');
    }
    const input: AiCollectionItemInput = {
      capabilityType,
      capabilityKey,
      config: item.config,
      enabled: item.enabled,
      // The draft order is the authoring order; the wire sort order follows it so
      // a UI reorder always round-trips identically.
      sortOrder: index,
    };
    const capabilityName = normalizeVisibleText(item.capabilityName, 'capability name', TEXT_LIMITS.capabilityName);
    if (capabilityName) {
      input.capabilityName = capabilityName;
    }
    const capabilityVersion = normalizeVisibleText(
      item.capabilityVersion,
      'capability version',
      TEXT_LIMITS.capabilityVersion,
    );
    if (capabilityVersion) {
      input.capabilityVersion = capabilityVersion;
    }
    const capabilityIconRef = normalizeVisibleText(
      item.capabilityIconRef,
      'capability icon reference',
      TEXT_LIMITS.iconRef,
    );
    if (capabilityIconRef) {
      input.capabilityIconRef = capabilityIconRef;
    }
    return input;
  });
}

function normalizeCollectionCategory(value: unknown): AdminCollectionCategory {
  const item = readRequiredRecord(value, 'Collection category record is required');
  return {
    id: requiredInt64String(readRequiredString(item, 'id', 'Collection category id is required'), 'category id'),
    categoryCode: readRequiredString(item, 'categoryCode', 'Collection category code is required'),
    name: readRequiredString(item, 'name', 'Collection category name is required'),
    description: readString(item, 'description'),
    iconRef: readString(item, 'iconRef'),
    collectionKind: normalizeCollectionKind(readString(item, 'collectionKind')),
    parentId: readNullableInt64String(item, 'parentId'),
    sortOrder: readNumber(item, 'sortOrder'),
    status: normalizeRecordStatus(readString(item, 'status')),
    isSystem: item.isSystem === true,
    collectionCount: requiredCountString(item, 'collectionCount', 'Collection category count is required'),
    createdAt: readString(item, 'createdAt'),
    updatedAt: readRequiredString(item, 'updatedAt', 'Collection category updated time is required'),
  };
}

function normalizeCollection(value: unknown): AdminCollection {
  const item = readRequiredRecord(value, 'Collection record is required');
  return {
    id: requiredInt64String(readRequiredString(item, 'id', 'Collection id is required'), 'collection id'),
    collectionKey: readRequiredString(item, 'collectionKey', 'Collection key is required'),
    name: readRequiredString(item, 'name', 'Collection name is required'),
    summary: readString(item, 'summary'),
    description: readString(item, 'description'),
    iconRef: readString(item, 'iconRef'),
    collectionKind: normalizeCollectionKind(readString(item, 'collectionKind')),
    categoryId: readNullableInt64String(item, 'categoryId'),
    categoryName: readNullableText(item, 'categoryName'),
    visibility: normalizeVisibility(readString(item, 'visibility')),
    publishStatus: normalizePublishStatus(readString(item, 'publishStatus')),
    publishedAt: readNullableText(item, 'publishedAt'),
    itemCount: requiredCountString(item, 'itemCount', 'Collection item count is required'),
    capabilityCounts: normalizeCapabilityCounts(item.capabilityCounts),
    tags: readStringArray(item, 'tags'),
    featured: item.featured === true,
    sortOrder: readNumber(item, 'sortOrder'),
    ownerUserId: requiredInt64String(readRequiredString(item, 'ownerUserId', 'Collection owner is required'), 'owner user id'),
    createdBy: requiredInt64String(readRequiredString(item, 'createdBy', 'Collection creator is required'), 'created by'),
    updatedBy: requiredInt64String(readRequiredString(item, 'updatedBy', 'Collection updater is required'), 'updated by'),
    status: normalizeRecordStatus(readString(item, 'status')),
    latestReleaseNo: readNullableNumber(item, 'latestReleaseNo'),
    items: readRequiredApiItems(item, 'Collection items are required').map(normalizeCollectionItem),
    createdAt: readString(item, 'createdAt'),
    updatedAt: readRequiredString(item, 'updatedAt', 'Collection updated time is required'),
  };
}

function normalizeCollectionItem(value: unknown): AdminCollectionItem {
  const item = readRequiredRecord(value, 'Collection item record is required');
  return {
    id: requiredInt64String(readRequiredString(item, 'id', 'Collection item id is required'), 'collection item id'),
    collectionId: requiredInt64String(
      readRequiredString(item, 'collectionId', 'Collection item collection id is required'),
      'collection item collection id',
    ),
    capabilityType: normalizeCapabilityType(readString(item, 'capabilityType')),
    capabilityKey: readRequiredString(item, 'capabilityKey', 'Collection item capability key is required'),
    capabilityName: readString(item, 'capabilityName'),
    capabilityVersion: readString(item, 'capabilityVersion'),
    capabilityIconRef: readString(item, 'capabilityIconRef'),
    config: isJsonObject(item.config) ? item.config : {},
    sortOrder: readNumber(item, 'sortOrder'),
    enabled: item.enabled !== false,
    createdAt: readString(item, 'createdAt'),
    updatedAt: readString(item, 'updatedAt'),
  };
}

function normalizeCollectionRelease(value: unknown): AdminCollectionRelease {
  const item = readRequiredRecord(value, 'Collection release record is required');
  return {
    id: requiredInt64String(readRequiredString(item, 'id', 'Collection release id is required'), 'collection release id'),
    releaseNo: readNumber(item, 'releaseNo'),
    name: readString(item, 'name'),
    itemCount: requiredCountString(item, 'itemCount', 'Collection release item count is required'),
    releaseStatus: normalizeReleaseStatus(readString(item, 'releaseStatus')),
    notes: readString(item, 'notes'),
    publishedBy: requiredInt64String(
      readRequiredString(item, 'publishedBy', 'Collection release publisher is required'),
      'collection release publisher',
    ),
    publishedAt: readString(item, 'publishedAt'),
    createdAt: readString(item, 'createdAt'),
  };
}

function normalizeCapabilityCounts(value: unknown): AdminCollectionCapabilityCounts {
  const record = isRecord(value) ? value : {};
  return {
    skill: requiredCountString(record, 'skill', 'Collection skill count is required'),
    mcp: requiredCountString(record, 'mcp', 'Collection mcp count is required'),
    agent: requiredCountString(record, 'agent', 'Collection agent count is required'),
    plugin: requiredCountString(record, 'plugin', 'Collection plugin count is required'),
  };
}

function normalizePageInfo(
  result: unknown,
  page: number,
  pageSize: number,
  itemCount: number,
): CollectionPageInfo {
  const pageInfo = isRecord(result) && isRecord(result.pageInfo) ? result.pageInfo : {};
  const resolvedPage = Math.max(1, Math.trunc(readNumber(pageInfo, 'page', page)));
  const resolvedPageSize = Math.max(1, Math.trunc(readNumber(pageInfo, 'pageSize', pageSize)));
  const totalItems = readNullableCount(pageInfo, 'totalItems');
  const totalPages = normalizeOptionalPositiveInteger(pageInfo.totalPages);
  const hasMore = pageInfo.hasMore;
  const hasNextPage = typeof hasMore === 'boolean'
    ? hasMore
    : totalPages !== null
      ? resolvedPage < totalPages
      : itemCount >= resolvedPageSize;
  return { page: resolvedPage, pageSize: resolvedPageSize, totalItems, totalPages, hasNextPage };
}

function normalizePageNumber(value: number | undefined): number {
  if (value === undefined) {
    return 1;
  }
  if (!Number.isInteger(value) || value < 1) {
    throw new Error('page must be a positive integer');
  }
  return value;
}

function normalizePageSize(value: number | undefined): number {
  if (value === undefined) {
    return 20;
  }
  if (!Number.isInteger(value) || value < 1 || value > COLLECTION_MAX_ITEMS) {
    throw new Error(`page size must be an integer between 1 and ${COLLECTION_MAX_ITEMS}`);
  }
  return value;
}

function normalizeOptionalPositiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : null;
}

function readNullableCount(item: ApiRecord, key: string): number | null {
  const value = readString(item, key);
  if (!value || !/^[0-9]+$/u.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function readNullableNumber(item: ApiRecord, key: string): number | null {
  const value = item[key];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  return null;
}

function readNullableText(item: ApiRecord, key: string): string | null {
  const value = readString(item, key);
  return value === '' ? null : value;
}

function readNullableInt64String(item: ApiRecord, key: string): string | null {
  const value = readString(item, key);
  if (!value) {
    return null;
  }
  return requiredInt64String(value, key);
}

function readRequiredRecord(value: unknown, message: string): ApiRecord {
  if (!isRecord(value)) {
    throw new Error(message);
  }
  return value;
}

function requiredCountString(item: ApiRecord, key: string, message: string): string {
  const value = readString(item, key);
  if (!/^[0-9]+$/u.test(value)) {
    throw new Error(message);
  }
  return value;
}

function requiredInt64String(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!/^-?[0-9]+$/u.test(normalized)) {
    throw new Error(`${fieldName} must be an int64 decimal string`);
  }
  return normalized;
}

function requiredText(value: string | undefined, fieldName: string, maxLength: number): string {
  const normalized = value?.trim() ?? '';
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }
  if (normalized.length > maxLength || !isVisibleText(normalized)) {
    throw new Error(`${fieldName} must be visible text and at most ${maxLength} characters`);
  }
  return normalized;
}

function normalizeVisibleText(value: string | undefined, fieldName: string, maxLength: number): string | undefined {
  const normalized = value?.trim() ?? '';
  if (!normalized) {
    return undefined;
  }
  if (normalized.length > maxLength || !isVisibleText(normalized)) {
    throw new Error(`${fieldName} must be visible text and at most ${maxLength} characters`);
  }
  return normalized;
}

function editableText(value: string, fieldName: string, maxLength: number): string {
  const normalized = value.trim();
  if (normalized.length > maxLength || !isVisibleText(normalized)) {
    throw new Error(`${fieldName} must be visible text and at most ${maxLength} characters`);
  }
  return normalized;
}

function requiredCollectionKey(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!COLLECTION_KEY_PATTERN.test(normalized)) {
    throw new Error('collection key must match ^[a-z0-9][a-z0-9._-]{0,127}$');
  }
  return normalized;
}

function requiredCategoryCode(value: string | undefined): string {
  const normalized = value?.trim().toLowerCase() ?? '';
  if (!COLLECTION_CATEGORY_CODE_PATTERN.test(normalized)) {
    throw new Error('category code must match ^[a-z0-9][a-z0-9_-]{0,127}$');
  }
  return normalized;
}

function normalizeNullableId(value: string | null | undefined, fieldName: string): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === '') {
    return null;
  }
  return requiredInt64String(value, fieldName);
}

function normalizeSortOrder(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 2_147_483_647) {
    throw new Error('sort order must be an integer between 0 and 2147483647');
  }
  return value;
}

function normalizeTags(values: readonly string[] | undefined): string[] | undefined {
  if (values === undefined) {
    return undefined;
  }
  if (values.length > COLLECTION_MAX_TAGS) {
    throw new Error(`tags must contain at most ${COLLECTION_MAX_TAGS} entries`);
  }
  const tags: string[] = [];
  for (const value of values) {
    const tag = value.trim();
    if (!tag) {
      continue;
    }
    if (tag.length > TEXT_LIMITS.tag || !isVisibleText(tag)) {
      throw new Error(`tag must be visible text and at most ${TEXT_LIMITS.tag} characters`);
    }
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }
  if (tags.length > COLLECTION_MAX_TAGS) {
    throw new Error(`tags must contain at most ${COLLECTION_MAX_TAGS} entries`);
  }
  return tags;
}

function normalizeCollectionKind(value: string | undefined): CollectionKind {
  if (value === 'mixed' || value === 'skill' || value === 'mcp' || value === 'agent' || value === 'plugin') {
    return value;
  }
  throw new Error(value ? `Unsupported collection kind: ${value}` : 'Collection kind is required');
}

function normalizeCapabilityType(value: string): CollectionCapabilityType {
  if (value === 'skill' || value === 'mcp' || value === 'agent' || value === 'plugin') {
    return value;
  }
  throw new Error(value ? `Unsupported capability type: ${value}` : 'Capability type is required');
}

function normalizeVisibility(value: string): CollectionVisibility {
  if (value === 'private' || value === 'organization' || value === 'public') {
    return value;
  }
  throw new Error(value ? `Unsupported collection visibility: ${value}` : 'Collection visibility is required');
}

function normalizePublishStatus(value: string): CollectionPublishStatus {
  if (value === 'draft' || value === 'published' || value === 'archived') {
    return value;
  }
  throw new Error(value ? `Unsupported publish status: ${value}` : 'Publish status is required');
}

function normalizeStatusTarget(value: CollectionStatusUpdateTarget): CollectionStatusUpdateTarget {
  if (value === 'published' || value === 'archived') {
    return value;
  }
  throw new Error('publish status must be published or archived');
}

function normalizeRecordStatus(value: string): CollectionRecordStatus {
  if (value === 'enabled' || value === 'disabled') {
    return value;
  }
  throw new Error(value ? `Unsupported record status: ${value}` : 'Record status is required');
}

function normalizeReleaseStatus(value: string): CollectionReleaseStatus {
  if (value === 'published' || value === 'revoked') {
    return value;
  }
  throw new Error(value ? `Unsupported release status: ${value}` : 'Release status is required');
}

function isVisibleText(value: string): boolean {
  return !/[\p{C}]/u.test(value);
}

function isJsonObject(value: unknown): value is Record<string, JsonValue> {
  return isRecord(value) && Object.values(value).every(isJsonValue);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return true;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  return isJsonObject(value);
}


