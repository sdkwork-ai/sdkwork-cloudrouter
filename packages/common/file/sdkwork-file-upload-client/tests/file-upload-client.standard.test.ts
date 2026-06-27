import { describe, expect, it } from "vitest";

import {
  FileUploadClientError,
  createDriveFileUploadClient,
  createFileUploadClient,
} from "../src/index";
import type {
  FileUploadProgress,
  UploadFileInput,
  UploadFileResult,
} from "../../sdkwork-file-sdk-ports/src/index";

describe("SDKWork file upload client", () => {
  it("delegates uploads to an injected Drive uploader", async () => {
    const progress: FileUploadProgress[] = [];
    const calls: UploadFileInput[] = [];
    const expected = createUploadResult("node_avatar");
    const client = createDriveFileUploadClient({
      uploadFile: async (input) => {
        calls.push(input);
        input.onProgress?.({
          status: "completed",
          totalBytes: input.sizeBytes,
          uploadedBytes: input.sizeBytes,
          totalParts: 1,
          uploadedPartsCount: 1,
        });
        return expected;
      },
    });

    const result = await client.uploadFile(createUploadInput(progress));

    expect(result).toEqual(expected);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      appId: "sdkwork-clawrouter-pc",
      appResourceId: "profile_draft_1",
      appResourceType: "profile_avatar",
      contentType: "image/png",
      filename: "avatar.png",
      purpose: "avatar",
      scene: "profile_settings",
      sizeBytes: 6,
      source: "pc_file_picker",
      tenantId: "tenant_1",
      uploadProfileCode: "avatar",
      userId: "user_1",
    });
    expect(progress).toEqual([
      {
        status: "completed",
        totalBytes: 6,
        uploadedBytes: 6,
        totalParts: 1,
        uploadedPartsCount: 1,
      },
    ]);
    expect(result.driveUri).toBe("drive://spaces/space_upload/nodes/node_avatar");
    expect(result).not.toHaveProperty("url");
    expect(result).not.toHaveProperty("objectKey");
  });

  it("keeps the legacy createFileUploadClient export as a Drive uploader alias", async () => {
    const result = createUploadResult("node_alias");
    const client = createFileUploadClient({
      uploadFile: async () => result,
    });

    await expect(client.uploadFile(createUploadInput())).resolves.toEqual(result);
  });

  it("fails fast when no Drive uploader is supplied", () => {
    expect(() =>
      createDriveFileUploadClient({
        uploadFile: undefined as unknown as (input: UploadFileInput) => Promise<UploadFileResult>,
      }),
    ).toThrow(FileUploadClientError);
  });
});

function createUploadInput(progress: FileUploadProgress[] = []): UploadFileInput {
  return {
    appId: "sdkwork-clawrouter-pc",
    appResourceId: "profile_draft_1",
    appResourceType: "profile_avatar",
    contentType: "image/png",
    file: new File(["avatar"], "avatar.png", { type: "image/png" }),
    filename: "avatar.png",
    idempotencyKey: "idem_avatar",
    onProgress: (event) => progress.push(event),
    operatorId: "user_1",
    purpose: "avatar",
    requestId: "req_avatar",
    retention: {
      mode: "long_term",
    },
    scene: "profile_settings",
    sizeBytes: 6,
    source: "pc_file_picker",
    target: {
      id: "profile_draft_1",
      type: "profile",
    },
    tenantId: "tenant_1",
    uploadProfileCode: "avatar",
    userId: "user_1",
  };
}

function createUploadResult(nodeId: string): UploadFileResult {
  return {
    driveNodeId: nodeId,
    driveSpaceId: "space_upload",
    driveUri: `drive://spaces/space_upload/nodes/${nodeId}`,
    fileRef: {
      displayName: "avatar.png",
      fileId: nodeId,
      purpose: "avatar",
      visibility: "private",
    },
    requestId: "req_avatar",
    status: "active",
    uploadId: "upload_avatar",
  };
}
