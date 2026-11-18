/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApplicationManagementPage } from "../src";
import type {
  ApplicationCatalogContext,
  ApplicationGroupId,
  ApplicationRecord,
  DeployAppListFilter,
  DeployOrganizationOption,
} from "../src";

/**
 * Deploy list filters: endpoint-kind tabs and ownership selection must become
 * generated-SDK query parameters, re-fetch on change, and stay in the URL.
 */

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const deployApplication: ApplicationRecord = {
  environment: "production",
  groupId: "deploy",
  id: "deploy-1",
  kind: "WECHAT_MINIPROGRAM",
  name: "WeChat Storefront",
  organizationId: "42",
  ownershipScope: "ORGANIZATION",
  reference: "wechat-storefront",
  status: "ACTIVE",
};

const tenantApplication: ApplicationRecord = {
  environment: "production",
  groupId: "deploy",
  id: "deploy-2",
  kind: "PC_WEB",
  name: "Tenant Console",
  organizationId: "0",
  ownershipScope: "TENANT",
  reference: "tenant-console",
  status: "ACTIVE",
};

function createLoaders() {
  return {
    "app-store": vi.fn().mockResolvedValue([]),
    deploy: vi.fn().mockResolvedValue([deployApplication, tenantApplication]),
    iam: vi.fn().mockResolvedValue([]),
  } satisfies Partial<Record<ApplicationGroupId, () => Promise<readonly ApplicationRecord[]>>>;
}

const resolveContext = vi.fn().mockResolvedValue({
  tenantId: "tenant-1",
  tenantName: "Acme",
} satisfies ApplicationCatalogContext);

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location-search">{location.search}</span>;
}

function renderPage(options: {
  initialEntries?: string[];
  loadOrganizations?: () => Promise<readonly DeployOrganizationOption[]>;
  loaders: ReturnType<typeof createLoaders>;
  organizations?: readonly DeployOrganizationOption[];
  organizationId?: string;
}) {
  return render(
    <SdkworkI18nProvider locale="zh-CN">
      <MemoryRouter initialEntries={options.initialEntries ?? ["/admin/applications/deploy"]}>
        <ApplicationManagementPage
          activeView="deploy"
          backTo="/admin"
          loaders={options.loaders}
          loadOrganizations={options.loadOrganizations ?? (() => Promise.resolve([]))}
          organizationId={options.organizationId}
          organizations={options.organizations}
          resolveContext={resolveContext}
          showViewNav={false}
          tenantId="tenant-1"
        />
        <LocationProbe />
      </MemoryRouter>
    </SdkworkI18nProvider>,
  );
}

/** The deploy filter handed to the group loader by its most recent call. */
function lastDeployFilter(loaders: ReturnType<typeof createLoaders>): DeployAppListFilter | undefined {
  const calls = loaders.deploy.mock.calls;
  const call = calls[calls.length - 1] as unknown as [unknown, { deploy?: DeployAppListFilter }] | undefined;
  return call?.[1]?.deploy;
}

function locationSearch(): string {
  return screen.getByTestId("location-search").textContent ?? "";
}

describe("deploy application filters", () => {
  it("queries the deploy group with the all filter and shows every kind tab", async () => {
    const loaders = createLoaders();
    renderPage({ loaders });

    await screen.findByText("WeChat Storefront");
    expect(lastDeployFilter(loaders)).toEqual({ kindTab: "all", ownership: "all" });
    expect(locationSearch()).toBe("");
    for (const label of ["全部", "H5", "PC 应用", "小程序", "Flutter", "iOS", "安卓", "HarmonyOS", "桌面应用", "API 服务", "传统 Web"]) {
      expect(screen.getAllByRole("tab", { name: label }).length).toBeGreaterThan(0);
    }
  });

  it("maps the mini program tab to both provider kinds and writes kind to the URL", async () => {
    const loaders = createLoaders();
    renderPage({ loaders });

    await screen.findByText("WeChat Storefront");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "小程序" }));

    await waitFor(() => expect(lastDeployFilter(loaders)).toMatchObject({ kindTab: "miniProgram" }));
    expect(screen.getByRole("tab", { name: "小程序" }).getAttribute("aria-selected")).toBe("true");
    expect(locationSearch()).toContain("kind=miniProgram");
  });

  it("restores a shared link's kind and ownership filter and re-queries", async () => {
    const loaders = createLoaders();
    renderPage({ initialEntries: ["/admin/applications/deploy?kind=ios&scope=USER"], loaders });

    await screen.findByText("WeChat Storefront");
    expect(lastDeployFilter(loaders)).toEqual({ kindTab: "ios", ownership: "USER" });
    expect(screen.getByRole("tab", { name: "iOS" }).getAttribute("aria-selected")).toBe("true");
    expect((screen.getByLabelText("归属") as HTMLSelectElement).value).toBe("USER");
  });

  it("selects an organization from the directory and sends owner_organization_id", async () => {
    const loaders = createLoaders();
    const loadOrganizations = vi.fn().mockResolvedValue([
      { id: "42", name: "Acme Org" },
      { id: "43", name: "Beta Org" },
    ]);
    renderPage({ loadOrganizations, loaders });

    await screen.findByText("WeChat Storefront");
    fireEvent.change(screen.getByLabelText("归属"), { target: { value: "ORGANIZATION" } });

    const organizationSelect = await screen.findByRole("combobox", { name: "组织 ID" });
    expect(loadOrganizations).toHaveBeenCalledTimes(1);
    fireEvent.change(organizationSelect, { target: { value: "42" } });

    await waitFor(() => expect(lastDeployFilter(loaders)).toMatchObject({
      kindTab: "all",
      organizationId: "42",
      ownership: "ORGANIZATION",
    }));
    expect(locationSearch()).toContain("scope=ORGANIZATION");
    expect(locationSearch()).toContain("org=42");
  });

  it("falls back to a validated numeric organization id when the directory is unavailable", async () => {
    const loaders = createLoaders();
    const loadOrganizations = vi.fn().mockRejectedValue(new Error("directory unavailable"));
    renderPage({ loadOrganizations, loaders });

    await screen.findByText("WeChat Storefront");
    fireEvent.change(screen.getByLabelText("归属"), { target: { value: "ORGANIZATION" } });

    await screen.findByText(/组织列表加载失败/);
    const input = await screen.findByLabelText("组织 ID");
    await waitFor(() => expect(lastDeployFilter(loaders)).toMatchObject({ ownership: "ORGANIZATION" }));

    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.blur(input);
    await screen.findByText(/组织 ID 必须是正整数/);
    // An invalid id never reaches the query.
    expect(lastDeployFilter(loaders)).not.toHaveProperty("organizationId");
    expect(locationSearch()).not.toContain("org=");

    fireEvent.change(input, { target: { value: "42" } });
    fireEvent.blur(input);
    await waitFor(() => expect(lastDeployFilter(loaders)).toMatchObject({
      organizationId: "42",
      ownership: "ORGANIZATION",
    }));
    expect(locationSearch()).toContain("org=42");
  });

  it("drops owner_organization_id when the ownership changes to personal", async () => {
    const loaders = createLoaders();
    renderPage({ initialEntries: ["/admin/applications/deploy?scope=ORGANIZATION&org=42"], loaders });

    await screen.findByText("WeChat Storefront");
    fireEvent.change(screen.getByLabelText("归属"), { target: { value: "USER" } });

    await waitFor(() => expect(lastDeployFilter(loaders)).toEqual({ kindTab: "all", ownership: "USER" }));
    expect(locationSearch()).toContain("scope=USER");
    expect(locationSearch()).not.toContain("org=");
  });

  it("clears every filter back to the unfiltered query", async () => {
    const loaders = createLoaders();
    renderPage({ initialEntries: ["/admin/applications/deploy?kind=ios&scope=USER"], loaders });

    await screen.findByText("WeChat Storefront");
    fireEvent.click(screen.getByRole("button", { name: "清除筛选" }));

    await waitFor(() => expect(lastDeployFilter(loaders)).toEqual({ kindTab: "all", ownership: "all" }));
    expect(locationSearch()).toBe("");
    expect(screen.getByRole("tab", { name: "全部" }).getAttribute("aria-selected")).toBe("true");
  });

  it("shows a no-match empty state once a filter narrows the list", async () => {
    const loaders = createLoaders();
    loaders.deploy.mockResolvedValue([]);
    renderPage({ loaders });

    await screen.findByText("暂无应用");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "iOS" }));

    await screen.findByText("没有匹配的应用");
    expect(screen.getByText(/当前筛选条件下没有匹配的应用/)).toBeTruthy();
  });

  it("reports a rejected filter separately from an unavailable deploy service", async () => {
    const loaders = createLoaders();
    loaders.deploy.mockRejectedValue(Object.assign(new Error("invalid filter"), { status: 400 }));
    renderPage({ loaders });

    await screen.findByText(/筛选参数不合法/);
    expect(screen.getByRole("button", { name: "清除筛选" })).toBeTruthy();
  });

  it("hides the ownership filter on an organization drill-down", async () => {
    resolveContext.mockResolvedValueOnce({
      organizationId: "42",
      organizationName: "Acme Org",
      tenantId: "tenant-1",
    } satisfies ApplicationCatalogContext);
    const loaders = createLoaders();
    renderPage({ loaders, organizationId: "42" });

    await screen.findByText("WeChat Storefront");
    // The drill-down already fixes the organization, so only kind tabs remain.
    expect(screen.queryByLabelText("归属")).toBeNull();
    expect(screen.getAllByRole("tab").length).toBeGreaterThan(0);
    expect(lastDeployFilter(loaders)).toEqual({ kindTab: "all", ownership: "all" });
  });

  it("renders the row's endpoint kind and ownership badges with the organization id", async () => {
    const loaders = createLoaders();
    renderPage({ loaders });

    await screen.findByText("WeChat Storefront");
    const kindBadge = document.querySelector('[data-deploy-kind="WECHAT_MINIPROGRAM"]');
    expect(kindBadge?.textContent).toBe("小程序");
    const ownership = document.querySelector('[data-deploy-ownership="ORGANIZATION"]');
    expect(ownership?.textContent).toContain("组织级");
    expect(document.querySelector('[data-deploy-organization-id="42"]')?.textContent).toBe("组织 ID 42");
    expect(screen.getByText("租户级")).toBeTruthy();
    expect(document.querySelector('[data-deploy-organization-id="0"]')).toBeNull();
  });
});
