import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import type { FilePlatformService } from "../../../common/file/sdkwork-file-service/src/index";
import { FileUploadButton, FileUploadQueue, type FileUploadQueueItem } from "../src/index";

afterEach(() => {
  cleanup();
});

describe("SDKWork file upload PC React blocks", () => {
  it("uploads through the Drive-backed file service with only slot and target business inputs", async () => {
    const events: string[] = [];
    const service = createRecordingService(events);

    render(
      <FileUploadButton
        accept="image/png"
        label="Upload icon"
        service={service}
        slotCode="app.icon"
        target={{ id: "app_1", type: "app" }}
        onCompleted={(result) => events.push(`completed:${result.fileRef.fileId}:${result.fileRef.purpose}:${result.driveUri}`)}
      />,
    );

    const input = screen.getByLabelText("Upload icon input") as HTMLInputElement;
    const file = new File(["icon"], "icon.png", { type: "image/png" });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(events).toEqual([
        "service.uploadFile:app.icon:icon.png:app:app_1",
        "completed:node_1:app.icon:drive://spaces/space_1/nodes/node_1",
      ]);
    });

    expect(screen.getByRole("button", { name: "Upload icon" }).getAttribute("data-upload-status")).toBe("completed");
  });

  it("reports upload failures without leaking storage internals", async () => {
    const events: string[] = [];
    const service = createRecordingService(events);

    render(
      <FileUploadButton
        label="Upload file"
        service={service}
        slotCode="app.icon"
        target={{ id: "app_1", type: "app" }}
        onError={(error) => events.push(`error:${error.message}`)}
      />,
    );

    const input = screen.getByLabelText("Upload file input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["x"], "x.png", { type: "image/png" })] } });

    await waitFor(() => {
      expect(events).toEqual([
        "service.uploadFile:app.icon:x.png:app:app_1",
        "error:Drive upload failed",
      ]);
    });

    expect(screen.getByRole("button", { name: "Upload file" }).getAttribute("data-upload-status")).toBe("failed");
    expect(screen.queryByText(/objectKey|bucket|presigned/i)).toBeNull();
  });

  it("passes upload progress from the Drive-backed file service", async () => {
    const events: string[] = [];
    const service = createRecordingService(events);

    render(
      <FileUploadButton
        label="Upload large file"
        service={service}
        slotCode="course.video"
        target={{ id: "course_1", type: "course" }}
        onProgress={(progress) => events.push(`progress:${progress.status}:${progress.uploadedBytes}:${progress.totalBytes}`)}
      />,
    );

    const input = screen.getByLabelText("Upload large file input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["abcdef"], "video.mp4", { type: "video/mp4" })] } });

    await waitFor(() => {
      expect(events).toEqual([
        "service.uploadFile:course.video:video.mp4:course:course_1",
        "progress:completed:6:6",
      ]);
    });
  });

  it("renders stable upload queue state for host applications", () => {
    const items: FileUploadQueueItem[] = [
      { id: "1", filename: "icon.png", progress: 100, status: "completed" },
      { id: "2", filename: "video.mp4", progress: 42, status: "uploading" },
    ];

    render(<FileUploadQueue items={items} title="Uploads" />);

    expect(screen.getByRole("list", { name: "Uploads" })).not.toBeNull();
    expect(screen.getByText("icon.png")).not.toBeNull();
    expect(screen.getByText("completed")).not.toBeNull();
    expect(screen.getByText("42%")).not.toBeNull();
  });
});

function createRecordingService(events: string[]): FilePlatformService {
  return {
    async abortUpload(input) {
      events.push(`service.abortUpload:${input.sessionId}`);
      return { requestId: input.requestId, sessionId: input.sessionId, status: "aborted" };
    },
    async bindFile(input) {
      return {
        fileRef: {
          fileId: input.fileId,
          purpose: input.slotCode,
          visibility: "private",
        },
        requestId: input.requestId,
      };
    },
    async completeUpload(input) {
      events.push(`service.completeUpload:${input.slotCode}:${input.sessionId}`);
      return {
        fileRef: {
          fileId: "file_1",
          purpose: input.slotCode,
          visibility: "private",
        },
        requestId: input.requestId,
        sessionId: input.sessionId,
        status: "active",
      };
    },
    async uploadFile(input) {
      events.push(`service.uploadFile:${input.slotCode}:${input.filename}:${input.target.type}:${input.target.id}`);
      if (input.filename === "x.png") {
        throw new Error("Drive upload failed");
      }
      input.onProgress?.({
        status: "completed",
        uploadedBytes: input.sizeBytes,
        totalBytes: input.sizeBytes,
      });
      return {
        driveNodeId: "node_1",
        driveSpaceId: "space_1",
        driveUri: "drive://spaces/space_1/nodes/node_1",
        fileRef: {
          fileId: "node_1",
          purpose: input.slotCode,
          visibility: "private",
        },
        requestId: input.requestId,
        status: "active",
        uploadId: "upload_1",
      };
    },
    getSlot() {
      return undefined;
    },
  };
}
