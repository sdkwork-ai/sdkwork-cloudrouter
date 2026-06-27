import type {
  AdminStorageDefaultBucket,
  AdminStoragePort,
  AdminStorageProviderHealthCheckResult,
} from '@sdkwork/file-sdk-ports';
import {
  createStorageBucket,
  createStorageGarbageCollectionJob,
  createStorageProvider,
  createStorageQuota,
  createStorageReconciliationRun,
  healthCheckStorageProvider,
  listStorageBuckets,
  listStorageDefaultBuckets,
  listStorageGarbageCollectionJobs,
  listStorageProviders,
  listStorageQuotas,
  listStorageReconciliationRuns,
  listStorageUsage,
  updateStorageBucket,
  updateStorageDefaultBucket,
  updateStorageProvider,
} from './storageService';

function normalizeStorageListLimit(limit?: number): string | undefined {
  return limit == null ? undefined : String(limit);
}

export function createAdminStoragePort(): AdminStoragePort {
  return {
    async createProvider(input) {
      const provider = await createStorageProvider(input, {
        idempotencyKey: input.idempotencyKey,
        requestId: input.requestId,
      });
      return { provider, requestId: input.requestId };
    },
    async updateProvider(input) {
      const provider = await updateStorageProvider(input.providerId, {
        reason: input.reason,
        status: input.status,
      }, { requestId: input.requestId });
      return { provider, requestId: input.requestId };
    },
    async createBucket(input) {
      const bucket = await createStorageBucket(input, {
        idempotencyKey: input.idempotencyKey,
        requestId: input.requestId,
      });
      return { bucket, requestId: input.requestId };
    },
    async updateBucket(input) {
      const bucket = await updateStorageBucket(input.bucketId, {
        reason: input.reason,
        status: input.status,
      }, { requestId: input.requestId });
      return { bucket, requestId: input.requestId };
    },
    async createQuotaPolicy(input) {
      const quotaPolicy = await createStorageQuota(input, {
        idempotencyKey: input.idempotencyKey,
        requestId: input.requestId,
      });
      return { quotaPolicy, requestId: input.requestId };
    },
    async createReconciliationRun(input) {
      const reconciliationRun = await createStorageReconciliationRun(input, {
        idempotencyKey: input.idempotencyKey,
        requestId: input.requestId,
      });
      return { reconciliationRun, requestId: input.requestId };
    },
    async createGarbageCollectionJob(input) {
      const job = await createStorageGarbageCollectionJob(input, {
        idempotencyKey: input.idempotencyKey,
        requestId: input.requestId,
      });
      return { job, requestId: input.requestId };
    },
    async healthCheckProvider(input) {
      const result = await healthCheckStorageProvider(input.providerId, { requestId: input.requestId });
      return {
        ...result,
        providerId: input.providerId,
        requestId: input.requestId,
      } as AdminStorageProviderHealthCheckResult;
    },
    async listProviders(query) {
      const result = await listStorageProviders();
      return { items: result.items, requestId: query.requestId };
    },
    async listBuckets(query) {
      const result = await listStorageBuckets({
        cursor: query.cursor,
        limit: normalizeStorageListLimit(query.limit),
        logicalScope: query.logicalScope,
        providerId: query.providerId,
        status: query.status,
      });
      return { items: result.items, requestId: query.requestId };
    },
    async listDefaultBuckets(query) {
      const result = await listStorageDefaultBuckets({
        logicalScope: query.logicalScope,
      });
      return { items: result.items as unknown as AdminStorageDefaultBucket[], requestId: query.requestId };
    },
    async listQuotaPolicies(query) {
      const result = await listStorageQuotas();
      return { items: result.items, requestId: query.requestId };
    },
    async listReconciliationRuns(query) {
      const result = await listStorageReconciliationRuns({
        cursor: query.cursor,
        limit: normalizeStorageListLimit(query.limit),
        status: query.status,
        runType: query.runType,
      });
      return { items: result.items, requestId: query.requestId };
    },
    async listUsageCounters(query) {
      const result = await listStorageUsage({
        cursor: query.cursor,
        limit: normalizeStorageListLimit(query.limit),
        scopeType: query.scopeType,
        scopeId: query.scopeId,
      });
      return { items: result.items, requestId: query.requestId };
    },
    async listUsageLedger(query) {
      const result = await listStorageUsage({
        cursor: query.cursor,
        limit: normalizeStorageListLimit(query.limit),
        scopeType: query.scopeType,
        scopeId: query.scopeId,
      });
      return { items: result.items, requestId: query.requestId };
    },
    async listUsageSnapshots(query) {
      const result = await listStorageUsage({
        cursor: query.cursor,
        limit: normalizeStorageListLimit(query.limit),
        scopeType: query.scopeType,
        scopeId: query.scopeId,
      });
      return { items: result.items, requestId: query.requestId };
    },
    async setDefaultBucket(input) {
      const defaultBucket = await updateStorageDefaultBucket(input.logicalScope, {
        bucketId: input.bucketId,
        reason: input.reason,
      }, { requestId: input.requestId });
      return { defaultBucket: defaultBucket as AdminStorageDefaultBucket, requestId: input.requestId };
    },
  };
}
