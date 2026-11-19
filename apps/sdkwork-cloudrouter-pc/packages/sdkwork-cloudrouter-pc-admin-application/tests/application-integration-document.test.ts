import { describe, expect, it } from "vitest";

import {
  isEnvironmentIntegrationEmpty,
  linkApplication,
  readApplicationIntegrationDocument,
  unlinkApplication,
  readEnvironmentIntegration,
  resolveDeployApplicationForRecord,
  resolvePaymentEnvironment,
  summarizeApplicationIntegration,
  upsertEnvironmentIntegration,
  validateApplicationIntegration,
  writeApplicationIntegrationDocument,
} from "../src/services/application-integration-document";
import {
  APPLICATION_INTEGRATION_METADATA_KEY,
  APPLICATION_INTEGRATION_SCHEMA,
} from "../src/types/application-integrations";
import type {
  ApplicationChannelAccountOption,
  ApplicationEnvironmentIntegration,
  ApplicationPaymentAccountOption,
} from "../src/types/application-integrations";
import type { ApplicationRecord } from "../src/types/application-catalog";

const paymentAccounts: readonly ApplicationPaymentAccountOption[] = [
  {
    id: "pay-prod-wechat",
    accountNo: "wechat-prod",
    accountName: "WeChat Pay Production",
    providerCode: "wechat_pay",
    environment: "production",
    accountMode: "direct",
    status: "active",
    capabilities: { pay: true },
    metadata: { appId: "wx-official-1" },
  },
  {
    id: "pay-sandbox-wechat",
    accountNo: "wechat-sandbox",
    accountName: "WeChat Pay Sandbox",
    providerCode: "wechat_pay",
    environment: "sandbox",
    accountMode: "direct",
    status: "active",
    capabilities: { pay: true },
    metadata: {},
  },
  {
    id: "pay-inactive-alipay",
    accountNo: "alipay-old",
    accountName: "Alipay Old",
    providerCode: "alipay",
    environment: "production",
    accountMode: "direct",
    status: "inactive",
    capabilities: { pay: true },
    metadata: {},
  },
];

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

function environmentIntegration(
  overrides: Partial<ApplicationEnvironmentIntegration> = {},
): ApplicationEnvironmentIntegration {
  return {
    paymentAccounts: [],
    ...overrides,
  };
}

describe("application integration document", () => {
  it("reads a missing or foreign document as empty without inventing data", () => {
    expect(readApplicationIntegrationDocument({})).toEqual({
      schema: APPLICATION_INTEGRATION_SCHEMA,
      linkedApplications: [],
      environments: {},
      migratedEnvironments: [],
    });
    expect(readApplicationIntegrationDocument({ integrations: { schema: "future/v9" } })).toEqual({
      schema: APPLICATION_INTEGRATION_SCHEMA,
      linkedApplications: [],
      environments: {},
      migratedEnvironments: [],
    });
  });

  it("round-trips the document and keeps unrelated metadata keys", () => {
    const metadata = { category: "mall", media: { logo: "drive://logo" } };
    const document = upsertEnvironmentIntegration(
      readApplicationIntegrationDocument(metadata),
      "production",
      environmentIntegration({
        officialAccount: {
          id: officialAccount.id,
          appId: officialAccount.appId,
          displayName: officialAccount.displayName,
          providerCode: officialAccount.providerCode,
          resourceAccountKind: "official-account",
          enabled: true,
        },
        paymentAccounts: [{
          id: "pay-prod-wechat",
          accountNo: "wechat-prod",
          accountName: "WeChat Pay Production",
          providerCode: "wechat_pay",
          environment: "production",
          accountMode: "direct",
          isDefault: true,
        }],
      }),
    );
    const next = writeApplicationIntegrationDocument(metadata, document);

    expect(next.category).toBe("mall");
    expect(next.media).toEqual({ logo: "drive://logo" });
    expect(readApplicationIntegrationDocument(next).environments.production.paymentAccounts).toHaveLength(1);
  });

  it("removes an environment instead of persisting an empty shell", () => {
    const document = upsertEnvironmentIntegration(
      readApplicationIntegrationDocument({}),
      "production",
      environmentIntegration(),
    );

    expect(document.environments.production).toBeUndefined();
    expect(isEnvironmentIntegrationEmpty(readEnvironmentIntegration(document, "production"))).toBe(true);
  });

  it("links a cross-system application once and resolves it before identifier fallback", () => {
    const linked = linkApplication(readApplicationIntegrationDocument({}), {
      groupId: "iam",
      id: "iam-1",
      reference: "acme-console",
    });
    const linkedAgain = linkApplication(linked, {
      groupId: "iam",
      id: "iam-1",
      reference: "acme-console",
      name: "Console",
    });

    expect(linkedAgain.linkedApplications).toEqual([
      { groupId: "iam", id: "iam-1", reference: "acme-console", name: "Console" },
    ]);

    const deployApplication: ApplicationRecord = {
      groupId: "deploy",
      id: "deploy-1",
      name: "Storefront",
      reference: "storefront",
      metadata: writeApplicationIntegrationDocument({}, linkedAgain),
    };
    const iamApplication: ApplicationRecord = {
      groupId: "iam",
      id: "iam-1",
      name: "Console",
      reference: "unrelated",
    };
    expect(resolveDeployApplicationForRecord(iamApplication, [deployApplication])?.id).toBe("deploy-1");
  });

  it("removes a stale cross-system link without touching the same row id in another group", () => {
    const document = {
      ...readApplicationIntegrationDocument({}),
      linkedApplications: [
        { groupId: "iam" as const, id: "app-1" },
        { groupId: "app-store" as const, id: "app-1" },
      ],
    };

    expect(unlinkApplication(document, { groupId: "iam", id: "app-1" }).linkedApplications).toEqual([
      { groupId: "app-store", id: "app-1" },
    ]);
    expect(unlinkApplication(document, { groupId: "iam", id: "unknown" })).toBe(document);
  });

  it("falls back to an exact identifier match for an unpinned IAM row", () => {
    const deployApplication: ApplicationRecord = {
      groupId: "deploy",
      id: "deploy-1",
      name: "Console",
      reference: "acme-console",
    };
    const iamApplication: ApplicationRecord = {
      groupId: "iam",
      id: "iam-1",
      name: "Console",
      reference: "acme-console",
    };

    expect(resolveDeployApplicationForRecord(iamApplication, [deployApplication])?.id).toBe("deploy-1");
  });

  it("prefers the IAM installation's deployApplicationId over a name match", () => {
    const namedMatch: ApplicationRecord = {
      groupId: "deploy",
      id: "deploy-named",
      name: "Console",
      reference: "acme-console",
    };
    const anchored: ApplicationRecord = {
      deployApplicationId: "410000000000000001",
      groupId: "deploy",
      id: "deploy-anchored",
      name: "Something else",
      reference: "other-console",
    };
    const iamApplication: ApplicationRecord = {
      deployApplicationId: "410000000000000001",
      groupId: "iam",
      id: "iam-1",
      name: "Console",
      reference: "acme-console",
    };

    expect(resolveDeployApplicationForRecord(iamApplication, [namedMatch, anchored])?.id)
      .toBe("deploy-anchored");
  });

  it("does not steal a Deploy app that is already linked to another row of the same group", () => {
    const deployApplication: ApplicationRecord = {
      groupId: "deploy",
      id: "deploy-1",
      name: "Console",
      reference: "acme-console",
      metadata: writeApplicationIntegrationDocument({}, linkApplication(
        readApplicationIntegrationDocument({}),
        { groupId: "iam", id: "iam-other", reference: "acme-console" },
      )),
    };
    const iamApplication: ApplicationRecord = {
      groupId: "iam",
      id: "iam-1",
      name: "Console",
      reference: "acme-console",
    };

    expect(resolveDeployApplicationForRecord(iamApplication, [deployApplication])).toBeUndefined();
  });

  it("maps app environments to payment environments", () => {
    expect(resolvePaymentEnvironment("prod", undefined)).toBe("production");
    expect(resolvePaymentEnvironment("production", undefined)).toBe("production");
    expect(resolvePaymentEnvironment("test", "STAGING")).toBe("sandbox");
    expect(resolvePaymentEnvironment("dev", undefined)).toBe("development");
    expect(resolvePaymentEnvironment("custom", undefined)).toBe("sandbox");
  });

  it("summarizes only configured environments", () => {
    const metadata = writeApplicationIntegrationDocument({}, upsertEnvironmentIntegration(
      readApplicationIntegrationDocument({}),
      "production",
      environmentIntegration({
        officialAccount: {
          id: officialAccount.id,
          appId: officialAccount.appId,
          displayName: officialAccount.displayName,
          providerCode: officialAccount.providerCode,
          resourceAccountKind: "official-account",
          enabled: true,
        },
      }),
    ));

    expect(summarizeApplicationIntegration(metadata, "deploy-1", false)).toEqual({
      deployAppId: "deploy-1",
      linked: false,
      environmentCount: 1,
      officialAccountCount: 1,
      miniProgramCount: 0,
      paymentAccountCount: 0,
    });
    expect(summarizeApplicationIntegration({}, "deploy-1", false)).toBeUndefined();
  });

  it("adds app-kind readiness to the row summary only when the kind is known", () => {
    const metadata = writeApplicationIntegrationDocument({}, upsertEnvironmentIntegration(
      readApplicationIntegrationDocument({}),
      "production",
      environmentIntegration({
        paymentAccounts: [{
          accountMode: "direct",
          accountNo: "wechat-prod",
          environment: "production",
          id: "pay-prod-wechat",
          isDefault: true,
          providerCode: "wechat_pay",
        }],
      }),
    ));

    // A WeChat mini program with payment but no mini program account cannot do
    // JSAPI checkout or `wx.login` auto-login yet.
    expect(summarizeApplicationIntegration(metadata, "deploy-1", false, "WECHAT_MINIPROGRAM")?.readiness)
      .toEqual({ autoLogin: "incomplete", checkout: "incomplete" });
    // Without a known kind the summary stays kind-agnostic.
    expect(summarizeApplicationIntegration(metadata, "deploy-1", false)?.readiness).toBeUndefined();
  });
});

describe("application integration validation", () => {
  function validate(
    integration: ApplicationEnvironmentIntegration,
    options: {
      environment?: string;
      environmentLevel?: string;
      channels?: readonly ApplicationChannelAccountOption[];
      payments?: readonly ApplicationPaymentAccountOption[];
    } = {},
  ) {
    return validateApplicationIntegration({
      environment: options.environment ?? "production",
      ...(options.environmentLevel === undefined ? {} : { environmentLevel: options.environmentLevel }),
      integration,
      channelAccounts: options.channels ?? [officialAccount, miniProgram],
      paymentAccounts: options.payments ?? paymentAccounts,
    });
  }

  it("rejects a production app bound to a sandbox merchant account", () => {
    const issues = validate(environmentIntegration({
      paymentAccounts: [{
        id: "pay-sandbox-wechat",
        accountNo: "wechat-sandbox",
        providerCode: "wechat_pay",
        environment: "sandbox",
        accountMode: "direct",
        isDefault: true,
      }],
    }));

    expect(issues).toContainEqual(expect.objectContaining({
      code: "payment-environment-mismatch",
      severity: "error",
    }));
  });

  it("rejects inactive accounts, duplicate defaults and missing pay capability", () => {
    const issues = validate(environmentIntegration({
      paymentAccounts: [
        {
          id: "pay-inactive-alipay",
          accountNo: "alipay-old",
          providerCode: "alipay",
          environment: "production",
          accountMode: "direct",
          isDefault: true,
        },
        {
          id: "pay-prod-wechat",
          accountNo: "wechat-prod",
          providerCode: "wechat_pay",
          environment: "production",
          accountMode: "direct",
          isDefault: true,
        },
        {
          id: "pay-prod-wechat-2",
          accountNo: "wechat-prod-2",
          providerCode: "wechat_pay",
          environment: "production",
          accountMode: "direct",
          isDefault: true,
        },
      ],
    }), {
      payments: [
        ...paymentAccounts,
        {
          ...paymentAccounts[0],
          id: "pay-prod-wechat-2",
          accountNo: "wechat-prod-2",
          capabilities: { pay: false },
        },
      ],
    });

    expect(issues.some((issue) => issue.code === "payment-inactive" && issue.severity === "error")).toBe(true);
    expect(issues.some((issue) => issue.code === "payment-default-duplicate" && issue.severity === "error")).toBe(true);
    expect(issues.some((issue) => issue.code === "payment-capability-missing" && issue.severity === "error")).toBe(true);
  });

  it("warns when the WeChat Pay AppID differs from the bound channel AppID", () => {
    const issues = validate(environmentIntegration({
      officialAccount: {
        id: officialAccount.id,
        appId: officialAccount.appId,
        displayName: officialAccount.displayName,
        providerCode: officialAccount.providerCode,
        resourceAccountKind: "official-account",
        enabled: true,
      },
      paymentAccounts: [{
        id: "pay-prod-wechat",
        accountNo: "wechat-prod",
        providerCode: "wechat_pay",
        environment: "production",
        accountMode: "direct",
        isDefault: true,
      }],
    }), {
      payments: [{
        ...paymentAccounts[0],
        metadata: { appId: "wx-other" },
      }],
    });

    expect(issues).toContainEqual(expect.objectContaining({
      code: "wechat-app-id-mismatch",
      severity: "warning",
    }));
  });

  it("rejects a disabled channel and warns about pending authorization", () => {
    const disabled: ApplicationChannelAccountOption = {
      ...officialAccount,
      enabled: false,
      status: "disabled",
      authorizationStatus: "pending",
    };
    const issues = validate(environmentIntegration({
      officialAccount: {
        id: disabled.id,
        appId: disabled.appId,
        displayName: disabled.displayName,
        providerCode: disabled.providerCode,
        resourceAccountKind: "official-account",
        enabled: false,
      },
    }), { channels: [disabled] });

    expect(issues.some((issue) => issue.code === "channel-disabled" && issue.severity === "error")).toBe(true);
    expect(issues.some((issue) => issue.code === "channel-unauthorized" && issue.severity === "warning")).toBe(true);
  });

  it("warns when a WeChat channel has no WeChat Pay account and vice versa", () => {
    const channelIssues = validate(environmentIntegration({
      miniProgram: {
        id: miniProgram.id,
        appId: miniProgram.appId,
        displayName: miniProgram.displayName,
        providerCode: miniProgram.providerCode,
        resourceAccountKind: "mini-program",
        enabled: true,
      },
    }));
    expect(channelIssues.some((issue) => issue.code === "wechat-payment-missing")).toBe(true);

    const paymentIssues = validate(environmentIntegration({
      paymentAccounts: [{
        id: "pay-prod-wechat",
        accountNo: "wechat-prod",
        providerCode: "wechat_pay",
        environment: "production",
        accountMode: "direct",
        isDefault: true,
      }],
    }));
    expect(paymentIssues.some((issue) => issue.code === "wechat-channel-missing")).toBe(true);
  });

  it("warns about a partner account without a sub-merchant mapping", () => {
    const issues = validate(environmentIntegration({
      paymentAccounts: [{
        id: "pay-prod-wechat",
        accountNo: "wechat-prod",
        providerCode: "wechat_pay",
        environment: "production",
        accountMode: "partner",
        isDefault: true,
      }],
    }), {
      payments: [{
        ...paymentAccounts[0],
        accountMode: "partner",
        metadata: {},
      }],
    });

    expect(issues.some((issue) => issue.code === "payment-partner-sub-merchant-missing")).toBe(true);
  });

  it("keeps the metadata key name stable for other Deploy writers", () => {
    expect(APPLICATION_INTEGRATION_METADATA_KEY).toBe("integrations");
  });
});
