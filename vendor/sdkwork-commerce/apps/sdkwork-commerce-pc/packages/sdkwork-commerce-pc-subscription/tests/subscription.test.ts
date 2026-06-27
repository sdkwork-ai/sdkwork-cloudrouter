import { describe, expect, it } from "vitest";
import {
  createSubscriptionRouteIntent,
  createSubscriptionWorkspaceManifest,
  estimateSdkworkSubscriptionCheckout,
  subscriptionPackageMeta,
} from "../src";

describe("sdkwork-commerce-pc-subscription headless contract", () => {
  it("creates reusable subscription manifests, route intents, and checkout estimates", () => {
    expect(subscriptionPackageMeta).toMatchObject({
      domain: "commerce",
      package: "@sdkwork/commerce-pc-subscription",
    });

    expect(
      createSubscriptionWorkspaceManifest({
        title: "Subscription",
      }),
    ).toMatchObject({
      capability: "subscription",
      packageNames: [
        "@sdkwork/commerce-pc-subscription",
        "@sdkwork/commerce-pc-coupon",
        "@sdkwork/commerce-pc-membership",
        "@sdkwork/commerce-pc-wallet",
      ],
      routePath: "/subscription",
      title: "Subscription",
    });

    expect(
      createSubscriptionRouteIntent({
        mode: "renew",
        packageId: 7,
      }),
    ).toEqual({
      focusWindow: true,
      mode: "renew",
      packageId: 7,
      route: "/subscription?mode=renew&packageId=7",
      source: "subscription-workspace",
      type: "subscription-route-intent",
    });

    expect(
      estimateSdkworkSubscriptionCheckout({
        action: "purchase",
        coupon: {
          discountAmountCny: 50,
          id: "user-coupon-1",
          minimumSpendCny: 199,
          name: "Spring Launch 50",
          status: "available",
        },
        paymentMethodCode: "ALIPAY",
        paymentMethodId: "alipay-pay",
        plan: {
          durationDays: 30,
          id: "membership-plan-2",
          includedPoints: 5000,
          name: "Pro Monthly",
          packageId: 2,
          priceCny: 199,
          recommended: true,
          tags: [],
        },
      }),
    ).toMatchObject({
      action: "purchase",
      discountAmountCny: 50,
      originalAmountCny: 199,
      payableAmountCny: 149,
      selectedCouponId: "user-coupon-1",
      selectedPackageId: 2,
      selectedPaymentMethodCode: "ALIPAY",
      selectedPaymentMethodId: "alipay-pay",
    });
  });
});
