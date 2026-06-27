import { describe, expect, it } from "vitest";

import {
  SDKWORK_FILE_API_ROUTES,
  SDKWORK_FILE_OPERATION_IDS,
  SDKWORK_FILE_STANDARD,
  SDKWORK_FILE_BINDING_STATES,
  SDKWORK_FILE_SLOT_STATUSES,
  SDKWORK_FILE_TABLES,
  SDKWORK_FILE_UPLOAD_STATUSES,
  SDKWORK_FILE_VISIBILITIES,
  SDKWORK_DRIVE_NODE_TYPES,
  SDKWORK_DRIVE_SPACE_STATUSES,
  SDKWORK_DRIVE_SPACE_TYPES,
  SDKWORK_STORAGE_JOB_STATUSES,
  SDKWORK_STORAGE_QUOTA_RESERVATION_STATUSES,
  SDKWORK_STORAGE_RESOURCE_STATUSES,
  SDKWORK_STORAGE_BUCKET_LOGICAL_SCOPES,
  SDKWORK_STORAGE_BUCKET_STORAGE_CLASSES,
  SDKWORK_STORAGE_ENCRYPTION_MODES,
  SDKWORK_STORAGE_PROVIDER_TYPES,
  createDriveNode,
  createDriveSpace,
  SDKWORK_STORAGE_USAGE_SCOPE_TYPES,
  createFileRef,
  createFileSlotDefinition,
  createStorageUsageSnapshot,
  isDriveNode,
  isDriveSpace,
  isFileRef,
  isStorageBucketLogicalScope,
  isStorageBucketStorageClass,
  isStorageEncryptionMode,
  isStorageJobStatus,
  isStorageProviderType,
  isStorageResourceStatus,
  isStorageUsageScopeType,
  isUploadStatus,
  isSupportedUploadMode,
  isTerminalUploadStatus,
  normalizeFileSlotDefinition,
  validateFileSlotDefinition,
} from "../src/index";

describe("SDKWork file platform contracts", () => {
  it("defines canonical API prefixes, namespaces, and operation routes", () => {
    expect(SDKWORK_FILE_STANDARD.domain).toBe("file");
    expect(SDKWORK_FILE_STANDARD.api.appPrefix).toBe("/app/v3/api");
    expect(SDKWORK_FILE_STANDARD.api.backendPrefix).toBe("/backend/v3/api");
    expect(SDKWORK_FILE_STANDARD.sdkNamespaces).toEqual([
      "files",
      "drive",
      "fileBindings",
      "storage",
      "oss",
      "fileSlots",
      "security",
      "audit",
    ]);

    expect(SDKWORK_FILE_API_ROUTES.app).not.toHaveProperty("upload");
    expect(SDKWORK_FILE_API_ROUTES.app.files.issueDownloadUrl).toBe(
      "/app/v3/api/files/{fileId}/download_url",
    );
    expect(SDKWORK_FILE_API_ROUTES.backend.storage.providers).toBe(
      "/backend/v3/api/storage/providers",
    );
    expect(SDKWORK_FILE_API_ROUTES.backend.storage.provider).toBe(
      "/backend/v3/api/storage/providers/{providerId}",
    );
    expect(SDKWORK_FILE_API_ROUTES.backend.storage.bucket).toBe(
      "/backend/v3/api/storage/buckets/{bucketId}",
    );
    expect(SDKWORK_FILE_API_ROUTES.backend.storage.defaultBuckets).toBe(
      "/backend/v3/api/storage/default_buckets",
    );
    expect(SDKWORK_FILE_API_ROUTES.backend.storage.defaultBucket).toBe(
      "/backend/v3/api/storage/default_buckets/{logicalScope}",
    );
    expect(SDKWORK_FILE_API_ROUTES.backend.fileSlots.collection).toBe(
      "/backend/v3/api/file_slots",
    );
    expect(SDKWORK_FILE_OPERATION_IDS.ossDefaultBucketsList.operationId).toBe(
      "oss.defaultBuckets.list",
    );
    expect(SDKWORK_FILE_OPERATION_IDS.ossDefaultBucketsUpdate.operationId).toBe(
      "oss.defaultBuckets.update",
    );
    expect(SDKWORK_FILE_OPERATION_IDS.ossProvidersUpdate.operationId).toBe(
      "oss.providers.update",
    );
    expect(SDKWORK_FILE_OPERATION_IDS.ossBucketsUpdate.operationId).toBe(
      "oss.buckets.update",
    );

    const operationKeys = Object.keys(SDKWORK_FILE_OPERATION_IDS);
    const backendOperationKeys = operationKeys.filter(
      (key) => SDKWORK_FILE_OPERATION_IDS[key as keyof typeof SDKWORK_FILE_OPERATION_IDS].apiSurface === "backend",
    );
    expect(backendOperationKeys).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^storage[A-Z]/),
      ]),
    );
    const uniqueOperationIds = new Set(
      Object.values(SDKWORK_FILE_OPERATION_IDS).map((operation) => operation.operationId),
    );
    expect(uniqueOperationIds.size).toBe(operationKeys.length);

    for (const operation of Object.values(SDKWORK_FILE_OPERATION_IDS)) {
      expect(operation.path).toMatch(/^\/(app|backend)\/v3\/api\//);
      expect(operation.operationId).toMatch(/^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/);
      expect(operation.path).not.toContain("__");
      expect(operation.path).not.toContain("/s3/");
      expect(operation.path).not.toContain("/object_keys");
    }
  });

  it("defines file-platform table names with bounded-context prefixes", () => {
    expect(SDKWORK_FILE_TABLES).toEqual(
      expect.objectContaining({
        objectProvider: "object_provider",
        objectBucket: "object_bucket",
        storageDefaultBucketPolicy: "storage_default_bucket_policy",
        objectBlob: "object_blob",
        fileNode: "file_node",
        fileVersion: "file_version",
        driveSpace: "drive_space",
        driveNode: "drive_node",
        driveAclEntry: "drive_acl_entry",
        fileSlotDefinition: "file_slot_definition",
        fileBinding: "file_binding",
        storageUsageLedger: "storage_usage_ledger",
        storageUsageCounter: "storage_usage_counter",
        storageUsageSnapshot: "storage_usage_snapshot",
        storageReconciliationRun: "storage_reconciliation_run",
        storageReconciliationItem: "storage_reconciliation_item",
        storageGcJob: "storage_gc_job",
        fileSecurityScan: "file_security_scan",
        fileAuditLog: "file_audit_log",
      }),
    );

    for (const tableName of Object.values(SDKWORK_FILE_TABLES)) {
      expect(tableName).toMatch(/^(object|file|drive|storage)_[a-z0-9_]+$/);
      expect(tableName).not.toContain("plus");
      expect(tableName).not.toContain("s3_url");
    }
    expect(Object.values(SDKWORK_FILE_TABLES).some((tableName) => tableName.startsWith("upload_"))).toBe(false);
  });

  it("validates supported upload modes and terminal upload states", () => {
    expect(isSupportedUploadMode("single_put")).toBe(true);
    expect(isSupportedUploadMode("multipart")).toBe(true);
    expect(isSupportedUploadMode("tus_facade")).toBe(true);
    expect(isSupportedUploadMode("server_proxy")).toBe(true);
    expect(isSupportedUploadMode("raw_s3")).toBe(false);

    expect(SDKWORK_FILE_UPLOAD_STATUSES).toEqual([
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
    ]);
    expect(isUploadStatus("uploaded")).toBe(true);
    expect(isUploadStatus("raw_s3")).toBe(false);
    expect(isTerminalUploadStatus("active")).toBe(true);
    expect(isTerminalUploadStatus("aborted")).toBe(true);
    expect(isTerminalUploadStatus("virus_detected")).toBe(true);
    expect(isTerminalUploadStatus("uploading")).toBe(false);
  });

  it("defines canonical status and visibility vocabularies for file platform resources", () => {
    expect(SDKWORK_FILE_VISIBILITIES).toEqual(["private", "restricted", "shared"]);
    expect(SDKWORK_FILE_SLOT_STATUSES).toEqual(["active", "disabled", "draft"]);
    expect(SDKWORK_FILE_BINDING_STATES).toEqual(["active", "deleted", "pending"]);
    expect(SDKWORK_DRIVE_SPACE_STATUSES).toEqual(["active", "archived", "disabled"]);
    expect(SDKWORK_STORAGE_RESOURCE_STATUSES).toEqual(["active", "archived", "disabled"]);
    expect(SDKWORK_STORAGE_JOB_STATUSES).toEqual(["canceled", "completed", "created", "failed", "running"]);
    expect(SDKWORK_STORAGE_QUOTA_RESERVATION_STATUSES).toEqual(["active", "converted", "expired", "released"]);

    expect(isStorageResourceStatus("active")).toBe(true);
    expect(isStorageResourceStatus("unknown")).toBe(false);
    expect(isStorageJobStatus("running")).toBe(true);
    expect(isStorageJobStatus("active")).toBe(false);
  });

  it("defines canonical storage provider types and logical bucket scopes", () => {
    expect(SDKWORK_STORAGE_PROVIDER_TYPES).toEqual([
      "aws_s3",
      "cloudflare_r2",
      "cos_s3",
      "local_dev_s3",
      "minio",
      "oss_s3",
      "s3_compatible",
    ]);
    expect(SDKWORK_STORAGE_BUCKET_LOGICAL_SCOPES).toEqual([
      "migration_import",
      "system_archive",
      "system_quarantine",
      "system_temp",
      "system_variant",
      "tenant_private",
      "tenant_public_asset",
    ]);

    expect(isStorageProviderType("s3_compatible")).toBe(true);
    expect(isStorageProviderType("raw_ftp")).toBe(false);
    expect(isStorageBucketLogicalScope("tenant_private")).toBe(true);
    expect(isStorageBucketLogicalScope("bucket_name")).toBe(false);

    expect(SDKWORK_STORAGE_BUCKET_STORAGE_CLASSES).toEqual([
      "STANDARD",
      "INTELLIGENT_TIERING",
      "STANDARD_IA",
      "ONEZONE_IA",
      "GLACIER_IR",
      "GLACIER",
      "DEEP_ARCHIVE",
    ]);
    expect(SDKWORK_STORAGE_ENCRYPTION_MODES).toEqual(["none", "sse_s3", "sse_kms"]);
    expect(isStorageBucketStorageClass("STANDARD")).toBe(true);
    expect(isStorageBucketStorageClass("custom_class")).toBe(false);
    expect(isStorageEncryptionMode("sse_kms")).toBe(true);
    expect(isStorageEncryptionMode("raw_aes_key")).toBe(false);
  });

  it("normalizes and validates business file slot definitions", () => {
    const slot = createFileSlotDefinition({
      appId: "app-center",
      businessDomain: "apps",
      displayName: "Application icon",
      slotCode: "app.icon",
      allowedMimeTypes: ["image/png", "image/jpeg"],
      maxFileBytes: 5 * 1024 * 1024,
      cardinality: "single",
      ownerScope: "organization",
      quotaAccountScope: "organization",
    });

    expect(normalizeFileSlotDefinition(slot)).toEqual({
      ...slot,
      allowedMimeTypes: ["image/jpeg", "image/png"],
      deniedMimeTypes: [],
      maxCount: 1,
      minCount: 0,
      status: "active",
    });
    expect(validateFileSlotDefinition(slot)).toEqual([]);

    expect(
      validateFileSlotDefinition({
        ...slot,
        allowedMimeTypes: [],
        maxFileBytes: 0,
        slotCode: "Bad Slot",
      }),
    ).toEqual([
      "slot_code_format",
      "allowed_mime_types_required",
      "max_file_bytes_positive",
    ]);
  });

  it("creates stable file references without exposing storage internals", () => {
    const ref = createFileRef({
      bindingId: "bind_01JABC",
      fileId: "file_01JABC",
      purpose: "app.icon",
      versionId: "ver_01JABC",
      visibility: "private",
    });

    expect(isFileRef(ref)).toBe(true);
    expect(ref).not.toHaveProperty("bucket");
    expect(ref).not.toHaveProperty("objectKey");
    expect(ref).not.toHaveProperty("presignedUrl");
    expect(ref).toEqual({
      bindingId: "bind_01JABC",
      fileId: "file_01JABC",
      purpose: "app.icon",
      versionId: "ver_01JABC",
      visibility: "private",
    });

    expect(isFileRef({ ...ref, objectKey: "tenant/raw/key" })).toBe(false);
    expect(isFileRef({ ...ref, presignedUrl: "https://example.invalid" })).toBe(false);
  });

  it("normalizes storage usage snapshots for tenant, organization, user, app, and space accounting", () => {
    expect(SDKWORK_STORAGE_USAGE_SCOPE_TYPES).toEqual([
      "tenant",
      "organization",
      "user",
      "space",
      "app",
      "business_domain",
    ]);
    expect(isStorageUsageScopeType("organization")).toBe(true);
    expect(isStorageUsageScopeType("bucket")).toBe(false);

    const usage = createStorageUsageSnapshot({
      fileCount: 4,
      objectCount: 5,
      quotaLimitBytes: 10 * 1024 * 1024,
      requestId: "req-usage",
      retainedBytes: 1024,
      scopeId: "org_1",
      scopeType: "organization",
      trashBytes: 256,
      usedBillableBytes: 3 * 1024 * 1024,
      usedLogicalBytes: 2 * 1024 * 1024,
      usedPhysicalBytes: 4 * 1024 * 1024,
      variantBytes: 128,
      versionCount: 6,
    });

    expect(usage).toEqual({
      fileCount: 4,
      objectCount: 5,
      quotaLimitBytes: 10485760,
      requestId: "req-usage",
      retainedBytes: 1024,
      scopeId: "org_1",
      scopeType: "organization",
      trashBytes: 256,
      usedBillableBytes: 3145728,
      usedLogicalBytes: 2097152,
      usedPhysicalBytes: 4194304,
      variantBytes: 128,
      versionCount: 6,
    });
    expect(usage).not.toHaveProperty("bucket");
    expect(usage).not.toHaveProperty("objectKey");
    expect(usage).not.toHaveProperty("presignedUrl");

    expect(() =>
      createStorageUsageSnapshot({
        requestId: "req-bad",
        scopeId: "org_1",
        scopeType: "organization",
        usedBillableBytes: -1,
        usedLogicalBytes: 1,
        usedPhysicalBytes: 1,
      }),
    ).toThrow("Storage usage bytes must be non-negative.");
  });

  it("normalizes drive spaces and nodes as storage-safe business resources", () => {
    expect(SDKWORK_DRIVE_SPACE_TYPES).toEqual([
      "user_drive",
      "organization_drive",
      "team_drive",
      "project_drive",
      "app_drive",
      "system_library",
      "shared_drive",
      "trash_space",
    ]);
    expect(SDKWORK_DRIVE_NODE_TYPES).toEqual([
      "root",
      "folder",
      "file",
      "shortcut",
      "mount",
      "external_link",
    ]);

    const space = createDriveSpace({
      name: " Organization Files ",
      organizationId: "org_1",
      rootNodeId: "node_root",
      spaceId: "space_org_1",
      type: "organization_drive",
    });
    const folder = createDriveNode({
      depth: 1,
      name: " Course Assets ",
      nodeId: "node_folder",
      nodeType: "folder",
      parentNodeId: "node_root",
      spaceId: "space_org_1",
    });
    const file = createDriveNode({
      depth: 2,
      fileId: "file_1",
      mimeType: "application/pdf",
      name: "Syllabus.pdf",
      nodeId: "node_file",
      nodeType: "file",
      parentNodeId: folder.nodeId,
      sizeBytes: 2048,
      spaceId: "space_org_1",
      updatedAt: "2026-05-23T08:00:00.000Z",
    });

    expect(space).toEqual({
      name: "Organization Files",
      organizationId: "org_1",
      rootNodeId: "node_root",
      spaceId: "space_org_1",
      status: "active",
      type: "organization_drive",
    });
    expect(folder.pathSegment).toBe("course-assets");
    expect(file).toEqual({
      depth: 2,
      fileId: "file_1",
      mimeType: "application/pdf",
      name: "Syllabus.pdf",
      nodeId: "node_file",
      nodeType: "file",
      parentNodeId: "node_folder",
      pathSegment: "syllabus-pdf",
      sizeBytes: 2048,
      spaceId: "space_org_1",
      trashed: false,
      updatedAt: "2026-05-23T08:00:00.000Z",
    });
    expect(isDriveSpace(space)).toBe(true);
    expect(isDriveNode(file)).toBe(true);
    expect(isDriveNode({ ...file, objectKey: "tenant/raw/key" })).toBe(false);
    expect(() =>
      createDriveNode({
        depth: 1,
        name: "Broken file",
        nodeId: "node_bad",
        nodeType: "file",
        spaceId: "space_org_1",
      }),
    ).toThrow("Drive file nodes require fileId.");
  });
});
