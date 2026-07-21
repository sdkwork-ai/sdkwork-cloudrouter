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
  const membershipPageSource = readPortalFile("./src/console-business/ClawRouterMembershipPage.tsx");
  const tokenPlanPageSource = readPortalFile("./src/token-plan/ClawRouterTokenPlanPage.tsx");
  const tokenPlanSurfaceSource = readPortalFile("./src/token-plan/ClawRouterTokenPlanSurface.tsx");
  const shellSource = readPortalFile("./packages/sdkwork-clawrouter-pc-shell/src/AppShellLayout.tsx");
  const publicNavbarSource = readPortalFile("./packages/sdkwork-clawroutes-pc-commons/src/components/Navbar.tsx");
  const packageJson = JSON.parse(readPortalFile("./package.json")) as { dependencies: Record<string, string> };

  assert.match(appSource, /ClawRouterConsoleBusinessHostRoutes/);
  assert.match(appSource, /ClawRouterConsoleBusinessNavbarActions/);
  assert.match(appSource, /ClawRouterTokenPlanPage/);
  assert.match(tokenPlanPageSource, /ClawRouterTokenPlanSurface/);
  assert.match(tokenPlanSurfaceSource, /@sdkwork\/membership-pc-subscription\/catalog/);
  assert.match(tokenPlanSurfaceSource, /SdkworkSubscriptionCatalogPage/);
  assert.match(tokenPlanSurfaceSource, /sdkworkSubscriptionCatalogHostComponents/);
  assert.match(tokenPlanSurfaceSource, /\.\.\.sdkworkSubscriptionCatalogHostComponents/);
  assert.match(tokenPlanSurfaceSource, /ClawRouterTokenPlanCheckoutModal/);
  assert.match(tokenPlanSurfaceSource, /checkoutModal:\s*ClawRouterTokenPlanCheckoutModal/);
  assert.match(tokenPlanSurfaceSource, /checkoutPort=\{getClawRouterMembershipCheckoutService\(\)\}/);
  assert.match(tokenPlanSurfaceSource, /useTokenPlanMemberSummary/);
  assert.match(tokenPlanSurfaceSource, /export function ClawRouterTokenPlanSurface/);
  assert.match(tokenPlanSurfaceSource, /data-token-plan-surface/);
  assert.match(membershipPageSource, /ClawRouterTokenPlanSurface/);
  assert.match(membershipPageSource, /data-membership-token-plan/);
  assert.match(membershipPageSource, /data-membership-monochrome-overview/);
  assert.doesNotMatch(membershipPageSource, /createSdkworkMembership(?:Backdrop|Glass|Hero|Panel|Tone)Style/);
  assert.doesNotMatch(membershipPageSource, /Membership(?:Benefits|Levels|Plans)Section/);
  assert.match(shellSource, /path="\/token-plan"/);
  assert.match(publicNavbarSource, /\/token-plan/);
  assert.match(publicNavbarSource, /nav\.tokenPlan/);
  assert.doesNotMatch(navbarSource, /ClawRouterNavbarTokenPlanEntry/);
  assert.doesNotMatch(navbarSource, /SdkworkTokenPlanHeaderEntry/);
  assert.match(readPortalFile("./src/console-business/ClawRouterWalletPage.tsx"), /@sdkwork\/account-pc-wallet/);
  assert.match(membershipPageSource, /@sdkwork\/membership-pc-membership/);
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

test("token plan purchases use order-owned checkout services and dialogs", () => {
  const modalSource = readPortalFile("./src/token-plan/ClawRouterTokenPlanCommerceModal.tsx");
  const providerSource = readPortalFile(
    "./packages/sdkwork-clawroutes-pc-commons/src/domain-service-providers.ts",
  );
  const summarySource = readPortalFile("./src/token-plan/tokenPlanMemberSummary.ts");
  const packageJson = JSON.parse(readPortalFile("./package.json")) as {
    dependencies: Record<string, string>;
  };

  assert.equal(packageJson.dependencies["@sdkwork/order-pc-recharge"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/order-pc-checkout"], "workspace:*");
  assert.match(modalSource, /@sdkwork\/order-pc-checkout/);
  assert.match(modalSource, /SdkworkOrderCheckoutDialog/);
  assert.match(modalSource, /@sdkwork\/order-pc-recharge/);
  assert.match(modalSource, /SdkworkPointsRechargeDialog/);
  assert.match(modalSource, /getClawRouterPointsRechargeService/);
  assert.match(modalSource, /service=\{getClawRouterPointsRechargeService\(\)\}/);
  assert.match(modalSource, /getClawRouterCouponRechargeService\(\)\.redeem/);
  assert.match(modalSource, /coupon_recharge\.code_label/);
  assert.match(modalSource, /Token Bank/);
  assert.doesNotMatch(modalSource, /createTokenPlanCommerceModal\("redeem"\)/);
  assert.doesNotMatch(modalSource, /createTokenPlanCommerceModal\("points-purchase"\)/);
  assert.doesNotMatch(modalSource, /登录后将跳转到控制台钱包完成操作/);
  assert.match(providerSource, /recharges:\s*orderClient\.recharges/);
  assert.match(providerSource, /const orderAppService = createSdkworkOrderAppService/);
  assert.match(providerSource, /configureSdkworkOrderAppServiceProvider\(\(\) => orderAppService\)/);
  assert.match(providerSource, /memberships:\s*orderClient\.memberships/);
  assert.doesNotMatch(
    providerSource,
    /function buildOrderCommercePort\(\s*(?:catalogClient|membershipClient|paymentClient):/,
  );
  assert.match(providerSource, /createSdkworkMembershipCheckoutService/);
  assert.match(providerSource, /createSdkworkCouponRechargeService/);
  assert.match(providerSource, /getClawRouterCouponRechargeService/);
  assert.match(providerSource, /getClawRouterMembershipCheckoutService/);
  assert.doesNotMatch(providerSource, /configureSdkworkMembershipOrderAppServiceProvider/);
  assert.doesNotMatch(providerSource, /MembershipOrderAppTransportClient/);
  assert.match(providerSource, /appService: orderAppService/);
  assert.doesNotMatch(providerSource, /bootstrapMembershipOrderAppService/);
  assert.match(summarySource, /pointBalance:\s*state\.dashboard\.summary\.pointBalance/);
});

test("Playground delegates Token Plan UI to Agents and injects only host services", () => {
  const playgroundSource = readPortalFile(
    "./packages/sdkwork-clawrouter-pc-playground/src/pages/Playground.tsx",
  );

  assert.match(playgroundSource, /@sdkwork\/agents-pc\/workbench/);
  assert.match(playgroundSource, /tokenPlan:\s*\{/);
  assert.match(playgroundSource, /checkoutService:\s*getClawRouterMembershipCheckoutService\(\)/);
  assert.match(playgroundSource, /couponRechargeService:\s*getClawRouterCouponRechargeService\(\)/);
  assert.match(playgroundSource, /pointsRechargeService:\s*getClawRouterPointsRechargeService\(\)/);
  assert.doesNotMatch(playgroundSource, /SdkworkSubscriptionCatalogPage/);
  assert.doesNotMatch(playgroundSource, /\bfetch\s*\(|axios|Authorization|Access-Token/);
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

test("console wallet derives authentication from the shared IAM session", () => {
  const walletSource = readPortalFile("./src/console-business/ClawRouterWalletPage.tsx");
  const withdrawSource = readPortalFile("./src/console-business/ClawRouterWithdrawDialog.tsx");
  const quickPanelSource = readPortalFile("./src/console-business/ClawRouterNavbarWalletQuickPanel.tsx");
  const sessionHookSource = readPortalFile("./src/auth/usePortalIamSession.ts");
  const guardSource = readPortalFile("./src/auth/protectedPortalRoutes.ts");
  const tokenPlanSummarySource = readPortalFile("./src/token-plan/tokenPlanMemberSummary.ts");
  const accountSource = readPortalFile("./src/console-business/ConsoleAccountView.tsx");
  const walletEntrySource = readPortalFile("./src/console-business/ClawRouterNavbarWalletEntry.tsx");

  assert.match(sessionHookSource, /hasPortalIamSession/);
  assert.match(sessionHookSource, /subscribePortalSessionChange/);
  assert.match(sessionHookSource, /useSyncExternalStore/);
  assert.match(walletSource, /usePortalIamSession/);
  assert.match(withdrawSource, /usePortalIamSession/);
  assert.match(quickPanelSource, /usePortalIamSession/);
  assert.match(guardSource, /usePortalIamSession/);
  assert.match(tokenPlanSummarySource, /usePortalIamSession/);
  assert.match(accountSource, /usePortalIamSession/);
  assert.match(walletEntrySource, /usePortalIamSession/);
  assert.doesNotMatch(walletSource, /const isAuthenticated = state\.overview\.isAuthenticated/);
  assert.doesNotMatch(walletSource, /effectivePoints <= 0 \|\| !state\.overview\.isAuthenticated/);
  assert.doesNotMatch(withdrawSource, /state\.overview\.isAuthenticated/);
  assert.doesNotMatch(quickPanelSource, /overview\.isAuthenticated/);
  assert.doesNotMatch(guardSource, /hasPortalIamSession\(\)/);
  assert.doesNotMatch(tokenPlanSummarySource, /hasPortalIamSession\(\)/);
  assert.doesNotMatch(accountSource, /SdkworkWalletRechargeDialog|SdkworkWalletWithdrawDialog/);
  assert.doesNotMatch(walletEntrySource, /SdkworkWalletHeaderEntry/);
  assert.match(accountSource, /overview=\{\{ \.\.\.state\.overview, isAuthenticated \}\}/);
  assert.match(walletEntrySource, /overview=\{\{ \.\.\.state\.overview, isAuthenticated \}\}/);
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

test("app bootstrap wires T1 domain service providers from independent owner SDKs", () => {
  const mainSource = readPortalFile("./src/main.tsx");
  const providersSource = readPortalFile("./packages/sdkwork-clawroutes-pc-commons/src/domain-service-providers.ts");

  assert.match(mainSource, /configureClawRouterDomainServiceProviders\(\)/);
  assert.doesNotMatch(mainSource, /getClawRouterAppSdkClient/);
  assert.doesNotMatch(mainSource, /configureSdkworkCommerceServiceProvider/);
  assert.match(providersSource, /createSdkworkOrderAppService/);
  assert.match(
    providersSource,
    /buildOrderCommercePort\(orderClient\)/,
  );
  assert.match(providersSource, /getSdkworkOrderAppSdkClient\(\)/);
  assert.match(providersSource, /getSdkworkPaymentAppSdkClient\(\)/);
  assert.match(providersSource, /configureSdkworkOrderSessionTokenProvider\(readSessionTokens\)/);
  assert.doesNotMatch(providersSource, /createTokenManager|Authorization|Access-Token/);
});

test("federated commerce runtime mounts the complete Order gateway assembly", () => {
  const runtimeSource = readPortalFile("../../crates/sdkwork-routes-clawrouter-app-api/src/commerce_runtime.rs");

  assert.match(runtimeSource, /sdkwork_api_order_assembly::ApiAssembly::from_database_pool/);
  assert.match(runtimeSource, /\.merge\(order_assembly\.router\)/);
  assert.doesNotMatch(runtimeSource, /sdkwork_routes_order_app_api::/);
});
