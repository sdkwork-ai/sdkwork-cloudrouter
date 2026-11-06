/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApplicationManagementPage } from "../src";
import type { ApplicationCatalogContext, ApplicationGroupId, ApplicationRecord } from "../src";

/**
 * Unified application management regression.
 *
 * The page groups one owner's applications per platform (IAM / Deploy / App
 * Store), keeps their identifiers and lifecycle words intact, and never
 * mislabels tenant-level App Store rows as organization apps.
 */

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const iamApplication: ApplicationRecord = {
  domain: "console.example.com",
  environment: "prod",
  groupId: "iam",
  id: "iam-1",
  kind: "pc",
  name: "Console",
  reference: "app-console",
  status: "enabled",
  updatedAt: "2026-01-01T00:00:00Z",
};

const deployApplication: ApplicationRecord = {
  environment: "production",
  groupId: "deploy",
  id: "deploy-1",
  kind: "WEB",
  name: "Storefront",
  organizationId: "org-1",
  reference: "storefront",
  status: "ACTIVE",
};

const appStoreApplication: ApplicationRecord = {
  groupId: "app-store",
  id: "library-1",
  kind: "DESKTOP_WINDOWS",
  name: "sdkwork-birdcoder",
  status: "installed",
  version: "1.2.0",
};

function createLoaders() {
  return {
    "app-store": vi.fn().mockResolvedValue([appStoreApplication]),
    deploy: vi.fn().mockResolvedValue([deployApplication]),
    iam: vi.fn().mockResolvedValue([iamApplication]),
  } satisfies Partial<Record<ApplicationGroupId, () => Promise<readonly ApplicationRecord[]>>>;
}

function renderPage(props: {
  organizationId?: string;
  tenantId?: string;
  issueToken?: ReturnType<typeof vi.fn>;
  loaders: ReturnType<typeof createLoaders>;
  resolveContext: (input: { organizationId?: string; tenantId?: string }) => Promise<ApplicationCatalogContext>;
}) {
  return render(
    <SdkworkI18nProvider locale="zh-CN">
      <MemoryRouter>
        <ApplicationManagementPage
          backTo="/admin/iam/tenants"
          issueToken={props.issueToken as never}
          loaders={props.loaders}
          organizationId={props.organizationId}
          resolveContext={props.resolveContext}
          tenantId={props.tenantId}
        />
      </MemoryRouter>
    </SdkworkI18nProvider>,
  );
}

function clickGroup(groupId: ApplicationGroupId): void {
  const element = document.querySelector(`[data-application-group="${groupId}"]`);
  expect(element).not.toBeNull();
  fireEvent.click(element as Element);
}

function expectText(text: string): void {
  expect(screen.queryAllByText(text).length).toBeGreaterThan(0);
}

describe("application management page", () => {
  it("groups the tenant applications by platform and shows the IAM group first", async () => {
    const loaders = createLoaders();
    const resolveContext = vi.fn().mockResolvedValue({ tenantId: "tenant-1", tenantName: "Acme" });
    renderPage({ loaders, resolveContext, tenantId: "tenant-1" });

    expect((await screen.findAllByText("Console")).length).toBeGreaterThan(0);
    expectText("应用管理");
    expect(screen.getByText(/Acme/)).toBeTruthy();
    expectText("共 1 个应用");
    expect(loaders.iam).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "tenant-1" }));
  });

  it("switches to the Deploy and App Store groups without mixing their rows", async () => {
    const loaders = createLoaders();
    const resolveContext = vi.fn().mockResolvedValue({ tenantId: "tenant-1", tenantName: "Acme" });
    renderPage({ loaders, resolveContext, tenantId: "tenant-1" });

    await screen.findAllByText("Console");

    clickGroup("deploy");
    expect((await screen.findAllByText("Storefront")).length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Console").length).toBe(0);
    expectText("组织级");

    clickGroup("app-store");
    expect((await screen.findAllByText("sdkwork-birdcoder")).length).toBeGreaterThan(0);
    expectText("1.2.0");
  });

  it("filters the active group locally", async () => {
    const loaders = createLoaders();
    loaders.iam.mockResolvedValue([iamApplication, { ...iamApplication, id: "iam-2", name: "Billing" }]);
    const resolveContext = vi.fn().mockResolvedValue({ tenantId: "tenant-1", tenantName: "Acme" });
    renderPage({ loaders, resolveContext, tenantId: "tenant-1" });

    await screen.findAllByText("Console");
    fireEvent.change(screen.getByPlaceholderText("搜索应用名称、标识或域名"), { target: { value: "bill" } });

    await waitFor(() => expect(screen.queryAllByText("Console").length).toBe(0));
    expectText("Billing");
  });

  it("keeps the App Store group empty for organizations and explains the scope", async () => {
    const loaders = createLoaders();
    loaders["app-store"].mockResolvedValue([]);
    const resolveContext = vi.fn().mockResolvedValue({
      organizationId: "org-1",
      organizationName: "Platform",
      tenantId: "tenant-1",
    });
    renderPage({ loaders, organizationId: "org-1", resolveContext, tenantId: "tenant-1" });

    await screen.findAllByText("Console");
    clickGroup("app-store");

    await screen.findByText(/组织维度的授权清单待后端接口接入。/);
    expectText("暂无应用");
  });

  it("renders the unavailable state with a retry action when a platform is not mounted", async () => {
    const loaders = createLoaders();
    loaders.deploy.mockRejectedValue(Object.assign(new Error("not found"), { status: 404 }));
    const resolveContext = vi.fn().mockResolvedValue({ tenantId: "tenant-1", tenantName: "Acme" });
    renderPage({ loaders, resolveContext, tenantId: "tenant-1" });

    await screen.findAllByText("Console");
    clickGroup("deploy");

    await screen.findByText(/该应用体系在当前部署中未启用/);
    expect(screen.getByRole("button", { name: "重试" })).toBeTruthy();
  });

  it("issues an application access token from the row action and can reveal it", async () => {
    const loaders = createLoaders();
    const resolveContext = vi.fn().mockResolvedValue({ tenantId: "tenant-1", tenantName: "Acme" });
    const issueToken = vi.fn().mockResolvedValue({
      accessToken: "header.payload.signature",
      appId: "app-console",
      expiresAt: "2026-11-07T10:00:00Z",
      tenantApplicationId: "iamapp-1",
    });
    renderPage({ issueToken, loaders, resolveContext, tenantId: "tenant-1" });

    await screen.findAllByText("Console");
    fireEvent.click(screen.getByRole("button", { name: "访问令牌" }));

    expect(await screen.findByText("应用访问令牌")).toBeTruthy();
    expect(issueToken).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-1" }),
      expect.objectContaining({ groupId: "iam", id: "iam-1" }),
    );
    // The token is masked until the operator reveals it.
    expect(screen.getByText(/\*{8}/)).toBeTruthy();
    expect(screen.queryByText("header.payload.signature")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "显示令牌" }));
    expect(screen.getByText("header.payload.signature")).toBeTruthy();
  });

  it("explains why a deploy application without an IAM registration cannot issue a token", async () => {
    const loaders = createLoaders();
    const resolveContext = vi.fn().mockResolvedValue({ tenantId: "tenant-1", tenantName: "Acme" });
    const issueToken = vi.fn().mockRejectedValue(Object.assign(new Error("tenant application was not found"), { status: 404 }));
    renderPage({ issueToken, loaders, resolveContext, tenantId: "tenant-1" });

    await screen.findAllByText("Console");
    clickGroup("deploy");
    await screen.findAllByText("Storefront");
    fireEvent.click(screen.getByRole("button", { name: "访问令牌" }));

    await screen.findByText(/该应用未在 IAM 注册为已启用的租户应用/);
  });

  it("reports a missing access-credential permission instead of a generic failure", async () => {
    const loaders = createLoaders();
    const resolveContext = vi.fn().mockResolvedValue({ tenantId: "tenant-1", tenantName: "Acme" });
    const issueToken = vi.fn().mockRejectedValue(Object.assign(new Error("forbidden"), { status: 403 }));
    renderPage({ issueToken, loaders, resolveContext, tenantId: "tenant-1" });

    await screen.findAllByText("Console");
    fireEvent.click(screen.getByRole("button", { name: "访问令牌" }));

    await screen.findByText(/当前账号没有签发应用访问令牌的权限/);
  });
});
