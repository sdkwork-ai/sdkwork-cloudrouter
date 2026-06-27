import { describe, expect, it } from "vitest";
import {
  commercePackageMeta,
  createCommerceRouteIntent,
  createCommerceWorkspaceManifest,
} from "../src";

describe("sdkwork-commerce-pc-commerce headless contract", () => {
  it("creates reusable commerce manifests and route intents", () => {
    expect(commercePackageMeta).toMatchObject({
      domain: "commerce",
      package: "@sdkwork/commerce-pc-commerce",
    });

    expect(
      createCommerceWorkspaceManifest({
        title: "Commerce",
      }),
    ).toMatchObject({
      capability: "commerce",
      packageNames: [
        "@sdkwork/commerce-pc-commerce",
        "@sdkwork/commerce-pc-billing",
        "@sdkwork/commerce-pc-checkout",
        "@sdkwork/commerce-pc-entitlement",
        "@sdkwork/commerce-pc-offer",
        "@sdkwork/commerce-pc-pricing",
        "@sdkwork/commerce-pc-wallet",
        "@sdkwork/commerce-pc-points",
        "@sdkwork/commerce-pc-membership",
        "@sdkwork/commerce-pc-membership-purchase",
        "@sdkwork/commerce-pc-coupon",
        "@sdkwork/commerce-pc-subscription",
        "@sdkwork/commerce-pc-order",
        "@sdkwork/commerce-pc-payment",
        "@sdkwork/commerce-pc-invoice",
      ],
      routePath: "/commerce",
      title: "Commerce",
    });

    expect(
      createCommerceRouteIntent({
        sectionId: "orders",
      }),
    ).toEqual({
      focusWindow: true,
      route: "/commerce?section=orders",
      sectionId: "orders",
      source: "commerce-workspace",
      type: "commerce-route-intent",
    });
  });
});
