import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { mapCommerceRouteToHost } from "../../packages/pc-react/commerce/sdkwork-commerce-pc-host/src/commerce-host-navigation.ts";

function readPortalFile(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function portalFileExists(relativePath: string): boolean {
  return existsSync(new URL(relativePath, import.meta.url));
}

test("mapCommerceRouteToHost maps checkout and payment routes into console scope", () => {
  assert.equal(
    mapCommerceRouteToHost("/checkout?kind=subscription", { routePrefix: "/console" }),
    "/console/checkout?kind=subscription",
  );
  assert.equal(
    mapCommerceRouteToHost("/payments?paymentId=pay-1", { routePrefix: "/console" }),
    "/console/payment?paymentId=pay-1",
  );
});

test("clawrouter mounts sdkwork-commerce host pages directly", () => {
  const appSource = readPortalFile("./src/App.tsx");
  const mountSource = readPortalFile("./src/commerce/commerceHostMount.tsx");
  const packageJson = JSON.parse(readPortalFile("./package.json")) as { dependencies: Record<string, string> };

  assert.match(appSource, /ClawRouterConsoleCommerceHostRoutes/);
  assert.match(appSource, /SdkworkCommerceHostNavbarActions/);
  assert.match(appSource, /from '@sdkwork\/commerce-pc-host'/);
  assert.match(mountSource, /SdkworkCommerceHostRoutes/);
  assert.match(mountSource, /CLAWROUTER_CONSOLE_COMMERCE_ROUTE_PREFIX/);
  assert.doesNotMatch(appSource, /consoleCommerceViews/);
  assert.doesNotMatch(appSource, /import\('@sdkwork\/commerce-pc-wallet'\), 'SdkworkWalletPage'/);
  assert.match(appSource, /import\('@sdkwork\/commerce-pc-billing'\), 'SdkworkBillingPage'/);
  assert.equal(packageJson.dependencies["@sdkwork/commerce-pc-host"], "workspace:*");
});

test("console checkout and payment routes stay hidden from sidebar navigation", () => {
  const consoleLayoutSource = readPortalFile("./packages/sdkwork-clawrouter-pc-console-shell/src/ConsoleLayout.tsx");

  assert.doesNotMatch(consoleLayoutSource, /path:\s*'\/console\/checkout'/);
  assert.doesNotMatch(consoleLayoutSource, /path:\s*'\/console\/payment'/);
});

test("sdkwork-commerce wallet and billing pages own recharge and settlement UI", () => {
  const walletPagePath = "../../packages/pc-react/commerce/sdkwork-commerce-pc-wallet/src/pages/WalletPage.tsx";
  const billingPagePath = "../../packages/pc-react/commerce/sdkwork-commerce-pc-billing/src/pages/BillingPage.tsx";

  if (portalFileExists(walletPagePath)) {
    assert.match(readPortalFile(walletPagePath), /navigateWalletRechargeCheckout/);
  }

  if (portalFileExists(billingPagePath)) {
    const billingSource = readPortalFile(billingPagePath);
    assert.match(billingSource, /SdkworkBillingSummaryCards/);
    assert.match(billingSource, /SdkworkBillingBreakdownTable/);
  }
});
