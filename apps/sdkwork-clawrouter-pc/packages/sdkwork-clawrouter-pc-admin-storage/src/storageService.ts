import { getClawRouterBackendSdkClient } from '@sdkwork/clawroutes-pc-commons/sdk-clients';
import { createClientOperationToken } from '@sdkwork/clawroutes-pc-commons/runtime';

type BackendStorageService = ReturnType<typeof getClawRouterBackendSdkClient>['storage'];

export type StorageProviderCreateInput = Parameters<BackendStorageService['oss']['providers']['create']>[0];
export type StorageBucketCreateInput = Parameters<BackendStorageService['oss']['buckets']['create']>[0];
export type StorageQuotaCreateInput = Parameters<BackendStorageService['oss']['quotas']['create']>[0];
export type StorageDefaultBucketUpdateInput = Parameters<BackendStorageService['defaultBuckets']['update']>[1];
export type StorageReconciliationCreateInput = NonNullable<Parameters<BackendStorageService['oss']['storageReconciliationRuns']['create']>[1]>;
export type StorageGarbageCollectionCreateInput = NonNullable<Parameters<BackendStorageService['gcJobs']['create']>[1]>;

export async function backendStorageProvidersList(pageSize = 100) {
  return getClawRouterBackendSdkClient().storage.oss.providers.list({ pageSize: String(pageSize) });
}

export async function backendStorageProviderCreate(body: StorageProviderCreateInput) {
  return getClawRouterBackendSdkClient().storage.oss.providers.create(body, {
    idempotencyKey: createClientOperationToken('storage-provider'),
  });
}

export async function backendStorageProviderHealthCheck(providerId: string) {
  return getClawRouterBackendSdkClient().storage.providers.healthCheck(providerId);
}

export async function backendStorageBucketsList(pageSize = 100) {
  return getClawRouterBackendSdkClient().storage.oss.buckets.list({ pageSize: String(pageSize) });
}

export async function backendStorageBucketCreate(body: StorageBucketCreateInput) {
  return getClawRouterBackendSdkClient().storage.oss.buckets.create(body, {
    idempotencyKey: createClientOperationToken('storage-bucket'),
  });
}

export async function backendStorageDefaultBucketsList(pageSize = 100) {
  return getClawRouterBackendSdkClient().storage.defaultBuckets.list({ pageSize: String(pageSize) });
}

export async function backendStorageDefaultBucketUpdate(
  logicalScope: string,
  body: StorageDefaultBucketUpdateInput,
) {
  return getClawRouterBackendSdkClient().storage.defaultBuckets.update(logicalScope, body);
}

export async function backendStorageQuotasList(pageSize = 100) {
  return getClawRouterBackendSdkClient().storage.oss.quotas.list({ pageSize: String(pageSize) });
}

export async function backendStorageQuotaCreate(body: StorageQuotaCreateInput) {
  return getClawRouterBackendSdkClient().storage.oss.quotas.create(body, {
    idempotencyKey: createClientOperationToken('storage-quota'),
  });
}

export async function backendStorageUsageList(pageSize = 100) {
  return getClawRouterBackendSdkClient().storage.oss.usage.list({ pageSize: String(pageSize) });
}

export async function backendStorageReconciliationRunsList(pageSize = 100) {
  return getClawRouterBackendSdkClient().storage.oss.storageReconciliationRuns.list({ pageSize: String(pageSize) });
}

export async function backendStorageReconciliationRunCreate(body: StorageReconciliationCreateInput) {
  return getClawRouterBackendSdkClient().storage.oss.storageReconciliationRuns.create(
    { idempotencyKey: createClientOperationToken('storage-reconciliation') },
    body,
  );
}

export async function backendStorageGarbageCollectionJobsList(pageSize = 100) {
  return getClawRouterBackendSdkClient().storage.gcJobs.list({ pageSize: String(pageSize) });
}

export async function backendStorageGarbageCollectionJobCreate(body: StorageGarbageCollectionCreateInput) {
  return getClawRouterBackendSdkClient().storage.gcJobs.create(
    { idempotencyKey: createClientOperationToken('storage-garbage-collection') },
    body,
  );
}
