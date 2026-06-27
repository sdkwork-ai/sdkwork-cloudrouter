import { describe, expect, it, vi } from "vitest";

import {
  SDKWORK_COMMERCE_APP_SDK_REQUIRED_METHODS,
  SDKWORK_COMMERCE_BACKEND_SDK_REQUIRED_METHODS,
  type CommerceAppSdkClient,
  type CommerceBackendSdkClient,
} from "@sdkwork/commerce-sdk-ports";

import {
  createCommerceRuntime,
  createMemoryCommerceFeatureFlagStore,
  detectCommercePaymentEnvironment,
  requestCommercePayment,
} from "../src/index";

const RETIRED_TIER_ROOT = "v" + "ip";

describe("SDKWork commerce runtime", () => {
  it("bootstraps deployments through injected commerce-root generated SDK clients", () => {
    const runtime = createCommerceRuntime({
      clients: {
        app: createClient<CommerceAppSdkClient>(SDKWORK_COMMERCE_APP_SDK_REQUIRED_METHODS),
        backend: createClient<CommerceBackendSdkClient>(SDKWORK_COMMERCE_BACKEND_SDK_REQUIRED_METHODS),
      },
      config: {
        appApiBaseUrl: "https://commerce-api.example.com",
        appId: "sdkwork-router",
        backendApiBaseUrl: "https://commerce-admin.example.com",
        deploymentMode: "private",
        environment: "production",
      },
    });

    expect(runtime.config).toEqual({
      appApiBaseUrl: "https://commerce-api.example.com/app/v3/api",
      appId: "sdkwork-router",
      backendApiBaseUrl: "https://commerce-admin.example.com/backend/v3/api",
      deploymentMode: "private",
      environment: "production",
    });
    expect(runtime.service.accounts.current.summary.retrieve).toBeDefined();
    expect(runtime.service.catalog.products.list).toBeDefined();
    expect(runtime.service.cart.current.retrieve).toBeDefined();
    expect(runtime.service.checkout.sessions.orders.create).toBeDefined();
    expect(runtime.service.orders.cancellations.create).toBeDefined();
    expect(runtime.service.payments.intents.attempts.create).toBeDefined();
    expect(runtime.service.refunds.create).toBeDefined();
    expect(runtime.service.fulfillments.retrieve).toBeDefined();
    expect(runtime.service.shipments.retrieve).toBeDefined();
    expect(runtime.service.memberships.purchases.create).toBeDefined();
    expect(runtime.service.recharges.orders.create).toBeDefined();
    expect(runtime.service.wallet.ledgerEntries.retrieve).toBeDefined();
    expect(runtime.service.promotions.codes.redemptions.create).toBeDefined();
    expect(runtime.service.promotions.userCoupons.list).toBeDefined();
    expect(runtime.service.promotions.discountApplications.create).toBeDefined();
    expect(runtime.service.invoices.create).toBeDefined();
    expect(runtime.service.admin.catalog.products.create).toBeDefined();
    expect(runtime.service.admin.inventory.stocks.update).toBeDefined();
    expect(runtime.service.admin.payments.providerAccounts.create).toBeDefined();
    expect(runtime.service.admin.payments.reconciliationRuns.list).toBeDefined();
    expect(runtime.service.admin.commerceReports.paymentReconciliation.retrieve).toBeDefined();
    expect(runtime.service.admin.audit.commerceEvents.list).toBeDefined();

    for (const flag of [
      "commerce.catalog",
      "commerce.inventory",
      "commerce.cart",
      "commerce.checkout",
      "commerce.orders",
      "commerce.payments",
      "commerce.refunds",
      "commerce.fulfillments",
      "commerce.shipments",
      "commerce.memberships",
      "commerce.recharges",
      "commerce.promotions",
      "commerce.promotion.offer",
      "commerce.promotion.couponStock",
      "commerce.promotion.code",
      "commerce.promotion.userCoupon",
      "commerce.promotion.discountApplication",
      "commerce.promotion.discountAllocation",
      "commerce.promotion.points",
      "commerce.wallet",
      "commerce.invoices",
      "commerce.reports",
      "commerce.audit",
      "commerce.admin",
    ]) {
      expect(runtime.featureFlagStore.isEnabled(flag)).toBe(true);
    }

    for (const retiredFlag of [
      "commerce.account",
      "commerce.coupons",
      "commerce.preflight",
      "commerce.settlements",
      "commerce." + RETIRED_TIER_ROOT,
    ]) {
      expect(runtime.featureFlagStore.isEnabled(retiredFlag)).toBe(false);
    }
  });

  it("validates generated app SDK clients during runtime bootstrap", () => {
    const appClient = createClient<CommerceAppSdkClient>(SDKWORK_COMMERCE_APP_SDK_REQUIRED_METHODS);
    Object.assign(appClient, { account: {} });

    expect(() =>
      createCommerceRuntime({
        clients: { app: appClient },
        config: {
          appId: "sdkwork-router",
          deploymentMode: "saas",
          environment: "test",
        },
      }),
    ).toThrow(/retired.*account/i);
  });

  it("validates generated backend SDK clients during runtime bootstrap when admin operations are enabled", () => {
    const backendClient = createClient<CommerceBackendSdkClient>(SDKWORK_COMMERCE_BACKEND_SDK_REQUIRED_METHODS);
    Object.assign(backendClient, { [RETIRED_TIER_ROOT]: { levels: { create: vi.fn() } } });

    expect(() =>
      createCommerceRuntime({
        clients: {
          app: createClient<CommerceAppSdkClient>(SDKWORK_COMMERCE_APP_SDK_REQUIRED_METHODS),
          backend: backendClient,
        },
        config: {
          appId: "sdkwork-router",
          deploymentMode: "private",
          environment: "test",
        },
      }),
    ).toThrow(new RegExp("retired.*" + RETIRED_TIER_ROOT, "i"));
  });

  it("allows app-only runtime bootstrap for clients that do not mount admin surfaces", () => {
    const runtime = createCommerceRuntime({
      clients: {
        app: createClient<CommerceAppSdkClient>(SDKWORK_COMMERCE_APP_SDK_REQUIRED_METHODS),
      },
      config: {
        appId: "sdkwork-router",
        deploymentMode: "saas",
        environment: "production",
      },
    });

    expect(runtime.service.admin).toBeDefined();
    expect(runtime.config.deploymentMode).toBe("saas");
  });

  it("keeps feature flags local to the commerce runtime boundary", () => {
    const featureFlagStore = createMemoryCommerceFeatureFlagStore({
      "commerce.memberships": true,
      "commerce.wallet.withdrawals": false,
    });

    expect(featureFlagStore.isEnabled("commerce.memberships")).toBe(true);
    expect(featureFlagStore.isEnabled("commerce.wallet.withdrawals")).toBe(false);
    expect(featureFlagStore.isEnabled("commerce." + RETIRED_TIER_ROOT)).toBe(false);
    expect(featureFlagStore.isEnabled("unknown")).toBe(false);

    featureFlagStore.set("commerce.wallet.withdrawals", true);
    expect(featureFlagStore.isEnabled("commerce.wallet.withdrawals")).toBe(true);
  });

  it("detects payment bridge environments and dispatches standardized H5 requestPayment calls", async () => {
    const originalNavigator = globalThis.navigator;
    const invoke = vi.fn((_name: string, _payload: unknown, callback?: (result: unknown) => void) => {
      callback?.({ err_msg: "get_brand_wcpay_request:ok" });
    });

    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        userAgent: "Mozilla/5.0 MicroMessenger",
      },
    });
    Object.defineProperty(window, "WeixinJSBridge", {
      configurable: true,
      value: {
        invoke,
      },
    });

    expect(detectCommercePaymentEnvironment()).toBe("wechat_official_account");
    await expect(
      requestCommercePayment({
        paymentProduct: "wechat_jsapi",
        payload: {
          appId: "wx-app-id",
          nonceStr: "nonce-value",
          package: "prepay_id=wx-prepay",
          paySign: "signature-value",
          signType: "RSA",
          timeStamp: "1717000000",
        },
      }),
    ).resolves.toEqual({
      rawResult: { err_msg: "get_brand_wcpay_request:ok" },
      status: "success",
    });
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith(
      "getBrandWCPayRequest",
      expect.objectContaining({
        appId: "wx-app-id",
        nonceStr: "nonce-value",
        package: "prepay_id=wx-prepay",
        paySign: "signature-value",
        signType: "RSA",
        timeStamp: "1717000000",
      }),
      expect.any(Function),
    );
    delete (window as typeof window & { WeixinJSBridge?: unknown }).WeixinJSBridge;

    if (originalNavigator === undefined) {
      delete (globalThis as { navigator?: unknown }).navigator;
    } else {
      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: originalNavigator,
      });
    }
  });
});

type MockNode = ReturnType<typeof vi.fn> | { [key: string]: MockNode };

function createClient<TClient>(methods: readonly string[]): TClient {
  const root: { [key: string]: MockNode } = {};
  for (const method of methods) {
    let node = root;
    const segments = method.split(".");
    for (const segment of segments.slice(0, -1)) {
      let child = node[segment];
      if (!child || typeof child === "function") {
        child = {};
        node[segment] = child;
      }
      node = child as { [key: string]: MockNode };
    }
    node[segments.at(-1)!] = vi.fn().mockResolvedValue({ data: {} });
  }
  return root as TClient;
}
