import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import { createDriveNode, createDriveSpace } from "../../../../common/file/sdkwork-file-contracts/src/index";
import type { FilePlatformService } from "../../../../common/file/sdkwork-file-service/src/index";
import { DriveBrowser, DriveNodeList, DriveSpaceTabs } from "../src/index";

afterEach(() => {
  cleanup();
});

describe("SDKWork drive PC React blocks", () => {
  it("renders drive spaces as selectable tabs", () => {
    const selected: string[] = [];
    render(
      <DriveSpaceTabs
        onSelectSpace={(space) => selected.push(space.spaceId)}
        selectedSpaceId="space_org"
        spaces={[
          createDriveSpace({ name: "My Drive", ownerUserId: "user_1", spaceId: "space_user", type: "user_drive" }),
          createDriveSpace({ name: "Organization Files", organizationId: "org_1", spaceId: "space_org", type: "organization_drive" }),
        ]}
      />,
    );

    expect(screen.getByRole("tab", { name: "Organization Files" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("tab", { name: "My Drive" }));
    expect(selected).toEqual(["space_user"]);
  });

  it("renders folders and files without exposing storage internals", () => {
    const opened: string[] = [];
    const selected: string[] = [];
    render(
      <DriveNodeList
        nodes={[
          createDriveNode({ depth: 1, name: "Course Assets", nodeId: "node_folder", nodeType: "folder", spaceId: "space_org" }),
          createDriveNode({ depth: 1, fileId: "file_notes", name: "Course Notes.pdf", nodeId: "node_file", nodeType: "file", sizeBytes: 2048, spaceId: "space_org" }),
        ]}
        onOpenFolder={(node) => opened.push(node.nodeId)}
        onSelectFile={(node) => selected.push(node.fileId ?? "")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Course Assets" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Course Notes.pdf" }));

    expect(opened).toEqual(["node_folder"]);
    expect(selected).toEqual(["file_notes"]);
    expect(screen.getByText("2 KB")).not.toBeNull();
    expect(screen.queryByText(/bucket|objectKey|presigned|provider/i)).toBeNull();
  });

  it("loads spaces and nodes through the file service", async () => {
    const events: string[] = [];
    const selectedFiles: string[] = [];
    render(
      <DriveBrowser
        onSelectFile={(node) => selectedFiles.push(node.fileId ?? "")}
        service={createDriveService(events)}
        title="Files"
      />,
    );

    await screen.findByRole("region", { name: "Files" });
    await screen.findByText("Organization Files");
    await screen.findByText("Course Assets");

    expect(events).toEqual([
      "spaces:drive:spaces",
      "nodes:space_org::drive:nodes:space_org:root",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Open Course Assets" }));
    await screen.findByText("Course Notes.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Select Course Notes.pdf" }));

    expect(selectedFiles).toEqual(["file_notes"]);
    expect(events).toEqual([
      "spaces:drive:spaces",
      "nodes:space_org::drive:nodes:space_org:root",
      "nodes:space_org:node_folder:drive:nodes:space_org:node_folder",
    ]);
    expect(within(screen.getByRole("region", { name: "Files" })).queryByText(/objectKey|presigned/i)).toBeNull();
  });
});

function createDriveService(events: string[]): FilePlatformService {
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
    async listDriveNodes(input) {
      events.push(`nodes:${input.spaceId}:${input.parentNodeId ?? ""}:${input.requestId}`);
      const isRoot = !input.parentNodeId;
      return {
        items: isRoot
          ? [
              createDriveNode({ depth: 1, name: "Course Assets", nodeId: "node_folder", nodeType: "folder", spaceId: input.spaceId }),
            ]
          : [
              createDriveNode({ depth: 2, fileId: "file_notes", name: "Course Notes.pdf", nodeId: "node_file", nodeType: "file", parentNodeId: input.parentNodeId, sizeBytes: 2048, spaceId: input.spaceId }),
            ],
        requestId: input.requestId,
      };
    },
    async listDriveSpaces(input) {
      events.push(`spaces:${input.requestId}`);
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
    async listFiles() {
      throw new Error("not used");
    },
  };
}
