import type {
  AiCollection,
  AiCollectionCategory,
  AiCollectionItem,
  AiCollectionRelease,
  JsonValue,
} from '@sdkwork/cloudrouter-backend-sdk';

/**
 * Domain vocabulary for the AI capability collection admin surfaces.
 *
 * The wire models are aliases of the generated backend SDK types, so an SDK
 * regeneration that changes a field breaks this package at compile time instead
 * of silently drifting. The remaining interfaces are the console's own request
 * and page view models; int64 ids and counts stay decimal strings (API_SPEC
 * §13.6) and are never converted to `number` here.
 *
 * This module is deliberately not a `*Service.ts` file: the frontend field audit
 * treats every exported interface in a service file as a contract-declared data
 * model, while these are console view models over the operation schemas that
 * `docs/schema-registry/frontend-field-contracts.yaml` already declares.
 */

export type CollectionKind = AiCollection['collectionKind'];
export type CollectionCapabilityType = AiCollectionItem['capabilityType'];
export type CollectionVisibility = AiCollection['visibility'];
export type CollectionPublishStatus = AiCollection['publishStatus'];
export type CollectionRecordStatus = AiCollection['status'];
export type CollectionReleaseStatus = AiCollectionRelease['releaseStatus'];
export type CollectionStatusUpdateTarget = Extract<CollectionPublishStatus, 'published' | 'archived'>;

export const COLLECTION_KINDS: readonly CollectionKind[] = ['mixed', 'skill', 'mcp', 'agent', 'plugin'];
export const COLLECTION_CAPABILITY_TYPES: readonly CollectionCapabilityType[] = ['skill', 'mcp', 'agent', 'plugin'];
export const COLLECTION_VISIBILITIES: readonly CollectionVisibility[] = ['private', 'organization', 'public'];
export const COLLECTION_PUBLISH_STATUSES: readonly CollectionPublishStatus[] = ['draft', 'published', 'archived'];
export const COLLECTION_RECORD_STATUSES: readonly CollectionRecordStatus[] = ['enabled', 'disabled'];

/**
 * Collection key slug pattern.
 *
 * The generated contract accepts `.` in a collection key, so the UI applies the
 * same character family the server validates.
 */
export const COLLECTION_KEY_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/u;
/**
 * Category code slug pattern.
 *
 * Category codes are stricter than collection keys: the generated contract and
 * the `ai_collection_category.category_code` check do not allow `.`.
 */
export const COLLECTION_CATEGORY_CODE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,127}$/u;
export const COLLECTION_MAX_ITEMS = 200;
export const COLLECTION_MAX_TAGS = 20;

export type AdminCollectionCategory = AiCollectionCategory;
export type AdminCollectionCapabilityCounts = AiCollection['capabilityCounts'];
export type AdminCollectionItem = AiCollectionItem;
export type AdminCollection = AiCollection;
export type AdminCollectionRelease = AiCollectionRelease;

export interface CollectionPageInfo {
  page: number;
  pageSize: number;
  /** Server-reported total for the active query, or null when it is unknown. */
  totalItems: number | null;
  /** Server-reported page count, or null when it is unknown. */
  totalPages: number | null;
  hasNextPage: boolean;
}

export interface CollectionListResult {
  items: AdminCollection[];
  pageInfo: CollectionPageInfo;
}

export interface CollectionCategoryListResult {
  items: AdminCollectionCategory[];
  pageInfo: CollectionPageInfo;
}

export interface CollectionReleaseListResult {
  items: AdminCollectionRelease[];
  pageInfo: CollectionPageInfo;
}

export interface CollectionCategoryListParams {
  collectionKind?: CollectionKind;
  status?: CollectionRecordStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CollectionListParams {
  collectionKind?: CollectionKind;
  categoryId?: string;
  publishStatus?: CollectionPublishStatus;
  status?: CollectionRecordStatus;
  featured?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CollectionReleaseListParams {
  page?: number;
  pageSize?: number;
}

export interface CollectionCategoryInput {
  /** Create-only; the update request never changes the category kind. */
  collectionKind?: CollectionKind;
  /** Create-only; the category code is immutable after creation. */
  categoryCode?: string;
  name?: string;
  description?: string;
  iconRef?: string;
  /** Optional parent id; `undefined` omits the field, `null` clears it. */
  parentId?: string | null;
  sortOrder?: number;
  status?: CollectionRecordStatus;
}

export interface CollectionItemDraft {
  capabilityType: CollectionCapabilityType;
  capabilityKey: string;
  capabilityName: string;
  capabilityVersion: string;
  capabilityIconRef: string;
  config: Record<string, JsonValue>;
  enabled: boolean;
}

export interface CollectionInput {
  name?: string;
  /** Create-only; the collection key is immutable after creation. */
  collectionKey?: string;
  summary?: string;
  description?: string;
  iconRef?: string;
  /** Create-only; the collection kind decides which capability types are legal. */
  collectionKind?: CollectionKind;
  categoryId?: string | null;
  visibility?: CollectionVisibility;
  tags?: string[];
  featured?: boolean;
  sortOrder?: number;
  status?: CollectionRecordStatus;
  items?: CollectionItemDraft[];
}

export interface CollectionStatusInput {
  publishStatus: CollectionStatusUpdateTarget;
  notes?: string;
}
