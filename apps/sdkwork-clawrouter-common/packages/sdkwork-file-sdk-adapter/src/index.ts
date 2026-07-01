import {
  SDKWORK_FILE_APP_OPENAPI,
  SDKWORK_FILE_BACKEND_OPENAPI,
  type SdkworkFileOpenApiDocument,
} from "../../sdkwork-file-api-contracts/src/index";
import type {
  DriveUploaderClient,
  DriveUploaderProfile,
  DriveUploaderUploadResult,
} from "@sdkwork/drive-app-sdk";
import {
  createFileRef,
  type SdkworkDriveNode,
  type SdkworkDriveSpace,
  type SdkworkFileRef,
  type SdkworkFileSlotDefinition,
  type SdkworkStorageUsageScopeType,
  type SdkworkStorageUsageSnapshot,
} from "../../sdkwork-file-contracts/src/index";
import type {
  AdminStorageBucketQuery,
  AdminStorageCreateBucketInput,
  AdminStorageCreateGarbageCollectionJobInput,
  AdminStorageCreateProviderInput,
  AdminStorageCreateQuotaPolicyInput,
  AdminStorageCreateReconciliationRunInput,
  AdminStorageDefaultBucket,
  AdminStorageDefaultBucketQuery,
  AdminStorageProviderHealthCheckInput,
  AdminStorageProviderHealthCheckResult,
  AdminStorageReconciliationRunQuery,
  AdminStorageSetDefaultBucketInput,
  AdminStorageUpdateBucketInput,
  AdminStorageUpdateProviderInput,
  AdminStorageUsageLedgerQuery,
  AdminStorageUsageQuery,
  AdminStorageUsageSnapshotQuery,
  AdminStoragePort,
  FileUploadTarget,
} from "../../sdkwork-file-sdk-ports/src/index";
import type {
  AbortManagedUploadInput,
  BindManagedFileInput,
  CompleteManagedUploadInput,
  DeleteManagedBindingInput,
  FilePlatformService,
  GetManagedFileInput,
  IssueManagedFileUrlInput,
  ListManagedBindingsInput,
  ManagedDriveUploadInput,
  ManagedDriveUploadResult,
} from "../../sdkwork-file-service/src/index";

export type SdkworkFileSdkAdapterSurface = "app" | "backend";

export interface SdkworkFileSdkAdapterMethod {
  clientMethod: string;
  operationId: string;
  serviceMethod: string;
  surface: SdkworkFileSdkAdapterSurface;
}

export interface SdkworkFileAppListFilesInput {
  cursor?: string;
  limit?: number;
  purpose?: string;
  requestId: string;
  target?: FileUploadTarget;
}

export interface SdkworkFileAppFileInput {
  fileId: string;
  requestId: string;
  versionId?: string;
}

export interface SdkworkFileAppCreateBindingInput {
  fileId: string;
  purpose: string;
  requestId: string;
  target: FileUploadTarget;
  versionId?: string;
}

export interface SdkworkFileAppListBindingsInput {
  purpose?: string;
  requestId: string;
  target: FileUploadTarget;
}

export interface SdkworkFileAppDeleteBindingInput {
  bindingId: string;
  requestId: string;
}

export interface SdkworkFileAppListDriveNodesInput {
  cursor?: string;
  limit?: number;
  parentNodeId?: string;
  requestId: string;
  spaceId: string;
}

export interface SdkworkFileAppStorageUsageInput {
  requestId: string;
  scopeId: string;
  scopeType: SdkworkStorageUsageScopeType;
}

export interface SdkworkFileAppSdkClient {
  driveNodesList(input: SdkworkFileAppListDriveNodesInput): Promise<{ items: SdkworkDriveNode[]; nextCursor?: string; requestId: string }>;
  driveSpacesList(input: { requestId: string }): Promise<{ items: SdkworkDriveSpace[]; requestId: string }>;
  fileBindingsCreate(input: SdkworkFileAppCreateBindingInput): Promise<{ fileRef: SdkworkFileRef; requestId: string }>;
  fileBindingsDelete(input: SdkworkFileAppDeleteBindingInput): Promise<{ bindingId: string; requestId: string }>;
  fileBindingsList(input: SdkworkFileAppListBindingsInput): Promise<{ items: SdkworkFileRef[]; requestId: string }>;
  filesDownloadUrlCreate(input: SdkworkFileAppFileInput): Promise<{ expiresAt: string; requestId: string; url: string }>;
  filesList(input: SdkworkFileAppListFilesInput): Promise<{ items: SdkworkFileRef[]; nextCursor?: string; requestId: string }>;
  filesPreviewUrlCreate(input: SdkworkFileAppFileInput): Promise<{ expiresAt: string; requestId: string; url: string }>;
  filesRetrieve(input: GetManagedFileInput): Promise<{ fileRef: SdkworkFileRef; requestId: string }>;
  storageUsageRetrieve(input: SdkworkFileAppStorageUsageInput): Promise<SdkworkStorageUsageSnapshot>;
}

export interface SdkworkFileDriveUploaderClient {
  uploader: Pick<DriveUploaderClient, "uploadByProfile">;
}

export interface SdkworkFileBackendSdkClient {
  oss: {
    buckets: {
      create(
        body: Omit<AdminStorageCreateBucketInput, "idempotencyKey" | "requestId">,
        params: SdkworkFileBackendCommandParams,
      ): Promise<SdkworkFileBackendSdkResult<{ bucket: unknown; requestId: string }>>;
      list(params?: Omit<AdminStorageBucketQuery, "requestId">): Promise<SdkworkFileBackendSdkResult<{
        items: unknown[];
        nextCursor?: string;
        requestId: string;
      }>>;
      update(
        bucketId: string,
        body: Omit<AdminStorageUpdateBucketInput, "bucketId" | "requestId">,
        params?: SdkworkFileBackendRequestParams,
      ): Promise<SdkworkFileBackendSdkResult<{ bucket: unknown; requestId: string }>>;
    };
    defaultBuckets: {
      list(params?: Omit<AdminStorageDefaultBucketQuery, "requestId">): Promise<SdkworkFileBackendSdkResult<{
        items: AdminStorageDefaultBucket[];
        requestId: string;
      }>>;
      update(
        logicalScope: AdminStorageSetDefaultBucketInput["logicalScope"],
        body: Omit<AdminStorageSetDefaultBucketInput, "logicalScope" | "requestId">,
        params?: SdkworkFileBackendRequestParams,
      ): Promise<SdkworkFileBackendSdkResult<{ defaultBucket: AdminStorageDefaultBucket; requestId: string }>>;
    };
    gcJobs: {
      create(
        body: Omit<AdminStorageCreateGarbageCollectionJobInput, "idempotencyKey" | "requestId">,
        params: SdkworkFileBackendCommandParams,
      ): Promise<SdkworkFileBackendSdkResult<{ job: unknown; requestId: string }>>;
      list(params?: { cursor?: string; limit?: number; status?: string }): Promise<SdkworkFileBackendSdkResult<{
        items: unknown[];
        nextCursor?: string;
        requestId: string;
      }>>;
    };
    providers: {
      create(
        body: Omit<AdminStorageCreateProviderInput, "idempotencyKey" | "requestId">,
        params: SdkworkFileBackendCommandParams,
      ): Promise<SdkworkFileBackendSdkResult<{ provider: unknown; requestId: string }>>;
      healthChecks: {
        create(
          providerId: string,
          params?: SdkworkFileBackendRequestParams,
        ): Promise<SdkworkFileBackendSdkResult<AdminStorageProviderHealthCheckResult>>;
      };
      list(): Promise<SdkworkFileBackendSdkResult<{ items: unknown[]; requestId: string }>>;
      update(
        providerId: string,
        body: Omit<AdminStorageUpdateProviderInput, "providerId" | "requestId">,
        params?: SdkworkFileBackendRequestParams,
      ): Promise<SdkworkFileBackendSdkResult<{ provider: unknown; requestId: string }>>;
    };
    quotas: {
      create(
        body: Omit<AdminStorageCreateQuotaPolicyInput, "idempotencyKey" | "requestId">,
        params: SdkworkFileBackendCommandParams,
      ): Promise<SdkworkFileBackendSdkResult<{ quotaPolicy: unknown; requestId: string }>>;
      list(): Promise<SdkworkFileBackendSdkResult<{ items: unknown[]; requestId: string }>>;
    };
    reconciliationRuns: {
      create(
        body: Omit<AdminStorageCreateReconciliationRunInput, "idempotencyKey" | "requestId">,
        params: SdkworkFileBackendCommandParams,
      ): Promise<SdkworkFileBackendSdkResult<{ reconciliationRun: unknown; requestId: string }>>;
      list(params?: Omit<AdminStorageReconciliationRunQuery, "requestId">): Promise<SdkworkFileBackendSdkResult<{
        items: unknown[];
        nextCursor?: string;
        requestId: string;
      }>>;
    };
    usage: {
      ledger: {
        list(params?: Omit<AdminStorageUsageLedgerQuery, "requestId">): Promise<SdkworkFileBackendSdkResult<{
          items: unknown[];
          nextCursor?: string;
          requestId: string;
        }>>;
      };
      list(params?: Omit<AdminStorageUsageQuery, "requestId">): Promise<SdkworkFileBackendSdkResult<{
        items: unknown[];
        nextCursor?: string;
        requestId: string;
      }>>;
      snapshots: {
        list(params?: Omit<AdminStorageUsageSnapshotQuery, "requestId">): Promise<SdkworkFileBackendSdkResult<{
          items: unknown[];
          nextCursor?: string;
          requestId: string;
        }>>;
      };
    };
  };
}

export interface SdkworkFileBackendRequestParams {
  xRequestId?: string;
}

export interface SdkworkFileBackendCommandParams extends SdkworkFileBackendRequestParams {
  idempotencyKey: string;
}

export type SdkworkFileBackendSdkResult<TData> = TData | {
  code?: number | string;
  data?: TData;
  message?: string;
  msg?: string;
};

export interface CreateFilePlatformServiceFromSdkClientOptions {
  app: SdkworkFileAppSdkClient;
  drive?: SdkworkFileDriveUploaderClient;
  slots?: readonly SdkworkFileSlotDefinition[];
}

export class FileSdkAdapterError extends Error {
  readonly code: "file.sdk_operation_failed";
  readonly operationId: string;
  readonly originalError: unknown;

  constructor(operationId: string, error: unknown) {
    super(`File SDK operation ${operationId} failed: ${redactMessage(errorMessage(error))}`);
    this.name = "FileSdkAdapterError";
    this.code = "file.sdk_operation_failed";
    this.operationId = operationId;
    this.originalError = error;
  }
}

export const SDKWORK_FILE_SDK_ADAPTER_METHODS: readonly SdkworkFileSdkAdapterMethod[] = [
  method("app", "listFiles", "filesList", "files.list"),
  method("app", "getFile", "filesRetrieve", "files.retrieve"),
  method("app", "issueDownloadUrl", "filesDownloadUrlCreate", "files.downloadUrl.create"),
  method("app", "issuePreviewUrl", "filesPreviewUrlCreate", "files.previewUrl.create"),
  method("app", "bindFile", "fileBindingsCreate", "fileBindings.create"),
  method("app", "listBindings", "fileBindingsList", "fileBindings.list"),
  method("app", "deleteBinding", "fileBindingsDelete", "fileBindings.delete"),
  method("app", "listDriveSpaces", "driveSpacesList", "drive.spaces.list"),
  method("app", "listDriveNodes", "driveNodesList", "drive.nodes.list"),
  method("app", "getStorageUsage", "storageUsageRetrieve", "storage.usage.retrieve"),
  method("backend", "listProviders", "oss.providers.list", "oss.providers.list"),
  method("backend", "createProvider", "oss.providers.create", "oss.providers.create"),
  method("backend", "updateProvider", "oss.providers.update", "oss.providers.update"),
  method("backend", "healthCheckProvider", "oss.providers.healthChecks.create", "oss.providers.healthChecks.create"),
  method("backend", "listBuckets", "oss.buckets.list", "oss.buckets.list"),
  method("backend", "createBucket", "oss.buckets.create", "oss.buckets.create"),
  method("backend", "updateBucket", "oss.buckets.update", "oss.buckets.update"),
  method("backend", "listDefaultBuckets", "oss.defaultBuckets.list", "oss.defaultBuckets.list"),
  method("backend", "setDefaultBucket", "oss.defaultBuckets.update", "oss.defaultBuckets.update"),
  method("backend", "listQuotaPolicies", "oss.quotas.list", "oss.quotas.list"),
  method("backend", "createQuotaPolicy", "oss.quotas.create", "oss.quotas.create"),
  method("backend", "listReconciliationRuns", "oss.reconciliationRuns.list", "oss.reconciliationRuns.list"),
  method("backend", "createReconciliationRun", "oss.reconciliationRuns.create", "oss.reconciliationRuns.create"),
  method("backend", "createGarbageCollectionJob", "oss.gcJobs.create", "oss.gcJobs.create"),
  method("backend", "listUsageCounters", "oss.usage.list", "oss.usage.list"),
  method("backend", "listUsageLedger", "oss.usage.ledger.list", "oss.usage.ledger.list"),
  method("backend", "listUsageSnapshots", "oss.usage.snapshots.list", "oss.usage.snapshots.list"),
] as const;

export function createFilePlatformServiceFromSdkClient({
  app,
  drive,
  slots = [],
}: CreateFilePlatformServiceFromSdkClientOptions): FilePlatformService {
  const slotRegistry = new Map(slots.map((slot) => [slot.slotCode, slot]));

  return {
    async abortUpload(input: AbortManagedUploadInput) {
      throw new FileSdkAdapterError("drive.uploader.uploadByProfile", new Error(`Drive upload abort is not exposed by this file facade: ${input.sessionId}`));
    },

    async bindFile(input: BindManagedFileInput) {
      const slot = slotRegistry.get(input.slotCode);
      const existing = await invokeSdkOperation("fileBindings.list", () => app.fileBindingsList({
        purpose: input.slotCode,
        requestId: input.requestId,
        target: input.target,
      }));
      if (slot && existing.items.length >= slot.maxCount) {
        throw new FileSdkAdapterError("fileBindings.create", new Error(`slot cardinality exceeded: ${slot.slotCode}`));
      }
      return invokeSdkOperation("fileBindings.create", () => app.fileBindingsCreate({
        fileId: input.fileId,
        purpose: input.slotCode,
        requestId: input.requestId,
        target: input.target,
        ...(input.versionId ? { versionId: input.versionId } : {}),
      }));
    },

    async completeUpload(input: CompleteManagedUploadInput) {
      throw new FileSdkAdapterError("drive.uploader.uploadByProfile", new Error(`Drive uploader completes inside uploadFile: ${input.slotCode}`));
    },

    async deleteBinding(input: DeleteManagedBindingInput) {
      return invokeSdkOperation("fileBindings.delete", () => app.fileBindingsDelete(input));
    },

    async getFile(input: GetManagedFileInput) {
      return invokeSdkOperation("files.retrieve", () => app.filesRetrieve(input));
    },

    async getStorageUsage(input: SdkworkFileAppStorageUsageInput) {
      return invokeSdkOperation("storage.usage.retrieve", () => app.storageUsageRetrieve(input));
    },

    getSlot(slotCode: string) {
      return slotRegistry.get(slotCode);
    },

    async issueDownloadUrl(input: IssueManagedFileUrlInput) {
      return invokeSdkOperation("files.downloadUrl.create", () => app.filesDownloadUrlCreate(input));
    },

    async issuePreviewUrl(input: IssueManagedFileUrlInput) {
      return invokeSdkOperation("files.previewUrl.create", () => app.filesPreviewUrlCreate(input));
    },

    async listBindings(input: ListManagedBindingsInput) {
      return invokeSdkOperation("fileBindings.list", () => app.fileBindingsList({
        purpose: input.slotCode,
        requestId: input.requestId,
        target: input.target,
      }));
    },

    async listDriveNodes(input: SdkworkFileAppListDriveNodesInput) {
      return invokeSdkOperation("drive.nodes.list", () => app.driveNodesList(input));
    },

    async listDriveSpaces(input: { requestId: string }) {
      return invokeSdkOperation("drive.spaces.list", () => app.driveSpacesList(input));
    },

    async listFiles(input: SdkworkFileAppListFilesInput) {
      return invokeSdkOperation("files.list", () => app.filesList(input));
    },

    async uploadFile(input: ManagedDriveUploadInput): Promise<ManagedDriveUploadResult> {
      if (!drive?.uploader || typeof drive.uploader.uploadByProfile !== "function") {
        throw new FileSdkAdapterError("drive.uploader.uploadByProfile", new Error("Drive app SDK uploader is not configured."));
      }
      const slot = slotRegistry.get(input.slotCode);
      const profile = input.uploadProfileCode ?? inferDriveUploaderProfile(input.contentType, input.filename);
      const result = await invokeSdkOperation("drive.uploader.uploadByProfile", () => drive.uploader.uploadByProfile(profile, {
        file: input.file,
        anonymousId: input.anonymousId,
        appResourceType: input.target.type,
        appResourceId: input.target.id,
        scene: input.scene || normalizeUsageLabel(input.slotCode),
        source: input.source || `${slot?.appId || "sdkwork-clawrouter"}-file-upload`,
        uploadProfileCode: profile,
        originalFileName: input.filename,
        contentType: input.contentType,
        spaceId: input.spaceId,
        parentNodeId: input.parentNodeId,
        retention: input.retention ?? { mode: "long_term" },
        onProgress: input.onProgress,
      }));
      return {
        ...mapDriveUploadResult(result, input),
        slotCode: input.slotCode,
      };
    },
  };
}

export function createFileAdminStoragePortFromBackendSdkClient(
  backend: SdkworkFileBackendSdkClient,
): AdminStoragePort {
  return {
    async createProvider(input) {
      return invokeBackendSdkOperation("oss.providers.create", () => backend.oss.providers.create(
        omitKeys(input, "idempotencyKey", "requestId"),
        commandParams(input),
      ));
    },
    async updateProvider(input) {
      return invokeBackendSdkOperation("oss.providers.update", () => backend.oss.providers.update(
        input.providerId,
        omitKeys(input, "providerId", "requestId"),
        requestParams(input),
      ));
    },
    async createBucket(input) {
      return invokeBackendSdkOperation("oss.buckets.create", () => backend.oss.buckets.create(
        omitKeys(input, "idempotencyKey", "requestId"),
        commandParams(input),
      ));
    },
    async updateBucket(input) {
      return invokeBackendSdkOperation("oss.buckets.update", () => backend.oss.buckets.update(
        input.bucketId,
        omitKeys(input, "bucketId", "requestId"),
        requestParams(input),
      ));
    },
    async createQuotaPolicy(input) {
      return invokeBackendSdkOperation("oss.quotas.create", () => backend.oss.quotas.create(
        omitKeys(input, "idempotencyKey", "requestId"),
        commandParams(input),
      ));
    },
    async createReconciliationRun(input) {
      return invokeBackendSdkOperation("oss.reconciliationRuns.create", () => backend.oss.reconciliationRuns.create(
        omitKeys(input, "idempotencyKey", "requestId"),
        commandParams(input),
      ));
    },
    async createGarbageCollectionJob(input) {
      return invokeBackendSdkOperation("oss.gcJobs.create", () => backend.oss.gcJobs.create(
        omitKeys(input, "idempotencyKey", "requestId"),
        commandParams(input),
      ));
    },
    async healthCheckProvider(input) {
      return invokeBackendSdkOperation("oss.providers.healthChecks.create", () => backend.oss.providers.healthChecks.create(
        input.providerId,
        requestParams(input),
      ));
    },
    async listProviders() {
      return invokeBackendSdkOperation("oss.providers.list", () => backend.oss.providers.list());
    },
    async listBuckets(input) {
      return invokeBackendSdkOperation("oss.buckets.list", () => backend.oss.buckets.list(omitKeys(input, "requestId")));
    },
    async listDefaultBuckets(input) {
      return invokeBackendSdkOperation("oss.defaultBuckets.list", () => backend.oss.defaultBuckets.list(omitKeys(input, "requestId")));
    },
    async listQuotaPolicies() {
      return invokeBackendSdkOperation("oss.quotas.list", () => backend.oss.quotas.list());
    },
    async listReconciliationRuns(input) {
      return invokeBackendSdkOperation("oss.reconciliationRuns.list", () => backend.oss.reconciliationRuns.list(omitKeys(input, "requestId")));
    },
    async listUsageCounters(input) {
      return invokeBackendSdkOperation("oss.usage.list", () => backend.oss.usage.list(omitKeys(input, "requestId")));
    },
    async listUsageLedger(input) {
      return invokeBackendSdkOperation("oss.usage.ledger.list", () => backend.oss.usage.ledger.list(omitKeys(input, "requestId")));
    },
    async listUsageSnapshots(input) {
      return invokeBackendSdkOperation("oss.usage.snapshots.list", () => backend.oss.usage.snapshots.list(omitKeys(input, "requestId")));
    },
    async setDefaultBucket(input) {
      return invokeBackendSdkOperation("oss.defaultBuckets.update", () => backend.oss.defaultBuckets.update(
        input.logicalScope,
        omitKeys(input, "logicalScope", "requestId"),
        requestParams(input),
      ));
    },
  };
}

function mapDriveUploadResult(
  result: DriveUploaderUploadResult,
  input: ManagedDriveUploadInput,
): Omit<ManagedDriveUploadResult, "slotCode"> {
  const uploadItem = result.uploadItem;
  const uploadSession = result.uploadSession;
  const driveSpaceId = uploadSession.spaceId || uploadItem.spaceId;
  const driveNodeId = uploadSession.nodeId || uploadItem.nodeId;
  if (!driveSpaceId || !driveNodeId) {
    throw new FileSdkAdapterError("drive.uploader.uploadByProfile", new Error("Drive uploader did not return a Drive space/node identity."));
  }
  return {
    driveNodeId,
    driveSpaceId,
    driveUri: `drive://spaces/${driveSpaceId}/nodes/${driveNodeId}`,
    fileRef: createFileRef({
      displayName: uploadItem.originalFileName?.trim() || input.filename,
      fileId: driveNodeId,
      purpose: input.slotCode,
      visibility: "private",
    }),
    requestId: input.requestId,
    status: "active",
    uploadId: uploadItem.id,
  };
}

function inferDriveUploaderProfile(contentType: string, filename: string): DriveUploaderProfile {
  const normalizedContentType = contentType.trim().toLowerCase();
  const normalizedName = filename.trim().toLowerCase();
  if (normalizedContentType.startsWith("image/")) return "image";
  if (normalizedContentType.startsWith("video/")) return "video";
  if (normalizedContentType.startsWith("audio/")) return "audio";
  if (normalizedContentType.startsWith("text/")) return "text";
  if (normalizedContentType.includes("pdf") || /\.(doc|docx|pdf|xls|xlsx)$/i.test(normalizedName)) return "document";
  if (normalizedContentType.includes("zip") || /\.(7z|rar|zip)$/i.test(normalizedName)) return "archive";
  return "attachment";
}

function normalizeUsageLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "file_upload";
}

function requiredText(value: string | undefined, fieldName: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new FileSdkAdapterError("drive.uploader.uploadByProfile", new Error(`Drive uploader requires ${fieldName}.`));
  }
  return trimmed;
}

export function isFileSdkAdapterError(value: unknown): value is FileSdkAdapterError {
  return value instanceof FileSdkAdapterError;
}

export function validateFileSdkAdapterStandard(
  appDocument: SdkworkFileOpenApiDocument = SDKWORK_FILE_APP_OPENAPI,
  backendDocument: SdkworkFileOpenApiDocument = SDKWORK_FILE_BACKEND_OPENAPI,
): string[] {
  const violations: string[] = [];
  const appOperationIds = new Set(collectOperationIds(appDocument));
  const backendOperationIds = new Set(collectOperationIds(backendDocument));
  const appOperations = collectOperationsById(appDocument);
  const backendOperations = collectOperationsById(backendDocument);
  const adapterOperationIds = SDKWORK_FILE_SDK_ADAPTER_METHODS.map((entry) => `${entry.surface}:${entry.operationId}`);

  if (new Set(adapterOperationIds).size !== adapterOperationIds.length) {
    violations.push("duplicate_adapter_operation");
  }

  for (const entry of SDKWORK_FILE_SDK_ADAPTER_METHODS) {
    const operationIds = entry.surface === "app" ? appOperationIds : backendOperationIds;
    if (!operationIds.has(entry.operationId)) {
      violations.push(`missing_openapi_operation:${entry.surface}:${entry.operationId}`);
    }
    if (Object.prototype.hasOwnProperty.call(entry, "path") || Object.prototype.hasOwnProperty.call(entry, "httpMethod")) {
      violations.push(`adapter_contains_transport_detail:${entry.serviceMethod}`);
    }
    const operation = entry.surface === "app" ? appOperations.get(entry.operationId) : backendOperations.get(entry.operationId);
    if (isCommandAdapterMethod(entry.serviceMethod) && !hasJsonRequestBody(operation)) {
      violations.push(`missing_command_request_body:${entry.surface}:${entry.serviceMethod}`);
    }
    if (!hasJsonResponseBody(operation)) {
      violations.push(`missing_operation_response_body:${entry.surface}:${entry.serviceMethod}`);
    }
  }

  return violations;
}

async function invokeSdkOperation<TResult>(
  operationId: string,
  run: () => Promise<TResult>,
): Promise<TResult> {
  try {
    return await run();
  } catch (error) {
    throw error instanceof FileSdkAdapterError ? error : new FileSdkAdapterError(operationId, error);
  }
}

async function invokeBackendSdkOperation<TResult>(
  operationId: string,
  run: () => Promise<SdkworkFileBackendSdkResult<TResult>>,
): Promise<TResult> {
  const result = await invokeSdkOperation(operationId, run);
  return unwrapBackendSdkResult(operationId, result);
}

function unwrapBackendSdkResult<TResult>(
  operationId: string,
  result: SdkworkFileBackendSdkResult<TResult>,
): TResult {
  if (isRecord(result) && isSdkEnvelope(result)) {
    if (!isSuccessCode(result.code)) {
      throw new FileSdkAdapterError(operationId, new Error(readEnvelopeMessage(result) || `SDK result code ${String(result.code)}`));
    }
    if (!("data" in result)) {
      throw new FileSdkAdapterError(operationId, new Error("SDK result data is missing"));
    }
    return result.data as TResult;
  }
  return result as TResult;
}

function commandParams(input: { idempotencyKey: string; requestId: string }): SdkworkFileBackendCommandParams {
  return {
    idempotencyKey: input.idempotencyKey,
    xRequestId: input.requestId,
  };
}

function requestParams(input: { requestId: string }): SdkworkFileBackendRequestParams {
  return { xRequestId: input.requestId };
}

function omitKeys<TRecord extends object, TKey extends keyof TRecord>(
  record: TRecord,
  ...keys: TKey[]
): Omit<TRecord, TKey> {
  const next = { ...record } as Record<PropertyKey, unknown>;
  for (const key of keys) {
    delete next[key as PropertyKey];
  }
  return next as Omit<TRecord, TKey>;
}

function method(
  surface: SdkworkFileSdkAdapterSurface,
  serviceMethod: string,
  clientMethod: string,
  operationId: string,
): SdkworkFileSdkAdapterMethod {
  return {
    clientMethod,
    operationId,
    serviceMethod,
    surface,
  };
}

function collectOperationIds(document: SdkworkFileOpenApiDocument): string[] {
  return Object.values(document.paths).flatMap((pathItem) => Object.values(pathItem).map((operation) => operation.operationId));
}

function collectOperationsById(document: SdkworkFileOpenApiDocument): Map<string, { requestBody?: unknown; responses: Record<string, unknown> }> {
  return new Map(
    Object.values(document.paths)
      .flatMap((pathItem) => Object.values(pathItem))
      .map((operation) => [operation.operationId, operation]),
  );
}

function isCommandAdapterMethod(serviceMethod: string): boolean {
  return /^(abort|bind|complete|create|delete|presign|issue|set)/.test(serviceMethod);
}

function hasJsonRequestBody(operation: { requestBody?: unknown } | undefined): boolean {
  const requestBody = operation?.requestBody as {
    content?: {
      "application/json"?: unknown;
    };
    required?: unknown;
  } | undefined;
  return requestBody?.required === true && Boolean(requestBody.content?.["application/json"]);
}

function hasJsonResponseBody(operation: { responses?: Record<string, unknown> } | undefined): boolean {
  const response = operation?.responses?.["200"] as {
    content?: {
      "application/json"?: {
        schema?: {
          $ref?: unknown;
        };
      };
    };
  } | undefined;
  return typeof response?.content?.["application/json"]?.schema?.$ref === "string";
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function redactMessage(message: string): string {
  return message.replace(/https?:\/\/[^\s"'<>]+/g, "[redacted-url]");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSdkEnvelope(value: Record<string, unknown>): boolean {
  return "code" in value && ("data" in value || "msg" in value || "message" in value);
}

function isSuccessCode(code: unknown): boolean {
  return code === 0
    || code === 200
    || code === 2000
    || code === "0"
    || code === "200"
    || code === "2000";
}

function readEnvelopeMessage(value: Record<string, unknown>): string {
  const message = value.msg ?? value.message;
  return typeof message === "string" ? message : "";
}
