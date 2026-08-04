import { describe, expect, it } from "vitest";

import { createDriveNode, createDriveSpace, createFileRef } from "../../sdkwork-file-contracts/src/index";
import {
  SDKWORK_ADMIN_STORAGE_BUCKET_CONFIGURATION_FIELDS,
  SDKWORK_ADMIN_STORAGE_PROVIDER_CONFIGURATION_FIELDS,
  SDKWORK_FILE_PORT_GROUPS,
  createInMemoryFileUploadPort,
  createUnsupportedFilePlatformPorts,
  type CompleteUploadInput,
  type FilePlatformPorts,
  type FileUploadPort,
  type StorageUsagePort,
  type UploadFileInput,
} from "../src/index";

describe("SDKWork file SDK ports", () => {
  it("declares composable port groups for app and admin file platform work", () => {
    expect(SDKWORK_FILE_PORT_GROUPS).toEqual([
      "upload",
      "binding",
      "access",
      "drive",
      "usage",
      "adminStorage",
    ]);
  });

  it("declares explicit admin storage configuration input fields for business composition", () => {
    expect(SDKWORK_ADMIN_STORAGE_PROVIDER_CONFIGURATION_FIELDS).toEqual([
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
    ]);
    expect(SDKWORK_ADMIN_STORAGE_BUCKET_CONFIGURATION_FIELDS).toEqual([
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
    ]);
  });

  it("defines upload port contracts without exposing provider internals to callers", async () => {
    const uploads: UploadFileInput[] = [];
    const completions: CompleteUploadInput[] = [];
    const uploadPort: FileUploadPort = {
      async abortUpload(input) {
        return { requestId: input.requestId, sessionId: input.sessionId, status: "aborted" };
      },
      async completeUpload(input) {
        completions.push(input);
        return {
          fileRef: createFileRef({
            fileId: "file_01J",
            purpose: input.purpose,
            visibility: "private",
          }),
          requestId: input.requestId,
          sessionId: input.sessionId,
          status: "active",
        };
      },
      async uploadFile(input) {
        uploads.push(input);
        return {
          driveNodeId: "node_01J",
          driveSpaceId: "space_01J",
          driveUri: "drive://spaces/space_01J/nodes/node_01J",
          fileRef: createFileRef({
            displayName: input.filename,
            fileId: "node_01J",
            purpose: input.purpose,
            visibility: "private",
          }),
          requestId: input.requestId,
          status: "active",
          uploadId: "upload_01J",
        };
      },
    };

    const uploaded = await uploadPort.uploadFile({
      appId: "app-center",
      appResourceId: "app_1",
      appResourceType: "app",
      checksum: { algorithm: "sha256", value: "abc" },
      contentType: "image/png",
      file: createTestFile("icon.png", "image/png", 1024),
      filename: "icon.png",
      idempotencyKey: "idem-1",
      purpose: "app.icon",
      requestId: "req-1",
      sizeBytes: 1024,
      target: { id: "app_1", type: "app" },
      tenantId: "tenant_1",
      uploadProfileCode: "image",
    });

    expect(uploaded).toEqual({
      driveNodeId: "node_01J",
      driveSpaceId: "space_01J",
      driveUri: "drive://spaces/space_01J/nodes/node_01J",
      fileRef: {
        displayName: "icon.png",
        fileId: "node_01J",
        purpose: "app.icon",
        visibility: "private",
      },
      requestId: "req-1",
      status: "active",
      uploadId: "upload_01J",
    });
    expect(uploaded).not.toHaveProperty("bucket");
    expect(uploaded).not.toHaveProperty("objectKey");

    const completed = await uploadPort.completeUpload({
      checksum: { algorithm: "sha256", value: "abc" },
      idempotencyKey: "complete-1",
      purpose: "app.icon",
      requestId: "req-2",
      sessionId: "upl_legacy",
    });

    expect(completed.fileRef).toEqual({
      fileId: "file_01J",
      purpose: "app.icon",
      visibility: "private",
    });
    expect(uploads).toHaveLength(1);
    expect(completions).toHaveLength(1);
  });

  it("provides explicit unsupported port defaults for dependency injection safety", async () => {
    const ports = createUnsupportedFilePlatformPorts();
    await expect(
      ports.upload.uploadFile({
        appId: "app-center",
        appResourceId: "app_1",
        appResourceType: "app",
        contentType: "image/png",
        file: createTestFile("icon.png", "image/png", 1),
        filename: "icon.png",
        idempotencyKey: "idem",
        purpose: "app.icon",
        requestId: "req",
        sizeBytes: 1,
        target: { id: "app_1", type: "app" },
        tenantId: "tenant_1",
      }),
    ).rejects.toThrow("file platform port upload.uploadFile is not configured");
    await expect(
      ports.adminStorage.updateProvider({
        providerId: "provider_1",
        reason: "disable unhealthy provider",
        requestId: "req-provider-update",
        status: "disabled",
      }),
    ).rejects.toThrow("file platform port adminStorage.updateProvider is not configured");
    await expect(
      ports.adminStorage.updateBucket({
        bucketId: "bucket_1",
        reason: "archive migrated bucket",
        requestId: "req-bucket-update",
        status: "archived",
      }),
    ).rejects.toThrow("file platform port adminStorage.updateBucket is not configured");
    await expect(
      ports.adminStorage.healthCheckProvider({
        providerId: "provider_1",
        requestId: "req-provider-health",
      }),
    ).rejects.toThrow("file platform port adminStorage.healthCheckProvider is not configured");
    await expect(
      ports.adminStorage.setDefaultBucket({
        bucketId: "bucket_1",
        logicalScope: "tenant_private",
        reason: "route uploads to verified bucket",
        requestId: "req-default-bucket",
      }),
    ).rejects.toThrow("file platform port adminStorage.setDefaultBucket is not configured");
  });

  it("offers an in-memory upload test port for service tests without raw HTTP", async () => {
    const port = createInMemoryFileUploadPort();
    const uploaded = await port.uploadFile({
      appId: "app-center",
      appResourceId: "app_1",
      appResourceType: "app",
      contentType: "image/png",
      file: createTestFile("icon.png", "image/png", 1),
      filename: "icon.png",
      idempotencyKey: "idem",
      purpose: "app.icon",
      requestId: "req-create",
      sizeBytes: 1,
      target: { id: "app_1", type: "app" },
      tenantId: "tenant_1",
    });

    expect(uploaded.driveUri).toMatch(/^drive:\/\/spaces\/space_memory\/nodes\/node_/);
    expect(uploaded.fileRef.fileId).toMatch(/^node_/);
    expect(uploaded.fileRef.purpose).toBe("app.icon");
  });

  it("uses explicit idempotency keys for quota reservation ports", async () => {
    const seenIdempotencyKeys: string[] = [];
    const usagePort: StorageUsagePort = {
      async getCurrentUsage() {
        throw new Error("not needed");
      },
      async releaseUploadQuota(input) {
        return { released: true, requestId: input.requestId, reservationId: input.reservationId };
      },
      async reserveUploadQuota(input) {
        seenIdempotencyKeys.push(input.idempotencyKey);
        return {
          expiresAt: "2026-05-23T08:10:00.000Z",
          requestId: input.requestId,
          reservationId: "quota_1",
        };
      },
    };

    await expect(
      usagePort.reserveUploadQuota({
        billableBytes: 1024,
        idempotencyKey: "quota-reserve-upl-1",
        requestId: "req-reserve",
        scopeId: "org_1",
        scopeType: "organization",
      }),
    ).resolves.toEqual({
      expiresAt: "2026-05-23T08:10:00.000Z",
      requestId: "req-reserve",
      reservationId: "quota_1",
    });
    expect(seenIdempotencyKeys).toEqual(["quota-reserve-upl-1"]);
  });

  it("keeps the full platform port bundle structurally explicit", () => {
    const ports: FilePlatformPorts = createUnsupportedFilePlatformPorts();
    expect(Object.keys(ports)).toEqual(["access", "adminStorage", "binding", "drive", "upload", "usage"]);
    expect(Object.keys(ports.access)).toEqual(["getFile", "issueDownloadUrl", "issuePreviewUrl", "listFiles"]);
    expect(Object.keys(ports.adminStorage)).toEqual([
      "createProvider",
      "updateProvider",
      "createBucket",
      "updateBucket",
      "createQuotaPolicy",
      "createReconciliationRun",
      "createGarbageCollectionJob",
      "healthCheckProvider",
      "listProviders",
      "listBuckets",
      "listDefaultBuckets",
      "listQuotaPolicies",
      "listReconciliationRuns",
      "listUsageCounters",
      "listUsageLedger",
      "listUsageSnapshots",
      "setDefaultBucket",
    ]);
    expect(Object.keys(ports.drive)).toEqual(["listNodes", "listSpaces"]);
    expect(Object.keys(ports.usage)).toEqual(["getCurrentUsage", "releaseUploadQuota", "reserveUploadQuota"]);
  });

  it("defines backend storage governance ports for provider and bucket status changes", async () => {
    const ports: FilePlatformPorts = {
      ...createUnsupportedFilePlatformPorts(),
      adminStorage: {
        ...createUnsupportedFilePlatformPorts().adminStorage,
        async updateBucket(input) {
          return {
            bucket: {
              bucketId: input.bucketId,
              reason: input.reason,
              status: input.status,
            },
            requestId: input.requestId,
          };
        },
        async updateProvider(input) {
          return {
            provider: {
              providerId: input.providerId,
              reason: input.reason,
              status: input.status,
            },
            requestId: input.requestId,
          };
        },
      },
    };

    await expect(
      ports.adminStorage.updateProvider({
        providerId: "provider_1",
        reason: "temporarily drain uploads",
        requestId: "req-update-provider",
        status: "disabled",
      }),
    ).resolves.toEqual({
      provider: {
        providerId: "provider_1",
        reason: "temporarily drain uploads",
        status: "disabled",
      },
      requestId: "req-update-provider",
    });
    await expect(
      ports.adminStorage.updateBucket({
        bucketId: "bucket_1",
        reason: "migration completed",
        requestId: "req-update-bucket",
        status: "archived",
      }),
    ).resolves.toEqual({
      bucket: {
        bucketId: "bucket_1",
        reason: "migration completed",
        status: "archived",
      },
      requestId: "req-update-bucket",
    });
  });

  it("defines backend storage administration ports for usage counters, ledger, and snapshots", async () => {
    const ports: FilePlatformPorts = {
      ...createUnsupportedFilePlatformPorts(),
      adminStorage: {
        async createBucket(input) {
          return { bucket: { bucketName: input.bucketName }, requestId: input.requestId };
        },
        async createGarbageCollectionJob(input) {
          return { job: { jobType: input.jobType }, requestId: input.requestId };
        },
        async createProvider(input) {
          return { provider: { providerCode: input.providerCode }, requestId: input.requestId };
        },
        async createQuotaPolicy(input) {
          return { quotaPolicy: { scopeId: input.scopeId }, requestId: input.requestId };
        },
        async createReconciliationRun(input) {
          return { reconciliationRun: { runType: input.runType }, requestId: input.requestId };
        },
        async listProviders(input) {
          return { items: [], requestId: input.requestId };
        },
        async listDefaultBuckets(input) {
          return { items: [], requestId: input.requestId };
        },
        async listQuotaPolicies(input) {
          return { items: [], requestId: input.requestId };
        },
        async setDefaultBucket(input) {
          return {
            defaultBucket: {
              bucketId: input.bucketId,
              logicalScope: input.logicalScope,
            },
            requestId: input.requestId,
          };
        },
        async listUsageCounters(input) {
          return {
            items: [{ scopeId: input.scopeId, scopeType: input.scopeType, usedLogicalBytes: 4096 }],
            requestId: input.requestId,
          };
        },
        async listUsageLedger(input) {
          return {
            items: [{ idempotencyKey: "usage-ledger-1", scopeId: input.scopeId }],
            nextCursor: "ledger-cursor-2",
            requestId: input.requestId,
          };
        },
        async listUsageSnapshots(input) {
          return {
            items: [{ periodStartAt: input.periodStartAt, scopeId: input.scopeId, snapshotType: input.snapshotType }],
            nextCursor: "snapshot-cursor-2",
            requestId: input.requestId,
          };
        },
      },
    };

    await expect(
      ports.adminStorage.listUsageCounters({
        requestId: "req-usage",
        scopeId: "org_1",
        scopeType: "organization",
      }),
    ).resolves.toEqual({
      items: [{ scopeId: "org_1", scopeType: "organization", usedLogicalBytes: 4096 }],
      requestId: "req-usage",
    });
    await expect(
      ports.adminStorage.listUsageLedger({
        cursor: "ledger-cursor-1",
        requestId: "req-ledger",
        scopeId: "org_1",
        scopeType: "organization",
      }),
    ).resolves.toEqual({
      items: [{ idempotencyKey: "usage-ledger-1", scopeId: "org_1" }],
      nextCursor: "ledger-cursor-2",
      requestId: "req-ledger",
    });
    await expect(
      ports.adminStorage.listUsageSnapshots({
        periodStartAt: "2026-05-23T00:00:00.000Z",
        requestId: "req-snapshots",
        scopeId: "org_1",
        scopeType: "organization",
        snapshotType: "daily",
      }),
    ).resolves.toEqual({
      items: [{ periodStartAt: "2026-05-23T00:00:00.000Z", scopeId: "org_1", snapshotType: "daily" }],
      nextCursor: "snapshot-cursor-2",
      requestId: "req-snapshots",
    });
  });

  it("defines backend storage configuration command ports for providers, buckets, and quota policies", async () => {
    const ports: FilePlatformPorts = {
      ...createUnsupportedFilePlatformPorts(),
      adminStorage: {
        async createBucket(input) {
          return {
            bucket: {
              bucketName: input.bucketName,
              bucketRegion: input.bucketRegion,
              dataResidencyRegion: input.dataResidencyRegion,
              defaultEncryptionMode: input.defaultEncryptionMode,
              defaultStorageClass: input.defaultStorageClass,
              kmsKeyRef: input.kmsKeyRef,
              lifecycleEnabled: input.lifecycleEnabled,
              logicalScope: input.logicalScope,
              objectKeyPrefix: input.objectKeyPrefix,
              objectLockEnabled: input.objectLockEnabled,
              providerId: input.providerId,
              publicAccessBlocked: input.publicAccessBlocked,
              versioningEnabled: input.versioningEnabled,
            },
            requestId: input.requestId,
          };
        },
        async createGarbageCollectionJob(input) {
          return { job: { jobType: input.jobType }, requestId: input.requestId };
        },
        async createProvider(input) {
          return {
            provider: {
              credentialRef: input.credentialRef,
              endpointUrl: input.endpointUrl,
              pathStyleEnabled: input.pathStyleEnabled,
              providerCode: input.providerCode,
              providerType: input.providerType,
              region: input.region,
              supportsLifecycle: input.supportsLifecycle,
              supportsMultipart: input.supportsMultipart,
              supportsObjectLock: input.supportsObjectLock,
            },
            requestId: input.requestId,
          };
        },
        async createQuotaPolicy(input) {
          return {
            quotaPolicy: {
              quotaLimitBytes: input.quotaLimitBytes,
              scopeId: input.scopeId,
              scopeType: input.scopeType,
              singleFileLimitBytes: input.singleFileLimitBytes,
            },
            requestId: input.requestId,
          };
        },
        async createReconciliationRun(input) {
          return { reconciliationRun: { runType: input.runType }, requestId: input.requestId };
        },
        async listBuckets(input) {
          return { items: [], requestId: input.requestId };
        },
        async listDefaultBuckets(input) {
          return {
            items: [{ bucketId: "bucket_1", logicalScope: input.logicalScope ?? "tenant_private" }],
            requestId: input.requestId,
          };
        },
        async listProviders(input) {
          return { items: [], requestId: input.requestId };
        },
        async listQuotaPolicies(input) {
          return { items: [], requestId: input.requestId };
        },
        async listReconciliationRuns(input) {
          return { items: [], requestId: input.requestId };
        },
        async listUsageCounters(input) {
          return { items: [], requestId: input.requestId };
        },
        async listUsageLedger(input) {
          return { items: [], requestId: input.requestId };
        },
        async listUsageSnapshots(input) {
          return { items: [], requestId: input.requestId };
        },
        async setDefaultBucket(input) {
          return {
            defaultBucket: {
              bucketId: input.bucketId,
              logicalScope: input.logicalScope,
            },
            requestId: input.requestId,
          };
        },
      },
    };

    await expect(
      ports.adminStorage.createProvider({
        credentialRef: "secret/storage/primary",
        endpointUrl: "https://s3.us-east-1.example.test",
        idempotencyKey: "provider-primary-s3",
        pathStyleEnabled: true,
        providerCode: "primary-s3",
        providerType: "s3_compatible",
        region: "us-east-1",
        requestId: "req-provider",
        supportsLifecycle: true,
        supportsMultipart: true,
        supportsObjectLock: false,
      }),
    ).resolves.toEqual({
      provider: {
        credentialRef: "secret/storage/primary",
        endpointUrl: "https://s3.us-east-1.example.test",
        pathStyleEnabled: true,
        providerCode: "primary-s3",
        providerType: "s3_compatible",
        region: "us-east-1",
        supportsLifecycle: true,
        supportsMultipart: true,
        supportsObjectLock: false,
      },
      requestId: "req-provider",
    });
    await expect(
      ports.adminStorage.createBucket({
        bucketName: "tenant-private",
        bucketRegion: "us-east-1",
        dataResidencyRegion: "us-east-1",
        defaultEncryptionMode: "sse_kms",
        defaultStorageClass: "STANDARD",
        idempotencyKey: "bucket-tenant-private",
        kmsKeyRef: "kms/storage/private",
        lifecycleEnabled: true,
        logicalScope: "tenant_private",
        objectKeyPrefix: "tenants/private/",
        objectLockEnabled: false,
        providerId: "provider_1",
        publicAccessBlocked: true,
        requestId: "req-bucket",
        versioningEnabled: true,
      }),
    ).resolves.toEqual({
      bucket: {
        bucketName: "tenant-private",
        bucketRegion: "us-east-1",
        dataResidencyRegion: "us-east-1",
        defaultEncryptionMode: "sse_kms",
        defaultStorageClass: "STANDARD",
        kmsKeyRef: "kms/storage/private",
        lifecycleEnabled: true,
        logicalScope: "tenant_private",
        objectKeyPrefix: "tenants/private/",
        objectLockEnabled: false,
        providerId: "provider_1",
        publicAccessBlocked: true,
        versioningEnabled: true,
      },
      requestId: "req-bucket",
    });
    await expect(
      ports.adminStorage.listDefaultBuckets({
        logicalScope: "tenant_private",
        requestId: "req-default-buckets",
      }),
    ).resolves.toEqual({
      items: [{ bucketId: "bucket_1", logicalScope: "tenant_private" }],
      requestId: "req-default-buckets",
    });
    await expect(
      ports.adminStorage.setDefaultBucket({
        bucketId: "bucket_1",
        logicalScope: "tenant_private",
        reason: "primary private upload route",
        requestId: "req-set-default-bucket",
      }),
    ).resolves.toEqual({
      defaultBucket: {
        bucketId: "bucket_1",
        logicalScope: "tenant_private",
      },
      requestId: "req-set-default-bucket",
    });
    await expect(
      ports.adminStorage.createQuotaPolicy({
        idempotencyKey: "quota-org-1",
        quotaLimitBytes: 10 * 1024 * 1024 * 1024,
        requestId: "req-quota",
        scopeId: "org_1",
        scopeType: "organization",
        singleFileLimitBytes: 100 * 1024 * 1024,
      }),
    ).resolves.toEqual({
      quotaPolicy: {
        quotaLimitBytes: 10 * 1024 * 1024 * 1024,
        scopeId: "org_1",
        scopeType: "organization",
        singleFileLimitBytes: 100 * 1024 * 1024,
      },
      requestId: "req-quota",
    });
  });

  it("defines backend storage governance ports for buckets, reconciliation, and garbage collection", async () => {
    const ports: FilePlatformPorts = {
      ...createUnsupportedFilePlatformPorts(),
      adminStorage: {
        async createBucket(input) {
          return { bucket: { bucketName: input.bucketName }, requestId: input.requestId };
        },
        async createGarbageCollectionJob(input) {
          return {
            job: {
              dryRun: input.dryRun,
              jobType: input.jobType,
              status: "created",
            },
            requestId: input.requestId,
          };
        },
        async createProvider(input) {
          return { provider: { providerCode: input.providerCode }, requestId: input.requestId };
        },
        async createQuotaPolicy(input) {
          return { quotaPolicy: { scopeId: input.scopeId }, requestId: input.requestId };
        },
        async createReconciliationRun(input) {
          return {
            reconciliationRun: {
              dryRun: input.dryRun,
              runType: input.runType,
              status: "created",
            },
            requestId: input.requestId,
          };
        },
        async listBuckets(input) {
          return {
            items: [{ bucketName: "tenant-private", logicalScope: input.logicalScope }],
            requestId: input.requestId,
          };
        },
        async listDefaultBuckets(input) {
          return {
            items: [{ bucketId: "bucket_1", logicalScope: input.logicalScope ?? "tenant_private" }],
            requestId: input.requestId,
          };
        },
        async listProviders(input) {
          return { items: [], requestId: input.requestId };
        },
        async listQuotaPolicies(input) {
          return { items: [], requestId: input.requestId };
        },
        async listReconciliationRuns(input) {
          return {
            items: [{ runType: input.runType, status: input.status }],
            nextCursor: "reconciliation-cursor-2",
            requestId: input.requestId,
          };
        },
        async listUsageCounters(input) {
          return { items: [], requestId: input.requestId };
        },
        async listUsageLedger(input) {
          return { items: [], requestId: input.requestId };
        },
        async listUsageSnapshots(input) {
          return { items: [], requestId: input.requestId };
        },
        async setDefaultBucket(input) {
          return {
            defaultBucket: {
              bucketId: input.bucketId,
              logicalScope: input.logicalScope,
            },
            requestId: input.requestId,
          };
        },
      },
    };

    await expect(
      ports.adminStorage.listBuckets({
        logicalScope: "tenant_private",
        requestId: "req-buckets",
      }),
    ).resolves.toEqual({
      items: [{ bucketName: "tenant-private", logicalScope: "tenant_private" }],
      requestId: "req-buckets",
    });
    await expect(
      ports.adminStorage.listReconciliationRuns({
        requestId: "req-runs",
        runType: "inventory",
        status: "completed",
      }),
    ).resolves.toEqual({
      items: [{ runType: "inventory", status: "completed" }],
      nextCursor: "reconciliation-cursor-2",
      requestId: "req-runs",
    });
    await expect(
      ports.adminStorage.createReconciliationRun({
        dryRun: true,
        idempotencyKey: "reconcile-inventory-1",
        requestId: "req-create-run",
        runType: "inventory",
      }),
    ).resolves.toEqual({
      reconciliationRun: { dryRun: true, runType: "inventory", status: "created" },
      requestId: "req-create-run",
    });
    await expect(
      ports.adminStorage.createGarbageCollectionJob({
        dryRun: true,
        idempotencyKey: "gc-1",
        jobType: "orphan_objects",
        requestId: "req-gc",
      }),
    ).resolves.toEqual({
      job: { dryRun: true, jobType: "orphan_objects", status: "created" },
      requestId: "req-gc",
    });
  });

  it("types drive ports with standard spaces and nodes instead of storage internals", async () => {
    const ports = createUnsupportedFilePlatformPorts();
    const drive: FilePlatformPorts["drive"] = {
      ...ports.drive,
      async listNodes(input) {
        return {
          items: [
            createDriveNode({
              depth: 1,
              fileId: "file_1",
              name: "Course Notes.pdf",
              nodeId: "node_file",
              nodeType: "file",
              parentNodeId: input.parentNodeId,
              sizeBytes: 4096,
              spaceId: input.spaceId,
            }),
          ],
          nextCursor: "cursor_2",
          requestId: input.requestId,
        };
      },
      async listSpaces(input) {
        return {
          items: [
            createDriveSpace({
              name: "Organization Files",
              organizationId: "org_1",
              spaceId: "space_org",
              type: "organization_drive",
            }),
          ],
          requestId: input.requestId,
        };
      },
    };

    const spaces = await drive.listSpaces({ requestId: "req-spaces" });
    const nodes = await drive.listNodes({
      parentNodeId: "node_root",
      requestId: "req-nodes",
      spaceId: spaces.items[0].spaceId,
    });

    expect(spaces.items[0].type).toBe("organization_drive");
    expect(nodes.items[0].nodeType).toBe("file");
    expect(nodes.items[0]).not.toHaveProperty("bucket");
    expect(nodes.items[0]).not.toHaveProperty("objectKey");
  });
});

function createTestFile(name: string, type: string, size: number): Blob & { name: string } {
  return Object.assign(new Blob([new Uint8Array(size)], { type }), { name });
}
