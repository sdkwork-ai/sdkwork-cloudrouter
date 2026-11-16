/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppModerationPanel } from "../src";
import { useApplicationCatalogMessages } from "../src/i18n";
import type { AppStoreModerationService } from "../src";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function createService(): AppStoreModerationService {
  return {
    listQueue: vi.fn().mockResolvedValue({
      items: [{
        reviewId: "rev-1",
        listingId: "listing-1",
        listingName: "Acme Notes",
        submissionType: "METADATA",
        reviewStatus: "PENDING",
        submittedAt: "2026-11-01T00:00:00Z",
      }],
      hasMore: false,
      total: 1,
    }),
    decide: vi.fn().mockResolvedValue(undefined),
    getReview: vi.fn().mockResolvedValue({
      reviewId: "rev-1",
      listingId: "listing-1",
      listingName: "Acme Notes",
      submissionType: "METADATA",
      reviewStatus: "PENDING",
      attributes: { changelog: "Fix crash" },
    }),
  };
}

function Harness({ service }: { service: AppStoreModerationService }) {
  const messages = useApplicationCatalogMessages();
  return <AppModerationPanel messages={messages} service={service} />;
}

describe("App Store moderation panel", () => {
  it("lists pending reviews and records an approval", async () => {
    const service = createService();
    render(
      <SdkworkI18nProvider locale="zh-CN">
        <Harness service={service} />
      </SdkworkI18nProvider>,
    );

    expect(await screen.findByText("Acme Notes")).toBeTruthy();
    expect(service.listQueue).toHaveBeenCalledWith({ reviewStatus: "PENDING", pageSize: 50 });
    fireEvent.click(screen.getByRole("button", { name: "审核" }));

    expect(await screen.findByText("提交审核决定")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "提交决定" }));

    await waitFor(() => expect(service.decide).toHaveBeenCalledTimes(1));
    expect(service.decide).toHaveBeenCalledWith("rev-1", { decisionType: "APPROVE" });
  });

  it("opens the review detail inspector with raw submission fields", async () => {
    const service = createService();
    render(
      <SdkworkI18nProvider locale="zh-CN">
        <Harness service={service} />
      </SdkworkI18nProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "详情" }));
    expect(await screen.findByText("审核详情")).toBeTruthy();
    await waitFor(() => expect(service.getReview).toHaveBeenCalledWith("rev-1"));
    expect(await screen.findByText("Fix crash")).toBeTruthy();
  });
});
