/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApplicationManagementPage } from "../src";
import type {
  ApplicationCatalogContext,
  ApplicationCatalogPage,
  ApplicationGroupId,
  ApplicationRecord,
} from "../src";

/**
 * App Center list layout: the ownership filter shares the search box's header
 * row, and the list total lives in the footer pagination bar whose page window
 * is requested from the server rather than sliced out of a downloaded array.
 */

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function deployRow(id: string, name: string): ApplicationRecord {
  return {
    environment: "production",
    groupId: "deploy",
    id,
    kind: "PC_WEB",
    name,
    organizationId: "0",
    ownershipScope: "TENANT",
    reference: id,
    status: "ACTIVE",
  };
}

function deployPage(page: number, overrides: Partial<ApplicationCatalogPage["pageInfo"]> = {}): ApplicationCatalogPage {
  return {
    items: [deployRow("deploy-1", "Storefront"), deployRow("deploy-2", "Tenant Console")],
    pageInfo: { hasMore: false, page, pageSize: 20, totalItems: 14, ...overrides },
  };
}

function createLoaders(result: ApplicationCatalogPage | readonly ApplicationRecord[] = deployPage(1)) {
  return {
    "app-store": vi.fn().mockResolvedValue([{ groupId: "app-store", id: "lib-1", name: "birdcoder" }]),
    deploy: vi.fn().mockResolvedValue(result),
    iam: vi.fn().mockResolvedValue([]),
  } satisfies Partial<Record<ApplicationGroupId, () => Promise<unknown>>>;
}

const resolveContext = vi.fn().mockResolvedValue({
  tenantId: "tenant-1",
  tenantName: "Acme",
} satisfies ApplicationCatalogContext);

function renderPage(
  loaders: ReturnType<typeof createLoaders>,
  options: { activeView?: "deploy" } = {},
) {
  return render(
    <SdkworkI18nProvider locale="zh-CN">
      <MemoryRouter initialEntries={["/admin/applications/deploy"]}>
        <ApplicationManagementPage
          activeView={options.activeView}
          backTo="/admin"
          loaders={loaders as never}
          loadOrganizations={() => Promise.resolve([])}
          resolveContext={resolveContext}
          tenantId="tenant-1"
        />
      </MemoryRouter>
    </SdkworkI18nProvider>,
  );
}

function lastDeployQuery(loaders: ReturnType<typeof createLoaders>): Record<string, unknown> {
  const calls = loaders.deploy.mock.calls;
  return (calls[calls.length - 1]?.[1] ?? {}) as Record<string, unknown>;
}

describe("application list header row", () => {
  it("puts the ownership filter on the search box's row", async () => {
    const loaders = createLoaders();
    renderPage(loaders, { activeView: "deploy" });

    await screen.findByText("Storefront");
    const toolbar = document.querySelector("[data-app-center-toolbar]");
    expect(toolbar).not.toBeNull();
    expect(toolbar?.querySelector("input")).not.toBeNull();
    expect(toolbar?.querySelector('select[aria-label="归属"]')).not.toBeNull();
  });

  it("keeps the endpoint kind tabs on their own row below the header", async () => {
    const loaders = createLoaders();
    renderPage(loaders, { activeView: "deploy" });

    await screen.findByText("Storefront");
    const toolbar = document.querySelector("[data-app-center-toolbar]");
    const kindTabs = document.querySelector("[data-deploy-kind-tabs]");
    expect(kindTabs).not.toBeNull();
    expect(toolbar?.contains(kindTabs)).toBe(false);
  });
});

describe("application list footer pagination", () => {
  it("prints the server total in the footer instead of above the table", async () => {
    const loaders = createLoaders();
    renderPage(loaders, { activeView: "deploy" });

    await screen.findByText("Storefront");
    const count = document.querySelector("[data-app-center-count]");
    const footer = document.querySelector('[data-sdk-region="data-table-footer"]');
    expect(count).not.toBeNull();
    expect(count?.textContent).toBe("共 14 个应用");
    expect(footer?.contains(count)).toBe(true);
  });

  it("requests the next page from the server instead of slicing the loaded rows", async () => {
    const loaders = createLoaders(deployPage(1, { hasMore: true, totalItems: 45 }));
    renderPage(loaders, { activeView: "deploy" });

    await screen.findByText("Storefront");
    expect(lastDeployQuery(loaders)).toMatchObject({ page: 1, pageSize: 20 });

    fireEvent.click(screen.getByRole("button", { name: "下一页" }));

    await waitFor(() => expect(lastDeployQuery(loaders)).toMatchObject({ page: 2, pageSize: 20 }));
    // One window per request: the page request carries the filter and no array.
    expect(loaders.deploy).toHaveBeenCalledTimes(2);
  });

  it("returns to the first page when the page size or the filter changes", async () => {
    const loaders = createLoaders(deployPage(1, { hasMore: true, totalItems: 45 }));
    renderPage(loaders, { activeView: "deploy" });

    await screen.findByText("Storefront");
    fireEvent.click(screen.getByRole("button", { name: "下一页" }));
    await waitFor(() => expect(lastDeployQuery(loaders)).toMatchObject({ page: 2 }));

    fireEvent.change(screen.getByLabelText("归属"), { target: { value: "TENANT" } });
    await waitFor(() => expect(lastDeployQuery(loaders)).toMatchObject({
      deploy: expect.objectContaining({ ownership: "TENANT" }),
      page: 1,
    }));

    fireEvent.change(screen.getByRole("combobox", { name: "每页" }), { target: { value: "50" } });
    await waitFor(() => expect(lastDeployQuery(loaders)).toMatchObject({ page: 1, pageSize: 50 }));
  });

  it("forwards the search term as a server facet", async () => {
    const loaders = createLoaders();
    renderPage(loaders, { activeView: "deploy" });

    await screen.findByText("Storefront");
    fireEvent.change(screen.getByPlaceholderText("搜索应用名称、标识、域名或应用ID"), { target: { value: "store" } });

    await waitFor(() => expect(lastDeployQuery(loaders)).toMatchObject({ keyword: "store", page: 1 }));
  });

  it("shows only the total for a bounded group that has no server page window", async () => {
    const loaders = createLoaders();
    renderPage(loaders);

    await screen.findByText("Storefront");
    fireEvent.click(document.querySelector('[data-application-group="app-store"]') as Element);

    await screen.findByText("birdcoder");
    expect(document.querySelector("[data-app-center-count]")?.textContent).toBe("共 1 个应用");
    expect(screen.queryByRole("button", { name: "下一页" })).toBeNull();
  });
});
