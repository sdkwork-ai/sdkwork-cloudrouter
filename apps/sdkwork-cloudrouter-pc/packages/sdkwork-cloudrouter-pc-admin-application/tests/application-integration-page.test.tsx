/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApplicationManagementPage } from "../src";
import type {
  ApplicationCatalogContext,
  ApplicationGroupId,
  ApplicationRecord,
} from "../src/types/application-catalog";
import type {
  ApplicationChannelAccountOption,
  ApplicationIntegrationSaveInput,
  ApplicationIntegrationService,
  ApplicationPaymentAccountOption,
} from "../src/types/application-integrations";
import {
  APPLICATION_INTEGRATION_SCHEMA,
} from "../src/types/application-integrations";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const deployApplication: ApplicationRecord = {
  deployApplicationId: "410000000000000001",
  environment: "production",
  groupId: "deploy",
  id: "deploy-1",
  kind: "WEB",
  name: "Storefront",
  reference: "storefront",
  status: "ACTIVE",
};

const iamApplication: ApplicationRecord = {
  groupId: "iam",
  id: "iam-1",
  kind: "pc",
  name: "Console",
  reference: "app-console",
  status: "enabled",
};

const paymentAccount: ApplicationPaymentAccountOption = {
  id: "pay-1",
  accountNo: "wechat-prod",
  accountName: "WeChat Pay Production",
  providerCode: "wechat_pay",
  environment: "production",
  accountMode: "direct",
  status: "active",
  capabilities: { pay: true },
  metadata: { appId: "wx-official-1" },
};

const officialAccount: ApplicationChannelAccountOption = {
  id: "ra-official-1",
  kind: "official-account",
  appId: "wx-official-1",
  displayName: "Acme Official",
  providerCode: "wechat",
  enabled: true,
  status: "active",
  authorizationStatus: "authorized",
};

const miniProgram: ApplicationChannelAccountOption = {
  id: "ra-mini-1",
  kind: "mini-program",
  appId: "wx-mini-1",
  displayName: "Acme Mini",
  providerCode: "wechat_mini_program",
  enabled: true,
  status: "active",
  authorizationStatus: "authorized",
};

/** A WeChat mini program deploy row already linked to `miniProgram` in production. */
function seededMiniProgramApplication(): ApplicationRecord {
  return {
    ...deployApplication,
    id: "deploy-mini-seeded",
    kind: "WECHAT_MINIPROGRAM",
    metadata: {
      integrations: {
        schema: APPLICATION_INTEGRATION_SCHEMA,
        linkedApplications: [],
        environments: {
          production: {
            miniProgram: {
              appId: "wx-mini-1",
              displayName: "Acme Mini",
              enabled: true,
              id: "ra-mini-1",
              providerCode: "wechat_mini_program",
              resourceAccountKind: "mini-program",
              status: "active",
            },
          },
        },
      },
    },
    name: "Mini Storefront",
    reference: "mini-storefront",
  };
}

function createIntegrationService(): ApplicationIntegrationService {
  return {
    loadChannelAccounts: vi.fn(async (kind) =>
      kind === "official-account" ? [officialAccount] : [miniProgram]),
    loadEnvironments: vi.fn(async () => [
      { key: "production", level: "PRODUCTION", name: "Production" },
    ]),
    loadPaymentAccounts: vi.fn(async () => [paymentAccount]),
    save: vi.fn(async (input: ApplicationIntegrationSaveInput) => ({
      deployAppId: input.deployAppId,
      metadata: {
        integrations: {
          schema: APPLICATION_INTEGRATION_SCHEMA,
          linkedApplications: input.linkedApplication ? [input.linkedApplication] : [],
          environments: Object.fromEntries(
            input.environments.map((environment) => [environment.key, environment.integration]),
          ),
        },
      },
      updatedAt: "2026-11-15T09:00:00Z",
    })),
  };
}

function createLoaders(records?: {
  deploy?: readonly ApplicationRecord[];
  iam?: readonly ApplicationRecord[];
}) {
  return {
    "app-store": vi.fn().mockResolvedValue([]),
    deploy: vi.fn().mockResolvedValue(records?.deploy ?? [deployApplication]),
    iam: vi.fn().mockResolvedValue(records?.iam ?? [iamApplication]),
  } satisfies Partial<Record<ApplicationGroupId, () => Promise<readonly ApplicationRecord[]>>>;
}

function renderPage(props: {
  integrations: ApplicationIntegrationService;
  loaders: ReturnType<typeof createLoaders>;
}) {
  const resolveContext = vi.fn().mockResolvedValue({
    tenantId: "tenant-1",
    tenantName: "Acme",
  } satisfies ApplicationCatalogContext);
  return render(
    <SdkworkI18nProvider locale="zh-CN">
      <MemoryRouter>
        <ApplicationManagementPage
          backTo="/admin/dashboard"
          integrations={props.integrations}
          loaders={props.loaders}
          resolveContext={resolveContext}
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

function chooseAppConfigAction(action: string): void {
  openAppConfigMenu();
  fireEvent.click(screen.getByRole("menuitem", { name: action }));
}

describe("application integration actions", () => {
  it("binds a payment account from the Deploy row and shows the summary chip", async () => {
    const integrations = createIntegrationService();
    renderPage({ integrations, loaders: createLoaders() });

    await screen.findAllByText("Storefront");
    clickGroup("deploy");
    await screen.findAllByText("Storefront");

    expect(screen.getByRole("button", { name: "应用配置" })).toBeTruthy();
    openAppConfigMenu();
    expect(screen.getByRole("menuitem", { name: "支付配置" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "关联小程序配置" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "关联公众号账号" })).toBeTruthy();

    fireEvent.click(screen.getByRole("menuitem", { name: "支付配置" }));
    expect(integrations.loadPaymentAccounts).toHaveBeenCalledTimes(1);

    fireEvent.click(await screen.findByRole("button", { name: "添加支付账号" }));
    fireEvent.click(await screen.findByRole("tab", { name: "租户" }));
    fireEvent.click(await screen.findByRole("option", { name: /WeChat Pay Production/ }));
    fireEvent.click(screen.getByRole("button", { name: "确认选择" }));
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));

    await waitFor(() => expect(integrations.save).toHaveBeenCalledTimes(1));
    expect(integrations.save).toHaveBeenCalledWith(expect.objectContaining({
      deployAppId: "deploy-1",
      environments: [{
        key: "production",
        integration: expect.objectContaining({
          paymentAccounts: [expect.objectContaining({
            id: "pay-1",
            isDefault: true,
            providerCode: "wechat_pay",
          })],
        }),
      }],
    }));

    expect(await screen.findByText("1 个支付账号")).toBeTruthy();
  });

  it("binds an official account and a mini program in their own drawers", async () => {
    const integrations = createIntegrationService();
    renderPage({ integrations, loaders: createLoaders() });

    await screen.findAllByText("Storefront");
    clickGroup("deploy");
    await screen.findAllByText("Storefront");

    chooseAppConfigAction("关联公众号账号");
    fireEvent.click(await screen.findByRole("button", { name: "选择账号" }));
    fireEvent.click(await screen.findByRole("tab", { name: "租户" }));
    fireEvent.click(await screen.findByRole("option", { name: /Acme Official/ }));
    fireEvent.click(screen.getByRole("button", { name: "确认选择" }));
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));
    await waitFor(() => expect(integrations.save).toHaveBeenCalledTimes(1));
    const officialSave = vi.mocked(integrations.save).mock.calls[0]?.[0];
    expect(officialSave?.environments[0]?.integration.officialAccount?.id).toBe("ra-official-1");

    cleanup();
    const secondService = createIntegrationService();
    renderPage({ integrations: secondService, loaders: createLoaders() });
    await screen.findAllByText("Storefront");
    clickGroup("deploy");
    await screen.findAllByText("Storefront");

    chooseAppConfigAction("关联小程序配置");
    fireEvent.click(await screen.findByRole("button", { name: "选择账号" }));
    fireEvent.click(await screen.findByRole("tab", { name: "租户" }));
    fireEvent.click(await screen.findByRole("option", { name: /Acme Mini/ }));
    fireEvent.click(screen.getByRole("button", { name: "确认选择" }));
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));
    await waitFor(() => expect(secondService.save).toHaveBeenCalledTimes(1));
    const miniSave = vi.mocked(secondService.save).mock.calls[0]?.[0];
    expect(miniSave?.environments[0]?.integration.miniProgram?.id).toBe("ra-mini-1");
  });

  it("asks a non-Deploy row for its Deploy anchor before saving", async () => {
    const integrations = createIntegrationService();
    const loaders = createLoaders();
    loaders["app-store"].mockResolvedValue([
      {
        groupId: "app-store",
        id: "store-1",
        kind: "DESKTOP_WINDOWS",
        name: "Store App",
        status: "installed",
        version: "1.0.0",
      },
    ]);
    renderPage({ integrations, loaders });

    await screen.findAllByText("Storefront");
    // A store row has no deploy anchor of its own, so the drawer must ask for one.
    clickGroup("app-store");
    await screen.findAllByText("Store App");
    chooseAppConfigAction("支付配置");

    expect(await screen.findByText("关联 Deploy 应用")).toBeTruthy();
    expect(screen.getByText("选择 Deploy 应用")).toBeTruthy();
    expect(screen.getByText(/支付与渠道账号配置保存在 Deploy 应用上/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "保存配置" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders the app-kind readiness matrix for a WeChat mini program", async () => {
    const miniProgramApplication: ApplicationRecord = {
      ...deployApplication,
      id: "deploy-mini",
      kind: "WECHAT_MINIPROGRAM",
      name: "Mini Storefront",
      reference: "mini-storefront",
    };
    const integrations: ApplicationIntegrationService = {
      ...createIntegrationService(),
      loadBindings: vi.fn(async () => ({
        environments: {},
        legacySeed: false,
        links: [],
      })),
      loadIamApplicationType: vi.fn(async () => "pc"),
    };
    renderPage({ integrations, loaders: createLoaders({ deploy: [miniProgramApplication] }) });

    await screen.findAllByText("Mini Storefront");
    clickGroup("deploy");
    await screen.findAllByText("Mini Storefront");
    chooseAppConfigAction("支付配置");

    const readiness = await waitFor(() => {
      const element = document.querySelector("[data-application-integration-app-kind='WECHAT_MINIPROGRAM']");
      expect(element).not.toBeNull();
      return element as Element;
    });
    expect(readiness.getAttribute("data-application-integration-readiness")).toBe("wechat-mini-program");
    expect(readiness.querySelector("[data-readiness-dimension='channel']")?.getAttribute("data-readiness-status"))
      .toBe("incomplete");
    expect(readiness.querySelector("[data-readiness-dimension='autoLogin']")?.getAttribute("data-readiness-status"))
      .toBe("incomplete");
    expect(readiness.querySelector("[data-readiness-dimension='checkout']")?.getAttribute("data-readiness-status"))
      .toBe("incomplete");
    const miniRequirement = readiness.querySelector("[data-requirement='mini-program']");
    expect(miniRequirement?.getAttribute("data-requirement-level")).toBe("required");
    expect(miniRequirement?.getAttribute("data-requirement-configured")).toBe("false");
    // The IAM installation is registered as `pc`; the drawer must surface the
    // cross-plane mismatch instead of silently trusting one side. The lookup is
    // keyed by the decimal `deploy_application_id`, not the public uuid.
    expect(integrations.loadIamApplicationType).toHaveBeenCalledWith(
      "410000000000000001",
      "deploy-mini",
    );
    expect(await screen.findByText(/IAM 安装注册的应用类型是 pc/)).toBeTruthy();
  });

  it("offers only the bindings an iOS app can use", async () => {
    const iosApplication: ApplicationRecord = {
      ...deployApplication,
      id: "deploy-ios",
      kind: "IOS_APP",
      name: "iOS Storefront",
      reference: "ios-storefront",
    };
    renderPage({ integrations: createIntegrationService(), loaders: createLoaders({ deploy: [iosApplication] }) });

    await screen.findAllByText("iOS Storefront");
    clickGroup("deploy");
    await screen.findAllByText("iOS Storefront");
    openAppConfigMenu();

    expect(screen.getByRole("menuitem", { name: "支付配置" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "关联公众号账号" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "关联小程序配置" })).toBeNull();
  });

  it("shows the environments from the Deploy app and the current binding status", async () => {
    const seeded: ApplicationRecord = {
      ...deployApplication,
      metadata: {
        integrations: {
          schema: APPLICATION_INTEGRATION_SCHEMA,
          linkedApplications: [],
          environments: {
            production: {
              miniProgram: {
                id: "ra-mini-1",
                appId: "wx-mini-1",
                displayName: "Acme Mini",
                providerCode: "wechat_mini_program",
                resourceAccountKind: "mini-program",
                enabled: true,
              },
              paymentAccounts: [{
                id: "pay-1",
                accountNo: "wechat-prod",
                accountName: "WeChat Pay Production",
                providerCode: "wechat_pay",
                environment: "production",
                accountMode: "direct",
                isDefault: true,
              }],
            },
          },
        },
      },
    };
    const integrations = createIntegrationService();
    renderPage({ integrations, loaders: createLoaders({ deploy: [seeded] }) });

    await screen.findAllByText("Storefront");
    clickGroup("deploy");
    await screen.findAllByText("Storefront");

    expect(await screen.findByText("1 个支付账号")).toBeTruthy();
    // The deploy kind tab also reads "小程序"; the summary chip is the one on
    // the application row.
    expect(document.querySelector("[data-application-integration-summary]")?.textContent)
      .toContain("小程序");

    chooseAppConfigAction("支付配置");
    expect(await screen.findByText("已绑定支付账号")).toBeTruthy();
    expect(screen.getByText("WeChat Pay Production")).toBeTruthy();
    expect(screen.getByText("默认")).toBeTruthy();
  });

  it("leads with the mini program configuration for a mini program application", async () => {
    renderPage({ integrations: createIntegrationService(), loaders: createLoaders({ deploy: [seededMiniProgramApplication()] }) });

    await screen.findAllByText("Mini Storefront");
    clickGroup("deploy");
    await screen.findAllByText("Mini Storefront");
    openAppConfigMenu();

    const labels = screen.getAllByRole("menuitem").map((item) => item.textContent ?? "");
    expect(labels.indexOf("关联小程序配置")).toBeGreaterThanOrEqual(0);
    expect(labels.indexOf("关联小程序配置")).toBeLessThan(labels.indexOf("关联公众号账号"));
  });

  it("lists the mini program binding of every environment and marks unsaved edits", async () => {
    const integrations = createIntegrationService();
    integrations.loadEnvironments = vi.fn(async () => [
      { key: "production", level: "PRODUCTION", name: "Production" },
      { key: "staging", level: "STAGING", name: "Staging" },
    ]);
    renderPage({ integrations, loaders: createLoaders({ deploy: [seededMiniProgramApplication()] }) });

    await screen.findAllByText("Mini Storefront");
    clickGroup("deploy");
    await screen.findAllByText("Mini Storefront");
    chooseAppConfigAction("关联小程序配置");

    expect(await screen.findByText("各环境关联状态")).toBeTruthy();
    const productionOverview = document.querySelector("[data-channel-overview-environment='production']");
    const stagingOverview = document.querySelector("[data-channel-overview-environment='staging']");
    expect(productionOverview?.getAttribute("data-channel-overview-bound")).toBe("true");
    expect(productionOverview?.textContent).toContain("Acme Mini");
    expect(stagingOverview?.getAttribute("data-channel-overview-bound")).toBe("false");

    fireEvent.click(await screen.findByRole("button", { name: "取消关联" }));

    const productionAfterEdit = document.querySelector("[data-channel-overview-environment='production']");
    expect(productionAfterEdit?.getAttribute("data-channel-overview-bound")).toBe("false");
    expect(productionAfterEdit?.textContent).toContain("未保存");
  });

  it("runs the mini program sign-in probe for the linked account", async () => {
    const checkMiniProgramLogin = vi.fn(async () => ({
      checkedAt: "2026-11-20T08:00:00Z",
      status: "succeeded" as const,
      summary: "external configuration probe passed",
    }));
    const integrations: ApplicationIntegrationService = {
      ...createIntegrationService(),
      checkMiniProgramLogin,
    };
    renderPage({ integrations, loaders: createLoaders({ deploy: [seededMiniProgramApplication()] }) });

    await screen.findAllByText("Mini Storefront");
    clickGroup("deploy");
    await screen.findAllByText("Mini Storefront");
    chooseAppConfigAction("关联小程序配置");

    fireEvent.click(await screen.findByRole("button", { name: "检测小程序登录" }));
    await waitFor(() => expect(checkMiniProgramLogin).toHaveBeenCalledWith("ra-mini-1"));
    expect(await screen.findByText("小程序登录检测通过。")).toBeTruthy();
    expect(screen.getByText("external configuration probe passed")).toBeTruthy();
    expect(document.querySelector("[data-mini-program-login-check-result='succeeded']")).not.toBeNull();
  });

  it("shows a failed mini program sign-in probe verdict", async () => {
    const integrations: ApplicationIntegrationService = {
      ...createIntegrationService(),
      checkMiniProgramLogin: vi.fn(async () => ({
        status: "failed" as const,
        summary: "invalid appsecret",
      })),
    };
    renderPage({ integrations, loaders: createLoaders({ deploy: [seededMiniProgramApplication()] }) });

    await screen.findAllByText("Mini Storefront");
    clickGroup("deploy");
    await screen.findAllByText("Mini Storefront");
    chooseAppConfigAction("关联小程序配置");

    fireEvent.click(await screen.findByRole("button", { name: "检测小程序登录" }));
    expect(await screen.findByText("小程序登录检测未通过。")).toBeTruthy();
    expect(screen.getByText("invalid appsecret")).toBeTruthy();
  });

  it("keeps channel validation when the payment catalog is unavailable", async () => {
    const integrations = createIntegrationService();
    integrations.loadPaymentAccounts = vi.fn(async () => {
      throw new Error("payment backend unavailable");
    });
    integrations.loadChannelAccounts = vi.fn(async (kind) => (
      kind === "official-account"
        ? [officialAccount]
        : [{ ...miniProgram, enabled: false, status: "inactive" }]
    ));
    renderPage({ integrations, loaders: createLoaders({ deploy: [seededMiniProgramApplication()] }) });

    await screen.findAllByText("Mini Storefront");
    clickGroup("deploy");
    await screen.findAllByText("Mini Storefront");
    chooseAppConfigAction("关联小程序配置");

    // The payment catalog failed, but the mini program binding is still
    // validated against the channel catalog that did load.
    expect(await screen.findByText(/已停用或未激活/)).toBeTruthy();
  });
});
