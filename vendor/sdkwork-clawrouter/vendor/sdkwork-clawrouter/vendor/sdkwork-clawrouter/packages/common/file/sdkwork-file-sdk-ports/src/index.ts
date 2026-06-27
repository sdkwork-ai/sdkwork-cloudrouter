import {
  createFileRef,
  type SdkworkDriveNode,
  type SdkworkDriveSpace,
  type SdkworkFileRef,
  type SdkworkFileUploadStatus,
  type SdkworkStorageBucketLogicalScope,
  type SdkworkStorageBucketStorageClass,
  type SdkworkStorageEncryptionMode,
  type SdkworkStorageProviderType,
  type SdkworkStorageResourceStatus,
  type SdkworkStorageUsageScopeType,
  type SdkworkStorageUsageSnapshot,
} from "../../sdkwork-file-contracts/src/index";

export const SDKWORK_FILE_PORT_GROUPS = [
  "upload",
  "binding",
  "access",
  "drive",
  "usage",
  "adminStorage",
] as const;

export type SdkworkFilePortGroup = (typeof SDKWORK_FILE_PORT_GROUPS)[number];

export const SDKWORK_ADMIN_STORAGE_PROVIDER_CONFIGURATION_FIELDS = [
  "credentialRef",
  "endpointUrl",
  "idempotencyKey",
  "pathStyleEnabled",
  "providerCode",
  "providerType",
  "region",
  "requestId",
  "supportsLifecycle",
  "supportsMultipart",
  "supportsObjectLock",
] as const;

export const SDKWORK_ADMIN_STORAGE_BUCKET_CONFIGURATION_FIELDS = [
  "bucketName",
  "bucketRegion",
  "dataResidencyRegion",
  "defaultEncryptionMode",
  "defaultStorageClass",
  "idempotencyKey",
  "kmsKeyRef",
  "lifecycleEnabled",
  "logicalScope",
  "objectKeyPrefix",
  "objectLockEnabled",
  "providerId",
  "publicAccessBlocked",
  "requestId",
  "versioningEnabled",
] as const;

export interface FileChecksum {
  algorithm: "crc32" | "crc32c" | "crc64nvme" | "sha256";
  value: string;
}

export interface FileUploadTarget {
  id: string;
  type: string;
}

export type FileUploadProfile =
  | "archive"
  | "attachment"
  | "audio"
  | "avatar"
  | "dataset"
  | "document"
  | "generic"
  | "image"
  | "text"
  | "thumbnail"
  | "video";

export interface FileUploadBlobLike {
  readonly name?: string;
  readonly size: number;
  readonly type?: string;
  arrayBuffer(): Promise<ArrayBuffer>;
  slice(start?: number, end?: number, contentType?: string): Blob;
}

export interface FileUploadProgress {
  status: "prepared" | "uploading" | "part_uploaded" | "completing" | "completed";
  totalBytes: number;
  uploadedBytes: number;
  partNo?: number;
  totalParts?: number;
  uploadedPartsCount?: number;
}

export interface FileUploadRetention {
  cleanupAction?: "hard_delete" | "soft_delete";
  hardDeleteAfterSeconds?: string;
  mode: "long_term" | "temporary";
  ttlSeconds?: string;
}

export interface UploadFileInput {
  anonymousId?: string;
  appId: string;
  appResourceId: string;
  appResourceType: string;
  checksum?: FileChecksum;
  contentType: string;
  file: FileUploadBlobLike;
  filename: string;
  idempotencyKey: string;
  onProgress?: (progress: FileUploadProgress) => void;
  organizationId?: string;
  parentNodeId?: string;
  purpose: string;
  requestId: string;
  retention?: FileUploadRetention;
  scene?: string;
  sizeBytes: number;
  spaceId?: string;
  source?: string;
  target: FileUploadTarget;
  tenantId?: string;
  uploadProfileCode?: FileUploadProfile;
  userId?: string;
}

export interface UploadFileResult {
  driveNodeId: string;
  driveSpaceId: string;
  driveUri: string;
  fileRef: SdkworkFileRef;
  requestId: string;
  status: SdkworkFileUploadStatus;
  uploadId: string;
}

export interface CompleteUploadInput {
  checksum?: FileChecksum;
  idempotencyKey: string;
  purpose: string;
  requestId: string;
  sessionId: string;
}

export interface CompleteUploadResult {
  fileRef: SdkworkFileRef;
  requestId: string;
  sessionId: string;
  status: SdkworkFileUploadStatus;
}

export interface AbortUploadInput {
  requestId: string;
  sessionId: string;
}

export interface AbortUploadResult {
  requestId: string;
  sessionId: string;
  status: SdkworkFileUploadStatus;
}

export interface FileUploadPort {
  abortUpload(input: AbortUploadInput): Promise<AbortUploadResult>;
  completeUpload(input: CompleteUploadInput): Promise<CompleteUploadResult>;
  uploadFile(input: UploadFileInput): Promise<UploadFileResult>;
}

export interface FileBindingPort {
  createBinding(input: {
    fileId: string;
    purpose: string;
    requestId: string;
    target: FileUploadTarget;
    versionId?: string;
  }): Promise<{ fileRef: SdkworkFileRef; requestId: string }>;
  deleteBinding(input: { bindingId: string; requestId: string }): Promise<{ bindingId: string; requestId: string }>;
  listBindings(query: { purpose?: string; requestId: string; target: FileUploadTarget }): Promise<{ items: SdkworkFileRef[]; requestId: string }>;
}

export interface FileAccessPort {
  getFile(input: { fileId: string; requestId: string }): Promise<{ fileRef: SdkworkFileRef; requestId: string }>;
  issueDownloadUrl(input: { fileId: string; requestId: string; versionId?: string }): Promise<{ expiresAt: string; requestId: string; url: string }>;
  issuePreviewUrl(input: { fileId: string; requestId: string; versionId?: string }): Promise<{ expiresAt: string; requestId: string; url: string }>;
  listFiles(query: {
    cursor?: string;
    limit?: number;
    purpose?: string;
    requestId: string;
    target?: FileUploadTarget;
  }): Promise<{ items: SdkworkFileRef[]; nextCursor?: string; requestId: string }>;
}

export interface DrivePort {
  listNodes(query: {
    cursor?: string;
    limit?: number;
    parentNodeId?: string;
    requestId: string;
    spaceId: string;
  }): Promise<{ items: SdkworkDriveNode[]; nextCursor?: string; requestId: string }>;
  listSpaces(query: { requestId: string }): Promise<{ items: SdkworkDriveSpace[]; requestId: string }>;
}

export interface StorageUsagePort {
  getCurrentUsage(query: { requestId: string; scopeId: string; scopeType: SdkworkStorageUsageScopeType }): Promise<SdkworkStorageUsageSnapshot>;
  releaseUploadQuota(input: { requestId: string; reservationId: string }): Promise<{
    released: boolean;
    requestId: string;
    reservationId: string;
  }>;
  reserveUploadQuota(input: {
    billableBytes: number;
    idempotencyKey: string;
    organizationId?: string;
    requestId: string;
    scopeId: string;
    scopeType: Exclude<SdkworkStorageUsageScopeType, "business_domain">;
    userId?: string;
  }): Promise<{
    expiresAt: string;
    requestId: string;
    reservationId: string;
  }>;
}

export interface AdminStorageUsageQuery {
  cursor?: string;
  limit?: number;
  requestId: string;
  scopeId?: string;
  scopeType?: SdkworkStorageUsageScopeType;
}

export interface AdminStorageUsageLedgerQuery extends AdminStorageUsageQuery {
  occurredAfter?: string;
  occurredBefore?: string;
}

export interface AdminStorageUsageSnapshotQuery extends AdminStorageUsageQuery {
  periodEndAt?: string;
  periodStartAt?: string;
  snapshotType?: string;
}

export interface AdminStorageBucketQuery {
  cursor?: string;
  limit?: number;
  logicalScope?: SdkworkStorageBucketLogicalScope;
  providerId?: string;
  requestId: string;
  status?: string;
}

export interface AdminStorageDefaultBucketQuery {
  logicalScope?: SdkworkStorageBucketLogicalScope;
  requestId: string;
}

export interface AdminStorageDefaultBucket {
  bucketId: string;
  bucketName: string;
  dataResidencyRegion?: string;
  logicalScope: SdkworkStorageBucketLogicalScope;
  providerCode: string;
  providerId: string;
  providerType: SdkworkStorageProviderType;
  status: SdkworkStorageResourceStatus;
  updatedAt?: string;
}

export interface AdminStorageSetDefaultBucketInput {
  bucketId: string;
  logicalScope: SdkworkStorageBucketLogicalScope;
  reason: string;
  requestId: string;
}

export interface AdminStorageProviderHealthCheckInput {
  providerId: string;
  requestId: string;
}

export interface AdminStorageProviderHealthCheckResult {
  checkedAt?: string;
  healthy: boolean;
  providerId: string;
  requestId: string;
  status: string;
}

export interface AdminStorageUpdateProviderInput {
  providerId: string;
  reason: string;
  requestId: string;
  status: SdkworkStorageResourceStatus;
}

export interface AdminStorageUpdateBucketInput {
  bucketId: string;
  reason: string;
  requestId: string;
  status: SdkworkStorageResourceStatus;
}

export interface AdminStorageCreateProviderInput {
  credentialRef: string;
  endpointUrl?: string;
  idempotencyKey: string;
  pathStyleEnabled?: boolean;
  providerCode: string;
  providerType: SdkworkStorageProviderType;
  region?: string;
  requestId: string;
  supportsLifecycle?: boolean;
  supportsMultipart?: boolean;
  supportsObjectLock?: boolean;
}

export interface AdminStorageCreateBucketInput {
  bucketName: string;
  bucketRegion?: string;
  dataResidencyRegion?: string;
  defaultEncryptionMode?: SdkworkStorageEncryptionMode;
  defaultStorageClass?: SdkworkStorageBucketStorageClass;
  idempotencyKey: string;
  kmsKeyRef?: string;
  lifecycleEnabled?: boolean;
  logicalScope: SdkworkStorageBucketLogicalScope;
  objectKeyPrefix?: string;
  objectLockEnabled?: boolean;
  providerId: string;
  publicAccessBlocked?: boolean;
  requestId: string;
  versioningEnabled?: boolean;
}

export interface AdminStorageCreateQuotaPolicyInput {
  idempotencyKey: string;
  quotaLimitBytes: number;
  requestId: string;
  scopeId: string;
  scopeType: Exclude<SdkworkStorageUsageScopeType, "business_domain">;
  singleFileLimitBytes?: number;
}

export interface AdminStorageReconciliationRunQuery {
  cursor?: string;
  limit?: number;
  requestId: string;
  runType?: string;
  status?: string;
}

export interface AdminStorageCreateReconciliationRunInput {
  bucketId?: string;
  dryRun: boolean;
  idempotencyKey: string;
  providerId?: string;
  requestId: string;
  runType: string;
}

export interface AdminStorageCreateGarbageCollectionJobInput {
  criteria?: Record<string, unknown>;
  dryRun: boolean;
  idempotencyKey: string;
  jobType: string;
  requestId: string;
}

export interface AdminStoragePort {
  createProvider(input: AdminStorageCreateProviderInput): Promise<{ provider: unknown; requestId: string }>;
  updateProvider(input: AdminStorageUpdateProviderInput): Promise<{ provider: unknown; requestId: string }>;
  createBucket(input: AdminStorageCreateBucketInput): Promise<{ bucket: unknown; requestId: string }>;
  updateBucket(input: AdminStorageUpdateBucketInput): Promise<{ bucket: unknown; requestId: string }>;
  createQuotaPolicy(input: AdminStorageCreateQuotaPolicyInput): Promise<{ quotaPolicy: unknown; requestId: string }>;
  createReconciliationRun(input: AdminStorageCreateReconciliationRunInput): Promise<{ reconciliationRun: unknown; requestId: string }>;
  createGarbageCollectionJob(input: AdminStorageCreateGarbageCollectionJobInput): Promise<{ job: unknown; requestId: string }>;
  healthCheckProvider(input: AdminStorageProviderHealthCheckInput): Promise<AdminStorageProviderHealthCheckResult>;
  listProviders(query: { requestId: string }): Promise<{ items: unknown[]; requestId: string }>;
  listBuckets(query: AdminStorageBucketQuery): Promise<{ items: unknown[]; nextCursor?: string; requestId: string }>;
  listDefaultBuckets(query: AdminStorageDefaultBucketQuery): Promise<{ items: AdminStorageDefaultBucket[]; requestId: string }>;
  listQuotaPolicies(query: { requestId: string }): Promise<{ items: unknown[]; requestId: string }>;
  listReconciliationRuns(query: AdminStorageReconciliationRunQuery): Promise<{ items: unknown[]; nextCursor?: string; requestId: string }>;
  listUsageCounters(query: AdminStorageUsageQuery): Promise<{ items: unknown[]; nextCursor?: string; requestId: string }>;
  listUsageLedger(query: AdminStorageUsageLedgerQuery): Promise<{ items: unknown[]; nextCursor?: string; requestId: string }>;
  listUsageSnapshots(query: AdminStorageUsageSnapshotQuery): Promise<{ items: unknown[]; nextCursor?: string; requestId: string }>;
  setDefaultBucket(input: AdminStorageSetDefaultBucketInput): Promise<{ defaultBucket: AdminStorageDefaultBucket; requestId: string }>;
}

export interface FilePlatformPorts {
  access: FileAccessPort;
  adminStorage: AdminStoragePort;
  binding: FileBindingPort;
  drive: DrivePort;
  upload: FileUploadPort;
  usage: StorageUsagePort;
}

export function createUnsupportedFilePlatformPorts(): FilePlatformPorts {
  return {
    access: {
      getFile: unsupported("access.getFile"),
      issueDownloadUrl: unsupported("access.issueDownloadUrl"),
      issuePreviewUrl: unsupported("access.issuePreviewUrl"),
      listFiles: unsupported("access.listFiles"),
    },
    adminStorage: {
      createProvider: unsupported("adminStorage.createProvider"),
      updateProvider: unsupported("adminStorage.updateProvider"),
      createBucket: unsupported("adminStorage.createBucket"),
      updateBucket: unsupported("adminStorage.updateBucket"),
      createQuotaPolicy: unsupported("adminStorage.createQuotaPolicy"),
      createReconciliationRun: unsupported("adminStorage.createReconciliationRun"),
      createGarbageCollectionJob: unsupported("adminStorage.createGarbageCollectionJob"),
      healthCheckProvider: unsupported("adminStorage.healthCheckProvider"),
      listProviders: unsupported("adminStorage.listProviders"),
      listBuckets: unsupported("adminStorage.listBuckets"),
      listDefaultBuckets: unsupported("adminStorage.listDefaultBuckets"),
      listQuotaPolicies: unsupported("adminStorage.listQuotaPolicies"),
      listReconciliationRuns: unsupported("adminStorage.listReconciliationRuns"),
      listUsageCounters: unsupported("adminStorage.listUsageCounters"),
      listUsageLedger: unsupported("adminStorage.listUsageLedger"),
      listUsageSnapshots: unsupported("adminStorage.listUsageSnapshots"),
      setDefaultBucket: unsupported("adminStorage.setDefaultBucket"),
    },
    binding: {
      createBinding: unsupported("binding.createBinding"),
      deleteBinding: unsupported("binding.deleteBinding"),
      listBindings: unsupported("binding.listBindings"),
    },
    drive: {
      listNodes: unsupported("drive.listNodes"),
      listSpaces: unsupported("drive.listSpaces"),
    },
    upload: {
      abortUpload: unsupported("upload.abortUpload"),
      completeUpload: unsupported("upload.completeUpload"),
      uploadFile: unsupported("upload.uploadFile"),
    },
    usage: {
      getCurrentUsage: unsupported("usage.getCurrentUsage"),
      releaseUploadQuota: unsupported("usage.releaseUploadQuota"),
      reserveUploadQuota: unsupported("usage.reserveUploadQuota"),
    },
  };
}

export function createInMemoryFileUploadPort(): FileUploadPort {
  let sequence = 0;

  return {
    async abortUpload(input) {
      return {
        requestId: input.requestId,
        sessionId: input.sessionId,
        status: "aborted",
      };
    },

    async completeUpload(input) {
      return {
        fileRef: createFileRef({
          fileId: `file_${input.sessionId.slice(4)}`,
          purpose: input.purpose,
          visibility: "private",
        }),
        requestId: input.requestId,
        sessionId: input.sessionId,
        status: "active",
      };
    },

    async uploadFile(input) {
      sequence += 1;
      const driveSpaceId = input.spaceId || "space_memory";
      const driveNodeId = `node_${sequence.toString().padStart(6, "0")}`;
      const uploadId = `upload_${sequence.toString().padStart(6, "0")}`;
      input.onProgress?.({
        status: "completed",
        totalBytes: input.sizeBytes,
        uploadedBytes: input.sizeBytes,
        totalParts: 1,
        uploadedPartsCount: 1,
      });
      return {
        driveNodeId,
        driveSpaceId,
        driveUri: `drive://spaces/${driveSpaceId}/nodes/${driveNodeId}`,
        fileRef: createFileRef({
          displayName: input.filename,
          fileId: driveNodeId,
          purpose: input.purpose,
          visibility: "private",
        }),
        requestId: input.requestId,
        status: "active",
        uploadId,
      };
    },
  };
}

function unsupported<TArgs extends unknown[], TResult>(name: string): (...args: TArgs) => Promise<TResult> {
  return async () => {
    throw new Error(`file platform port ${name} is not configured`);
  };
}
