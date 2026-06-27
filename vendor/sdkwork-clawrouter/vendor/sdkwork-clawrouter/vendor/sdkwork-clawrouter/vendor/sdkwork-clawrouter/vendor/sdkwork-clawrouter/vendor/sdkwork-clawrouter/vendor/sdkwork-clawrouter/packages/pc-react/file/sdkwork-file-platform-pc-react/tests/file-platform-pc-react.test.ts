import { describe, expect, it } from "vitest";

import {
  DriveBrowser,
  DriveNodeList,
  DriveSpaceTabs,
  FileAccessActions,
  FileAttachmentList,
  FileAttachmentManager,
  FilePickerDialog,
  FilePreviewSummary,
  FileSelectedList,
  FileUploadButton,
  FileUploadQueue,
  StorageQuotaCard,
  StorageOperationsSettings,
  StorageUsageBar,
  calculateQuotaPercent,
  formatDriveStorageBytes,
  formatUsageStorageBytes,
} from "../src/index";

describe("SDKWork file platform PC React aggregate exports", () => {
  it("exports all file platform building-block components from one package", () => {
    expect(FileUploadButton).toBeTypeOf("function");
    expect(FileUploadQueue).toBeTypeOf("function");
    expect(FilePickerDialog).toBeTypeOf("function");
    expect(FileSelectedList).toBeTypeOf("function");
    expect(FileAttachmentList).toBeTypeOf("function");
    expect(FileAttachmentManager).toBeTypeOf("function");
    expect(FilePreviewSummary).toBeTypeOf("function");
    expect(FileAccessActions).toBeTypeOf("function");
    expect(DriveSpaceTabs).toBeTypeOf("function");
    expect(DriveNodeList).toBeTypeOf("function");
    expect(DriveBrowser).toBeTypeOf("function");
    expect(StorageUsageBar).toBeTypeOf("function");
    expect(StorageQuotaCard).toBeTypeOf("function");
    expect(StorageOperationsSettings).toBeTypeOf("function");
  });

  it("aliases duplicate byte-format helpers so host apps can import deterministically", () => {
    expect(formatDriveStorageBytes(1024)).toBe("1 KB");
    expect(formatUsageStorageBytes(1024)).toBe("1 KB");
    expect(calculateQuotaPercent(512, 1024)).toBe(50);
  });
});
