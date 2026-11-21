/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  deployApplicationId: "410000000000000001",
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
  correctKind?: ((appId: string, kind: string) => Promise<void>) | ReturnType<typeof vi.fn>;
  permissionScope?: readonly string[];
  loaders: ReturnType<typeof createLoaders>;
  resolveContext: (input: { organizationId?: string; tenantId?: string }) => Promise<ApplicationCatalogContext>;
}) {
  return render(
    <SdkworkI18nProvider locale="zh-CN">
      <MemoryRouter>
        <ApplicationManagementPage
          backTo="/admin/iam/tenants"
          correctKind={props.correctKind as never}
          issueToken={props.issueToken as never}
          loaders={props.loaders}
          organizationId={props.organizationId}
          permissionScope={props.permissionScope}
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

function openAppConfigMenu(): void {
  const trigger = screen.getAllByRole("button", { name: "应用配置" })[0];
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
  fireEvent.click(trigger);
}

function expectText(text: string): void {
  expect(screen.queryAllByText(text).length).toBeGreaterThan(0);
}

describe("application management page", () => {
  it("groups the tenant applications by platform and shows the deployment group first", async () => {
    const loaders = createLoaders();
    const resolveContext = vi.fn().mockResolvedValue({ tenantId: "tenant-1", tenantName: "Acme" });
    renderPage({ loaders, resolveContext, tenantId: "tenant-1" });

    expect((await screen.findAllByText("Storefront")).length).toBeGreaterThan(0);
    expectText("应用管理");
    expect(screen.getByText(/Acme/)).toBeTruthy();
    expect(loaders.deploy).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-1" }),
      expect.objectContaining({
        deploy: expect.objectContaining({ kindTab: "all", ownership: "all" }),
      }),
    );
    // The IAM view is retired: an installation is reviewed through the
    // deployment application it belongs to.
    expect(loaders.iam).not.toHaveBeenCalled();
  });

  it("prints each deploy application's snowflake id exactly as the wire carried it", async () => {
    const loaders = createLoaders();
    // 2^53 + 1: the first integer an IEEE-754 double cannot represent. A page
    // that read the id through `Number` would print 9007199254740992 instead.
    loaders.deploy.mockResolvedValue([
      { ...deployApplication, deployApplicationId: "9007199254740993" },
    ]);
    const resolveContext = vi.fn().mockResolvedValue({ tenantId: "tenant-1", tenantName: "Acme" });
    renderPage({ loaders, resolveContext, tenantId: "tenant-1" });

    await screen.findAllByText("Storefront");
    expect(screen.getByRole("columnheader", { name: "应用ID" })).toBeTruthy();
    expectText("9007199254740993");
    expect(screen.queryAllByText("9007199254740992").length).toBe(0);
  });

  it("switches to the App Store group without mixing its rows", async () => {
    const loaders = createLoaders();
    const resolveContext = vi.fn().mockResolvedValue({ tenantId: "tenant-1", tenantName: "Acme" });
    renderPage({ loaders, resolveContext, tenantId: "tenant-1" });

    await screen.findAllByText("Storefront");
    // The deployment row is organization-scoped, so the scope tag belongs to it.
    expectText("组织级");

    clickGroup("app-store");
    expect((await screen.findAllByText("sdkwork-birdcoder")).length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Storefront").length).toBe(0);
    expectText("1.2.0");
  });

  it("searches the deploy group on the server instead of trimming the loaded page", async () => {
    const loaders = createLoaders();
    const resolveContext = vi.fn().mockResolvedValue({ tenantId: "tenant-1", tenantName: "Acme" });
    renderPage({ loaders, resolveContext, tenantId: "tenant-1" });

    await screen.findAllByText("Storefront");
    loaders.deploy.mockResolvedValue([{ ...deployApplication, id: "deploy-2", name: "Billing" }]);
    fireEvent.change(screen.getByPlaceholderText("搜索应用名称、标识、域名或应用ID"), { target: { value: "bill" } });

    // The keyword is a server facet: the row set is whatever the backend
    // returned for it, never a local filter over the rows already on screen.
    await waitFor(() => expect(loaders.deploy).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ keyword: "bill", page: 1 }),
    ));
    expectText("Billing");
  });

  it("filters the bounded App Store group locally", async () => {
    const loaders = createLoaders();
    loaders["app-store"].mockResolvedValue([
      appStoreApplication,
      { ...appStoreApplication, id: "library-2", name: "billing-desktop" },
    ]);
    const resolveContext = vi.fn().mockResolvedValue({ tenantId: "tenant-1", tenantName: "Acme" });
    renderPage({ loaders, resolveContext, tenantId: "tenant-1" });

    await screen.findAllByText("Storefront");
    clickGroup("app-store");
    await screen.findAllByText("sdkwork-birdcoder");

    fireEvent.change(screen.getByPlaceholderText("搜索应用名称、标识、域名或应用ID"), { target: { value: "bill" } });

    await waitFor(() => expect(screen.queryAllByText("sdkwork-birdcoder").length).toBe(0));
    expectText("billing-desktop");
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

    await screen.findAllByText("Storefront");
    clickGroup("app-store");

    await screen.findByText(/组织维度的授权清单待后端接口接入。/);
    expectText("暂无应用");
  });

  it("renders the unavailable state with a retry action when a platform is not mounted", async () => {
    const loaders = createLoaders();
    loaders.deploy.mockRejectedValue(Object.assign(new Error("not found"), { status: 404 }));
    const resolveContext = vi.fn().mockResolvedValue({ tenantId: "tenant-1", tenantName: "Acme" });
    renderPage({ loaders, resolveContext, tenantId: "tenant-1" });

    clickGroup("deploy");

    await screen.findByText(/该应用体系在当前部署中未启用/);
    expect(screen.getByRole("button", { name: "重试" })).toBeTruthy();
  });

  it("explains why a deploy application without an IAM registration cannot issue a token", async () => {
    const loaders = createLoaders();
    const resolveContext = vi.fn().mockResolvedValue({ tenantId: "tenant-1", tenantName: "Acme" });
    const issueToken = vi.fn().mockRejectedValue(Object.assign(new Error("tenant application was not found"), { status: 404 }));
    renderPage({ issueToken, loaders, resolveContext, tenantId: "tenant-1" });

    await screen.findAllByText("Storefront");
    clickGroup("deploy");
    await screen.findAllByText("Storefront");
    openAppConfigMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "访问令牌" }));

    await screen.findByText(/该应用未在 IAM 注册为已启用的租户应用/);
  });

  it("reports a missing access-credential permission instead of a generic failure", async () => {
    const loaders = createLoaders();
    const resolveContext = vi.fn().mockResolvedValue({ tenantId: "tenant-1", tenantName: "Acme" });
    const issueToken = vi.fn().mockRejectedValue(Object.assign(new Error("forbidden"), { status: 403 }));
    renderPage({ issueToken, loaders, resolveContext, tenantId: "tenant-1" });

    await screen.findAllByText("Storefront");
    openAppConfigMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "访问令牌" }));

    await screen.findByText(/当前账号没有签发应用访问令牌的权限/);
  });

  it("keeps every application row action on one line", async () => {
    const loaders = createLoaders();
    const resolveContext = vi.fn().mockResolvedValue({ tenantId: "tenant-1", tenantName: "Acme" });
    renderPage({ loaders, resolveContext, tenantId: "tenant-1" });

    await screen.findAllByText("Storefront");
    const actions = document.querySelector("[data-application-row-actions]");
    expect(actions).not.toBeNull();
    // One configuration trigger keeps the name and the config actions visible.
    expect(within(actions as HTMLElement).getAllByRole("button")).toHaveLength(1);
  });

  it("corrects a draft application's endpoint type from the row menu", async () => {
    const loaders = createLoaders();
    const draft: ApplicationRecord = {
      ...deployApplication,
      id: "deploy-draft-1",
      kind: "API_SERVICE",
      name: "Draft Flutter",
      status: "DRAFT",
    };
    loaders.deploy.mockResolvedValue([draft]);
    const correctKind = vi.fn().mockResolvedValue(undefined);
    const resolveContext = vi.fn().mockResolvedValue({ tenantId: "tenant-1", tenantName: "Acme" });
    renderPage({
      correctKind,
      loaders,
      permissionScope: ["deploy.apps.write"],
      resolveContext,
      tenantId: "tenant-1",
    });

    await screen.findAllByText("Draft Flutter");
    openAppConfigMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "修改应用类型" }));
    fireEvent.change(await screen.findByRole("combobox"), {
      target: { value: "FLUTTER_APP" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存修正" }));

    await waitFor(() => expect(correctKind).toHaveBeenCalledWith("deploy-draft-1", "FLUTTER_APP"));
    await screen.findByText(/应用类型已修正为 Flutter 应用/);
  });
});
