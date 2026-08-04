import {
  type SdkworkFileRef,
  type SdkworkFileSlotDefinition,
  type SdkworkDriveNode,
  type SdkworkDriveSpace,
  type SdkworkStorageUsageScopeType,
  type SdkworkStorageUsageSnapshot,
  validateFileSlotDefinition,
} from "../../sdkwork-file-contracts/src/index";
import type {
  CompleteUploadResult,
  FileChecksum,
  FilePlatformPorts,
  FileUploadTarget,
  FileUploadProgress,
  FileUploadProfile,
  FileUploadRetention,
  UploadFileResult,
  FileUploadBlobLike,
} from "../../sdkwork-file-sdk-ports/src/index";

export interface CreateFilePlatformServiceOptions {
  ports: FilePlatformPorts;
  slots: readonly SdkworkFileSlotDefinition[];
}

export interface ManagedDriveUploadInput {
  anonymousId?: string;
  checksum?: FileChecksum;
  contentType: string;
  file: FileUploadBlobLike;
  filename: string;
  idempotencyKey: string;
  onProgress?: (progress: FileUploadProgress) => void;
  organizationId?: string;
  operatorId?: string;
  parentNodeId?: string;
  requestId: string;
  retention?: FileUploadRetention;
  scene?: string;
  sizeBytes: number;
  slotCode: string;
  spaceId?: string;
  source?: string;
  target: FileUploadTarget;
  tenantId?: string;
  uploadProfileCode?: FileUploadProfile;
  userId?: string;
}

export interface ManagedDriveUploadResult extends UploadFileResult {
  quotaReservationId?: string;
  slotCode: string;
}

export interface CompleteManagedUploadInput {
  checksum?: FileChecksum;
  idempotencyKey: string;
  requestId: string;
  sessionId: string;
  slotCode: string;
}

export interface BindManagedFileInput {
  fileId: string;
  requestId: string;
  slotCode: string;
  target: FileUploadTarget;
  versionId?: string;
}

export interface ListManagedBindingsInput {
  requestId: string;
  slotCode: string;
  target: FileUploadTarget;
}

export interface DeleteManagedBindingInput {
  bindingId: string;
  requestId: string;
}

export interface GetManagedFileInput {
  fileId: string;
  requestId: string;
}

export interface IssueManagedFileUrlInput {
  fileId: string;
  requestId: string;
  versionId?: string;
}

export interface AbortManagedUploadInput {
  quotaReservationId?: string;
  requestId: string;
  sessionId: string;
}

export interface FilePlatformService {
  abortUpload(input: AbortManagedUploadInput): Promise<{ requestId: string; sessionId: string; status: string }>;
  bindFile(input: BindManagedFileInput): Promise<{ fileRef: SdkworkFileRef; requestId: string }>;
  completeUpload(input: CompleteManagedUploadInput): Promise<CompleteUploadResult>;
  deleteBinding(input: DeleteManagedBindingInput): Promise<{ bindingId: string; requestId: string }>;
  getFile(input: GetManagedFileInput): Promise<{ fileRef: SdkworkFileRef; requestId: string }>;
  getStorageUsage(input: { requestId: string; scopeId: string; scopeType: SdkworkStorageUsageScopeType }): Promise<SdkworkStorageUsageSnapshot>;
  getSlot(slotCode: string): SdkworkFileSlotDefinition | undefined;
  issueDownloadUrl(input: IssueManagedFileUrlInput): Promise<{ expiresAt: string; requestId: string; url: string }>;
  issuePreviewUrl(input: IssueManagedFileUrlInput): Promise<{ expiresAt: string; requestId: string; url: string }>;
  listBindings(input: ListManagedBindingsInput): Promise<{ items: SdkworkFileRef[]; requestId: string }>;
  listDriveNodes(input: {
    cursor?: string;
    limit?: number;
    parentNodeId?: string;
    requestId: string;
    spaceId: string;
  }): Promise<{ items: SdkworkDriveNode[]; nextCursor?: string; requestId: string }>;
  listDriveSpaces(input: { requestId: string }): Promise<{ items: SdkworkDriveSpace[]; requestId: string }>;
  listFiles(input: {
    cursor?: string;
    limit?: number;
    purpose?: string;
    requestId: string;
    target?: FileUploadTarget;
  }): Promise<{ items: SdkworkFileRef[]; nextCursor?: string; requestId: string }>;
  uploadFile(input: ManagedDriveUploadInput): Promise<ManagedDriveUploadResult>;
}

export class FilePlatformServiceError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "FilePlatformServiceError";
    this.code = code;
    this.details = { ...details };
  }
}

export function isFilePlatformServiceError(value: unknown): value is FilePlatformServiceError {
  return value instanceof FilePlatformServiceError;
}

export function createFilePlatformService({
  ports,
  slots,
}: CreateFilePlatformServiceOptions): FilePlatformService {
  const slotRegistry = new Map<string, SdkworkFileSlotDefinition>();
  for (const slot of slots) {
    const errors = validateFileSlotDefinition(slot);
    if (errors.length > 0) {
      throw new FilePlatformServiceError("file.slot_invalid", "File slot definition is invalid.", {
        errors,
        slotCode: slot.slotCode,
      });
    }
    slotRegistry.set(slot.slotCode, slot);
  }

  function getRequiredSlot(slotCode: string): SdkworkFileSlotDefinition {
    const slot = slotRegistry.get(slotCode);
    if (!slot) {
      throw new FilePlatformServiceError("file.slot_not_found", "File slot definition was not found.", {
        slotCode,
      });
    }
    if (slot.status !== "active") {
      throw new FilePlatformServiceError("file.slot_inactive", "File slot is not active.", {
        slotCode,
        status: slot.status,
      });
    }
    return slot;
  }

  return {
    async abortUpload(input) {
      const result = await ports.upload.abortUpload({
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
      if (input.quotaReservationId) {
        await ports.usage.releaseUploadQuota({
          requestId: input.requestId,
          reservationId: input.quotaReservationId,
        });
      }
      return result;
    },

    async bindFile(input) {
      const slot = getRequiredSlot(input.slotCode);
      const existing = await ports.binding.listBindings({
        purpose: slot.slotCode,
        requestId: input.requestId,
        target: input.target,
      });
      if (existing.items.length >= slot.maxCount) {
        throw new FilePlatformServiceError("file.slot_cardinality_exceeded", "File slot binding cardinality limit was reached.", {
          currentCount: existing.items.length,
          maxCount: slot.maxCount,
          slotCode: slot.slotCode,
          target: input.target,
        });
      }
      return ports.binding.createBinding({
        fileId: input.fileId,
        purpose: slot.slotCode,
        requestId: input.requestId,
        target: input.target,
        ...(input.versionId ? { versionId: input.versionId } : {}),
      });
    },

    async completeUpload(input) {
      const slot = getRequiredSlot(input.slotCode);
      return ports.upload.completeUpload({
        ...(input.checksum ? { checksum: input.checksum } : {}),
        idempotencyKey: input.idempotencyKey,
        purpose: slot.slotCode,
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
    },

    async uploadFile(input) {
      const slot = getRequiredSlot(input.slotCode);
      validateUploadInput(slot, input);
      const quotaScope = resolveQuotaScope(slot, input);
      const reservation = await ports.usage.reserveUploadQuota({
        billableBytes: input.sizeBytes,
        idempotencyKey: input.idempotencyKey,
        ...(input.organizationId ? { organizationId: input.organizationId } : {}),
        requestId: input.requestId,
        scopeId: quotaScope.scopeId,
        scopeType: quotaScope.scopeType,
        ...(input.userId ? { userId: input.userId } : {}),
      });

      try {
        const upload = await ports.upload.uploadFile({
          anonymousId: input.anonymousId,
          appId: slot.appId,
          appResourceId: input.target.id,
          appResourceType: input.target.type,
          ...(input.checksum ? { checksum: input.checksum } : {}),
          contentType: normalizeMime(input.contentType),
          file: input.file,
          filename: input.filename,
          idempotencyKey: input.idempotencyKey,
          onProgress: input.onProgress,
          ...(input.parentNodeId ? { parentNodeId: input.parentNodeId } : {}),
          purpose: slot.slotCode,
          requestId: input.requestId,
          retention: input.retention ?? { mode: "long_term" },
          scene: input.scene ?? normalizeUsageLabel(slot.slotCode),
          sizeBytes: input.sizeBytes,
          ...(input.spaceId ? { spaceId: input.spaceId } : {}),
          source: input.source ?? `${slot.appId}-file-upload`,
          target: input.target,
          uploadProfileCode: input.uploadProfileCode ?? inferUploadProfile(input.contentType, input.filename),
        });

        return {
          driveNodeId: upload.driveNodeId,
          driveSpaceId: upload.driveSpaceId,
          driveUri: upload.driveUri,
          fileRef: upload.fileRef,
          quotaReservationId: reservation.reservationId,
          requestId: upload.requestId,
          slotCode: slot.slotCode,
          status: upload.status,
          uploadId: upload.uploadId,
        };
      } catch (error) {
        await ports.usage.releaseUploadQuota({
          requestId: input.requestId,
          reservationId: reservation.reservationId,
        });
        throw error;
      }
    },

    async deleteBinding(input) {
      return ports.binding.deleteBinding(input);
    },

    async getFile(input) {
      return ports.access.getFile(input);
    },

    async getStorageUsage(input) {
      return ports.usage.getCurrentUsage(input);
    },

    getSlot(slotCode) {
      return slotRegistry.get(slotCode);
    },

    async issueDownloadUrl(input) {
      return ports.access.issueDownloadUrl(input);
    },

    async issuePreviewUrl(input) {
      return ports.access.issuePreviewUrl(input);
    },

    async listBindings(input) {
      const slot = getRequiredSlot(input.slotCode);
      return ports.binding.listBindings({
        purpose: slot.slotCode,
        requestId: input.requestId,
        target: input.target,
      });
    },

    async listDriveNodes(input) {
      return ports.drive.listNodes(input);
    },

    async listDriveSpaces(input) {
      return ports.drive.listSpaces(input);
    },

    async listFiles(input) {
      return ports.access.listFiles(input);
    },
  };
}

function validateUploadInput(
  slot: SdkworkFileSlotDefinition,
  input: ManagedDriveUploadInput,
): void {
  const contentType = normalizeMime(input.contentType);
  if (!slot.allowedMimeTypes.includes(contentType)) {
    throw new FilePlatformServiceError("file.slot_mime_not_allowed", "File MIME type is not allowed for this slot.", {
      allowedMimeTypes: slot.allowedMimeTypes,
      contentType,
      slotCode: slot.slotCode,
    });
  }
  if (slot.deniedMimeTypes.includes(contentType)) {
    throw new FilePlatformServiceError("file.slot_mime_denied", "File MIME type is explicitly denied for this slot.", {
      contentType,
      slotCode: slot.slotCode,
    });
  }
  if (input.sizeBytes <= 0) {
    throw new FilePlatformServiceError("file.upload_size_invalid", "Upload size must be positive.", {
      sizeBytes: input.sizeBytes,
      slotCode: slot.slotCode,
    });
  }
  if (input.sizeBytes > slot.maxFileBytes) {
    throw new FilePlatformServiceError("file.slot_file_too_large", "File exceeds slot maximum size.", {
      maxFileBytes: slot.maxFileBytes,
      sizeBytes: input.sizeBytes,
      slotCode: slot.slotCode,
    });
  }
}

function resolveQuotaScope(
  slot: SdkworkFileSlotDefinition,
  input: ManagedDriveUploadInput,
): { scopeId: string; scopeType: "app" | "organization" | "space" | "tenant" | "user" } {
  switch (slot.quotaAccountScope) {
    case "app":
      return { scopeId: slot.appId, scopeType: "app" };
    case "organization":
      return { scopeId: requiredScopeValue(input.organizationId, "organization", slot.slotCode), scopeType: "organization" };
    case "space":
      return { scopeId: requiredScopeValue(input.spaceId, "space", slot.slotCode), scopeType: "space" };
    case "tenant":
      return { scopeId: requiredScopeValue(input.tenantId, "tenant", slot.slotCode), scopeType: "tenant" };
    case "user":
      return { scopeId: requiredScopeValue(input.userId, "user", slot.slotCode), scopeType: "user" };
  }
}

function requiredScopeValue(value: string | undefined, scopeType: string, slotCode: string): string {
  if (!value?.trim()) {
    throw new FilePlatformServiceError("file.quota_scope_missing", "Quota scope value is required for this file slot.", {
      scopeType,
      slotCode,
    });
  }
  return value.trim();
}

function normalizeMime(value: string): string {
  return value.trim().toLowerCase();
}

function inferUploadProfile(contentType: string, filename: string): FileUploadProfile {
  const normalizedContentType = normalizeMime(contentType);
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
