import { describe, expect, it } from "vitest";

import { SDKWORK_FILE_APP_OPENAPI, SDKWORK_FILE_BACKEND_OPENAPI } from "../../sdkwork-file-api-contracts/src/index";
import { createFileSlotDefinition } from "../../sdkwork-file-contracts/src/index";
import type { FilePlatformService } from "../../sdkwork-file-service/src/index";
import {
  SDKWORK_FILE_SDK_ADAPTER_METHODS,
  createFileAdminStoragePortFromBackendSdkClient,
  createFilePlatformServiceFromSdkClient,
  isFileSdkAdapterError,
  validateFileSdkAdapterStandard,
  type SdkworkFileAppSdkClient,
  type SdkworkFileBackendSdkClient,
  type SdkworkFileDriveUploaderClient,
} from "../src/index";

const iconSlot = createFileSlotDefinition({
  allowedMimeTypes: ["image/png"],
  appId: "app-center",
  businessDomain: "apps",
  cardinality: "single",
  displayName: "App icon",
  maxFileBytes: 5 * 1024 * 1024,
  ownerScope: "organization",
  quotaAccountScope: "organization",
  slotCode: "app.icon",
});

describe("SDKWork file SDK adapter", () => {
  it("defines a generated-SDK adapter manifest aligned with canonical OpenAPI operations", () => {
    const openApiOperationIds = new Set([
      ...collectOperationIds(SDKWORK_FILE_APP_OPENAPI),
      ...collectOperationIds(SDKWORK_FILE_BACKEND_OPENAPI),
    ]);

    expect(SDKWORK_FILE_SDK_ADAPTER_METHODS.map((entry) => entry.serviceMethod)).toEqual(
      expect.arrayContaining([
        "listFiles",
        "bindFile",
        "listDriveSpaces",
        "getStorageUsage",
        "listDefaultBuckets",
        "setDefaultBucket",
        "listReconciliationRuns",
        "createReconciliationRun",
        "createGarbageCollectionJob",
        "createQuotaPolicy",
      ]),
    );
    expect(SDKWORK_FILE_SDK_ADAPTER_METHODS.map((entry) => entry.serviceMethod)).not.toEqual(
      expect.arrayContaining([
        `create${"UploadSession"}`,
        "completeUpload",
        `presign${"UploadPart"}`,
      ]),
    );
    for (const entry of SDKWORK_FILE_SDK_ADAPTER_METHODS) {
      expect(openApiOperationIds.has(entry.operationId)).toBe(true);
      expect(entry).not.toHaveProperty("path");
      expect(entry).not.toHaveProperty("httpMethod");
      if (entry.surface === "backend") {
        expect(entry.clientMethod).toMatch(/^oss\./);
        expect(entry.clientMethod).not.toMatch(/^storage[A-Z]/);
      }
    }
    expect(validateFileSdkAdapterStandard()).toEqual([]);
  });

  it("reports adapter command mappings whose OpenAPI operation lacks a JSON request body", () => {
    const withoutBindingRequestBody = {
      ...SDKWORK_FILE_APP_OPENAPI,
      paths: {
        ...SDKWORK_FILE_APP_OPENAPI.paths,
        "/app/v3/api/file_bindings": {
          ...SDKWORK_FILE_APP_OPENAPI.paths["/app/v3/api/file_bindings"],
          post: {
            ...SDKWORK_FILE_APP_OPENAPI.paths["/app/v3/api/file_bindings"].post,
            requestBody: undefined,
          },
        },
      },
    };

    expect(validateFileSdkAdapterStandard(withoutBindingRequestBody, SDKWORK_FILE_BACKEND_OPENAPI)).toContain(
      "missing_command_request_body:app:bindFile",
    );
  });

  it("reports adapter mappings whose OpenAPI operation lacks a typed JSON response body", () => {
    const withoutListFilesResponse = {
      ...SDKWORK_FILE_APP_OPENAPI,
      paths: {
        ...SDKWORK_FILE_APP_OPENAPI.paths,
        "/app/v3/api/files": {
          ...SDKWORK_FILE_APP_OPENAPI.paths["/app/v3/api/files"],
          get: {
            ...SDKWORK_FILE_APP_OPENAPI.paths["/app/v3/api/files"].get,
            responses: {
              ...SDKWORK_FILE_APP_OPENAPI.paths["/app/v3/api/files"].get?.responses,
              "200": {
                description: "Request completed.",
              },
            },
          },
        },
      },
    };

    expect(validateFileSdkAdapterStandard(withoutListFilesResponse, SDKWORK_FILE_BACKEND_OPENAPI)).toContain(
      "missing_operation_response_body:app:listFiles",
    );
  });

  it("creates a component-facing file service facade from an approved app SDK wrapper", async () => {
    const events: string[] = [];
    const service = createFilePlatformServiceFromSdkClient({
      app: createRecordingAppSdk(events),
      drive: createRecordingDriveSdk(events),
      slots: [iconSlot],
    });

    expect(service.getSlot("app.icon")).toEqual(iconSlot);

    const uploaded = await service.uploadFile({
      contentType: "image/png",
      file: createTestFile("icon.png", "image/png", 1024),
      filename: "icon.png",
      idempotencyKey: "idem-create",
      organizationId: "org_1",
      requestId: "req-create",
      sizeBytes: 1024,
      slotCode: "app.icon",
      target: { id: "app_1", type: "app" },
      tenantId: "tenant_1",
      userId: "user_1",
    });
    const files = await service.listFiles({
      purpose: "app.icon",
      requestId: "req-files",
      target: { id: "app_1", type: "app" },
    });
    const binding = await service.bindFile({
      fileId: "file_1",
      requestId: "req-bind",
      slotCode: "app.icon",
      target: { id: "app_1", type: "app" },
    });
    const usage = await service.getStorageUsage({
      requestId: "req-usage",
      scopeId: "org_1",
      scopeType: "organization",
    });

    expect(uploaded).toEqual({
      driveNodeId: "node_drive_1",
      driveSpaceId: "space_drive_1",
      driveUri: "drive://spaces/space_drive_1/nodes/node_drive_1",
      fileRef: {
        displayName: "icon.png",
        fileId: "node_drive_1",
        purpose: "app.icon",
        visibility: "private",
      },
      requestId: "req-create",
      slotCode: "app.icon",
      status: "active",
      uploadId: "upload_item_1",
    });
    expect(uploaded).not.toHaveProperty("quotaReservationId");
    expect(files.items[0]).not.toHaveProperty("objectKey");
    expect(binding.fileRef).not.toHaveProperty("bucket");
    expect(usage.usedLogicalBytes).toBe(1024);
    expect(events).toEqual([
      "driveUploader.uploadByProfile:image:app:app_1:icon.png",
      "filesList:app.icon:app_1",
      "fileBindingsList:app.icon:app_1",
      "fileBindingsCreate:app.icon:app_1",
      "storageUsageRetrieve:organization:org_1",
    ]);
  });

  it("creates backend admin storage ports from an approved backend SDK wrapper", async () => {
    const events: string[] = [];
    const port = createFileAdminStoragePortFromBackendSdkClient(createRecordingBackendSdk(events));

    await expect(port.listQuotaPolicies({ requestId: "req-quotas" })).resolves.toEqual({
      items: [{ policyCode: "org-standard", scopeType: "organization" }],
      requestId: "req-quotas",
    });
    await expect(port.listDefaultBuckets({ logicalScope: "tenant_private", requestId: "req-default-buckets" })).resolves.toEqual({
      items: [
        {
          bucketId: "bucket_1",
          bucketName: "tenant-private",
          logicalScope: "tenant_private",
          providerCode: "primary-s3",
          providerId: "provider_1",
          providerType: "aws_s3",
          status: "active",
        },
      ],
      requestId: "req-default-buckets",
    });
    await expect(
      port.setDefaultBucket({
        bucketId: "bucket_1",
        logicalScope: "tenant_private",
        reason: "primary private upload route",
        requestId: "req-set-default-bucket",
      }),
    ).resolves.toEqual({
      defaultBucket: {
        bucketId: "bucket_1",
        bucketName: "tenant-private",
        logicalScope: "tenant_private",
        providerCode: "primary-s3",
        providerId: "provider_1",
        providerType: "aws_s3",
        status: "active",
      },
      requestId: "req-set-default-bucket",
    });
    await expect(
      port.createQuotaPolicy({
        idempotencyKey: "quota-org-1",
        quotaLimitBytes: 10 * 1024 * 1024 * 1024,
        requestId: "req-create-quota",
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
      requestId: "req-create-quota",
    });
    await expect(
      port.listUsageCounters({
        requestId: "req-usage",
        scopeId: "org_1",
        scopeType: "organization",
      }),
    ).resolves.toEqual({
      items: [{ scopeId: "org_1", usedLogicalBytes: 2048 }],
      requestId: "req-usage",
    });
    await expect(
      port.listReconciliationRuns({
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
      port.createReconciliationRun({
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
      port.createGarbageCollectionJob({
        dryRun: true,
        idempotencyKey: "gc-1",
        jobType: "orphan_objects",
        requestId: "req-gc",
      }),
    ).resolves.toEqual({
      job: { dryRun: true, jobType: "orphan_objects", status: "created" },
      requestId: "req-gc",
    });
    expect(events).toEqual([
      "oss.quotas.list",
      "oss.defaultBuckets.list:tenant_private",
      "oss.defaultBuckets.update:tenant_private:bucket_1:req-set-default-bucket",
      "oss.quotas.create:organization:org_1:quota-org-1:req-create-quota",
      "oss.usage.list:organization:org_1",
      "oss.reconciliationRuns.list:inventory:completed",
      "oss.reconciliationRuns.create:inventory:true:reconcile-inventory-1:req-create-run",
      "oss.gcJobs.create:orphan_objects:true:gc-1:req-gc",
    ]);
  });

  it("normalizes SDK operation failures and redacts short-lived URLs", async () => {
    const app = createRecordingAppSdk([]);
    app.filesRetrieve = async () => {
      throw new Error("provider failed for https://s3.example.test/private/object?X-Amz-Signature=secret");
    };
    const service = createFilePlatformServiceFromSdkClient({ app });

    let caught: unknown;
    try {
      await service.getFile({ fileId: "file_1", requestId: "req-file" });
    } catch (error) {
      caught = error;
    }

    expect(isFileSdkAdapterError(caught)).toBe(true);
    expect(caught).toMatchObject({
      code: "file.sdk_operation_failed",
      operationId: "files.retrieve",
    });
    expect(String((caught as Error).message)).not.toContain("X-Amz-Signature");
    expect(String((caught as Error).message)).toContain("[redacted-url]");
  });

  it("normalizes backend SDK envelope failures instead of leaking empty successful payloads", async () => {
    const backend = createRecordingBackendSdk([]);
    backend.oss.quotas.list = async () => ({ code: "4010", msg: "trusted request subject is required" });
    const port = createFileAdminStoragePortFromBackendSdkClient(backend);

    let caught: unknown;
    try {
      await port.listQuotaPolicies({ requestId: "req-quotas" });
    } catch (error) {
      caught = error;
    }

    expect(isFileSdkAdapterError(caught)).toBe(true);
    expect(caught).toMatchObject({
      code: "file.sdk_operation_failed",
      operationId: "oss.quotas.list",
    });
    expect(String((caught as Error).message)).toContain("trusted request subject is required");

    backend.oss.quotas.list = async () => ({ code: "2000", msg: "ok" });
    await expect(port.listQuotaPolicies({ requestId: "req-quotas" })).rejects.toMatchObject({
      code: "file.sdk_operation_failed",
      operationId: "oss.quotas.list",
    });
  });
});

function createRecordingAppSdk(events: string[]): SdkworkFileAppSdkClient {
  return {
    async driveNodesList(input) {
      events.push(`driveNodesList:${input.spaceId}:${input.parentNodeId ?? "root"}`);
      return {
        items: [],
        requestId: input.requestId,
      };
    },
    async driveSpacesList(input) {
      events.push(`driveSpacesList:${input.requestId}`);
      return {
        items: [],
        requestId: input.requestId,
      };
    },
    async fileBindingsCreate(input) {
      events.push(`fileBindingsCreate:${input.purpose}:${input.target.id}`);
      return {
        fileRef: {
          fileId: input.fileId,
          purpose: input.purpose,
          visibility: "private",
        },
        requestId: input.requestId,
      };
    },
    async fileBindingsDelete(input) {
      events.push(`fileBindingsDelete:${input.bindingId}`);
      return {
        bindingId: input.bindingId,
        requestId: input.requestId,
      };
    },
    async fileBindingsList(input) {
      events.push(`fileBindingsList:${input.purpose}:${input.target.id}`);
      return {
        items: [],
        requestId: input.requestId,
      };
    },
    async filesDownloadUrlCreate(input) {
      events.push(`filesDownloadUrlCreate:${input.fileId}`);
      return {
        expiresAt: "2026-05-23T08:10:00.000Z",
        requestId: input.requestId,
        url: "https://download.example.test/file_1",
      };
    },
    async filesList(input) {
      events.push(`filesList:${input.purpose}:${input.target?.id ?? "none"}`);
      return {
        items: [
          {
            displayName: "App Icon",
            fileId: "file_1",
            purpose: input.purpose ?? "app.icon",
            visibility: "private",
          },
        ],
        requestId: input.requestId,
      };
    },
    async filesPreviewUrlCreate(input) {
      events.push(`filesPreviewUrlCreate:${input.fileId}`);
      return {
        expiresAt: "2026-05-23T08:10:00.000Z",
        requestId: input.requestId,
        url: "https://preview.example.test/file_1",
      };
    },
    async filesRetrieve(input) {
      events.push(`filesRetrieve:${input.fileId}`);
      return {
        fileRef: {
          fileId: input.fileId,
          purpose: "app.icon",
          visibility: "private",
        },
        requestId: input.requestId,
      };
    },
    async storageUsageRetrieve(input) {
      events.push(`storageUsageRetrieve:${input.scopeType}:${input.scopeId}`);
      return {
        fileCount: 1,
        objectCount: 1,
        requestId: input.requestId,
        retainedBytes: 0,
        scopeId: input.scopeId,
        scopeType: input.scopeType,
        trashBytes: 0,
        usedBillableBytes: 1024,
        usedLogicalBytes: 1024,
        usedPhysicalBytes: 1024,
        variantBytes: 0,
        versionCount: 1,
      };
    },
  };
}

function createRecordingDriveSdk(events: string[]): SdkworkFileDriveUploaderClient {
  return {
    uploader: {
      async uploadByProfile(profile, input) {
        events.push(
          `driveUploader.uploadByProfile:${profile}:${input.appResourceType}:${input.appResourceId}:${input.originalFileName}`,
        );
        return {
          parts: [
            {
              etag: "etag-1",
              offsetBytes: 0,
              partNo: 1,
              sizeBytes: Number(input.file.size),
            },
          ],
          uploadItem: {
            actorId: input.operatorId ?? "user_1",
            actorType: "user",
            appId: input.appId ?? "app-center",
            appResourceId: input.appResourceId ?? "app_1",
            appResourceType: input.appResourceType ?? "app",
            chunkSizeBytes: String(input.file.size),
            cleanupStatus: "none",
            contentLength: String(input.file.size),
            contentType: input.contentType ?? "image/png",
            contentTypeGroup: "image",
            fileFingerprint: "sha256:icon",
            id: "upload_item_1",
            nodeId: "node_drive_1",
            originalFileName: input.originalFileName ?? "icon.png",
            postProcessStatus: "completed",
            retentionMode: "long_term",
            spaceId: "space_drive_1",
            status: "completed",
            taskId: input.taskId ?? "task_1",
            tenantId: "tenant_1",
            totalParts: "1",
            uploadProfileCode: profile,
            uploadedBytes: String(input.file.size),
            uploadedPartsCount: "1",
            uploadSessionId: "upload_session_1",
          },
          uploadSession: {
            bucket: "redacted-drive-owned-bucket",
            expiresAtEpochMs: "1770000000000",
            id: "upload_session_1",
            nodeId: "node_drive_1",
            objectKey: "redacted-drive-owned-object",
            spaceId: "space_drive_1",
            state: "completed",
            storageProviderId: "provider_1",
            storageUploadId: "storage_upload_1",
            tenantId: "tenant_1",
            version: "1",
          },
        };
      },
    },
  };
}

function createTestFile(name: string, type: string, size: number): Blob & { name: string } {
  return Object.assign(new Blob([new Uint8Array(size)], { type }), { name });
}

function createRecordingBackendSdk(events: string[]): SdkworkFileBackendSdkClient {
  return {
    oss: {
      defaultBuckets: {
        async list(params) {
          events.push(`oss.defaultBuckets.list:${params?.logicalScope}`);
          return sdkEnvelope({
            items: [
              {
                bucketId: "bucket_1",
                bucketName: "tenant-private",
                logicalScope: params?.logicalScope ?? "tenant_private",
                providerCode: "primary-s3",
                providerId: "provider_1",
                providerType: "aws_s3",
                status: "active",
              },
            ],
            requestId: "req-default-buckets",
          });
        },
        async update(logicalScope, body, params) {
          events.push(`oss.defaultBuckets.update:${logicalScope}:${body.bucketId}:${params?.xRequestId}`);
          return sdkEnvelope({
            defaultBucket: {
              bucketId: body.bucketId,
              bucketName: "tenant-private",
              logicalScope,
              providerCode: "primary-s3",
              providerId: "provider_1",
              providerType: "aws_s3",
              status: "active",
            },
            requestId: params?.xRequestId ?? "",
          });
        },
      },
      gcJobs: {
        async create(body, params) {
          events.push(`oss.gcJobs.create:${body.jobType}:${body.dryRun}:${params.idempotencyKey}:${params.xRequestId}`);
          return sdkEnvelope({
            job: { dryRun: body.dryRun, jobType: body.jobType, status: "created" },
            requestId: params.xRequestId ?? "",
          });
        },
        async list() {
          return sdkEnvelope({ items: [], requestId: "req-gc-jobs" });
        },
      },
      providers: {
        async create(body, params) {
          events.push([
            `oss.providers.create:${body.providerCode}:${body.providerType}:${params.idempotencyKey}:${params.xRequestId}`,
            body.pathStyleEnabled ? "path-style" : "virtual-hosted",
            body.supportsMultipart ? "multipart" : "singlepart",
            body.supportsLifecycle ? "lifecycle" : "no-lifecycle",
            body.supportsObjectLock ? "object-lock" : "no-object-lock",
          ].join(":"));
          return sdkEnvelope({
            provider: {
              credentialRef: body.credentialRef,
              endpointUrl: body.endpointUrl,
              pathStyleEnabled: body.pathStyleEnabled,
              providerCode: body.providerCode,
              providerType: body.providerType,
              region: body.region,
              supportsLifecycle: body.supportsLifecycle,
              supportsMultipart: body.supportsMultipart,
              supportsObjectLock: body.supportsObjectLock,
            },
            requestId: params.xRequestId ?? "",
          });
        },
        healthChecks: {
          async create(providerId, params) {
            events.push(`oss.providers.healthChecks.create:${providerId}:${params?.xRequestId}`);
            return sdkEnvelope({
              checkedAt: "2026-05-23T08:00:00.000Z",
              healthy: true,
              providerId,
              requestId: params?.xRequestId ?? "",
              status: "reachable",
            });
          },
        },
        async list() {
          events.push("oss.providers.list");
          return sdkEnvelope({
            items: [{ providerCode: "primary-s3", providerType: "aws_s3" }],
            requestId: "req-providers",
          });
        },
        async update(providerId, body, params) {
          events.push(`oss.providers.update:${providerId}:${body.status}:${params?.xRequestId}`);
          return sdkEnvelope({
            provider: {
              providerId,
              reason: body.reason,
              status: body.status,
            },
            requestId: params?.xRequestId ?? "",
          });
        },
      },
      quotas: {
        async create(body, params) {
          events.push(`oss.quotas.create:${body.scopeType}:${body.scopeId}:${params.idempotencyKey}:${params.xRequestId}`);
          return sdkEnvelope({
            quotaPolicy: {
              quotaLimitBytes: body.quotaLimitBytes,
              scopeId: body.scopeId,
              scopeType: body.scopeType,
              singleFileLimitBytes: body.singleFileLimitBytes,
            },
            requestId: params.xRequestId ?? "",
          });
        },
        async list() {
          events.push("oss.quotas.list");
          return sdkEnvelope({
            items: [{ policyCode: "org-standard", scopeType: "organization" }],
            requestId: "req-quotas",
          });
        },
      },
      reconciliationRuns: {
        async create(body, params) {
          events.push(`oss.reconciliationRuns.create:${body.runType}:${body.dryRun}:${params.idempotencyKey}:${params.xRequestId}`);
          return sdkEnvelope({
            reconciliationRun: { dryRun: body.dryRun, runType: body.runType, status: "created" },
            requestId: params.xRequestId ?? "",
          });
        },
        async list(params) {
          events.push(`oss.reconciliationRuns.list:${params?.runType}:${params?.status}`);
          return sdkEnvelope({
            items: [{ runType: params?.runType, status: params?.status }],
            nextCursor: "reconciliation-cursor-2",
            requestId: "req-runs",
          });
        },
      },
      usage: {
        async list(params) {
          events.push(`oss.usage.list:${params?.scopeType}:${params?.scopeId}`);
          return sdkEnvelope({
            items: [{ scopeId: params?.scopeId, usedLogicalBytes: 2048 }],
            requestId: "req-usage",
          });
        },
      },
    },
  };
}

function sdkEnvelope<T>(data: T): { code: string; data: T; msg: string } {
  return { code: "2000", data, msg: "ok" };
}

function collectOperationIds(document: typeof SDKWORK_FILE_APP_OPENAPI): string[] {
  return Object.values(document.paths).flatMap((pathItem) => Object.values(pathItem).map((operation) => operation.operationId));
}
