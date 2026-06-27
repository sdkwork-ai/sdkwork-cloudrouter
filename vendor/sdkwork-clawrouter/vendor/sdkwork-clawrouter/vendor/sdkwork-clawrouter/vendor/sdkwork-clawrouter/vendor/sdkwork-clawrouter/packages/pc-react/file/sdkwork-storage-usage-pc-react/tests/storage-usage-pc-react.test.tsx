import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import { createStorageUsageSnapshot } from "../../../../common/file/sdkwork-file-contracts/src/index";
import type { FilePlatformService } from "../../../../common/file/sdkwork-file-service/src/index";
import {
  StorageQuotaCard,
  StorageUsageBar,
  calculateQuotaPercent,
  formatStorageBytes,
} from "../src/index";

afterEach(() => {
  cleanup();
});

describe("SDKWork storage usage PC React blocks", () => {
  it("formats storage bytes and calculates bounded quota percentages", () => {
    expect(formatStorageBytes(512)).toBe("512 B");
    expect(formatStorageBytes(1536)).toBe("1.5 KB");
    expect(formatStorageBytes(2 * 1024 * 1024)).toBe("2 MB");
    expect(calculateQuotaPercent(50, 100)).toBe(50);
    expect(calculateQuotaPercent(150, 100)).toBe(100);
    expect(calculateQuotaPercent(10, undefined)).toBe(0);
  });

  it("renders a quota bar with accessible bounded progress values", () => {
    render(
      <StorageUsageBar
        label="Organization storage"
        quotaBytes={3 * 1024 * 1024}
        usedBytes={1536 * 1024}
      />,
    );

    const progress = screen.getByRole("progressbar", { name: "Organization storage" });
    expect(progress.getAttribute("aria-valuemin")).toBe("0");
    expect(progress.getAttribute("aria-valuemax")).toBe("100");
    expect(progress.getAttribute("aria-valuenow")).toBe("50");
    expect(screen.getByText("1.5 MB")).not.toBeNull();
    expect(screen.getByText("3 MB")).not.toBeNull();
  });

  it("loads scoped usage through the file service and hides storage internals", async () => {
    const events: string[] = [];
    render(
      <StorageQuotaCard
        scopeId="org_1"
        scopeType="organization"
        service={createUsageService(events)}
        title="Organization storage"
      />,
    );

    await screen.findByText("Billable bytes");

    expect(events).toEqual(["usage:organization:org_1:storage-usage:organization:org_1"]);
    expect(screen.getByRole("region", { name: "Organization storage" })).not.toBeNull();
    expect(screen.getByRole("progressbar", { name: "Organization storage quota" }).getAttribute("aria-valuenow")).toBe("25");
    expect(screen.getByText("Logical bytes")).not.toBeNull();
    expect(screen.getByText("2 MB")).not.toBeNull();
    expect(screen.getByText("Physical bytes")).not.toBeNull();
    expect(screen.getByText("3 MB")).not.toBeNull();
    expect(screen.getByText("Billable bytes")).not.toBeNull();
    expect(screen.getAllByText("1 MB")).toHaveLength(2);
    expect(screen.getByText("Files")).not.toBeNull();
    expect(screen.getByText("4")).not.toBeNull();
    expect(screen.queryByText(/ledger|provider|bucket|objectKey|presigned/i)).toBeNull();
  });

  it("reports usage loading failures through UI state and callback", async () => {
    const events: string[] = [];
    render(
      <StorageQuotaCard
        onError={(error) => events.push(error.message)}
        scopeId="user_1"
        scopeType="user"
        service={createFailingUsageService()}
      />,
    );

    await screen.findByText("Unable to load storage usage");
    expect(events).toEqual(["usage unavailable"]);
  });
});

function createUsageService(events: string[]): FilePlatformService {
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
    async getStorageUsage(input) {
      events.push(`usage:${input.scopeType}:${input.scopeId}:${input.requestId}`);
      return createStorageUsageSnapshot({
        fileCount: 4,
        objectCount: 5,
        quotaLimitBytes: 4 * 1024 * 1024,
        requestId: input.requestId,
        retainedBytes: 512 * 1024,
        scopeId: input.scopeId,
        scopeType: input.scopeType,
        trashBytes: 256 * 1024,
        usedBillableBytes: 1024 * 1024,
        usedLogicalBytes: 2 * 1024 * 1024,
        usedPhysicalBytes: 3 * 1024 * 1024,
        variantBytes: 128 * 1024,
        versionCount: 6,
      });
    },
    getSlot() {
      return undefined;
    },
    async listFiles() {
      throw new Error("not used");
    },
  };
}

function createFailingUsageService(): FilePlatformService {
  return {
    ...createUsageService([]),
    async getStorageUsage() {
      throw new Error("usage unavailable");
    },
  };
}
