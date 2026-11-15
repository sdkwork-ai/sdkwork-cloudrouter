import { beforeEach, describe, expect, it, vi } from "vitest";

import { APPLICATION_INTEGRATION_SCHEMA } from "../src/types/application-integrations";

const mocks = vi.hoisted(() => ({
  deployments: {
    app: {
      retrieve: vi.fn(),
      update: vi.fn(),
    },
    appEnvironment: {
      list: vi.fn(),
    },
  },
  payment: {
    payments: {
      providerAccounts: {
        list: vi.fn(),
      },
    },
  },
  iam: {
    iam: {
      oauth: {
        resourceAccounts: {
          list: vi.fn(),
        },
      },
    },
  },
}));

vi.mock("@sdkwork/cloudroutes-pc-commons/runtime", () => ({
  getSdkworkDeploymentsAppSdkClient: () => mocks.deployments,
  getSdkworkPaymentBackendSdkClient: () => mocks.payment,
}));

vi.mock("../src/services/iam-service", () => ({
  getApplicationCatalogIamService: () => mocks.iam,
}));

const { createApplicationIntegrationService } = await import("../src/services/application-integrations");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("application integration transport", () => {
  it("normalizes both IAM resource-account kinds and hides the other kind", async () => {
    mocks.iam.iam.oauth.resourceAccounts.list.mockResolvedValue({
      items: [
        {
          id: "ra-official",
          resourceAccountKind: "official_account",
          providerAccountId: "wx-official",
          displayName: "Official",
          providerCode: "wechat",
          enabled: true,
          status: "active",
          authorizationStatus: "authorized",
        },
        {
          id: "ra-mini",
          resource_account_kind: "mini_program",
          provider_client_id: "wx-mini",
          display_name: "Mini",
          provider_code: "wechat_mini_program",
          enabled: 1,
          status: "active",
        },
      ],
      pageInfo: { mode: "offset" },
    });

    const service = createApplicationIntegrationService();
    const official = await service.loadChannelAccounts("official-account");
    const mini = await service.loadChannelAccounts("mini-program");

    expect(official).toEqual([expect.objectContaining({
      id: "ra-official",
      appId: "wx-official",
      displayName: "Official",
      kind: "official-account",
      enabled: true,
    })]);
    expect(mini).toEqual([expect.objectContaining({
      id: "ra-mini",
      appId: "wx-mini",
      displayName: "Mini",
      kind: "mini-program",
      enabled: true,
    })]);
  });

  it("normalizes payment provider accounts, including environment and metadata", async () => {
    mocks.payment.payments.providerAccounts.list.mockResolvedValue({
      items: [{
        id: "pay-1",
        accountNo: "wechat-prod",
        accountName: "WeChat Pay Production",
        providerCode: "wechat_pay",
        environment: "production",
        accountMode: "direct",
        status: "active",
        settlementCurrency: "CNY",
        countryCode: "CN",
        capabilities: { pay: true },
        metadata: { appId: "wx-official" },
      }],
      pageInfo: { mode: "offset" },
    });

    const service = createApplicationIntegrationService();
    const accounts = await service.loadPaymentAccounts();

    expect(mocks.payment.payments.providerAccounts.list).toHaveBeenCalledWith({
      page: 1,
      pageSize: 200,
    });
    expect(accounts).toEqual([expect.objectContaining({
      id: "pay-1",
      accountNo: "wechat-prod",
      status: "active",
      settlementCurrency: "CNY",
      countryCode: "CN",
      metadata: { appId: "wx-official" },
    })]);
  });

  it("falls back to the Deploy app default environment when the environment API fails", async () => {
    mocks.deployments.appEnvironment.list.mockRejectedValue(new Error("not found"));

    const service = createApplicationIntegrationService();
    const environments = await service.loadEnvironments("deploy-1", "production");

    expect(environments).toEqual([{ key: "production" }]);
  });

  it("merges the binding document into the complete metadata object and resolves the link", async () => {
    mocks.deployments.app.retrieve.mockResolvedValue({
      metadata: { category: "mall", media: { logo: "drive://logo" } },
    });
    mocks.deployments.app.update.mockResolvedValue({
      metadata: {
        category: "mall",
        media: { logo: "drive://logo" },
        integrations: {
          schema: APPLICATION_INTEGRATION_SCHEMA,
          linkedApplications: [{ groupId: "iam", id: "iam-1" }],
          environments: {
            production: {
              paymentAccounts: [{
                id: "pay-1",
                accountNo: "wechat-prod",
                providerCode: "wechat_pay",
                environment: "production",
                accountMode: "direct",
                isDefault: true,
              }],
            },
          },
        },
      },
      updatedAt: "2026-11-15T09:00:00Z",
    });

    const service = createApplicationIntegrationService();
    const result = await service.save({
      deployAppId: "deploy-1",
      linkedApplication: { groupId: "iam", id: "iam-1" },
      environments: [{
        key: "production",
        integration: {
          paymentAccounts: [{
            id: "pay-1",
            accountNo: "wechat-prod",
            providerCode: "wechat_pay",
            environment: "production",
            accountMode: "direct",
            isDefault: true,
          }],
        },
      }],
    });

    expect(mocks.deployments.app.update).toHaveBeenCalledWith("deploy-1", {
      metadata: expect.objectContaining({
        category: "mall",
        media: { logo: "drive://logo" },
        integrations: expect.objectContaining({
          schema: APPLICATION_INTEGRATION_SCHEMA,
          linkedApplications: [{ groupId: "iam", id: "iam-1" }],
        }),
      }),
    });
    expect(result).toEqual(expect.objectContaining({
      deployAppId: "deploy-1",
      updatedAt: "2026-11-15T09:00:00Z",
    }));
  });

  it("removes a stale link from the previous anchor and reports its new metadata", async () => {
    mocks.deployments.app.retrieve
      .mockResolvedValueOnce({ metadata: {} })
      .mockResolvedValueOnce({
        metadata: {
          integrations: {
            schema: APPLICATION_INTEGRATION_SCHEMA,
            linkedApplications: [
              { groupId: "iam", id: "iam-1" },
              { groupId: "app-store", id: "library-1" },
            ],
            environments: {},
          },
        },
      });
    mocks.deployments.app.update
      .mockResolvedValueOnce({ metadata: { integrations: { schema: APPLICATION_INTEGRATION_SCHEMA } } })
      .mockResolvedValueOnce({
        metadata: {
          integrations: {
            schema: APPLICATION_INTEGRATION_SCHEMA,
            linkedApplications: [{ groupId: "app-store", id: "library-1" }],
            environments: {},
          },
        },
      });

    const service = createApplicationIntegrationService();
    const result = await service.save({
      deployAppId: "deploy-new",
      previousDeployAppId: "deploy-old",
      linkedApplication: { groupId: "iam", id: "iam-1" },
      environments: [],
    });

    expect(mocks.deployments.app.update).toHaveBeenNthCalledWith(2, "deploy-old", {
      metadata: expect.objectContaining({
        integrations: expect.objectContaining({
          linkedApplications: [{ groupId: "app-store", id: "library-1" }],
        }),
      }),
    });
    expect(result.previousDeployApp).toEqual(expect.objectContaining({
      deployAppId: "deploy-old",
    }));
  });

  it("refuses to overwrite an unknown future document version", async () => {
    mocks.deployments.app.retrieve.mockResolvedValue({
      metadata: { integrations: { schema: "future/v9" } },
    });

    const service = createApplicationIntegrationService();
    await expect(service.save({
      deployAppId: "deploy-1",
      environments: [],
    })).rejects.toThrow(/version is not supported/);
    expect(mocks.deployments.app.update).not.toHaveBeenCalled();
  });
});
