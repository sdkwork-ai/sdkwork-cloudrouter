import { beforeEach, describe, expect, it, vi } from "vitest";

import { APPLICATION_INTEGRATION_SCHEMA } from "../src/types/application-integrations";

const mocks = vi.hoisted(() => ({
  deployments: {
    app: {
      retrieve: vi.fn(),
      update: vi.fn(),
      resourceLinks: {
        delete: vi.fn(),
        list: vi.fn(),
        update: vi.fn(),
      },
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
      tenantApplications: {
        list: vi.fn(),
      },
    },
  },
}));

vi.mock("@sdkwork/cloudroutes-pc-commons/runtime", () => ({
  getSdkworkDeploymentsAppSdkClient: () => mocks.deployments,
  getSdkworkPaymentBackendSdkClient: () => mocks.payment,
  resolveStoredPortalTenantId: () => "tenant-1",
}));

vi.mock("../src/services/iam-service", () => ({
  getApplicationCatalogIamService: () => mocks.iam,
}));

const {
  createApplicationIntegrationService,
  resolveIntegrationAccountScope,
} = await import("../src/services/application-integrations");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.deployments.app.resourceLinks.list.mockResolvedValue({
    items: [],
    pageInfo: { hasMore: false },
  });
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

  it("writes the anchor to metadata and the binding through the resource-link authority", async () => {
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
        },
      },
      updatedAt: "2026-11-15T09:00:00Z",
    });
    mocks.deployments.app.resourceLinks.update.mockResolvedValue({
      id: "link-1",
      appId: "deploy-1",
      environment: "production",
      resourceKind: "payment_account",
      resourceRef: "wechat-prod",
      providerCode: "wechat_pay",
      isDefault: true,
      bindingStatus: "ACTIVE",
      metadata: {},
      createdAt: "2026-11-15T09:00:00Z",
      updatedAt: "2026-11-15T09:00:00Z",
      version: "1",
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

    // Metadata is written only for the cross-system anchor; existing keys and
    // the legacy binding document are preserved byte-for-byte.
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
    expect(mocks.deployments.app.resourceLinks.update).toHaveBeenCalledWith("deploy-1", {
      bindingStatus: "ACTIVE",
      environment: "production",
      isDefault: true,
      metadata: expect.objectContaining({
        accountId: "pay-1",
        accountMode: "direct",
        environment: "production",
        source: "sdkwork-application-center",
      }),
      providerCode: "wechat_pay",
      resourceKind: "payment_account",
      resourceRef: "wechat-prod",
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

  it("refuses to overwrite an unknown future document version when linking", async () => {
    mocks.deployments.app.retrieve.mockResolvedValue({
      metadata: { integrations: { schema: "future/v9" } },
    });

    const service = createApplicationIntegrationService();
    await expect(service.save({
      deployAppId: "deploy-1",
      linkedApplication: { groupId: "iam", id: "iam-1" },
      environments: [],
    })).rejects.toThrow(/version is not supported/);
    expect(mocks.deployments.app.update).not.toHaveBeenCalled();
  });
});

describe("authoritative resource-link transport", () => {
  it("loads bindings from resource links and falls back to the legacy seed only when empty", async () => {
    mocks.deployments.app.resourceLinks.list.mockResolvedValueOnce({
      items: [
        {
          id: "link-official",
          appId: "deploy-1",
          environment: "production",
          resourceKind: "official_account",
          resourceRef: "wx-official",
          providerCode: "wechat",
          isDefault: false,
          bindingStatus: "ACTIVE",
          metadata: { accountId: "ra-official", displayName: "Official", status: "active" },
          createdAt: "2026-11-15T09:00:00Z",
          updatedAt: "2026-11-15T09:00:00Z",
          version: "1",
        },
        {
          id: "link-payment",
          appId: "deploy-1",
          environment: "production",
          resourceKind: "payment_account",
          resourceRef: "wechat-prod",
          providerCode: "wechat_pay",
          isDefault: true,
          bindingStatus: "ACTIVE",
          metadata: { accountId: "pay-1", accountName: "Merchant", accountMode: "direct", environment: "production" },
          createdAt: "2026-11-15T09:00:00Z",
          updatedAt: "2026-11-15T09:00:00Z",
          version: "1",
        },
      ],
      pageInfo: { hasMore: false },
    });

    const service = createApplicationIntegrationService();
    const bindings = await service.loadBindings?.("deploy-1", {});

    expect(bindings?.legacySeed).toBe(false);
    expect(bindings?.environments.production.officialAccount).toEqual(expect.objectContaining({
      appId: "wx-official",
      displayName: "Official",
      id: "ra-official",
    }));
    expect(bindings?.environments.production.paymentAccounts).toEqual([
      expect.objectContaining({ accountNo: "wechat-prod", id: "pay-1", isDefault: true }),
    ]);

    mocks.deployments.app.resourceLinks.list.mockResolvedValueOnce({
      items: [],
      pageInfo: { hasMore: false },
    });
    const legacy = await service.loadBindings?.("deploy-1", {
      integrations: {
        schema: APPLICATION_INTEGRATION_SCHEMA,
        linkedApplications: [],
        environments: {
          production: {
            miniProgram: {
              id: "ra-mini",
              appId: "wx-mini",
              displayName: "Mini",
              providerCode: "wechat_mini_program",
              resourceAccountKind: "mini-program",
              enabled: true,
            },
            paymentAccounts: [],
          },
        },
      },
    });
    expect(legacy?.legacySeed).toBe(true);
    expect(legacy?.environments.production.miniProgram).toEqual(expect.objectContaining({
      appId: "wx-mini",
      id: "ra-mini",
    }));
  });

  it("deletes removed rows and replaces a changed single-instance account", async () => {
    mocks.deployments.app.retrieve.mockResolvedValue({ metadata: {} });
    mocks.deployments.app.resourceLinks.list.mockResolvedValue({
      items: [
        {
          id: "link-official",
          appId: "deploy-1",
          environment: "production",
          resourceKind: "official_account",
          resourceRef: "wx-old",
          providerCode: "wechat",
          isDefault: false,
          bindingStatus: "ACTIVE",
          metadata: { accountId: "ra-old", appId: "wx-old", displayName: "Old" },
          createdAt: "2026-11-15T09:00:00Z",
          updatedAt: "2026-11-15T09:00:00Z",
          version: "1",
        },
        {
          id: "link-payment-gone",
          appId: "deploy-1",
          environment: "production",
          resourceKind: "payment_account",
          resourceRef: "old-merchant",
          providerCode: "alipay",
          isDefault: true,
          bindingStatus: "ACTIVE",
          metadata: { accountId: "pay-old", accountMode: "direct", environment: "production" },
          createdAt: "2026-11-15T09:00:00Z",
          updatedAt: "2026-11-15T09:00:00Z",
          version: "1",
        },
      ],
      pageInfo: { hasMore: false },
    });

    const service = createApplicationIntegrationService();
    await service.save({
      deployAppId: "deploy-1",
      environments: [{
        key: "production",
        integration: {
          officialAccount: {
            id: "ra-new",
            appId: "wx-new",
            displayName: "New",
            providerCode: "wechat",
            resourceAccountKind: "official-account",
            enabled: true,
          },
          paymentAccounts: [],
        },
      }],
    });

    expect(mocks.deployments.app.resourceLinks.update).toHaveBeenCalledWith("deploy-1", expect.objectContaining({
      environment: "production",
      resourceKind: "official_account",
      resourceRef: "wx-new",
    }));
    expect(mocks.deployments.app.resourceLinks.delete).toHaveBeenCalledWith("deploy-1", "link-payment-gone");
    expect(mocks.deployments.app.resourceLinks.delete).toHaveBeenCalledTimes(1);
    expect(mocks.deployments.app.update).not.toHaveBeenCalled();
  });

  it("does not resurrect a legacy environment after its bindings were cleared", async () => {
    const legacyDocument = {
      schema: APPLICATION_INTEGRATION_SCHEMA,
      linkedApplications: [],
      environments: {
        production: {
          miniProgram: {
            id: "ra-mini",
            appId: "wx-mini",
            displayName: "Mini",
            providerCode: "wechat_mini_program",
            resourceAccountKind: "mini-program",
            enabled: true,
          },
          paymentAccounts: [],
        },
      },
    };
    mocks.deployments.app.resourceLinks.list.mockResolvedValue({
      items: [],
      pageInfo: { hasMore: false },
    });
    const service = createApplicationIntegrationService();

    // The legacy row is the migration seed until the operator saves.
    const seeded = await service.loadBindings?.("deploy-1", { integrations: legacyDocument });
    expect(seeded?.legacySeed).toBe(true);

    mocks.deployments.app.retrieve.mockResolvedValue({
      metadata: { integrations: legacyDocument },
    });
    mocks.deployments.app.update.mockResolvedValue({
      metadata: {
        integrations: {
          ...legacyDocument,
          migratedEnvironments: ["production"],
        },
      },
    });

    await service.save({
      deployAppId: "deploy-1",
      environments: [{ key: "production", integration: { paymentAccounts: [] } }],
    });

    // Clearing a legacy binding writes no authority row, but it must record the
    // migration so the next open does not re-seed the deleted configuration.
    expect(mocks.deployments.app.resourceLinks.delete).not.toHaveBeenCalled();
    expect(mocks.deployments.app.update).toHaveBeenCalledWith("deploy-1", {
      metadata: expect.objectContaining({
        integrations: expect.objectContaining({
          migratedEnvironments: ["production"],
          environments: expect.objectContaining({ production: expect.anything() }),
        }),
      }),
    });

    mocks.deployments.app.resourceLinks.list.mockResolvedValue({
      items: [{
        id: "link-dev",
        appId: "deploy-1",
        environment: "development",
        resourceKind: "payment_account",
        resourceRef: "dev-merchant",
        providerCode: "alipay",
        isDefault: true,
        bindingStatus: "ACTIVE",
        metadata: { accountId: "pay-dev", accountMode: "direct", environment: "development" },
        createdAt: "2026-11-15T09:00:00Z",
        updatedAt: "2026-11-15T09:00:00Z",
        version: "1",
      }],
      pageInfo: { hasMore: false },
    });
    const afterClear = await service.loadBindings?.("deploy-1", {
      integrations: {
        ...legacyDocument,
        migratedEnvironments: ["production"],
      },
    });
    expect(afterClear?.legacySeed).toBe(false);
    expect(afterClear?.environments.production).toBeUndefined();
    expect(afterClear?.environments.development?.paymentAccounts).toHaveLength(1);
  });

  it("resolves the IAM application type anchored on the deploy application", async () => {
    mocks.iam.iam.tenantApplications.list.mockResolvedValue({
      items: [
        { applicationType: "pc", deployApplicationId: "deploy-other" },
        { applicationType: "miniprogram", deployApplicationId: "deploy-1" },
      ],
    });

    const service = createApplicationIntegrationService();
    await expect(service.loadIamApplicationType?.("deploy-1")).resolves.toBe("miniprogram");
    await expect(service.loadIamApplicationType?.("deploy-missing")).resolves.toBeUndefined();
    expect(mocks.iam.iam.tenantApplications.list).toHaveBeenCalledWith("tenant-1", {
      page: 1,
      page_size: 200,
    });
  });

  it("refuses to send a non-lifecycle environment to the Deploy API", async () => {
    mocks.deployments.app.retrieve.mockResolvedValue({ metadata: {} });

    const service = createApplicationIntegrationService();
    await expect(service.save({
      deployAppId: "deploy-1",
      environments: [{ key: "custom-prod", integration: { paymentAccounts: [] } }],
    })).rejects.toThrow(/cannot carry account bindings/);
    expect(mocks.deployments.app.resourceLinks.update).not.toHaveBeenCalled();
  });
});

describe("integration account scopes", () => {
  it("resolves explicit scopes and ownership columns, defaulting to tenant", () => {
    expect(resolveIntegrationAccountScope({ scope: "personal" })).toBe("personal");
    expect(resolveIntegrationAccountScope({ ownerScope: "organization" })).toBe("organization");
    expect(resolveIntegrationAccountScope({ ownerUserId: "user-1" })).toBe("personal");
    expect(resolveIntegrationAccountScope({ organization_id: "org-1" })).toBe("organization");
    expect(resolveIntegrationAccountScope({ metadata: { organizationId: "org-2" } })).toBe("organization");
    expect(resolveIntegrationAccountScope({ tenant_id: "tenant-1", user_id: "creator" })).toBe("tenant");
    expect(resolveIntegrationAccountScope({})).toBe("tenant");
  });

  it("pages the channel catalog by scope with server-side search", async () => {
    mocks.iam.iam.oauth.resourceAccounts.list.mockResolvedValue({
      items: [
        {
          id: "ra-tenant",
          resourceAccountKind: "official_account",
          displayName: "Tenant official",
          providerCode: "wechat",
          enabled: true,
        },
        {
          id: "ra-org",
          resourceAccountKind: "official_account",
          displayName: "Organization official",
          providerCode: "wechat",
          enabled: true,
          organizationId: "org-1",
        },
      ],
      pageInfo: { hasMore: true },
    });

    const service = createApplicationIntegrationService();
    const page = await service.loadChannelAccountPage?.("official-account", "organization", {
      search: "acme",
      pageSize: 10,
    });

    expect(mocks.iam.iam.oauth.resourceAccounts.list).toHaveBeenCalledWith({
      page: 1,
      page_size: 10,
      q: "acme",
    });
    expect(page?.items.map((item) => item.id)).toEqual(["ra-org"]);
    expect(page?.hasMore).toBe(true);
    expect(page?.nextCursor).toBe("2");
  });

  it("pages the payment catalog by scope with server-side search", async () => {
    mocks.payment.payments.providerAccounts.list.mockResolvedValue({
      items: [
        {
          id: "pay-org",
          accountNo: "acct-1",
          accountName: "Org merchant",
          providerCode: "wechat_pay",
          environment: "production",
          accountMode: "direct",
          status: "active",
          metadata: { organizationId: "org-1" },
        },
        {
          id: "pay-tenant",
          accountNo: "acct-2",
          accountName: "Tenant merchant",
          providerCode: "wechat_pay",
          environment: "production",
          accountMode: "direct",
          status: "active",
        },
      ],
      pageInfo: { hasMore: false },
    });

    const service = createApplicationIntegrationService();
    const page = await service.loadPaymentAccountPage?.("organization", {
      search: "merchant",
      pageSize: 20,
    });

    expect(mocks.payment.payments.providerAccounts.list).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      q: "merchant",
    });
    expect(page?.items.map((item) => item.id)).toEqual(["pay-org"]);
    expect(page?.hasMore).toBe(false);
    expect(page?.nextCursor).toBeUndefined();
  });
});
