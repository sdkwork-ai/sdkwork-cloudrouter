import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import type { FilePlatformService } from "../../../common/file/sdkwork-file-service/src/index";
import { FilePickerDialog, FileSelectedList } from "../src/index";

afterEach(() => {
  cleanup();
});

describe("SDKWork file picker PC React blocks", () => {
  it("loads pickable files through the file service and confirms selected FileRef values", async () => {
    const events: string[] = [];
    const service = createPickerService(events);

    render(
      <FilePickerDialog
        open
        service={service}
        slotCode="app.icon"
        target={{ id: "app_1", type: "app" }}
        title="Choose icon"
        onConfirm={(files) => events.push(`confirm:${files.map((file) => file.fileId).join(",")}`)}
      />,
    );

    await screen.findByRole("dialog", { name: "Choose icon" });
    expect(events).toEqual(["service.listFiles:app.icon:app_1"]);

    fireEvent.click(screen.getByRole("button", { name: "Select App Icon" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm selection" }));

    expect(events).toEqual([
      "service.listFiles:app.icon:app_1",
      "confirm:file_icon",
    ]);
  });

  it("supports multi-select without exposing storage internals", async () => {
    const events: string[] = [];
    render(
      <FilePickerDialog
        multiple
        open
        service={createPickerService(events)}
        slotCode="course.attachment"
        target={{ id: "course_1", type: "course" }}
        onConfirm={(files) => events.push(`confirm:${files.length}`)}
      />,
    );

    await screen.findByText("Course Notes");
    fireEvent.click(screen.getByRole("button", { name: "Select App Icon" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Course Notes" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm selection" }));

    expect(events).toContain("confirm:2");
    expect(screen.queryByText(/bucket|objectKey|presigned/i)).toBeNull();
  });

  it("renders selected file references as a stable business-facing list", () => {
    render(
      <FileSelectedList
        files={[
          { displayName: "App Icon", fileId: "file_icon", purpose: "app.icon", visibility: "private" },
          { bindingId: "bind_doc", displayName: "Course Notes", fileId: "file_doc", purpose: "course.attachment", visibility: "restricted" },
        ]}
        title="Selected files"
      />,
    );

    const selectedFiles = screen.getByRole("list", { name: "Selected files" });
    expect(selectedFiles).not.toBeNull();
    expect(within(selectedFiles).getByText("file_icon")).not.toBeNull();
    expect(within(selectedFiles).getByText("course.attachment")).not.toBeNull();
  });
});

function createPickerService(events: string[]): FilePlatformService {
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
    async getStorageUsage() {
      throw new Error("not used");
    },
    getSlot() {
      return undefined;
    },
    async listFiles(input) {
      events.push(`service.listFiles:${input.purpose}:${input.target?.id}`);
      return {
        items: [
          { displayName: "App Icon", fileId: "file_icon", purpose: "app.icon", visibility: "private" },
          { bindingId: "bind_doc", displayName: "Course Notes", fileId: "file_doc", purpose: "course.attachment", visibility: "restricted" },
        ],
        requestId: input.requestId,
      };
    },
  };
}
