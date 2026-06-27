import { describe, expect, it } from "vitest";
import {
  formatSdkworkCommerceCurrencyCny,
  formatSdkworkCommercePoints,
  formatSdkworkCommercePointsRate,
} from "@sdkwork/commerce-service";
import {
  createWalletCheckoutRouteIntent,
  createWalletRouteIntent,
  createWalletWorkspaceManifest,
  formatSdkworkWalletDelta,
  getSdkworkWalletAccountLevelLabel,
  walletPackageMeta,
} from "../src";

describe("sdkwork-commerce-pc-wallet headless contract", () => {
  it("formats points, currency, and rate in a Sdkwork-aligned commerce style", () => {
    expect(formatSdkworkCommercePoints(5200)).toBe("5,200");
    expect(formatSdkworkCommerceCurrencyCny(199)).toContain("199");
    expect(formatSdkworkCommercePointsRate(200)).toBe("200 pts / CNY 1");
    expect(formatSdkworkWalletDelta(1200)).toBe("+1,200");
    expect(formatSdkworkWalletDelta(-240)).toBe("-240");
    expect(
      getSdkworkWalletAccountLevelLabel({
        level: 3,
        levelName: "Pro",
      }),
    ).toBe("Pro");
    expect(
      getSdkworkWalletAccountLevelLabel({
        level: null,
      }),
    ).toBe("Standard");
  });

  it("creates a wallet workspace manifest and route intent with the expected package selection", () => {
    expect(walletPackageMeta).toMatchObject({
      domain: "commerce",
      package: "@sdkwork/commerce-pc-wallet",
    });

    expect(
      createWalletWorkspaceManifest({
        title: "Wallet",
      }),
    ).toMatchObject({
      capability: "wallet",
      packageNames: ["@sdkwork/commerce-pc-wallet"],
      routePath: "/wallet",
      title: "Wallet",
    });

    expect(
      createWalletRouteIntent({
        sectionId: "recharge",
      }),
    ).toEqual({
      focusWindow: true,
      route: "/wallet?section=recharge",
      sectionId: "recharge",
      source: "wallet-workspace",
      type: "wallet-route-intent",
    });

    expect(
      createWalletCheckoutRouteIntent({
        package: {
          id: 42,
          points: 12000,
          priceCny: 99,
        },
      }),
    ).toEqual({
      focusWindow: true,
      kind: "wallet-recharge",
      route: "/checkout?kind=wallet-recharge&points=12000&priceCny=99&sourceId=wallet-recharge-package-42&packageId=42",
      source: "wallet-workspace",
      sourceId: "wallet-recharge-package-42",
      type: "wallet-checkout-route-intent",
    });
  });
});
