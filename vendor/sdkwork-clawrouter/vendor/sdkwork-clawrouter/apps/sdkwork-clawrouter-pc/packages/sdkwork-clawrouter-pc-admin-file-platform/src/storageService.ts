import type {
  AdminStorageCreateBucketInput,
  AdminStorageCreateGarbageCollectionJobInput,
  AdminStorageCreateProviderInput,
  AdminStorageCreateQuotaPolicyInput,
  AdminStorageCreateReconciliationRunInput,
  AdminStorageSetDefaultBucketInput,
  AdminStorageUpdateBucketInput,
  AdminStorageUpdateProviderInput,
} from '@sdkwork/file-sdk-ports';
import type { SdkworkStorageProviderType } from '@sdkwork/file-contracts';
import {
  ensureSdkworkApiSuccess,
  getSdkworkDriveBackendSdkClient,
  readApiItems,
  readApiRecord,
  requiredSafePathSegment,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import type { DriveBackendSdkClient } from '@sdkwork/clawroutes-pc-commons/runtime';

type DriveBackend = DriveBackendSdkClient['drive'];
type StorageProvidersApi = DriveBackend['storageProviders'];

export function getDriveStorageSdk(): DriveBackend {
  return getSdkworkDriveBackendSdkClient().drive;
}

export interface StorageProviderListParams extends NonNullable<Parameters<StorageProvidersApi['list']>[0]> {}

export interface StorageBucketListParams {
  cursor?: string;
  limit?: string;
  logicalScope?: string;
  providerId?: string;
  status?: string;
}
export interface StorageDefaultBucketListParams {
  logicalScope?: string;
}
export interface StorageQuotaListParams {}
export interface StorageUsageListParams {
  cursor?: string;
  limit?: string;
  scopeType?: string;
  scopeId?: string;
}
export interface StorageReconciliationRunListParams {
  cursor?: string;
  limit?: string;
  status?: string;
  runType?: string;
}
export interface StorageGarbageCollectionJobListParams {
  cursor?: string;
  limit?: string;
  status?: string;
}

function mapStorageListResult(result: unknown) {
  return { items: readApiItems(result) };
}

function readStorageMutationRecord(result: unknown, keys: string[]) {
  const record = readApiRecord(result);
  for (const key of keys) {
    const value = record[key];
    if (value && typeof value === 'object') {
      return value;
    }
  }
  return record;
}

function operatorIdFromRequest(requestId: string): string {
  const trimmed = requestId.trim();
  return trimmed.length > 0 ? trimmed : 'clawrouter-admin';
}

function mapProviderKind(providerType: SdkworkStorageProviderType): 'local_filesystem' | 's3_compatible' {
  return providerType === 'local_dev_s3' ? 'local_filesystem' : 's3_compatible';
}

function mapLogicalScopeToSpaceType(
  logicalScope: string,
): 'personal' | 'team' | 'knowledge_base' | 'ai_generated' | 'git_repository' | 'deployment' | 'app_upload' | 'im' | 'rtc' | 'notary' | undefined {
  switch (logicalScope) {
    case 'tenant_private':
      return 'personal';
    case 'tenant_public_asset':
      return 'team';
    case 'system_temp':
      return 'app_upload';
    case 'system_archive':
      return 'deployment';
    default:
      return undefined;
  }
}

function mapMaintenanceJobType(
  runType?: string,
): 'object_sweep' | 'upload_session_sweep' | 'expired_upload_content_sweep' | 'abandoned_upload_task_sweep' | undefined {
  switch (runType) {
    case 'object_sweep':
    case 'upload_session_sweep':
    case 'expired_upload_content_sweep':
    case 'abandoned_upload_task_sweep':
      return runType;
    case 'reconciliation':
      return 'object_sweep';
    case 'garbage_collection':
      return 'object_sweep';
    default:
      return undefined;
  }
}

function parsePageLimit(limit?: string): number | undefined {
  if (!limit) {
    return undefined;
  }
  const parsed = Number.parseInt(limit, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

async function listProviderBuckets(providerId: string) {
  const drive = getDriveStorageSdk();
  try {
    const bucket = await drive.storageProviders.bucket.head(providerId);
    return [{
      id: `${providerId}:${bucket.bucket}`,
      providerId,
      bucketName: bucket.bucket,
      status: bucket.exists ? 'active' : 'disabled',
    }];
  } catch {
    return [];
  }
}

export async function listStorageProviders(_params?: StorageProviderListParams) {
  const result = await getDriveStorageSdk().storageProviders.list();
  ensureSdkworkApiSuccess(result, 'Failed to load storage providers');
  return mapStorageListResult(result);
}

export async function createStorageProvider(
  input: Omit<AdminStorageCreateProviderInput, 'idempotencyKey' | 'requestId'>,
  params: { idempotencyKey: string; requestId: string },
) {
  const result = await getDriveStorageSdk().storageProviders.create({
    id: input.providerCode,
    name: input.providerCode,
    providerKind: mapProviderKind(input.providerType),
    endpointUrl: input.endpointUrl ?? '',
    region: input.region,
    credentialRef: input.credentialRef,
    bucket: input.providerCode,
    pathStyle: input.pathStyleEnabled,
    operatorId: operatorIdFromRequest(params.requestId),
  });
  ensureSdkworkApiSuccess(result, 'Failed to create storage provider');
  return readStorageMutationRecord(result, ['provider']);
}

export async function updateStorageProvider(
  providerId: string,
  input: Omit<AdminStorageUpdateProviderInput, 'providerId' | 'requestId'>,
  params?: { requestId?: string },
) {
  const result = await getDriveStorageSdk().storageProviders.update(
    requiredSafePathSegment(providerId, 'providerId'),
    {
      status: input.status,
      operatorId: operatorIdFromRequest(params?.requestId ?? ''),
    },
  );
  ensureSdkworkApiSuccess(result, 'Failed to update storage provider');
  return readStorageMutationRecord(result, ['provider']);
}

export async function healthCheckStorageProvider(providerId: string, _params?: { requestId?: string }) {
  const result = await getDriveStorageSdk().storageProviders.test(
    requiredSafePathSegment(providerId, 'providerId'),
    { operatorId: operatorIdFromRequest(_params?.requestId ?? '') },
  );
  ensureSdkworkApiSuccess(result, 'Failed to health check storage provider');
  return readApiRecord(result);
}

export async function listStorageBuckets(params?: StorageBucketListParams) {
  if (params?.providerId) {
    return { items: await listProviderBuckets(requiredSafePathSegment(params.providerId, 'providerId')) };
  }
  const providers = await listStorageProviders();
  const items: unknown[] = [];
  for (const provider of providers.items) {
    const record = provider as Record<string, unknown>;
    const providerId = String(record.id ?? record.providerId ?? '').trim();
    if (!providerId) {
      continue;
    }
    items.push(...await listProviderBuckets(providerId));
  }
  return { items };
}

export async function createStorageBucket(
  input: Omit<AdminStorageCreateBucketInput, 'idempotencyKey' | 'requestId'>,
  _params: { idempotencyKey: string; requestId: string },
) {
  const result = await getDriveStorageSdk().storageProviders.bucket.create(
    requiredSafePathSegment(input.providerId, 'providerId'),
  );
  ensureSdkworkApiSuccess(result, 'Failed to create storage bucket');
  return readStorageMutationRecord(result, ['bucket']);
}

export async function updateStorageBucket(
  bucketId: string,
  input: Omit<AdminStorageUpdateBucketInput, 'bucketId' | 'requestId'>,
  params?: { requestId?: string },
) {
  const providerId = bucketId.includes(':') ? bucketId.split(':')[0] : bucketId;
  const result = await getDriveStorageSdk().storageProviders.update(providerId, {
    status: input.status,
    operatorId: operatorIdFromRequest(params?.requestId ?? ''),
  });
  ensureSdkworkApiSuccess(result, 'Failed to update storage bucket');
  return readStorageMutationRecord(result, ['bucket', 'provider']);
}

export async function listStorageDefaultBuckets(params?: StorageDefaultBucketListParams) {
  const result = await getDriveStorageSdk().storageProviderBindings.default.get({
    spaceType: params?.logicalScope ? mapLogicalScopeToSpaceType(params.logicalScope) : undefined,
  });
  ensureSdkworkApiSuccess(result, 'Failed to load storage default buckets');
  return { items: [readApiRecord(result)] };
}

export async function updateStorageDefaultBucket(
  logicalScope: AdminStorageSetDefaultBucketInput['logicalScope'],
  input: Omit<AdminStorageSetDefaultBucketInput, 'logicalScope' | 'requestId'>,
  params?: { requestId?: string },
) {
  const result = await getDriveStorageSdk().storageProviderBindings.default.set({
    providerId: requiredSafePathSegment(input.bucketId, 'bucketId'),
    spaceType: mapLogicalScopeToSpaceType(logicalScope),
    operatorId: operatorIdFromRequest(params?.requestId ?? ''),
  });
  ensureSdkworkApiSuccess(result, 'Failed to update storage default bucket');
  return readStorageMutationRecord(result, ['defaultBucket', 'binding']);
}

export async function listStorageQuotas(_params?: StorageQuotaListParams) {
  const result = await getDriveStorageSdk().quotas.summary();
  ensureSdkworkApiSuccess(result, 'Failed to load storage quota summary');
  const record = readApiRecord(result);
  return {
    items: [{
      id: `tenant:${record.tenantId ?? 'default'}`,
      scopeType: 'tenant',
      scopeId: record.tenantId,
      quotaLimitBytes: record.totalBytes,
      status: 'active',
    }],
  };
}

export async function createStorageQuota(
  input: Omit<AdminStorageCreateQuotaPolicyInput, 'idempotencyKey' | 'requestId'>,
  _params: { idempotencyKey: string; requestId: string },
) {
  return {
    id: `${input.scopeType}:${input.scopeId}`,
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    quotaLimitBytes: input.quotaLimitBytes,
    status: 'active',
  };
}

export async function listStorageUsage(params?: StorageUsageListParams) {
  const summary = await getDriveStorageSdk().quotas.summary();
  ensureSdkworkApiSuccess(summary, 'Failed to load storage usage');
  const record = readApiRecord(summary);
  return {
    items: [{
      id: `usage:${record.tenantId ?? 'default'}`,
      scopeType: params?.scopeType ?? 'tenant',
      scopeId: params?.scopeId ?? record.tenantId,
      usedBytes: record.totalBytes,
      objectCount: record.objectCount,
      status: 'active',
    }],
  };
}

export async function listStorageReconciliationRuns(params?: StorageReconciliationRunListParams) {
  const result = await getDriveStorageSdk().maintenance.jobs.list({
    jobType: mapMaintenanceJobType(params?.runType ?? 'reconciliation'),
    status: params?.status === 'failed' || params?.status === 'completed' ? params.status : undefined,
    pageSize: parsePageLimit(params?.limit),
  });
  ensureSdkworkApiSuccess(result, 'Failed to load storage reconciliation runs');
  return mapStorageListResult(result);
}

export async function createStorageReconciliationRun(
  input: Omit<AdminStorageCreateReconciliationRunInput, 'idempotencyKey' | 'requestId'>,
  params: { idempotencyKey: string; requestId: string },
) {
  const result = await getDriveStorageSdk().maintenance.objectSweep.start({
    dryRun: input.dryRun ?? false,
    operatorId: operatorIdFromRequest(params.requestId),
    requestId: params.requestId,
  });
  ensureSdkworkApiSuccess(result, 'Failed to create storage reconciliation run');
  return readStorageMutationRecord(result, ['reconciliationRun', 'job']);
}

export async function listStorageGarbageCollectionJobs(params?: StorageGarbageCollectionJobListParams) {
  const result = await getDriveStorageSdk().maintenance.jobs.list({
    jobType: 'object_sweep',
    status: params?.status === 'failed' || params?.status === 'completed' ? params.status : undefined,
    pageSize: parsePageLimit(params?.limit),
  });
  ensureSdkworkApiSuccess(result, 'Failed to load storage garbage collection jobs');
  return mapStorageListResult(result);
}

export async function createStorageGarbageCollectionJob(
  input: Omit<AdminStorageCreateGarbageCollectionJobInput, 'idempotencyKey' | 'requestId'>,
  params: { idempotencyKey: string; requestId: string },
) {
  const result = await getDriveStorageSdk().maintenance.objectSweep.start({
    dryRun: input.dryRun ?? false,
    operatorId: operatorIdFromRequest(params.requestId),
    requestId: params.requestId,
  });
  ensureSdkworkApiSuccess(result, 'Failed to create storage garbage collection job');
  return readStorageMutationRecord(result, ['job']);
}
