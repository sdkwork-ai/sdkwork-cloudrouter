import { describe, expect, it } from "vitest";

import {
  buildResourceLinkChangeSet,
  environmentIntegrationsFromResourceLinks,
  validateApplicationIntegration,
} from "../src/services/application-integration-document";
import {
  evaluateApplicationIntegrationReadiness,
  isBindableEnvironmentKey,
  normalizeBindableEnvironmentKey,
  resolveApplicationIntegrationSurface,
} from "../src/services/application-integration-requirements";
import type {
  ApplicationChannelAccountOption,
  ApplicationPaymentAccountOption,
  ApplicationResourceLinkRecord,
} from "../src/types/application-integrations";

const wechatOfficial: ApplicationChannelAccountOption = {
  appId: "wx-official",
  displayName: "Official",
  enabled: true,
  id: "ra-official",
  kind: "official-account",
  providerCode: "wechat",
  status: "active",
};

const wechatPay: ApplicationPaymentAccountOption = {
  accountMode: "direct",
  accountNo: "wechat-prod",
  capabilities: { pay: true },
  environment: "production",
  id: "pay-wechat",
  metadata: { appId: "wx-mini" },
  providerCode: "wechat_pay",
  status: "active",
};

function link(overrides: Partial<ApplicationResourceLinkRecord>): ApplicationResourceLinkRecord {
  return {
    bindingStatus: "ACTIVE",
    environment: "production",
    id: "link-1",
    isDefault: false,
    metadata: {},
    resourceKind: "official_account",
    resourceRef: "wx-official",
    ...overrides,
  };
}

describe("application kind integration matrix", () => {
  it("maps every Deploy app kind to a commercial surface", () => {
    expect(resolveApplicationIntegrationSurface("H5_WEB").id).toBe("h5");
    expect(resolveApplicationIntegrationSurface("PC_WEB").id).toBe("pc");
    expect(resolveApplicationIntegrationSurface("WECHAT_MINIPROGRAM").id).toBe("wechat-mini-program");
    expect(resolveApplicationIntegrationSurface("DOUYIN_MINIPROGRAM").id).toBe("douyin-mini-program");
    expect(resolveApplicationIntegrationSurface("FLUTTER_APP").id).toBe("flutter");
    expect(resolveApplicationIntegrationSurface("IOS_APP").id).toBe("ios");
    expect(resolveApplicationIntegrationSurface("ANDROID_APP").id).toBe("android");
    expect(resolveApplicationIntegrationSurface("HARMONYOS_APP").id).toBe("harmonyos");
    expect(resolveApplicationIntegrationSurface("DESKTOP_APP").id).toBe("desktop");
    expect(resolveApplicationIntegrationSurface("API_SERVICE").id).toBe("api");
    expect(resolveApplicationIntegrationSurface("SPA_WEB").id).toBe("web-legacy");
    expect(resolveApplicationIntegrationSurface("UNKNOWN_KIND").id).toBe("unknown");
  });

  it("binds only the five fleet lifecycle environments", () => {
    for (const environment of ["development", "test", "staging", "demo", "production"]) {
      expect(isBindableEnvironmentKey(environment)).toBe(true);
    }
    expect(isBindableEnvironmentKey("custom-prod")).toBe(false);
    expect(normalizeBindableEnvironmentKey(" PRODUCTION ")).toBe("production");
    expect(normalizeBindableEnvironmentKey("preview")).toBeUndefined();
  });

  it("reports auto-login and cashier readiness per app kind", () => {
    const empty = evaluateApplicationIntegrationReadiness({
      appKind: "WECHAT_MINIPROGRAM",
      integration: { paymentAccounts: [] },
    });
    expect(empty.channel.status).toBe("incomplete");
    expect(empty.autoLogin.status).toBe("incomplete");
    expect(empty.payment.status).toBe("incomplete");
    expect(empty.checkout.status).toBe("incomplete");

    const ready = evaluateApplicationIntegrationReadiness({
      appKind: "WECHAT_MINIPROGRAM",
      integration: {
        miniProgram: {
          appId: "wx-mini",
          displayName: "Mini",
          enabled: true,
          id: "ra-mini",
          providerCode: "wechat_mini_program",
          resourceAccountKind: "mini-program",
        },
        officialAccount: {
          appId: "wx-official",
          displayName: "Official",
          enabled: true,
          id: "ra-official",
          providerCode: "wechat",
          resourceAccountKind: "official-account",
        },
        paymentAccounts: [{
          accountMode: "direct",
          accountNo: "wechat-prod",
          environment: "production",
          id: "pay-wechat",
          isDefault: true,
          providerCode: "wechat_pay",
        }],
      },
    });
    expect(ready.channel.status).toBe("ready");
    expect(ready.autoLogin.status).toBe("ready");
    expect(ready.payment.status).toBe("ready");
    expect(ready.checkout.status).toBe("ready");

    const api = evaluateApplicationIntegrationReadiness({
      appKind: "API_SERVICE",
      integration: { paymentAccounts: [] },
    });
    expect(api.channel.status).toBe("not-applicable");
    expect(api.payment.status).toBe("not-applicable");
    expect(api.autoLogin.status).toBe("not-applicable");
    expect(api.checkout.status).toBe("not-applicable");
  });
});

describe("app-kind-aware validation", () => {
  it("warns that a WeChat mini program still needs its mini program account", () => {
    const issues = validateApplicationIntegration({
      appKind: "WECHAT_MINIPROGRAM",
      channelAccounts: [wechatOfficial],
      environment: "production",
      integration: {
        officialAccount: {
          appId: "wx-official",
          displayName: "Official",
          enabled: true,
          id: "ra-official",
          providerCode: "wechat",
          resourceAccountKind: "official-account",
        },
        paymentAccounts: [],
      },
      paymentAccounts: [wechatPay],
    });
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "required-integration-missing", severity: "warning" }),
    ]));
    // The missing mini program is the required channel, so the same gap is not
    // repeated as a separate auto-login warning.
    expect(issues.some((issue) => issue.code === "auto-login-not-configured")).toBe(false);
  });

  it("rejects a WeChat account on a Douyin app and a non-WeChat pay provider", () => {
    const issues = validateApplicationIntegration({
      appKind: "DOUYIN_MINIPROGRAM",
      channelAccounts: [wechatOfficial],
      environment: "production",
      integration: {
        officialAccount: {
          appId: "wx-official",
          displayName: "Official",
          enabled: true,
          id: "ra-official",
          providerCode: "wechat",
          resourceAccountKind: "official-account",
        },
        paymentAccounts: [{
          accountMode: "direct",
          accountNo: "wechat-prod",
          environment: "production",
          id: "pay-wechat",
          isDefault: true,
          providerCode: "wechat_pay",
        }],
      },
      paymentAccounts: [wechatPay],
    });
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "account-not-used-by-app-kind", severity: "error" }),
      expect.objectContaining({ code: "payment-provider-incompatible", severity: "error" }),
    ]));
  });

  it("rejects payment on an API service and a non-lifecycle environment", () => {
    const issues = validateApplicationIntegration({
      appKind: "API_SERVICE",
      channelAccounts: [],
      environment: "custom-prod",
      integration: {
        paymentAccounts: [{
          accountMode: "direct",
          accountNo: "wechat-prod",
          environment: "production",
          id: "pay-wechat",
          isDefault: true,
          providerCode: "wechat_pay",
        }],
      },
      paymentAccounts: [wechatPay],
    });
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "environment-not-bindable", severity: "error" }),
      expect.objectContaining({ code: "payment-not-used-by-app-kind", severity: "error" }),
    ]));
  });

  it("warns that an H5 payment-only binding has no auto-login channel", () => {
    const issues = validateApplicationIntegration({
      appKind: "H5_WEB",
      channelAccounts: [],
      environment: "production",
      integration: {
        paymentAccounts: [{
          accountMode: "direct",
          accountNo: "wechat-prod",
          environment: "production",
          id: "pay-wechat",
          isDefault: true,
          providerCode: "wechat_pay",
        }],
      },
      paymentAccounts: [wechatPay],
    });
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "auto-login-not-configured", severity: "warning" }),
      expect.objectContaining({ code: "wechat-channel-missing", severity: "warning" }),
    ]));
    expect(issues.some((issue) => issue.severity === "error")).toBe(false);
  });

  it("does not require a JSAPI channel for PC native WeChat Pay", () => {
    const issues = validateApplicationIntegration({
      appKind: "PC_WEB",
      channelAccounts: [],
      environment: "production",
      integration: {
        paymentAccounts: [{
          accountMode: "direct",
          accountNo: "wechat-prod",
          environment: "production",
          id: "pay-wechat",
          isDefault: true,
          providerCode: "wechat_pay",
        }],
      },
      paymentAccounts: [wechatPay],
    });
    // PC WeChat Pay uses the merchant open-platform AppID, not the official
    // account AppID used for scan sign-in.
    expect(issues.some((issue) => issue.code === "wechat-channel-missing")).toBe(false);
    expect(issues.some((issue) => issue.code === "wechat-app-id-mismatch")).toBe(false);
  });

  it("warns when the IAM installation type disagrees with the Deploy app kind", () => {
    const issues = validateApplicationIntegration({
      appKind: "WECHAT_MINIPROGRAM",
      iamApplicationType: "pc",
      channelAccounts: [],
      environment: "production",
      integration: { paymentAccounts: [] },
      paymentAccounts: [],
    });
    expect(issues).toEqual([
      expect.objectContaining({
        code: "application-type-mismatch",
        params: expect.objectContaining({ expected: "miniprogram", registered: "pc" }),
        severity: "warning",
      }),
    ]);
  });
});

describe("resource link document conversion", () => {
  it("maps authority rows back to the catalog account ids and bindings", () => {
    const environments = environmentIntegrationsFromResourceLinks([
      link({
        id: "link-official",
        metadata: { accountStatus: "active", sourceAccountId: "ra-official", displayName: "Official" },
        resourceKind: "official_account",
        resourceRef: "wx-official",
      }),
      link({
        id: "link-mini",
        metadata: { accountId: "ra-mini", displayName: "Mini" },
        providerCode: "wechat_mini_program",
        resourceKind: "mini_program",
        resourceRef: "wx-mini",
      }),
      link({
        id: "link-pay",
        isDefault: true,
        // Backfilled rows store the provider environment under a distinct key.
        metadata: { accountId: "pay-wechat", accountMode: "direct", paymentEnvironment: "sandbox" },
        providerCode: "wechat_pay",
        resourceKind: "payment_account",
        resourceRef: "wechat-prod",
      }),
    ]);

    expect(environments.production.officialAccount?.id).toBe("ra-official");
    expect(environments.production.officialAccount?.status).toBe("active");
    expect(environments.production.miniProgram?.id).toBe("ra-mini");
    expect(environments.production.paymentAccounts).toEqual([
      expect.objectContaining({
        accountNo: "wechat-prod",
        environment: "sandbox",
        id: "pay-wechat",
        isDefault: true,
      }),
    ]);
  });

  it("diffs a changed single-instance account and removed payment rows", () => {
    const changeSet = buildResourceLinkChangeSet({
      environment: "production",
      existingLinks: [
        link({ id: "old-official", resourceRef: "wx-old", metadata: { accountId: "ra-old" } }),
        link({
          id: "old-payment",
          metadata: { accountId: "pay-old", accountMode: "direct", environment: "production" },
          providerCode: "alipay",
          resourceKind: "payment_account",
          resourceRef: "old-merchant",
        }),
      ],
      integration: {
        officialAccount: {
          appId: "wx-new",
          displayName: "New",
          enabled: true,
          id: "ra-new",
          providerCode: "wechat",
          resourceAccountKind: "official-account",
        },
        paymentAccounts: [],
      },
    });

    expect(changeSet.upserts).toEqual([expect.objectContaining({
      environment: "production",
      resourceKind: "official_account",
      resourceRef: "wx-new",
    })]);
    expect(changeSet.deletes).toEqual([{ id: "old-payment" }]);
  });

  it("refuses to build a change set for a non-lifecycle environment", () => {
    expect(() => buildResourceLinkChangeSet({
      environment: "custom-prod",
      existingLinks: [],
      integration: { paymentAccounts: [] },
    })).toThrow(/cannot carry account bindings/);
  });
});
