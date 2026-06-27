import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import type { FilePlatformService } from "../../../../common/file/sdkwork-file-service/src/index";
import { FileAttachmentList, FileAttachmentManager } from "../src/index";

afterEach(() => {
  cleanup();
});

describe("SDKWork file attachments PC React blocks", () => {
  it("renders stable file references as removable business attachments", () => {
    const removed: string[] = [];
    render(
      <FileAttachmentList
        files={[
          { bindingId: "bind_icon", displayName: "App Icon", fileId: "file_icon", purpose: "app.icon", visibility: "private" },
          { bindingId: "bind_notes", displayName: "Course Notes", fileId: "file_notes", purpose: "course.attachment", visibility: "restricted" },
        ]}
        onRemove={(file) => removed.push(file.bindingId ?? "")}
        title="Attachments"
      />,
    );

    const list = screen.getByRole("list", { name: "Attachments" });
    expect(within(list).getByText("App Icon")).not.toBeNull();
    expect(within(list).getByText("Course Notes")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Remove App Icon" }));
    expect(removed).toEqual(["bind_icon"]);
    expect(screen.queryByText(/bucket|objectKey|presigned|provider/i)).toBeNull();
  });

  it("loads and removes bindings through the file service", async () => {
    const events: string[] = [];
    render(
      <FileAttachmentManager
        service={createAttachmentService(events)}
        slotCode="course.attachment"
        target={{ id: "course_1", type: "course" }}
        title="Course attachments"
      />,
    );

    await screen.findByText("Course Notes");
    expect(events).toEqual(["list:course.attachment:course_1:file-attachments:list:course.attachment:course_1"]);

    fireEvent.click(screen.getByRole("button", { name: "Remove Course Notes" }));
    await screen.findByText("No attachments");

    expect(events).toEqual([
      "list:course.attachment:course_1:file-attachments:list:course.attachment:course_1",
      "delete:bind_notes:file-attachments:delete:bind_notes",
    ]);
  });

  it("reports loading failures through UI state and callback", async () => {
    const events: string[] = [];
    render(
      <FileAttachmentManager
        onError={(error) => events.push(error.message)}
        service={createFailingAttachmentService()}
        slotCode="course.attachment"
        target={{ id: "course_1", type: "course" }}
      />,
    );

    await screen.findByText("Unable to load attachments");
    expect(events).toEqual(["attachments unavailable"]);
  });
});

function createAttachmentService(events: string[]): FilePlatformService {
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
    async deleteBinding(input) {
      events.push(`delete:${input.bindingId}:${input.requestId}`);
      return {
        bindingId: input.bindingId,
        requestId: input.requestId,
      };
    },
    async getStorageUsage() {
      throw new Error("not used");
    },
    getSlot() {
      return undefined;
    },
    async listBindings(input) {
      events.push(`list:${input.slotCode}:${input.target.id}:${input.requestId}`);
      return {
        items: [
          {
            bindingId: "bind_notes",
            displayName: "Course Notes",
            fileId: "file_notes",
            purpose: "course.attachment",
            visibility: "restricted",
          },
        ],
        requestId: input.requestId,
      };
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

function createFailingAttachmentService(): FilePlatformService {
  return {
    ...createAttachmentService([]),
    async listBindings() {
      throw new Error("attachments unavailable");
    },
  };
}
