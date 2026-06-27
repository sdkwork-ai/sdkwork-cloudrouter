import { describe, expect, it } from "vitest";
import {
  buildSdkworkCheckoutSession,
  checkoutPackageMeta,
  createCheckoutRouteIntent,
  createCheckoutWorkspaceManifest,
  createEmptySdkworkCheckoutCatalog,
  resolveCheckoutRouteSearchParams,
  resolveCheckoutRouteSourceId,
  resolveCheckoutRouteWalletRecharge,
  type SdkworkCheckoutCatalogData,
} from "../src";

function createCatalog(): SdkworkCheckoutCatalogData {
  return {
    invoicePolicy: {
      available: true,
      enabledByDefault: true,
      title: "SDKWORK Technology",
      titleType: "company",
    },
    isAuthenticated: true,
    paymentMethods: [
      {
        available: true,
        code: "WECHAT_PAY",
        description: "Scan to pay",
        id: "wechat-pay",
        kind: "qr",
        label: "WeChat Pay",
        recommended: true,
      },
      {
        available: true,
        code: "ALIPAY",
        description: "Fast desktop payment",
        id: "alipay-pay",
        kind: "qr",
        label: "Alipay",
        recommended: false,
      },
    ],
    sources: [
      {
        action: {
          capability: "subscription",
          intent: "purchase",
          label: "Activate membership",
          route: "/subscription?mode=purchase&packageId=101",
        },
        billingLabel: "Monthly",
        description: "Daily individual usage",
        id: "plan-pro",
        invoiceEligible: true,
        kind: "subscription",
        meta: {
          action: "purchase",
          packageId: 101,
        },
        originalAmountCny: 59,
        quantity: 1,
        recommended: true,
        tags: ["creator"],
        title: "Pro Monthly",
        unitLabel: "seat",
      },
      {
        action: {
          capability: "wallet",
          intent: "recharge",
          label: "Recharge wallet",
          route: "/wallet?section=recharge",
        },
        billingLabel: "One-time recharge",
        description: "Credits for burst launches",
        id: "wallet-pack-12000",
        invoiceEligible: false,
        kind: "wallet-recharge",
        meta: {
          points: 12000,
          rechargePackageId: 9001,
        },
        originalAmountCny: 99,
        quantity: 12000,
        recommended: false,
        tags: ["credits"],
        title: "Studio Credits 12K",
        unitLabel: "points",
      },
    ],
    userCoupons: [
      {
        discountAmountCny: 30,
        id: "user-coupon-subscription",
        label: "Launch Credit",
        minimumSpendCny: 50,
        sourceKinds: ["subscription"],
      },
      {
        discountAmountCny: 12,
        id: "user-coupon-wallet",
        label: "Recharge Coupon",
        minimumSpendCny: 80,
        sourceKinds: ["wallet-recharge"],
      },
    ],
    walletBalanceCny: 18,
  };
}

describe("sdkwork-commerce-pc-checkout headless contract", () => {
  it("creates manifests, route intents, empty catalogs, and derived checkout sessions", () => {
    expect(checkoutPackageMeta).toMatchObject({
      domain: "commerce",
      package: "@sdkwork/commerce-pc-checkout",
    });

    expect(
      createCheckoutWorkspaceManifest({
        title: "Checkout",
      }),
    ).toMatchObject({
      capability: "checkout",
      packageNames: [
        "@sdkwork/commerce-pc-checkout",
        "@sdkwork/commerce-pc-pricing",
        "@sdkwork/commerce-pc-coupon",
        "@sdkwork/commerce-pc-payment",
        "@sdkwork/commerce-pc-order",
        "@sdkwork/commerce-pc-invoice",
      ],
      routePath: "/checkout",
      title: "Checkout",
    });

    expect(
      createCheckoutRouteIntent({
        kind: "subscription",
        sourceId: "plan-pro",
      }),
    ).toEqual({
      focusWindow: true,
      kind: "subscription",
      route: "/checkout?kind=subscription&sourceId=plan-pro",
      source: "checkout-workspace",
      sourceId: "plan-pro",
      type: "checkout-route-intent",
    });

    expect(
      resolveCheckoutRouteSearchParams(new URLSearchParams("kind=subscription&sourceId=plan-pro&mode=purchase")),
    ).toEqual({
      kind: "subscription",
      mode: "purchase",
      sourceId: "plan-pro",
    });

    expect(
      resolveCheckoutRouteSourceId(new URLSearchParams("kind=subscription&sourceId=membership-plan-pro&mode=renew")),
    ).toBe("membership-plan-pro-renew");

    expect(
      resolveCheckoutRouteWalletRecharge(
        new URLSearchParams("kind=wallet-recharge&sourceId=wallet-recharge-package-42&points=12000&priceCny=99&packageId=42"),
      ),
    ).toEqual({
      packageId: 42,
      points: 12000,
      priceCny: 99,
    });

    expect(createEmptySdkworkCheckoutCatalog()).toEqual({
      invoicePolicy: {
        available: false,
        enabledByDefault: false,
        title: undefined,
        titleType: "personal",
      },
      isAuthenticated: false,
      paymentMethods: [],
      sources: [],
      userCoupons: [],
      walletBalanceCny: 0,
    });

    expect(
      buildSdkworkCheckoutSession({
        catalog: createCatalog(),
      }),
    ).toMatchObject({
      availableCoupons: [
        {
          id: "user-coupon-subscription",
        },
      ],
      invoiceRequested: true,
      selectedCouponId: "user-coupon-subscription",
      selectedPaymentMethodId: "wechat-pay",
      source: {
        action: {
          capability: "subscription",
          intent: "purchase",
          label: "Activate membership",
          route: "/subscription?mode=purchase&packageId=101",
        },
        id: "plan-pro",
      },
      summary: {
        balanceCoverageCny: 18,
        couponLabel: "Launch Credit",
        discountAmountCny: 30,
        invoiceEligible: true,
        invoiceRequested: true,
        originalAmountCny: 59,
        payableAmountCny: 29,
        paymentMethodLabel: "WeChat Pay",
      },
    });

    expect(
      buildSdkworkCheckoutSession({
        catalog: createCatalog(),
        selectedCouponId: "user-coupon-subscription",
        selectedSourceId: "wallet-pack-12000",
      }),
    ).toMatchObject({
      availableCoupons: [
        {
          id: "user-coupon-wallet",
        },
      ],
      invoiceRequested: false,
      selectedCouponId: null,
      source: {
        action: {
          capability: "wallet",
          intent: "recharge",
          label: "Recharge wallet",
          route: "/wallet?section=recharge",
        },
        id: "wallet-pack-12000",
      },
      summary: {
        balanceCoverageCny: 18,
        couponLabel: null,
        discountAmountCny: 0,
        invoiceEligible: false,
        invoiceRequested: false,
        originalAmountCny: 99,
        payableAmountCny: 99,
      },
    });
  });
});
