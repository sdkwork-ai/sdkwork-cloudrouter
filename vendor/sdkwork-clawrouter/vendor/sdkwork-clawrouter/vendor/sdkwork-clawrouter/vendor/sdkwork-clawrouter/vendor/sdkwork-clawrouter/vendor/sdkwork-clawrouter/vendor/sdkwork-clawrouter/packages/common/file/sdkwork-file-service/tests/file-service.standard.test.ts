import { describe, expect, it } from "vitest";

import {
  createDriveNode,
  createDriveSpace,
  createFileSlotDefinition,
  createStorageUsageSnapshot,
} from "../../sdkwork-file-contracts/src/index";
import { createUnsupportedFilePlatformPorts, type FilePlatformPorts } from "../../sdkwork-file-sdk-ports/src/index";
import {
  FilePlatformServiceError,
  createFilePlatformService,
  isFilePlatformServiceError,
} from "../src/index";

const iconSlot = createFileSlotDefinition({
  allowedMimeTypes: ["image/png", "image/jpeg"],
  appId: "app-center",
  businessDomain: "apps",
  cardinality: "single",
  displayName: "App icon",
  maxFileBytes: 5 * 1024 * 1024,
  ownerScope: "organization",
  quotaAccountScope: "organization",
  slotCode: "app.icon",
});

describe("SDKWork file service", () => {
  it("uploads files only after slot validation and quota reservation", async () => {
    const events: string[] = [];
    const ports = createRecordingPorts(events);
    const service = createFilePlatformService({ ports, slots: [iconSlot] });

    const result = await service.uploadFile({
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

    expect(events).toEqual([
      "usage.reserveUploadQuota:organization:org_1:1024:idem-create",
      "upload.uploadFile:app.icon:icon.png:image",
    ]);
    expect(result).toEqual({
      driveNodeId: "node_upload_1",
      driveSpaceId: "space_org",
      driveUri: "drive://spaces/space_org/nodes/node_upload_1",
      fileRef: {
        displayName: "icon.png",
        fileId: "node_upload_1",
        purpose: "app.icon",
        visibility: "private",
      },
      quotaReservationId: "quota_1",
      requestId: "req-create",
      slotCode: "app.icon",
      status: "active",
      uploadId: "upload_1",
    });
  });

  it("releases reserved quota when Drive upload fails", async () => {
    const events: string[] = [];
    const ports = createRecordingPorts(events, { failUpload: true });
    const service = createFilePlatformService({ ports, slots: [iconSlot] });

    await expect(
      service.uploadFile({
        contentType: "image/png",
        file: createTestFile("icon.png", "image/png", 1024),
        filename: "icon.png",
        idempotencyKey: "idem-fail",
        organizationId: "org_1",
        requestId: "req-fail",
        sizeBytes: 1024,
        slotCode: "app.icon",
        target: { id: "app_1", type: "app" },
        tenantId: "tenant_1",
        userId: "user_1",
      }),
    ).rejects.toThrow("Drive upload failed");

    expect(events).toEqual([
      "usage.reserveUploadQuota:organization:org_1:1024:idem-fail",
      "upload.uploadFile:app.icon:icon.png:image",
      "usage.releaseUploadQuota:quota_1",
    ]);
  });

  it("rejects uploads that violate slot MIME and size policy before reserving quota", async () => {
    const events: string[] = [];
    const service = createFilePlatformService({ ports: createRecordingPorts(events), slots: [iconSlot] });

    await expect(
      service.uploadFile({
        contentType: "image/gif",
        file: createTestFile("icon.gif", "image/gif", 1024),
        filename: "icon.gif",
        idempotencyKey: "idem-gif",
        organizationId: "org_1",
        requestId: "req-gif",
        sizeBytes: 1024,
        slotCode: "app.icon",
        target: { id: "app_1", type: "app" },
      }),
    ).rejects.toMatchObject({ code: "file.slot_mime_not_allowed" });

    await expect(
      service.uploadFile({
        contentType: "image/png",
        file: createTestFile("huge.png", "image/png", 6 * 1024 * 1024),
        filename: "huge.png",
        idempotencyKey: "idem-huge",
        organizationId: "org_1",
        requestId: "req-huge",
        sizeBytes: 6 * 1024 * 1024,
        slotCode: "app.icon",
        target: { id: "app_1", type: "app" },
      }),
    ).rejects.toMatchObject({ code: "file.slot_file_too_large" });

    expect(events).toEqual([]);
  });

  it("completes legacy uploads with the slot code as purpose and returns stable file refs", async () => {
    const events: string[] = [];
    const service = createFilePlatformService({ ports: createRecordingPorts(events), slots: [iconSlot] });

    const result = await service.completeUpload({
      checksum: { algorithm: "sha256", value: "abc" },
      idempotencyKey: "complete-1",
      requestId: "req-complete",
      sessionId: "upl_1",
      slotCode: "app.icon",
    });

    expect(events).toEqual(["upload.completeUpload:app.icon:upl_1"]);
    expect(result.fileRef).toEqual({
      fileId: "file_upl_1",
      purpose: "app.icon",
      visibility: "private",
    });
  });

  it("creates bindings through the binding port without exposing object storage internals", async () => {
    const events: string[] = [];
    const service = createFilePlatformService({ ports: createRecordingPorts(events), slots: [iconSlot] });

    const result = await service.bindFile({
      fileId: "file_1",
      requestId: "req-bind",
      slotCode: "app.icon",
      target: { id: "app_1", type: "app" },
      versionId: "ver_1",
    });

    expect(events).toEqual([
      "binding.listBindings:app.icon:app_1",
      "binding.createBinding:app.icon:app_1",
    ]);
    expect(result.fileRef).toEqual({
      bindingId: "bind_file_1",
      fileId: "file_1",
      purpose: "app.icon",
      versionId: "ver_1",
      visibility: "private",
    });
    expect(result.fileRef).not.toHaveProperty("objectKey");
  });

  it("rejects new bindings when slot cardinality is already full", async () => {
    const events: string[] = [];
    const service = createFilePlatformService({
      ports: createRecordingPorts(events, {
        bindings: [
          {
            bindingId: "bind_existing",
            displayName: "Existing icon",
            fileId: "file_existing",
            purpose: "app.icon",
            visibility: "private",
          },
        ],
      }),
      slots: [iconSlot],
    });

    await expect(
      service.bindFile({
        fileId: "file_new",
        requestId: "req-bind-new",
        slotCode: "app.icon",
        target: { id: "app_1", type: "app" },
      }),
    ).rejects.toMatchObject({
      code: "file.slot_cardinality_exceeded",
    });
    expect(events).toEqual(["binding.listBindings:app.icon:app_1"]);
  });

  it("lists and deletes bindings through business-facing service methods", async () => {
    const events: string[] = [];
    const service = createFilePlatformService({
      ports: createRecordingPorts(events, {
        bindings: [
          {
            bindingId: "bind_file_1",
            displayName: "App Icon",
            fileId: "file_1",
            purpose: "app.icon",
            visibility: "private",
          },
        ],
      }),
      slots: [iconSlot],
    });

    const bindings = await service.listBindings({
      requestId: "req-bindings",
      slotCode: "app.icon",
      target: { id: "app_1", type: "app" },
    });
    const deleted = await service.deleteBinding({
      bindingId: "bind_file_1",
      requestId: "req-delete-binding",
    });

    expect(bindings.items).toEqual([
      {
        bindingId: "bind_file_1",
        displayName: "App Icon",
        fileId: "file_1",
        purpose: "app.icon",
        visibility: "private",
      },
    ]);
    expect(deleted).toEqual({
      bindingId: "bind_file_1",
      requestId: "req-delete-binding",
    });
    expect(bindings.items[0]).not.toHaveProperty("objectKey");
    expect(events).toEqual([
      "binding.listBindings:app.icon:app_1",
      "binding.deleteBinding:bind_file_1",
    ]);
  });

  it("lists pickable files and reads usage through standard service methods", async () => {
    const events: string[] = [];
    const service = createFilePlatformService({ ports: createRecordingPorts(events), slots: [iconSlot] });

    const files = await service.listFiles({
      purpose: "app.icon",
      requestId: "req-files",
      target: { id: "app_1", type: "app" },
    });
    const usage = await service.getStorageUsage({
      requestId: "req-usage",
      scopeId: "org_1",
      scopeType: "organization",
    });

    expect(files.items).toEqual([
      {
        fileId: "file_1",
        purpose: "app.icon",
        visibility: "private",
      },
    ]);
    expect(usage).toEqual({
      fileCount: 1,
      objectCount: 1,
      quotaLimitBytes: 4096,
      requestId: "req-usage",
      retainedBytes: 128,
      scopeId: "org_1",
      scopeType: "organization",
      trashBytes: 64,
      usedBillableBytes: 1024,
      usedLogicalBytes: 1024,
      usedPhysicalBytes: 2048,
      variantBytes: 32,
      versionCount: 1,
    });
    expect(events).toEqual([
      "access.listFiles:app.icon:app_1",
      "usage.getCurrentUsage:organization:org_1",
    ]);
  });

  it("gets files and issues short-lived access URLs through access ports", async () => {
    const events: string[] = [];
    const service = createFilePlatformService({ ports: createRecordingPorts(events), slots: [iconSlot] });

    const file = await service.getFile({ fileId: "file_1", requestId: "req-file" });
    const preview = await service.issuePreviewUrl({ fileId: "file_1", requestId: "req-preview" });
    const download = await service.issueDownloadUrl({
      fileId: "file_1",
      requestId: "req-download",
      versionId: "ver_1",
    });

    expect(file.fileRef).toEqual({
      displayName: "App Icon",
      fileId: "file_1",
      purpose: "app.icon",
      visibility: "private",
    });
    expect(preview).toEqual({
      expiresAt: "2026-05-23T08:10:00.000Z",
      requestId: "req-preview",
      url: "https://download.example.test/preview/file_1",
    });
    expect(download).toEqual({
      expiresAt: "2026-05-23T08:10:00.000Z",
      requestId: "req-download",
      url: "https://download.example.test/files/file_1?version=ver_1",
    });
    expect(events).toEqual([
      "access.getFile:file_1",
      "access.issuePreviewUrl:file_1:current",
      "access.issueDownloadUrl:file_1:ver_1",
    ]);
  });

  it("lists drive spaces and nodes through typed drive ports", async () => {
    const events: string[] = [];
    const service = createFilePlatformService({ ports: createRecordingPorts(events), slots: [iconSlot] });

    const spaces = await service.listDriveSpaces({ requestId: "req-spaces" });
    const nodes = await service.listDriveNodes({
      parentNodeId: "node_root",
      requestId: "req-nodes",
      spaceId: "space_org",
    });

    expect(spaces.items).toEqual([
      {
        name: "Organization Files",
        organizationId: "org_1",
        spaceId: "space_org",
        status: "active",
        type: "organization_drive",
      },
    ]);
    expect(nodes.items).toEqual([
      {
        depth: 1,
        fileId: "file_1",
        name: "Course Notes.pdf",
        nodeId: "node_file",
        nodeType: "file",
        parentNodeId: "node_root",
        pathSegment: "course-notes-pdf",
        sizeBytes: 4096,
        spaceId: "space_org",
        trashed: false,
      },
    ]);
    expect(events).toEqual([
      "drive.listSpaces",
      "drive.listNodes:space_org:node_root",
    ]);
    expect(nodes.items[0]).not.toHaveProperty("objectKey");
  });

  it("aborts uploads and releases quota reservations when provided", async () => {
    const events: string[] = [];
    const service = createFilePlatformService({ ports: createRecordingPorts(events), slots: [iconSlot] });

    const result = await service.abortUpload({
      quotaReservationId: "quota_1",
      requestId: "req-abort",
      sessionId: "upl_1",
    });

    expect(events).toEqual([
      "upload.abortUpload:upl_1",
      "usage.releaseUploadQuota:quota_1",
    ]);
    expect(result.status).toBe("aborted");
  });

  it("provides typed service errors for callers", () => {
    const error = new FilePlatformServiceError("file.slot_not_found", "Slot not found.", {
      slotCode: "missing.slot",
    });
    expect(isFilePlatformServiceError(error)).toBe(true);
    expect(error.details).toEqual({ slotCode: "missing.slot" });
  });
});

function createRecordingPorts(
  events: string[],
  options: {
    bindings?: Array<{ bindingId?: string; displayName?: string; fileId: string; purpose: string; visibility: "private" | "restricted" | "shared" }>;
    failUpload?: boolean;
  } = {},
): FilePlatformPorts {
  const ports = createUnsupportedFilePlatformPorts();
  return {
    ...ports,
    binding: {
      ...ports.binding,
      async createBinding(input) {
        events.push(`binding.createBinding:${input.purpose}:${input.target.id}`);
        return {
          fileRef: {
            bindingId: `bind_${input.fileId}`,
            fileId: input.fileId,
            purpose: input.purpose,
            ...(input.versionId ? { versionId: input.versionId } : {}),
            visibility: "private",
          },
          requestId: input.requestId,
        };
      },
      async deleteBinding(input) {
        events.push(`binding.deleteBinding:${input.bindingId}`);
        return {
          bindingId: input.bindingId,
          requestId: input.requestId,
        };
      },
      async listBindings(input) {
        events.push(`binding.listBindings:${input.purpose}:${input.target.id}`);
        return {
          items: options.bindings ?? [],
          requestId: input.requestId,
        };
      },
    },
    access: {
      ...ports.access,
      async getFile(input) {
        events.push(`access.getFile:${input.fileId}`);
        return {
          fileRef: {
            displayName: "App Icon",
            fileId: input.fileId,
            purpose: "app.icon",
            visibility: "private",
          },
          requestId: input.requestId,
        };
      },
      async issueDownloadUrl(input) {
        events.push(`access.issueDownloadUrl:${input.fileId}:${input.versionId ?? "current"}`);
        return {
          expiresAt: "2026-05-23T08:10:00.000Z",
          requestId: input.requestId,
          url: `https://download.example.test/files/${input.fileId}?version=${input.versionId ?? "current"}`,
        };
      },
      async issuePreviewUrl(input) {
        events.push(`access.issuePreviewUrl:${input.fileId}:${input.versionId ?? "current"}`);
        return {
          expiresAt: "2026-05-23T08:10:00.000Z",
          requestId: input.requestId,
          url: `https://download.example.test/preview/${input.fileId}`,
        };
      },
      async listFiles(input) {
        events.push(`access.listFiles:${input.purpose}:${input.target.id}`);
        return {
          items: [
            {
              fileId: "file_1",
              purpose: input.purpose ?? "app.icon",
              visibility: "private",
            },
          ],
          requestId: input.requestId,
        };
      },
    },
    drive: {
      ...ports.drive,
      async listNodes(input) {
        events.push(`drive.listNodes:${input.spaceId}:${input.parentNodeId}`);
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
          requestId: input.requestId,
        };
      },
      async listSpaces(input) {
        events.push("drive.listSpaces");
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
    },
    upload: {
      ...ports.upload,
      async abortUpload(input) {
        events.push(`upload.abortUpload:${input.sessionId}`);
        return { requestId: input.requestId, sessionId: input.sessionId, status: "aborted" };
      },
      async completeUpload(input) {
        events.push(`upload.completeUpload:${input.purpose}:${input.sessionId}`);
        return {
          fileRef: {
            fileId: `file_${input.sessionId}`,
            purpose: input.purpose,
            visibility: "private",
          },
          requestId: input.requestId,
          sessionId: input.sessionId,
          status: "active",
        };
      },
      async uploadFile(input) {
        events.push(`upload.uploadFile:${input.purpose}:${input.filename}:${input.uploadProfileCode}`);
        if (options.failUpload) {
          throw new Error("Drive upload failed");
        }
        return {
          driveNodeId: "node_upload_1",
          driveSpaceId: input.spaceId ?? "space_org",
          driveUri: `drive://spaces/${input.spaceId ?? "space_org"}/nodes/node_upload_1`,
          fileRef: {
            displayName: input.filename,
            fileId: "node_upload_1",
            purpose: input.purpose,
            visibility: "private",
          },
          requestId: input.requestId,
          status: "active",
          uploadId: "upload_1",
        };
      },
    },
    usage: {
      ...ports.usage,
      async getCurrentUsage() {
        events.push("usage.getCurrentUsage:organization:org_1");
        return createStorageUsageSnapshot({
          fileCount: 1,
          objectCount: 1,
          quotaLimitBytes: 4096,
          requestId: "req-usage",
          retainedBytes: 128,
          scopeId: "org_1",
          scopeType: "organization",
          trashBytes: 64,
          usedBillableBytes: 1024,
          usedLogicalBytes: 1024,
          usedPhysicalBytes: 2048,
          variantBytes: 32,
          versionCount: 1,
        });
      },
      async releaseUploadQuota(input) {
        events.push(`usage.releaseUploadQuota:${input.reservationId}`);
        return { released: true, requestId: input.requestId, reservationId: input.reservationId };
      },
      async reserveUploadQuota(input) {
        events.push(`usage.reserveUploadQuota:${input.scopeType}:${input.scopeId}:${input.billableBytes}:${input.idempotencyKey}`);
        return {
          expiresAt: "2026-05-23T08:10:00.000Z",
          requestId: input.requestId,
          reservationId: "quota_1",
        };
      },
    },
  };
}

function createTestFile(name: string, type: string, size: number): Blob & { name: string } {
  return Object.assign(new Blob([new Uint8Array(size)], { type }), { name });
}
