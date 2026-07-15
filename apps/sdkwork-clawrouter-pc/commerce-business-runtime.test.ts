import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function readPortalFile(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function portalFileExists(relativePath: string): boolean {
  return existsSync(new URL(relativePath, import.meta.url));
}

test("console business host mounts T1 domain wallet, membership, coupon, checkout, and payment routes", () => {
  const appSource = readPortalFile("./src/App.tsx");
  const mountSource = readPortalFile("./src/console-business/consoleBusinessHostMount.tsx");
  const navbarSource = readPortalFile("./src/console-business/consoleBusinessNavbar.tsx");
  const tokenPlanPageSource = readPortalFile("./src/token-plan/ClawRouterTokenPlanPage.tsx");
  const shellSource = readPortalFile("./packages/sdkwork-clawrouter-pc-shell/src/AppShellLayout.tsx");
  const publicNavbarSource = readPortalFile("./packages/sdkwork-clawroutes-pc-commons/src/components/Navbar.tsx");
  const packageJson = JSON.parse(readPortalFile("./package.json")) as { dependencies: Record<string, string> };

  assert.match(appSource, /ClawRouterConsoleBusinessHostRoutes/);
  assert.match(appSource, /ClawRouterConsoleBusinessNavbarActions/);
  assert.match(appSource, /ClawRouterTokenPlanPage/);
  assert.match(tokenPlanPageSource, /@sdkwork\/membership-pc-subscription\/catalog/);
  assert.match(tokenPlanPageSource, /SdkworkSubscriptionCatalogPage/);
  assert.match(tokenPlanPageSource, /sdkworkSubscriptionCatalogHostComponents/);
  assert.match(tokenPlanPageSource, /\.\.\.sdkworkSubscriptionCatalogHostComponents/);
  assert.doesNotMatch(tokenPlanPageSource, /ClawRouterTokenPlanCheckoutModal/);
  assert.doesNotMatch(tokenPlanPageSource, /checkoutModal\s*:/);
  assert.match(tokenPlanPageSource, /useTokenPlanMemberSummary/);
  assert.match(shellSource, /path="\/token-plan"/);
  assert.match(publicNavbarSource, /\/token-plan/);
  assert.match(publicNavbarSource, /nav\.tokenPlan/);
  assert.doesNotMatch(navbarSource, /ClawRouterNavbarTokenPlanEntry/);
  assert.doesNotMatch(navbarSource, /SdkworkTokenPlanHeaderEntry/);
  assert.match(readPortalFile("./src/console-business/ClawRouterWalletPage.tsx"), /@sdkwork\/account-pc-wallet/);
  assert.match(readPortalFile("./src/console-business/ClawRouterMembershipPage.tsx"), /@sdkwork\/membership-pc-membership/);
  assert.match(mountSource, /@sdkwork\/promotion-pc-coupon/);
  assert.match(mountSource, /@sdkwork\/payment-pc-payment/);
  assert.doesNotMatch(appSource, /from '@sdkwork\/commerce-pc-host'/);
  assert.doesNotMatch(appSource, /ClawRouterConsoleCommerceHostRoutes/);
  assert.equal(packageJson.dependencies["@sdkwork/account-pc-wallet"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/payment-pc-payment"], "workspace:*");
});

test("console coupons route is reachable from sidebar navigation", () => {
  const consoleLayoutSource = readPortalFile("./packages/sdkwork-clawrouter-pc-console-shell/src/ConsoleLayout.tsx");

  assert.match(consoleLayoutSource, /path:\s*'\/console\/coupons'/);
  assert.match(consoleLayoutSource, /console\.menu\.coupons/);
  assert.doesNotMatch(consoleLayoutSource, /path:\s*'\/console\/checkout'/);
  assert.doesNotMatch(consoleLayoutSource, /path:\s*'\/console\/payment'/);
});

test("console checkout and payment routes stay hidden from sidebar navigation", () => {
  const consoleLayoutSource = readPortalFile("./packages/sdkwork-clawrouter-pc-console-shell/src/ConsoleLayout.tsx");

  assert.doesNotMatch(consoleLayoutSource, /path:\s*'\/console\/checkout'/);
  assert.doesNotMatch(consoleLayoutSource, /path:\s*'\/console\/payment'/);
});

test("console account and settlements views compose T1 domain packages", () => {
  const accountSource = readPortalFile("./src/console-business/ConsoleAccountView.tsx");
  const settlementsSource = readPortalFile("./src/console-business/ConsoleSettlementsView.tsx");

  assert.match(accountSource, /@sdkwork\/account-pc-wallet/);
  assert.match(settlementsSource, /@sdkwork\/order-pc-order/);
});

test("T1 wallet package owns recharge checkout navigation", () => {
  const walletPagePath = "../../../sdkwork-account/apps/sdkwork-account-pc/packages/sdkwork-account-pc-wallet/src/pages/WalletPage.tsx";
  if (!portalFileExists(walletPagePath)) {
    return;
  }
  const walletSource = readPortalFile(walletPagePath);
  assert.match(walletSource, /navigateWalletRechargeCheckout|checkoutBasePath/);
});

test("console commerce pages guard bootstrap against failure loops", () => {
  const guardedSources = [
    ["../../../sdkwork-account/apps/sdkwork-account-pc/packages/sdkwork-account-pc-wallet/src/pages/WalletPage.tsx", "wallet page"],
    ["../../../sdkwork-membership/apps/sdkwork-membership-pc/packages/sdkwork-membership-pc-membership/src/pages/MembershipPage.tsx", "membership page"],
    ["../../../sdkwork-order/apps/sdkwork-order-pc/packages/sdkwork-order-pc-order/src/pages/OrderPage.tsx", "order page"],
    ["../../../sdkwork-promotion/apps/sdkwork-promotion-pc/packages/sdkwork-promotion-pc-coupon/src/pages/CouponPage.tsx", "coupon page"],
    ["../../../sdkwork-payment/apps/sdkwork-payment-pc/packages/sdkwork-payment-pc-payment/src/pages/PaymentPage.tsx", "payment page"],
    ["./src/console-business/ConsoleAccountView.tsx", "console account view"],
  ] as const;

  for (const [relativePath, label] of guardedSources) {
    if (!portalFileExists(relativePath)) {
      continue;
    }

    const source = readPortalFile(relativePath);
    assert.match(source, /!state\.lastError/, `${label} must stop retrying bootstrap after failure`);
    assert.match(source, /bootstrap\(\)\.catch/, `${label} must swallow bootstrap rejection to avoid effect noise`);
  }
});

test("membership page renders all sections with sticky anchor navigation", () => {
  const membershipPagePath = "../../../sdkwork-membership/apps/sdkwork-membership-pc/packages/sdkwork-membership-pc-membership/src/pages/MembershipPage.tsx";
  if (!portalFileExists(membershipPagePath)) {
    return;
  }

  const source = readPortalFile(membershipPagePath);
  assert.match(source, /scrollToMembershipSection/);
  assert.match(source, /membership-section-plans/);
  assert.match(source, /membership-section-benefits/);
  assert.match(source, /membership-section-levels/);
});

test("console payment host avoids duplicate bootstrap and waits for controller readiness", () => {
  const mountSource = readPortalFile("./src/console-business/consoleBusinessHostMount.tsx");

  assert.match(mountSource, /useSdkworkPaymentControllerState/);
  assert.match(mountSource, /state\.isBootstrapped/);
  assert.doesNotMatch(mountSource, /controller\.bootstrap\(\)\.then/);
});

test("console coupons page passes resolved locale", () => {
  const mountSource = readPortalFile("./src/console-business/consoleBusinessHostMount.tsx");
  const localeSource = readPortalFile("./src/console-business/consoleCommerceLocale.ts");

  assert.match(mountSource, /resolveConsoleCouponLocale/);
  assert.match(mountSource, /<SdkworkCouponPage locale=\{locale\} \/>/);
  assert.match(localeSource, /normalizeSdkworkCouponLocale/);
});

test("app bootstrap wires T1 domain service providers to Claw Router app SDK domains", () => {
  const mainSource = readPortalFile("./src/main.tsx");
  const providersSource = readPortalFile("./packages/sdkwork-clawroutes-pc-commons/src/domain-service-providers.ts");

  assert.match(mainSource, /configureClawRouterDomainServiceProviders/);
  assert.match(mainSource, /getClawRouterAppSdkClient/);
  assert.doesNotMatch(mainSource, /configureSdkworkCommerceServiceProvider/);
  assert.match(providersSource, /bootstrapMembershipOrderAppService/);
  assert.match(providersSource, /getClawRouterGlobalTokenManager\(\)/);
  assert.match(providersSource, /resolveRequiredAppDomainTransportBaseUrl\(\{\}\)/);
});

test("federated commerce runtime mounts Order-owned membership checkout routes", () => {
  const runtimeSource = readPortalFile("../../crates/sdkwork-routes-clawrouter-app-api/src/commerce_runtime.rs");

  assert.match(runtimeSource, /app_membership_order_router_with_postgres_pool_and_payments/);
  assert.match(runtimeSource, /app_membership_order_router_with_sqlite_pool_and_payments/);
});
