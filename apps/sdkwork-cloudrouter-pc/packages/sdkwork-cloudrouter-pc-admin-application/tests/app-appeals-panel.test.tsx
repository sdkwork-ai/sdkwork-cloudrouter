/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppAppealsPanel } from "../src";
import { useApplicationCatalogMessages } from "../src/i18n";
import type { AppStoreModerationService } from "../src";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function createService(): AppStoreModerationService {
  return {
    listQueue: vi.fn(),
    decide: vi.fn(),
    listAppeals: vi.fn().mockResolvedValue({
      items: [{
        appealId: "appeal-1",
        reviewId: "rev-1",
        listingName: "Acme Notes",
        appealStatus: "PENDING",
        appealReason: "The rejection missed the new screenshots.",
        submittedAt: "2026-11-13T00:00:00Z",
      }],
      hasMore: false,
      total: 1,
    }),
    decideAppeal: vi.fn().mockResolvedValue(undefined),
  };
}

function Harness({ service }: { service: AppStoreModerationService }) {
  const messages = useApplicationCatalogMessages();
  return <AppAppealsPanel messages={messages} service={service} />;
}

describe("moderation appeals panel", () => {
  it("lists pending appeals and records a decision", async () => {
    const service = createService();
    render(
      <SdkworkI18nProvider locale="zh-CN">
        <Harness service={service} />
      </SdkworkI18nProvider>,
    );

    expect(await screen.findByText("Acme Notes")).toBeTruthy();
    expect(service.listAppeals).toHaveBeenCalledWith({ status: "PENDING", pageSize: 50 });
    fireEvent.click(screen.getByRole("button", { name: "裁决" }));

    expect(await screen.findByText("裁决审核申诉")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("裁决说明"), {
      target: { value: "重新审核后通过" },
    });
    fireEvent.click(screen.getByRole("button", { name: "提交裁决" }));

    await waitFor(() => expect(service.decideAppeal).toHaveBeenCalledTimes(1));
    expect(service.decideAppeal).toHaveBeenCalledWith("appeal-1", {
      decision: "APPROVE",
      note: "重新审核后通过",
    });
  });
});
