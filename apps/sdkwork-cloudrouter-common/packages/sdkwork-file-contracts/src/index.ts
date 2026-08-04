export const SDKWORK_FILE_STANDARD = {
  api: {
    appPrefix: "/app/v3/api",
    backendPrefix: "/backend/v3/api",
    openapi: "3.1.2",
  },
  domain: "file",
  sdkNamespaces: [
    "files",
    "drive",
    "fileBindings",
    "storage",
    "oss",
    "fileSlots",
    "security",
    "audit",
  ],
} as const;

export const SDKWORK_FILE_TABLES = {
  objectProvider: "object_provider",
  objectBucket: "object_bucket",
  storageDefaultBucketPolicy: "storage_default_bucket_policy",
  objectBlob: "object_blob",
  objectTag: "object_tag",
  fileNode: "file_node",
  fileVersion: "file_version",
  fileMetadataCommon: "file_metadata_common",
  driveSpace: "drive_space",
  driveNode: "drive_node",
  driveAclEntry: "drive_acl_entry",
  driveChangeLog: "drive_change_log",
  fileSlotDefinition: "file_slot_definition",
  fileBinding: "file_binding",
  storageQuotaPolicy: "storage_quota_policy",
  storageQuotaReservation: "storage_quota_reservation",
  storageUsageLedger: "storage_usage_ledger",
  storageUsageCounter: "storage_usage_counter",
  storageUsageSnapshot: "storage_usage_snapshot",
  storageReconciliationRun: "storage_reconciliation_run",
  storageReconciliationItem: "storage_reconciliation_item",
  storageGcJob: "storage_gc_job",
  fileSecurityScan: "file_security_scan",
  fileAuditLog: "file_audit_log",
} as const;

export const SDKWORK_FILE_API_ROUTES = {
  app: {
    files: {
      collection: "/app/v3/api/files",
      delete: "/app/v3/api/files/{fileId}",
      get: "/app/v3/api/files/{fileId}",
      issueDownloadUrl: "/app/v3/api/files/{fileId}/download_url",
      issuePreviewUrl: "/app/v3/api/files/{fileId}/preview_url",
      update: "/app/v3/api/files/{fileId}",
      versions: "/app/v3/api/files/{fileId}/versions",
    },
    drive: {
      changes: "/app/v3/api/drive/changes",
      copyNode: "/app/v3/api/drive/nodes/{nodeId}/copy",
      createFolder: "/app/v3/api/drive/spaces/{spaceId}/folders",
      listNodes: "/app/v3/api/drive/spaces/{spaceId}/nodes",
      listSpaces: "/app/v3/api/drive/spaces",
      moveNode: "/app/v3/api/drive/nodes/{nodeId}/move",
      restoreNode: "/app/v3/api/drive/nodes/{nodeId}/restore",
      trashNode: "/app/v3/api/drive/nodes/{nodeId}/trash",
      updateNode: "/app/v3/api/drive/nodes/{nodeId}",
    },
    fileBindings: {
      collection: "/app/v3/api/file_bindings",
      item: "/app/v3/api/file_bindings/{bindingId}",
    },
    storage: {
      currentQuota: "/app/v3/api/storage/quotas/current",
      currentUsage: "/app/v3/api/storage/usage/current",
      spaceUsage: "/app/v3/api/storage/usage/spaces",
    },
  },
  backend: {
    storage: {
      bucket: "/backend/v3/api/storage/buckets/{bucketId}",
      buckets: "/backend/v3/api/storage/buckets",
      defaultBucket: "/backend/v3/api/storage/default_buckets/{logicalScope}",
      defaultBuckets: "/backend/v3/api/storage/default_buckets",
      gcJobs: "/backend/v3/api/storage/gc_jobs",
      overview: "/backend/v3/api/storage/overview",
      provider: "/backend/v3/api/storage/providers/{providerId}",
      providers: "/backend/v3/api/storage/providers",
      providerHealthCheck: "/backend/v3/api/storage/providers/{providerId}/health_check",
      quotas: "/backend/v3/api/storage/quotas",
      reconciliationRuns: "/backend/v3/api/storage/reconciliation_runs",
      usage: "/backend/v3/api/storage/usage",
      usageLedger: "/backend/v3/api/storage/usage/ledger",
      usageSnapshots: "/backend/v3/api/storage/usage/snapshots",
    },
    files: {
      accessLogs: "/backend/v3/api/files/{fileId}/access_logs",
      bindings: "/backend/v3/api/files/{fileId}/bindings",
      collection: "/backend/v3/api/files",
      item: "/backend/v3/api/files/{fileId}",
      lock: "/backend/v3/api/files/{fileId}/lock",
      restore: "/backend/v3/api/files/{fileId}/restore",
      unlock: "/backend/v3/api/files/{fileId}/unlock",
      versions: "/backend/v3/api/files/{fileId}/versions",
    },
    drive: {
      nodePermissions: "/backend/v3/api/drive/nodes/{nodeId}/permissions",
      shareLink: "/backend/v3/api/drive/share_links/{shareLinkId}",
      shareLinks: "/backend/v3/api/drive/share_links",
      shareLinkRevoke: "/backend/v3/api/drive/share_links/{shareLinkId}/revoke",
      spaceNodes: "/backend/v3/api/drive/spaces/{spaceId}/nodes",
      spaces: "/backend/v3/api/drive/spaces",
    },
    fileSlots: {
      collection: "/backend/v3/api/file_slots",
      item: "/backend/v3/api/file_slots/{slotCode}",
    },
    security: {
      auditLogs: "/backend/v3/api/security/files/audit_logs",
      dlpResults: "/backend/v3/api/security/files/dlp_results",
      retryScan: "/backend/v3/api/security/files/scans/{scanId}/retry",
      scans: "/backend/v3/api/security/files/scans",
    },
  },
} as const;

export type SdkworkFileApiSurface = "app" | "backend";
export type SdkworkFileOperationKind = "create" | "delete" | "read" | "update";

export interface SdkworkFileOperationContract {
  apiSurface: SdkworkFileApiSurface;
  kind: SdkworkFileOperationKind;
  operationId: string;
  path: string;
  tag: (typeof SDKWORK_FILE_STANDARD.sdkNamespaces)[number];
}

export const SDKWORK_FILE_OPERATION_IDS = {
  filesList: operation("app", "read", "files.list", SDKWORK_FILE_API_ROUTES.app.files.collection, "files"),
  filesRetrieve: operation("app", "read", "files.retrieve", SDKWORK_FILE_API_ROUTES.app.files.get, "files"),
  filesUpdate: operation("app", "update", "files.update", SDKWORK_FILE_API_ROUTES.app.files.update, "files"),
  filesDelete: operation("app", "delete", "files.delete", SDKWORK_FILE_API_ROUTES.app.files.delete, "files"),
  filesVersionsList: operation("app", "read", "files.versions.list", SDKWORK_FILE_API_ROUTES.app.files.versions, "files"),
  filesDownloadUrlCreate: operation("app", "create", "files.downloadUrl.create", SDKWORK_FILE_API_ROUTES.app.files.issueDownloadUrl, "files"),
  filesPreviewUrlCreate: operation("app", "create", "files.previewUrl.create", SDKWORK_FILE_API_ROUTES.app.files.issuePreviewUrl, "files"),
  driveSpacesList: operation("app", "read", "drive.spaces.list", SDKWORK_FILE_API_ROUTES.app.drive.listSpaces, "drive"),
  driveNodesList: operation("app", "read", "drive.nodes.list", SDKWORK_FILE_API_ROUTES.app.drive.listNodes, "drive"),
  driveFoldersCreate: operation("app", "create", "drive.folders.create", SDKWORK_FILE_API_ROUTES.app.drive.createFolder, "drive"),
  driveNodesUpdate: operation("app", "update", "drive.nodes.update", SDKWORK_FILE_API_ROUTES.app.drive.updateNode, "drive"),
  driveNodesMove: operation("app", "update", "drive.nodes.move", SDKWORK_FILE_API_ROUTES.app.drive.moveNode, "drive"),
  driveNodesCopy: operation("app", "create", "drive.nodes.copy", SDKWORK_FILE_API_ROUTES.app.drive.copyNode, "drive"),
  driveNodesTrash: operation("app", "update", "drive.nodes.trash", SDKWORK_FILE_API_ROUTES.app.drive.trashNode, "drive"),
  driveNodesRestore: operation("app", "update", "drive.nodes.restore", SDKWORK_FILE_API_ROUTES.app.drive.restoreNode, "drive"),
  driveChangesList: operation("app", "read", "drive.changes.list", SDKWORK_FILE_API_ROUTES.app.drive.changes, "drive"),
  fileBindingsList: operation("app", "read", "fileBindings.list", SDKWORK_FILE_API_ROUTES.app.fileBindings.collection, "fileBindings"),
  fileBindingsCreate: operation("app", "create", "fileBindings.create", SDKWORK_FILE_API_ROUTES.app.fileBindings.collection, "fileBindings"),
  fileBindingsUpdate: operation("app", "update", "fileBindings.update", SDKWORK_FILE_API_ROUTES.app.fileBindings.item, "fileBindings"),
  fileBindingsDelete: operation("app", "delete", "fileBindings.delete", SDKWORK_FILE_API_ROUTES.app.fileBindings.item, "fileBindings"),
  storageUsageRetrieve: operation("app", "read", "storage.usage.retrieve", SDKWORK_FILE_API_ROUTES.app.storage.currentUsage, "storage"),
  storageUsageSpacesList: operation("app", "read", "storage.usage.spaces.list", SDKWORK_FILE_API_ROUTES.app.storage.spaceUsage, "storage"),
  storageQuotasCurrentRetrieve: operation("app", "read", "storage.quotas.current.retrieve", SDKWORK_FILE_API_ROUTES.app.storage.currentQuota, "storage"),
  ossOverviewRetrieve: operation("backend", "read", "oss.overview.retrieve", SDKWORK_FILE_API_ROUTES.backend.storage.overview, "oss"),
  ossProvidersList: operation("backend", "read", "oss.providers.list", SDKWORK_FILE_API_ROUTES.backend.storage.providers, "oss"),
  ossProvidersCreate: operation("backend", "create", "oss.providers.create", SDKWORK_FILE_API_ROUTES.backend.storage.providers, "oss"),
  ossProvidersUpdate: operation("backend", "update", "oss.providers.update", SDKWORK_FILE_API_ROUTES.backend.storage.provider, "oss"),
  ossProvidersHealthChecksCreate: operation("backend", "create", "oss.providers.healthChecks.create", SDKWORK_FILE_API_ROUTES.backend.storage.providerHealthCheck, "oss"),
  ossBucketsList: operation("backend", "read", "oss.buckets.list", SDKWORK_FILE_API_ROUTES.backend.storage.buckets, "oss"),
  ossBucketsCreate: operation("backend", "create", "oss.buckets.create", SDKWORK_FILE_API_ROUTES.backend.storage.buckets, "oss"),
  ossBucketsUpdate: operation("backend", "update", "oss.buckets.update", SDKWORK_FILE_API_ROUTES.backend.storage.bucket, "oss"),
  ossDefaultBucketsList: operation("backend", "read", "oss.defaultBuckets.list", SDKWORK_FILE_API_ROUTES.backend.storage.defaultBuckets, "oss"),
  ossDefaultBucketsUpdate: operation("backend", "update", "oss.defaultBuckets.update", SDKWORK_FILE_API_ROUTES.backend.storage.defaultBucket, "oss"),
  ossQuotasList: operation("backend", "read", "oss.quotas.list", SDKWORK_FILE_API_ROUTES.backend.storage.quotas, "oss"),
  ossQuotasCreate: operation("backend", "create", "oss.quotas.create", SDKWORK_FILE_API_ROUTES.backend.storage.quotas, "oss"),
  ossUsageList: operation("backend", "read", "oss.usage.list", SDKWORK_FILE_API_ROUTES.backend.storage.usage, "oss"),
  ossUsageLedgerList: operation("backend", "read", "oss.usage.ledger.list", SDKWORK_FILE_API_ROUTES.backend.storage.usageLedger, "oss"),
  ossUsageSnapshotsList: operation("backend", "read", "oss.usage.snapshots.list", SDKWORK_FILE_API_ROUTES.backend.storage.usageSnapshots, "oss"),
  ossReconciliationRunsList: operation("backend", "read", "oss.reconciliationRuns.list", SDKWORK_FILE_API_ROUTES.backend.storage.reconciliationRuns, "oss"),
  ossReconciliationRunsCreate: operation("backend", "create", "oss.reconciliationRuns.create", SDKWORK_FILE_API_ROUTES.backend.storage.reconciliationRuns, "oss"),
  ossGcJobsCreate: operation("backend", "create", "oss.gcJobs.create", SDKWORK_FILE_API_ROUTES.backend.storage.gcJobs, "oss"),
  adminFilesList: operation("backend", "read", "admin.files.list", SDKWORK_FILE_API_ROUTES.backend.files.collection, "files"),
  adminFilesRetrieve: operation("backend", "read", "admin.files.retrieve", SDKWORK_FILE_API_ROUTES.backend.files.item, "files"),
  adminFilesDelete: operation("backend", "delete", "admin.files.delete", SDKWORK_FILE_API_ROUTES.backend.files.item, "files"),
  adminFilesVersionsList: operation("backend", "read", "admin.files.versions.list", SDKWORK_FILE_API_ROUTES.backend.files.versions, "files"),
  filesBindingsList: operation("backend", "read", "files.bindings.list", SDKWORK_FILE_API_ROUTES.backend.files.bindings, "files"),
  filesAccessLogsList: operation("backend", "read", "files.accessLogs.list", SDKWORK_FILE_API_ROUTES.backend.files.accessLogs, "audit"),
  filesLock: operation("backend", "update", "files.lock", SDKWORK_FILE_API_ROUTES.backend.files.lock, "files"),
  filesUnlock: operation("backend", "update", "files.unlock", SDKWORK_FILE_API_ROUTES.backend.files.unlock, "files"),
  filesRestore: operation("backend", "update", "files.restore", SDKWORK_FILE_API_ROUTES.backend.files.restore, "files"),
  adminDriveSpacesList: operation("backend", "read", "admin.drive.spaces.list", SDKWORK_FILE_API_ROUTES.backend.drive.spaces, "drive"),
  adminDriveNodesList: operation("backend", "read", "admin.drive.nodes.list", SDKWORK_FILE_API_ROUTES.backend.drive.spaceNodes, "drive"),
  drivePermissionsRetrieve: operation("backend", "read", "drive.permissions.retrieve", SDKWORK_FILE_API_ROUTES.backend.drive.nodePermissions, "drive"),
  drivePermissionsUpdate: operation("backend", "update", "drive.permissions.update", SDKWORK_FILE_API_ROUTES.backend.drive.nodePermissions, "drive"),
  driveShareLinksList: operation("backend", "read", "drive.shareLinks.list", SDKWORK_FILE_API_ROUTES.backend.drive.shareLinks, "drive"),
  driveShareLinksUpdate: operation("backend", "update", "drive.shareLinks.update", SDKWORK_FILE_API_ROUTES.backend.drive.shareLink, "drive"),
  driveShareLinksRevoke: operation("backend", "update", "drive.shareLinks.revoke", SDKWORK_FILE_API_ROUTES.backend.drive.shareLinkRevoke, "drive"),
  fileSlotsList: operation("backend", "read", "fileSlots.list", SDKWORK_FILE_API_ROUTES.backend.fileSlots.collection, "fileSlots"),
  fileSlotsCreate: operation("backend", "create", "fileSlots.create", SDKWORK_FILE_API_ROUTES.backend.fileSlots.collection, "fileSlots"),
  fileSlotsUpdate: operation("backend", "update", "fileSlots.update", SDKWORK_FILE_API_ROUTES.backend.fileSlots.item, "fileSlots"),
  securityScansList: operation("backend", "read", "security.scans.list", SDKWORK_FILE_API_ROUTES.backend.security.scans, "security"),
  securityScansRetry: operation("backend", "create", "security.scans.retry", SDKWORK_FILE_API_ROUTES.backend.security.retryScan, "security"),
  securityDlpResultsList: operation("backend", "read", "security.dlpResults.list", SDKWORK_FILE_API_ROUTES.backend.security.dlpResults, "security"),
  auditLogsList: operation("backend", "read", "audit.fileEvents.list", SDKWORK_FILE_API_ROUTES.backend.security.auditLogs, "audit"),
} as const;

export type SdkworkFileUploadMode = "multipart" | "server_proxy" | "single_put" | "tus_facade";

export const SDKWORK_FILE_UPLOAD_MODES: readonly SdkworkFileUploadMode[] = [
  "multipart",
  "server_proxy",
  "single_put",
  "tus_facade",
] as const;

export type SdkworkFileUploadStatus =
  | "aborted"
  | "active"
  | "canceled"
  | "checksum_failed"
  | "created"
  | "expired"
  | "orphaned"
  | "policy_rejected"
  | "processing"
  | "quota_rejected"
  | "scan_failed"
  | "scanning"
  | "uploaded"
  | "uploading"
  | "verifying"
  | "virus_detected";

export const SDKWORK_FILE_UPLOAD_STATUSES: readonly SdkworkFileUploadStatus[] = [
  "aborted",
  "active",
  "canceled",
  "checksum_failed",
  "created",
  "expired",
  "orphaned",
  "policy_rejected",
  "processing",
  "quota_rejected",
  "scan_failed",
  "scanning",
  "uploaded",
  "uploading",
  "verifying",
  "virus_detected",
] as const;

export const SDKWORK_FILE_TERMINAL_UPLOAD_STATUSES: readonly SdkworkFileUploadStatus[] = [
  "aborted",
  "active",
  "canceled",
  "checksum_failed",
  "expired",
  "orphaned",
  "policy_rejected",
  "quota_rejected",
  "scan_failed",
  "virus_detected",
] as const;

export type SdkworkFileSlotCardinality = "multiple" | "ordered_multiple" | "single" | "versioned_single";
export type SdkworkFileSlotOwnerScope = "app" | "organization" | "space" | "tenant" | "user";
export type SdkworkFileSlotStatus = "active" | "disabled" | "draft";
export type SdkworkFileVisibility = "private" | "restricted" | "shared";
export type SdkworkFileBindingState = "active" | "deleted" | "pending";
export type SdkworkDriveNodeType = "external_link" | "file" | "folder" | "mount" | "root" | "shortcut";
export type SdkworkDriveSpaceStatus = "active" | "archived" | "disabled";
export type SdkworkDriveSpaceType =
  | "app_drive"
  | "organization_drive"
  | "project_drive"
  | "shared_drive"
  | "system_library"
  | "team_drive"
  | "trash_space"
  | "user_drive";
export type SdkworkStorageProviderType =
  | "aws_s3"
  | "cloudflare_r2"
  | "cos_s3"
  | "local_dev_s3"
  | "minio"
  | "oss_s3"
  | "s3_compatible";
export type SdkworkStorageBucketLogicalScope =
  | "migration_import"
  | "system_archive"
  | "system_quarantine"
  | "system_temp"
  | "system_variant"
  | "tenant_private"
  | "tenant_public_asset";
export type SdkworkStorageBucketStorageClass =
  | "DEEP_ARCHIVE"
  | "GLACIER"
  | "GLACIER_IR"
  | "INTELLIGENT_TIERING"
  | "ONEZONE_IA"
  | "STANDARD"
  | "STANDARD_IA";
export type SdkworkStorageEncryptionMode = "none" | "sse_kms" | "sse_s3";
export type SdkworkStorageQuotaAccountScope = "app" | "organization" | "space" | "tenant" | "user";
export type SdkworkStorageResourceStatus = "active" | "archived" | "disabled";
export type SdkworkStorageJobStatus = "canceled" | "completed" | "created" | "failed" | "running";
export type SdkworkStorageQuotaReservationStatus = "active" | "converted" | "expired" | "released";
export type SdkworkStorageUsageScopeType = "app" | "business_domain" | "organization" | "space" | "tenant" | "user";

export const SDKWORK_FILE_VISIBILITIES: readonly SdkworkFileVisibility[] = [
  "private",
  "restricted",
  "shared",
] as const;

export const SDKWORK_FILE_SLOT_STATUSES: readonly SdkworkFileSlotStatus[] = [
  "active",
  "disabled",
  "draft",
] as const;

export const SDKWORK_FILE_BINDING_STATES: readonly SdkworkFileBindingState[] = [
  "active",
  "deleted",
  "pending",
] as const;

export const SDKWORK_DRIVE_SPACE_TYPES: readonly SdkworkDriveSpaceType[] = [
  "user_drive",
  "organization_drive",
  "team_drive",
  "project_drive",
  "app_drive",
  "system_library",
  "shared_drive",
  "trash_space",
] as const;

export const SDKWORK_DRIVE_SPACE_STATUSES: readonly SdkworkDriveSpaceStatus[] = [
  "active",
  "archived",
  "disabled",
] as const;

export const SDKWORK_DRIVE_NODE_TYPES: readonly SdkworkDriveNodeType[] = [
  "root",
  "folder",
  "file",
  "shortcut",
  "mount",
  "external_link",
] as const;

export const SDKWORK_STORAGE_PROVIDER_TYPES: readonly SdkworkStorageProviderType[] = [
  "aws_s3",
  "cloudflare_r2",
  "cos_s3",
  "local_dev_s3",
  "minio",
  "oss_s3",
  "s3_compatible",
] as const;

export const SDKWORK_STORAGE_BUCKET_LOGICAL_SCOPES: readonly SdkworkStorageBucketLogicalScope[] = [
  "migration_import",
  "system_archive",
  "system_quarantine",
  "system_temp",
  "system_variant",
  "tenant_private",
  "tenant_public_asset",
] as const;

export const SDKWORK_STORAGE_BUCKET_STORAGE_CLASSES: readonly SdkworkStorageBucketStorageClass[] = [
  "STANDARD",
  "INTELLIGENT_TIERING",
  "STANDARD_IA",
  "ONEZONE_IA",
  "GLACIER_IR",
  "GLACIER",
  "DEEP_ARCHIVE",
] as const;

export const SDKWORK_STORAGE_ENCRYPTION_MODES: readonly SdkworkStorageEncryptionMode[] = [
  "none",
  "sse_s3",
  "sse_kms",
] as const;

export const SDKWORK_STORAGE_RESOURCE_STATUSES: readonly SdkworkStorageResourceStatus[] = [
  "active",
  "archived",
  "disabled",
] as const;

export const SDKWORK_STORAGE_JOB_STATUSES: readonly SdkworkStorageJobStatus[] = [
  "canceled",
  "completed",
  "created",
  "failed",
  "running",
] as const;

export const SDKWORK_STORAGE_QUOTA_RESERVATION_STATUSES: readonly SdkworkStorageQuotaReservationStatus[] = [
  "active",
  "converted",
  "expired",
  "released",
] as const;

export const SDKWORK_STORAGE_USAGE_SCOPE_TYPES: readonly SdkworkStorageUsageScopeType[] = [
  "tenant",
  "organization",
  "user",
  "space",
  "app",
  "business_domain",
] as const;

export interface SdkworkFileSlotDefinition {
  allowedMimeTypes: string[];
  appId: string;
  businessDomain: string;
  cardinality: SdkworkFileSlotCardinality;
  defaultVisibility: SdkworkFileVisibility;
  deniedMimeTypes: string[];
  displayName: string;
  maxCount: number;
  maxFileBytes: number;
  minCount: number;
  ownerScope: SdkworkFileSlotOwnerScope;
  quotaAccountScope: SdkworkStorageQuotaAccountScope;
  slotCode: string;
  status: SdkworkFileSlotStatus;
}

export interface CreateSdkworkFileSlotDefinitionInput {
  allowedMimeTypes: readonly string[];
  appId: string;
  businessDomain: string;
  cardinality: SdkworkFileSlotCardinality;
  defaultVisibility?: SdkworkFileVisibility;
  deniedMimeTypes?: readonly string[];
  displayName: string;
  maxCount?: number;
  maxFileBytes: number;
  minCount?: number;
  ownerScope: SdkworkFileSlotOwnerScope;
  quotaAccountScope: SdkworkStorageQuotaAccountScope;
  slotCode: string;
  status?: SdkworkFileSlotStatus;
}

export interface SdkworkDriveSpace {
  appId?: string;
  name: string;
  organizationId?: string;
  ownerUserId?: string;
  rootNodeId?: string;
  spaceId: string;
  status: SdkworkDriveSpaceStatus;
  type: SdkworkDriveSpaceType;
}

export interface CreateSdkworkDriveSpaceInput {
  appId?: string;
  name: string;
  organizationId?: string;
  ownerUserId?: string;
  rootNodeId?: string;
  spaceId: string;
  status?: SdkworkDriveSpaceStatus;
  type: SdkworkDriveSpaceType;
}

export interface SdkworkDriveNode {
  depth: number;
  fileId?: string;
  mimeType?: string;
  name: string;
  nodeId: string;
  nodeType: SdkworkDriveNodeType;
  parentNodeId?: string;
  pathSegment: string;
  sizeBytes?: number;
  spaceId: string;
  trashed: boolean;
  updatedAt?: string;
}

export interface CreateSdkworkDriveNodeInput {
  depth: number;
  fileId?: string;
  mimeType?: string;
  name: string;
  nodeId: string;
  nodeType: SdkworkDriveNodeType;
  parentNodeId?: string;
  pathSegment?: string;
  sizeBytes?: number;
  spaceId: string;
  trashed?: boolean;
  updatedAt?: string;
}

export interface SdkworkFileRef {
  bindingId?: string;
  displayName?: string;
  fileId: string;
  purpose: string;
  versionId?: string;
  visibility: SdkworkFileVisibility;
}

export type CreateSdkworkFileRefInput = SdkworkFileRef;

export interface SdkworkStorageUsageSnapshot {
  fileCount: number;
  objectCount: number;
  quotaLimitBytes?: number;
  requestId: string;
  retainedBytes: number;
  scopeId: string;
  scopeType: SdkworkStorageUsageScopeType;
  trashBytes: number;
  usedBillableBytes: number;
  usedLogicalBytes: number;
  usedPhysicalBytes: number;
  variantBytes: number;
  versionCount: number;
}

export interface CreateSdkworkStorageUsageSnapshotInput {
  fileCount?: number;
  objectCount?: number;
  quotaLimitBytes?: number;
  requestId: string;
  retainedBytes?: number;
  scopeId: string;
  scopeType: SdkworkStorageUsageScopeType;
  trashBytes?: number;
  usedBillableBytes: number;
  usedLogicalBytes: number;
  usedPhysicalBytes: number;
  variantBytes?: number;
  versionCount?: number;
}

const SLOT_CODE_PATTERN = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*)+$/;
const MIME_PATTERN = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i;
const STORAGE_INTERNAL_KEYS = new Set([
  "bucket",
  "bucketName",
  "objectKey",
  "objectUri",
  "object_key",
  "presignedUrl",
  "url",
]);

function operation(
  apiSurface: SdkworkFileApiSurface,
  kind: SdkworkFileOperationKind,
  operationId: string,
  path: string,
  tag: SdkworkFileOperationContract["tag"],
): SdkworkFileOperationContract {
  return { apiSurface, kind, operationId, path, tag };
}

export function isSupportedUploadMode(value: string): value is SdkworkFileUploadMode {
  return SDKWORK_FILE_UPLOAD_MODES.includes(value as SdkworkFileUploadMode);
}

export function isUploadStatus(value: string): value is SdkworkFileUploadStatus {
  return SDKWORK_FILE_UPLOAD_STATUSES.includes(value as SdkworkFileUploadStatus);
}

export function isTerminalUploadStatus(value: string): value is SdkworkFileUploadStatus {
  return SDKWORK_FILE_TERMINAL_UPLOAD_STATUSES.includes(value as SdkworkFileUploadStatus);
}

export function createFileSlotDefinition(
  input: CreateSdkworkFileSlotDefinitionInput,
): SdkworkFileSlotDefinition {
  return normalizeFileSlotDefinition(input);
}

export function normalizeFileSlotDefinition(
  input: CreateSdkworkFileSlotDefinitionInput,
): SdkworkFileSlotDefinition {
  const cardinalityDefaultMax = input.cardinality === "single" || input.cardinality === "versioned_single" ? 1 : 50;

  return {
    allowedMimeTypes: normalizeMimeList(input.allowedMimeTypes),
    appId: input.appId.trim(),
    businessDomain: input.businessDomain.trim(),
    cardinality: input.cardinality,
    defaultVisibility: input.defaultVisibility ?? "private",
    deniedMimeTypes: normalizeMimeList(input.deniedMimeTypes ?? []),
    displayName: input.displayName.trim(),
    maxCount: input.maxCount ?? cardinalityDefaultMax,
    maxFileBytes: input.maxFileBytes,
    minCount: input.minCount ?? 0,
    ownerScope: input.ownerScope,
    quotaAccountScope: input.quotaAccountScope,
    slotCode: input.slotCode.trim(),
    status: input.status ?? "active",
  };
}

export function validateFileSlotDefinition(
  input: CreateSdkworkFileSlotDefinitionInput,
): string[] {
  const normalized = normalizeFileSlotDefinition(input);
  const errors: string[] = [];

  if (!SLOT_CODE_PATTERN.test(normalized.slotCode)) {
    errors.push("slot_code_format");
  }
  if (normalized.allowedMimeTypes.length === 0) {
    errors.push("allowed_mime_types_required");
  }
  if (normalized.allowedMimeTypes.some((mimeType) => !MIME_PATTERN.test(mimeType))) {
    errors.push("allowed_mime_type_format");
  }
  if (normalized.maxFileBytes <= 0) {
    errors.push("max_file_bytes_positive");
  }
  if (normalized.maxCount < normalized.minCount) {
    errors.push("max_count_gte_min_count");
  }
  if ((normalized.cardinality === "single" || normalized.cardinality === "versioned_single") && normalized.maxCount !== 1) {
    errors.push("single_slot_max_count_one");
  }

  return errors;
}

export function createFileRef(input: CreateSdkworkFileRefInput): SdkworkFileRef {
  return {
    ...(input.bindingId ? { bindingId: input.bindingId } : {}),
    ...(input.displayName ? { displayName: input.displayName } : {}),
    fileId: input.fileId,
    purpose: input.purpose,
    ...(input.versionId ? { versionId: input.versionId } : {}),
    visibility: input.visibility,
  };
}

export function createDriveSpace(input: CreateSdkworkDriveSpaceInput): SdkworkDriveSpace {
  const space: SdkworkDriveSpace = {
    ...(input.appId ? { appId: input.appId.trim() } : {}),
    name: requiredTrimmed(input.name, "Drive space name is required."),
    ...(input.organizationId ? { organizationId: input.organizationId.trim() } : {}),
    ...(input.ownerUserId ? { ownerUserId: input.ownerUserId.trim() } : {}),
    ...(input.rootNodeId ? { rootNodeId: input.rootNodeId.trim() } : {}),
    spaceId: requiredTrimmed(input.spaceId, "Drive space id is required."),
    status: input.status ?? "active",
    type: input.type,
  };

  if (!SDKWORK_DRIVE_SPACE_TYPES.includes(space.type)) {
    throw new Error("Drive space type is not supported.");
  }
  if (!isDriveSpaceStatus(space.status)) {
    throw new Error("Drive space status is not supported.");
  }

  return space;
}

export function createDriveNode(input: CreateSdkworkDriveNodeInput): SdkworkDriveNode {
  const name = requiredTrimmed(input.name, "Drive node name is required.");
  const node: SdkworkDriveNode = {
    depth: assertNonNegativeNumber(input.depth, "Drive node depth must be non-negative."),
    ...(input.fileId ? { fileId: input.fileId.trim() } : {}),
    ...(input.mimeType ? { mimeType: input.mimeType.trim().toLowerCase() } : {}),
    name,
    nodeId: requiredTrimmed(input.nodeId, "Drive node id is required."),
    nodeType: input.nodeType,
    ...(input.parentNodeId ? { parentNodeId: input.parentNodeId.trim() } : {}),
    pathSegment: input.pathSegment ? requiredTrimmed(input.pathSegment, "Drive node path segment is required.") : slugifyPathSegment(name),
    ...(input.sizeBytes === undefined ? {} : { sizeBytes: assertNonNegativeNumber(input.sizeBytes, "Drive node size must be non-negative.") }),
    spaceId: requiredTrimmed(input.spaceId, "Drive space id is required."),
    trashed: input.trashed ?? false,
    ...(input.updatedAt ? { updatedAt: input.updatedAt } : {}),
  };

  if (!SDKWORK_DRIVE_NODE_TYPES.includes(node.nodeType)) {
    throw new Error("Drive node type is not supported.");
  }
  if (node.nodeType === "file" && !node.fileId) {
    throw new Error("Drive file nodes require fileId.");
  }
  if (node.nodeType === "root" && node.depth !== 0) {
    throw new Error("Drive root nodes must have depth 0.");
  }

  return node;
}

export function createStorageUsageSnapshot(
  input: CreateSdkworkStorageUsageSnapshotInput,
): SdkworkStorageUsageSnapshot {
  const snapshot: SdkworkStorageUsageSnapshot = {
    fileCount: assertNonNegativeNumber(input.fileCount ?? 0, "Storage usage bytes must be non-negative."),
    objectCount: assertNonNegativeNumber(input.objectCount ?? 0, "Storage usage bytes must be non-negative."),
    ...(input.quotaLimitBytes === undefined ? {} : { quotaLimitBytes: assertNonNegativeNumber(input.quotaLimitBytes, "Storage usage bytes must be non-negative.") }),
    requestId: input.requestId,
    retainedBytes: assertNonNegativeNumber(input.retainedBytes ?? 0, "Storage usage bytes must be non-negative."),
    scopeId: input.scopeId,
    scopeType: input.scopeType,
    trashBytes: assertNonNegativeNumber(input.trashBytes ?? 0, "Storage usage bytes must be non-negative."),
    usedBillableBytes: assertNonNegativeNumber(input.usedBillableBytes, "Storage usage bytes must be non-negative."),
    usedLogicalBytes: assertNonNegativeNumber(input.usedLogicalBytes, "Storage usage bytes must be non-negative."),
    usedPhysicalBytes: assertNonNegativeNumber(input.usedPhysicalBytes, "Storage usage bytes must be non-negative."),
    variantBytes: assertNonNegativeNumber(input.variantBytes ?? 0, "Storage usage bytes must be non-negative."),
    versionCount: assertNonNegativeNumber(input.versionCount ?? 0, "Storage usage bytes must be non-negative."),
  };

  if (!isStorageUsageScopeType(snapshot.scopeType)) {
    throw new Error("Storage usage scope type is not supported.");
  }
  if (!snapshot.requestId.trim() || !snapshot.scopeId.trim()) {
    throw new Error("Storage usage requestId and scopeId are required.");
  }

  return snapshot;
}

export function isFileRef(value: unknown): value is SdkworkFileRef {
  if (!isRecord(value)) {
    return false;
  }
  for (const key of Object.keys(value)) {
    if (STORAGE_INTERNAL_KEYS.has(key)) {
      return false;
    }
  }
  return (
    typeof value.fileId === "string"
    && value.fileId.trim().length > 0
    && typeof value.purpose === "string"
    && SLOT_CODE_PATTERN.test(value.purpose)
    && isVisibility(value.visibility)
    && optionalNonEmptyString(value.bindingId)
    && optionalNonEmptyString(value.versionId)
  );
}

export function isDriveSpace(value: unknown): value is SdkworkDriveSpace {
  if (!isRecord(value)) {
    return false;
  }
  for (const key of Object.keys(value)) {
    if (STORAGE_INTERNAL_KEYS.has(key)) {
      return false;
    }
  }
  return (
    typeof value.spaceId === "string"
    && value.spaceId.trim().length > 0
    && typeof value.name === "string"
    && value.name.trim().length > 0
    && typeof value.type === "string"
    && SDKWORK_DRIVE_SPACE_TYPES.includes(value.type as SdkworkDriveSpaceType)
    && isDriveSpaceStatus(value.status)
  );
}

export function isDriveNode(value: unknown): value is SdkworkDriveNode {
  if (!isRecord(value)) {
    return false;
  }
  for (const key of Object.keys(value)) {
    if (STORAGE_INTERNAL_KEYS.has(key)) {
      return false;
    }
  }
  return (
    typeof value.nodeId === "string"
    && value.nodeId.trim().length > 0
    && typeof value.spaceId === "string"
    && value.spaceId.trim().length > 0
    && typeof value.name === "string"
    && value.name.trim().length > 0
    && typeof value.pathSegment === "string"
    && value.pathSegment.trim().length > 0
    && typeof value.nodeType === "string"
    && SDKWORK_DRIVE_NODE_TYPES.includes(value.nodeType as SdkworkDriveNodeType)
    && typeof value.depth === "number"
    && value.depth >= 0
    && typeof value.trashed === "boolean"
    && optionalNonEmptyString(value.fileId)
    && optionalNonEmptyString(value.parentNodeId)
  );
}

export function isStorageUsageScopeType(value: string): value is SdkworkStorageUsageScopeType {
  return SDKWORK_STORAGE_USAGE_SCOPE_TYPES.includes(value as SdkworkStorageUsageScopeType);
}

export function isStorageProviderType(value: string): value is SdkworkStorageProviderType {
  return SDKWORK_STORAGE_PROVIDER_TYPES.includes(value as SdkworkStorageProviderType);
}

export function isStorageBucketLogicalScope(value: string): value is SdkworkStorageBucketLogicalScope {
  return SDKWORK_STORAGE_BUCKET_LOGICAL_SCOPES.includes(value as SdkworkStorageBucketLogicalScope);
}

export function isStorageBucketStorageClass(value: string): value is SdkworkStorageBucketStorageClass {
  return SDKWORK_STORAGE_BUCKET_STORAGE_CLASSES.includes(value as SdkworkStorageBucketStorageClass);
}

export function isStorageEncryptionMode(value: string): value is SdkworkStorageEncryptionMode {
  return SDKWORK_STORAGE_ENCRYPTION_MODES.includes(value as SdkworkStorageEncryptionMode);
}

export function isStorageResourceStatus(value: string): value is SdkworkStorageResourceStatus {
  return SDKWORK_STORAGE_RESOURCE_STATUSES.includes(value as SdkworkStorageResourceStatus);
}

export function isStorageJobStatus(value: string): value is SdkworkStorageJobStatus {
  return SDKWORK_STORAGE_JOB_STATUSES.includes(value as SdkworkStorageJobStatus);
}

function normalizeMimeList(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))].sort();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalNonEmptyString(value: unknown): boolean {
  return value === undefined || (typeof value === "string" && value.trim().length > 0);
}

function isVisibility(value: unknown): value is SdkworkFileVisibility {
  return value === "private" || value === "restricted" || value === "shared";
}

function isDriveSpaceStatus(value: unknown): value is SdkworkDriveSpaceStatus {
  return value === "active" || value === "archived" || value === "disabled";
}

function assertNonNegativeNumber(value: number, message: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(message);
  }
  return value;
}

function requiredTrimmed(value: string, message: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(message);
  }
  return trimmed;
}

function slugifyPathSegment(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "unnamed";
}
