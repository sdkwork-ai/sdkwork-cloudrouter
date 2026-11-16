/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppFeaturedSlotsPanel, AppListingsPanel, AppPublishersPanel } from "../src";
import { useApplicationCatalogMessages } from "../src/i18n";
import type {
  AppStoreFeaturedSlotService,
  AppStoreListingService,
  AppStorePublisherService,
} from "../src";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function createPublisherService(): AppStorePublisherService {
  return {
    list: vi.fn().mockResolvedValue({
      items: [{
        publisherId: "pub-1",
        displayName: "Acme Studio",
        publisherType: "COMPANY",
        status: "ACTIVE",
        verificationStatus: "PENDING",
      }],
      hasMore: false,
      total: 1,
    }),
    verify: vi.fn().mockResolvedValue(undefined),
  };
}

function createListingService(): AppStoreListingService {
  return {
    list: vi.fn().mockResolvedValue({
      items: [{
        listingId: "listing-1",
        listingCode: "acme-notes",
        displayName: "Acme Notes",
        publisherName: "Acme Studio",
        listingStatus: "PUBLISHED",
        storefrontVisibility: "VISIBLE",
      }],
      hasMore: false,
      total: 1,
    }),
    updateVisibility: vi.fn().mockResolvedValue(undefined),
    getListing: vi.fn().mockResolvedValue({
      listingId: "listing-1",
      displayName: "Acme Notes",
      listingStatus: "PUBLISHED",
      storefrontVisibility: "VISIBLE",
      attributes: { reviewNotes: "approved by ops" },
    }),
  };
}

function createFeaturedService(): AppStoreFeaturedSlotService {
  return {
    list: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
    update: vi.fn().mockResolvedValue(undefined),
  };
}

function PublisherHarness({ service }: { service: AppStorePublisherService }) {
  const messages = useApplicationCatalogMessages();
  return <AppPublishersPanel messages={messages} service={service} />;
}

function ListingHarness({ service }: { service: AppStoreListingService }) {
  const messages = useApplicationCatalogMessages();
  return <AppListingsPanel messages={messages} service={service} />;
}

function FeaturedHarness({ service }: { service: AppStoreFeaturedSlotService }) {
  const messages = useApplicationCatalogMessages();
  return <AppFeaturedSlotsPanel messages={messages} service={service} />;
}

describe("App Store publisher and listing administration", () => {
  it("records a publisher verification decision", async () => {
    const service = createPublisherService();
    render(
      <SdkworkI18nProvider locale="zh-CN">
        <PublisherHarness service={service} />
      </SdkworkI18nProvider>,
    );

    expect(await screen.findByText("Acme Studio")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "认证审核" }));
    expect(await screen.findByText("发布者认证审核")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "提交审核" }));

    await waitFor(() => expect(service.verify).toHaveBeenCalledTimes(1));
    expect(service.verify).toHaveBeenCalledWith("pub-1", {
      verificationType: "IDENTITY",
      decision: "APPROVE",
    });
  });

  it("changes a listing's storefront visibility", async () => {
    const service = createListingService();
    render(
      <SdkworkI18nProvider locale="zh-CN">
        <ListingHarness service={service} />
      </SdkworkI18nProvider>,
    );

    expect(await screen.findByText("Acme Notes")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "调整可见性" }));
    expect(await screen.findByText("调整商店可见性")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "隐藏" }));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(service.updateVisibility).toHaveBeenCalledTimes(1));
    expect(service.updateVisibility).toHaveBeenCalledWith("listing-1", {
      storefrontVisibility: "HIDDEN",
    });
  });

  it("opens the listing detail inspector", async () => {
    const service = createListingService();
    render(
      <SdkworkI18nProvider locale="zh-CN">
        <ListingHarness service={service} />
      </SdkworkI18nProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "详情" }));
    expect(await screen.findByText("应用详情")).toBeTruthy();
    await waitFor(() => expect(service.getListing).toHaveBeenCalledWith("listing-1"));
    expect(await screen.findByText("approved by ops")).toBeTruthy();
  });

  it("creates a new featured slot with a slot code", async () => {
    const service = createFeaturedService();
    render(
      <SdkworkI18nProvider locale="zh-CN">
        <FeaturedHarness service={service} />
      </SdkworkI18nProvider>,
    );

    expect(await screen.findByText("暂无精选位")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "新建精选位" }));
    fireEvent.change(screen.getByLabelText("精选位编码"), { target: { value: "HOME_HERO" } });
    fireEvent.change(screen.getByLabelText("应用 ID"), { target: { value: "listing-1" } });
    fireEvent.change(screen.getByLabelText("开始时间"), { target: { value: "2026-12-01T00:00" } });
    fireEvent.change(screen.getByLabelText("结束时间"), { target: { value: "2026-12-02T00:00" } });
    fireEvent.click(screen.getByRole("button", { name: "保存投放" }));

    await waitFor(() => expect(service.update).toHaveBeenCalledTimes(1));
    expect(service.update).toHaveBeenCalledWith("HOME_HERO", expect.objectContaining({
      listingId: "listing-1",
      slotStatus: "SCHEDULED",
    }));
  });
});
