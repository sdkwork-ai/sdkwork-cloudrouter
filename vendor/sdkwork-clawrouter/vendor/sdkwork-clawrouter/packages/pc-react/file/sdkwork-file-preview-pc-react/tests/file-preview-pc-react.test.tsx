import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import type { SdkworkFileRef } from "../../../../common/file/sdkwork-file-contracts/src/index";
import type { FilePlatformService } from "../../../../common/file/sdkwork-file-service/src/index";
import { FileAccessActions, FilePreviewSummary } from "../src/index";

afterEach(() => {
  cleanup();
});

const fileRef: SdkworkFileRef = {
  displayName: "Course Notes",
  fileId: "file_notes",
  purpose: "course.attachment",
  versionId: "ver_1",
  visibility: "restricted",
};

describe("SDKWork file preview PC React blocks", () => {
  it("renders file preview summary from FileRef metadata only", () => {
    render(<FilePreviewSummary file={fileRef} title="Preview" />);

    expect(screen.getByRole("region", { name: "Preview" })).not.toBeNull();
    expect(screen.getByText("Course Notes")).not.toBeNull();
    expect(screen.getByText("course.attachment")).not.toBeNull();
    expect(screen.queryByText(/bucket|objectKey|presigned|provider/i)).toBeNull();
  });

  it("issues preview and download URLs only through service callbacks", async () => {
    const events: string[] = [];
    const urls: string[] = [];
    render(
      <FileAccessActions
        file={fileRef}
        onDownloadUrl={(result) => urls.push(`download:${result.url}`)}
        onPreviewUrl={(result) => urls.push(`preview:${result.url}`)}
        service={createAccessService(events)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Preview Course Notes" }));
    await screen.findByText("Preview ready");
    fireEvent.click(screen.getByRole("button", { name: "Download Course Notes" }));
    await screen.findByText("Download ready");

    expect(events).toEqual([
      "preview:file_notes:ver_1:file-preview:preview:file_notes:ver_1",
      "download:file_notes:ver_1:file-preview:download:file_notes:ver_1",
    ]);
    expect(urls).toEqual([
      "preview:https://access.example.test/preview/file_notes",
      "download:https://access.example.test/download/file_notes",
    ]);
    expect(screen.queryByText(/https:\/\/access\.example\.test/)).toBeNull();
  });

  it("reports access failures through UI state and callback", async () => {
    const events: string[] = [];
    render(
      <FileAccessActions
        file={fileRef}
        onError={(error) => events.push(error.message)}
        service={createFailingAccessService()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Preview Course Notes" }));
    await screen.findByText("Unable to issue file access URL");
    expect(events).toEqual(["access denied"]);
  });
});

function createAccessService(events: string[]): FilePlatformService {
  return {
    async abortUpload() {
      throw new Error("not used");
    },
    async bindFile() {
      throw new Error("not used");
    },
    async completeUpload() {
      throw new Error("not used");
    },
    async uploadFile() {
      throw new Error("not used");
    },
    async deleteBinding() {
      throw new Error("not used");
    },
    async getFile() {
      throw new Error("not used");
    },
    async getStorageUsage() {
      throw new Error("not used");
    },
    getSlot() {
      return undefined;
    },
    async issueDownloadUrl(input) {
      events.push(`download:${input.fileId}:${input.versionId ?? "current"}:${input.requestId}`);
      return {
        expiresAt: "2026-05-23T08:10:00.000Z",
        requestId: input.requestId,
        url: `https://access.example.test/download/${input.fileId}`,
      };
    },
    async issuePreviewUrl(input) {
      events.push(`preview:${input.fileId}:${input.versionId ?? "current"}:${input.requestId}`);
      return {
        expiresAt: "2026-05-23T08:10:00.000Z",
        requestId: input.requestId,
        url: `https://access.example.test/preview/${input.fileId}`,
      };
    },
    async listBindings() {
      throw new Error("not used");
    },
    async listDriveNodes() {
      throw new Error("not used");
    },
    async listDriveSpaces() {
      throw new Error("not used");
    },
    async listFiles() {
      throw new Error("not used");
    },
  };
}

function createFailingAccessService(): FilePlatformService {
  return {
    ...createAccessService([]),
    async issuePreviewUrl() {
      throw new Error("access denied");
    },
  };
}
