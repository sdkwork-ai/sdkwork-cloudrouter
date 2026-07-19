import {
  isRecord,
  readRequiredNonNegativeNumber,
  readRequiredString,
  readString,
  readStringArray,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/api-result';
import { getClawRouterBackendSdkClient } from '@sdkwork/clawroutes-pc-commons/sdk-clients';

export type CacheProviderKind = 'local_cache' | 'redis_cache';
export type CacheRuntimeTarget = 'desktop_packaged' | 'service';

export interface CacheSummary {
  runtimeTarget: CacheRuntimeTarget;
  totalInstances: number;
  totalNamespaces: number;
  totalEntries: number;
  expiredEntries: number;
  cacheHits: number;
  cacheMisses: number;
  cacheWrites: number;
  cacheDeletes: number;
  cacheRefreshes: number;
  cacheInspections: number;
  cacheErrors: number;
}

export interface CacheInstance {
  name: string;
  providerKind: CacheProviderKind;
  purpose: string;
  keyPrefix: string;
  defaultTtlSeconds: number;
  maxEntries: number | null;
  connectionProfileName: string | null;
  supportsInspect: boolean;
  supportsRefresh: boolean;
  supportsDelete: boolean;
  entryCount: number;
  expiredEntryCount: number;
  cacheHits: number;
  cacheMisses: number;
  cacheWrites: number;
  cacheDeletes: number;
  cacheRefreshes: number;
  cacheInspections: number;
  cacheErrors: number;
  status: string;
}

export interface CacheNamespacePolicy {
  namespace: string;
  instanceName: string;
  ttlSeconds: number;
  scope: string;
  sensitivity: string;
  failureMode: string;
  consistency: string;
  jitterPercent: number;
  staleWhileRevalidateSeconds: number;
  tags: string[];
  enabled: boolean;
}

export interface CacheOverview {
  summary: CacheSummary;
  instances: CacheInstance[];
  namespacePolicies: CacheNamespacePolicy[];
}

export interface CacheOperationOutcome {
  operation: string;
  instanceName: string | null;
  namespace: string | null;
  cacheKey: string | null;
  deletedEntries: number;
  refreshedEntries: number;
  status: string;
}

export interface CacheKeyItem {
  key: string;
  namespace: string;
  instanceName: string;
  status: 'active' | 'expired';
  expiresInSeconds: number | null;
}

export interface CacheKeyList {
  namespace: string;
  instanceName: string;
  scannedItems: number;
  returnedItems: number;
  scanComplete: boolean;
  pageInfo: CachePageInfo;
  items: CacheKeyItem[];
}

export interface CachePageInfo {
  mode: 'cursor' | 'offset';
  pageSize: number | null;
  hasMore: boolean;
  nextCursor: string | null;
}

const DEFAULT_CACHE_KEY_LIST_PAGE_SIZE = 200;
const PROVIDER_KINDS = new Set<CacheProviderKind>(['local_cache', 'redis_cache']);
const RUNTIME_TARGETS = new Set<CacheRuntimeTarget>(['desktop_packaged', 'service']);
const CACHE_NAMESPACE_SCOPES = new Set(['global', 'tenant', 'tenant_user', 'user', 'session', 'request']);
const CACHE_NAMESPACE_SENSITIVITIES = new Set(['public', 'internal', 'private', 'sensitive', 'credential']);
const CACHE_FAILURE_MODES = new Set(['fail_closed', 'origin_fallback', 'serve_stale', 'bypass_cache']);
const CACHE_CONSISTENCY_LEVELS = new Set(['relaxed', 'bounded_stale', 'coordination_critical']);
const CACHE_KEY_STATUSES = new Set(['active', 'expired']);

export class AdminCacheService {
  static async fetchOverview(): Promise<CacheOverview> {
    const result = await getClawRouterBackendSdkClient().system.cache.overview.retrieve();
    return normalizeOverview(readRequiredRecord(result, 'Cache overview is required'));
  }

  static async refreshAll(): Promise<CacheOperationOutcome> {
    const result = await getClawRouterBackendSdkClient().system.cache.refresh();
    return normalizeOperation(readRequiredRecord(result, 'Cache refresh outcome is required'));
  }

  static async refreshInstance(instanceName: string): Promise<CacheOperationOutcome> {
    const result = await getClawRouterBackendSdkClient().system.cache.instances.refresh(instanceName);
    return normalizeOperation(readRequiredRecord(result, 'Cache instance refresh outcome is required'));
  }

  static async deleteInstance(instanceName: string): Promise<CacheOperationOutcome> {
    const result = await getClawRouterBackendSdkClient().system.cache.instances.delete(instanceName);
    return normalizeOperation(readRequiredRecord(result, 'Cache instance delete outcome is required'));
  }

  static async refreshNamespace(namespace: string): Promise<CacheOperationOutcome> {
    const result = await getClawRouterBackendSdkClient().system.cache.namespaces.refresh(namespace);
    return normalizeOperation(readRequiredRecord(result, 'Cache namespace refresh outcome is required'));
  }

  static async deleteNamespace(namespace: string): Promise<CacheOperationOutcome> {
    const result = await getClawRouterBackendSdkClient().system.cache.namespaces.delete(namespace);
    return normalizeOperation(readRequiredRecord(result, 'Cache namespace delete outcome is required'));
  }

  static async deleteKey(namespace: string, key: string): Promise<CacheOperationOutcome> {
    const result = await getClawRouterBackendSdkClient().system.cache.namespaces.keys.delete(namespace, key);
    return normalizeOperation(readRequiredRecord(result, 'Cache key delete outcome is required'));
  }

  static async listKeys(
    namespace: string,
    pageSize = DEFAULT_CACHE_KEY_LIST_PAGE_SIZE,
    cursor?: string | null,
  ): Promise<CacheKeyList> {
    const result = await getClawRouterBackendSdkClient().system.cache.namespaces.keys.list(namespace, {
      pageSize,
      ...(cursor ? { cursor } : {}),
    });
    return normalizeKeyList(readRequiredRecord(result, 'Cache key list is required'));
  }
}

function normalizeOverview(record: ApiRecord): CacheOverview {
  const summary = normalizeSummary(readRequiredRecord(record.summary, 'Cache summary is required'));
  const instances = readRequiredRecordArray(record.instances, 'Cache instances are required').map(normalizeInstance);
  const namespacePolicies = readRequiredRecordArray(
    record.namespacePolicies,
    'Cache namespace policies are required',
  ).map(normalizeNamespacePolicy);
  validateOverviewConsistency(summary, instances, namespacePolicies);
  return {
    summary,
    instances,
    namespacePolicies,
  };
}

function validateOverviewConsistency(
  summary: CacheSummary,
  instances: CacheInstance[],
  namespacePolicies: CacheNamespacePolicy[],
): void {
  if (summary.totalInstances !== instances.length) {
    throw new Error('Cache instance count does not match returned instances');
  }
  if (summary.totalNamespaces !== namespacePolicies.length) {
    throw new Error('Cache namespace count does not match returned namespace policies');
  }
  const actualEntries = instances.reduce((total, instance) => total + instance.entryCount, 0);
  if (summary.totalEntries !== actualEntries) {
    throw new Error('Cache entry count does not match returned instances');
  }
  const actualExpiredEntries = instances.reduce((total, instance) => total + instance.expiredEntryCount, 0);
  if (summary.expiredEntries !== actualExpiredEntries) {
    throw new Error('Cache expired entry count does not match returned instances');
  }
  assertMetricEquals(summary.cacheHits, sumInstanceMetric(instances, 'cacheHits'), 'Cache hit metric does not match returned instances');
  assertMetricEquals(summary.cacheMisses, sumInstanceMetric(instances, 'cacheMisses'), 'Cache miss metric does not match returned instances');
  assertMetricEquals(summary.cacheWrites, sumInstanceMetric(instances, 'cacheWrites'), 'Cache write metric does not match returned instances');
  assertMetricEquals(summary.cacheDeletes, sumInstanceMetric(instances, 'cacheDeletes'), 'Cache delete metric does not match returned instances');
  assertMetricEquals(summary.cacheRefreshes, sumInstanceMetric(instances, 'cacheRefreshes'), 'Cache refresh metric does not match returned instances');
  assertMetricEquals(summary.cacheInspections, sumInstanceMetric(instances, 'cacheInspections'), 'Cache inspection metric does not match returned instances');
  const instanceErrors = sumInstanceMetric(instances, 'cacheErrors');
  if (summary.cacheErrors < instanceErrors) {
    throw new Error('Cache error metric is lower than returned instance errors');
  }
}

function sumInstanceMetric(instances: CacheInstance[], metric: keyof Pick<
  CacheInstance,
  'cacheHits' | 'cacheMisses' | 'cacheWrites' | 'cacheDeletes' | 'cacheRefreshes' | 'cacheInspections' | 'cacheErrors'
>): number {
  return instances.reduce((total, instance) => total + instance[metric], 0);
}

function assertMetricEquals(actual: number, expected: number, message: string): void {
  if (actual !== expected) {
    throw new Error(message);
  }
}

function normalizeSummary(record: ApiRecord): CacheSummary {
  return {
    runtimeTarget: readRuntimeTarget(record, 'runtimeTarget'),
    totalInstances: readRequiredNonNegativeNumber(record, 'totalInstances', 'Cache instance count is required'),
    totalNamespaces: readRequiredNonNegativeNumber(record, 'totalNamespaces', 'Cache namespace count is required'),
    totalEntries: readRequiredNonNegativeNumber(record, 'totalEntries', 'Cache entry count is required'),
    expiredEntries: readRequiredNonNegativeNumber(record, 'expiredEntries', 'Cache expired entry count is required'),
    cacheHits: readRequiredNonNegativeNumber(record, 'cacheHits', 'Cache hit count is required'),
    cacheMisses: readRequiredNonNegativeNumber(record, 'cacheMisses', 'Cache miss count is required'),
    cacheWrites: readRequiredNonNegativeNumber(record, 'cacheWrites', 'Cache write count is required'),
    cacheDeletes: readRequiredNonNegativeNumber(record, 'cacheDeletes', 'Cache delete count is required'),
    cacheRefreshes: readRequiredNonNegativeNumber(record, 'cacheRefreshes', 'Cache refresh count is required'),
    cacheInspections: readRequiredNonNegativeNumber(record, 'cacheInspections', 'Cache inspection count is required'),
    cacheErrors: readRequiredNonNegativeNumber(record, 'cacheErrors', 'Cache error count is required'),
  };
}

function normalizeInstance(record: ApiRecord): CacheInstance {
  return {
    name: readRequiredString(record, 'name', 'Cache instance name is required'),
    providerKind: readProviderKind(record, 'providerKind'),
    purpose: readRequiredString(record, 'purpose', 'Cache instance purpose is required'),
    keyPrefix: readRequiredString(record, 'keyPrefix', 'Cache key prefix is required'),
    defaultTtlSeconds: readRequiredNonNegativeNumber(record, 'defaultTtlSeconds', 'Cache default ttl is required'),
    maxEntries: readNullableNumber(record, 'maxEntries'),
    connectionProfileName: readNullableText(record, 'connectionProfileName'),
    supportsInspect: readBoolean(record, 'supportsInspect'),
    supportsRefresh: readBoolean(record, 'supportsRefresh'),
    supportsDelete: readBoolean(record, 'supportsDelete'),
    entryCount: readRequiredNonNegativeNumber(record, 'entryCount', 'Cache instance entry count is required'),
    expiredEntryCount: readRequiredNonNegativeNumber(record, 'expiredEntryCount', 'Cache instance expired count is required'),
    cacheHits: readRequiredNonNegativeNumber(record, 'cacheHits', 'Cache instance hit count is required'),
    cacheMisses: readRequiredNonNegativeNumber(record, 'cacheMisses', 'Cache instance miss count is required'),
    cacheWrites: readRequiredNonNegativeNumber(record, 'cacheWrites', 'Cache instance write count is required'),
    cacheDeletes: readRequiredNonNegativeNumber(record, 'cacheDeletes', 'Cache instance delete count is required'),
    cacheRefreshes: readRequiredNonNegativeNumber(record, 'cacheRefreshes', 'Cache instance refresh count is required'),
    cacheInspections: readRequiredNonNegativeNumber(record, 'cacheInspections', 'Cache instance inspection count is required'),
    cacheErrors: readRequiredNonNegativeNumber(record, 'cacheErrors', 'Cache instance error count is required'),
    status: readRequiredString(record, 'status', 'Cache instance status is required'),
  };
}

function normalizeNamespacePolicy(record: ApiRecord): CacheNamespacePolicy {
  return {
    namespace: readRequiredString(record, 'namespace', 'Cache namespace is required'),
    instanceName: readRequiredString(record, 'instanceName', 'Cache namespace instance is required'),
    ttlSeconds: readRequiredNonNegativeNumber(record, 'ttlSeconds', 'Cache namespace ttl is required'),
    scope: readAllowedString(
      record,
      'scope',
      CACHE_NAMESPACE_SCOPES,
      'Cache namespace scope is required',
      'Unsupported cache namespace scope',
    ),
    sensitivity: readAllowedString(
      record,
      'sensitivity',
      CACHE_NAMESPACE_SENSITIVITIES,
      'Cache namespace sensitivity is required',
      'Unsupported cache namespace sensitivity',
    ),
    failureMode: readAllowedString(
      record,
      'failureMode',
      CACHE_FAILURE_MODES,
      'Cache namespace failure mode is required',
      'Unsupported cache namespace failure mode',
    ),
    consistency: readAllowedString(
      record,
      'consistency',
      CACHE_CONSISTENCY_LEVELS,
      'Cache namespace consistency is required',
      'Unsupported cache namespace consistency',
    ),
    jitterPercent: readJitterPercent(record),
    staleWhileRevalidateSeconds: readRequiredNonNegativeNumber(
      record,
      'staleWhileRevalidateSeconds',
      'Cache namespace stale while revalidate window is required',
    ),
    tags: readStringArray(record, 'tags'),
    enabled: readBoolean(record, 'enabled'),
  };
}

function readAllowedString(
  record: ApiRecord,
  key: string,
  allowedValues: Set<string>,
  requiredMessage: string,
  unsupportedMessage: string,
): string {
  const value = readRequiredString(record, key, requiredMessage);
  if (allowedValues.has(value)) {
    return value;
  }
  throw new Error(`${unsupportedMessage}: ${value}`);
}

function readJitterPercent(record: ApiRecord): number {
  const value = readRequiredNonNegativeNumber(record, 'jitterPercent', 'Cache namespace jitter percent is required');
  if (value <= 100) {
    return value;
  }
  throw new Error(`Cache namespace jitter percent must be between 0 and 100: ${value}`);
}

function normalizeOperation(record: ApiRecord): CacheOperationOutcome {
  return {
    operation: readRequiredString(record, 'operation', 'Cache operation is required'),
    instanceName: readNullableText(record, 'instanceName'),
    namespace: readNullableText(record, 'namespace'),
    cacheKey: readNullableText(record, 'cacheKey'),
    deletedEntries: readRequiredNonNegativeNumber(record, 'deletedEntries', 'Cache deleted entries are required'),
    refreshedEntries: readRequiredNonNegativeNumber(record, 'refreshedEntries', 'Cache refreshed entries are required'),
    status: readRequiredString(record, 'status', 'Cache operation status is required'),
  };
}

function normalizeKeyList(record: ApiRecord): CacheKeyList {
  const namespace = readRequiredString(record, 'namespace', 'Cache key namespace is required');
  const instanceName = readRequiredString(record, 'instanceName', 'Cache key instance is required');
  const items = readRequiredRecordArray(record.items, 'Cache key items are required').map((item) => normalizeKeyItem(item, namespace, instanceName));
  const scannedItems = readRequiredNonNegativeNumber(record, 'scannedItems', 'Cache scanned key count is required');
  const returnedItems = readRequiredNonNegativeNumber(record, 'returnedItems', 'Cache returned key count is required');
  if (returnedItems !== items.length) {
    throw new Error('Cache returned key count does not match returned items');
  }
  if (returnedItems > scannedItems) {
    throw new Error('Cache returned key count exceeds scanned key count');
  }
  const pageInfo = normalizePageInfo(readRequiredRecord(record.pageInfo, 'Cache key page info is required'));
  const scanComplete = readBoolean(record, 'scanComplete');
  if ((pageInfo.hasMore || !scanComplete) && !pageInfo.nextCursor) {
    throw new Error('Cache next cursor is required when more keys are available');
  }
  if (!pageInfo.hasMore && scanComplete && pageInfo.nextCursor) {
    throw new Error('Cache next cursor must be empty after a complete scan');
  }
  return {
    namespace,
    instanceName,
    scannedItems,
    returnedItems,
    scanComplete,
    pageInfo,
    items,
  };
}

function normalizePageInfo(record: ApiRecord): CachePageInfo {
  const mode = readRequiredString(record, 'mode', 'Cache page mode is required');
  if (mode !== 'cursor' && mode !== 'offset') {
    throw new Error(`Unsupported cache page mode: ${mode}`);
  }
  const pageSize = readNullableNonNegativeNumber(record, 'pageSize');
  if (pageSize !== null && (pageSize < 1 || pageSize > DEFAULT_CACHE_KEY_LIST_PAGE_SIZE)) {
    throw new Error(`Cache page size must be between 1 and ${DEFAULT_CACHE_KEY_LIST_PAGE_SIZE}: ${pageSize}`);
  }
  return {
    mode,
    pageSize,
    hasMore: readBoolean(record, 'hasMore'),
    nextCursor: readNullableText(record, 'nextCursor'),
  };
}

function normalizeKeyItem(record: ApiRecord, expectedNamespace: string, expectedInstanceName: string): CacheKeyItem {
  const item = {
    key: readRequiredString(record, 'key', 'Cache key is required'),
    namespace: readRequiredString(record, 'namespace', 'Cache key namespace is required'),
    instanceName: readRequiredString(record, 'instanceName', 'Cache key instance is required'),
    status: readAllowedString(
      record,
      'status',
      CACHE_KEY_STATUSES,
      'Cache key status is required',
      'Unsupported cache key status',
    ) as CacheKeyItem['status'],
    expiresInSeconds: readNullableNonNegativeNumber(record, 'expiresInSeconds'),
  };
  if (item.namespace !== expectedNamespace) {
    throw new Error('Cache key item namespace does not match list namespace');
  }
  if (item.instanceName !== expectedInstanceName) {
    throw new Error('Cache key item instance does not match list instance');
  }
  return item;
}

function readRequiredRecordArray(value: unknown, message: string): ApiRecord[] {
  if (!Array.isArray(value)) {
    throw new Error(message);
  }
  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`${message}: item ${index + 1} is invalid`);
    }
    return item;
  });
}

function readRequiredRecord(value: unknown, message: string): ApiRecord {
  if (!isRecord(value)) {
    throw new Error(message);
  }
  return value;
}

function readRuntimeTarget(record: ApiRecord, key: string): CacheRuntimeTarget {
  const value = readString(record, key);
  if (RUNTIME_TARGETS.has(value as CacheRuntimeTarget)) {
    return value as CacheRuntimeTarget;
  }
  throw new Error(value ? `Unsupported cache runtime target: ${value}` : 'Cache runtime target is required');
}

function readProviderKind(record: ApiRecord, key: string): CacheProviderKind {
  const value = readString(record, key);
  if (PROVIDER_KINDS.has(value as CacheProviderKind)) {
    return value as CacheProviderKind;
  }
  throw new Error(value ? `Unsupported cache provider kind: ${value}` : 'Cache provider kind is required');
}

function readNullableText(record: ApiRecord, key: string): string | null {
  const value = record[key];
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return readString(record, key);
}

function readNullableNumber(record: ApiRecord, key: string): number | null {
  const value = record[key];
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  throw new Error(`Cache numeric field is invalid: ${key}`);
}

function readNullableNonNegativeNumber(record: ApiRecord, key: string): number | null {
  const value = readNullableNumber(record, key);
  if (value === null || value >= 0) {
    return value;
  }
  throw new Error(`Cache numeric field must be non-negative: ${key}`);
}

function readBoolean(record: ApiRecord, key: string): boolean {
  const value = record[key];
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return false;
}
