import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import {
  clearStoredAppSessionToken,
  storeAppSessionFromResult,
} from "./packages/sdkwork-clawroutes-pc-commons/src/app-session-token.ts";
import { resetClawRouterSdkClients } from "./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts";
import { backendPromotionOffersList } from "./packages/sdkwork-clawrouter-pc-admin-marketing/src/marketingService.ts";
import {
  fetchMembershipAdminPackageGroups,
  fetchMembershipAdminPackages,
  fetchMembershipAdminPlans,
} from "./packages/sdkwork-clawrouter-pc-admin-memberships/src/membershipsService.ts";

const originalFetch = globalThis.fetch;
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");

type CapturedCommerceRequest = {
  url: string;
  method: string;
};

async function withCommerceSdkResponder<T>(
  responder: (request: CapturedCommerceRequest) => unknown,
  run: (captured: CapturedCommerceRequest[]) => Promise<T>,
): Promise<T> {
  const captured: CapturedCommerceRequest[] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    enumerable: true,
    value: { dispatchEvent: () => true },
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = {
      url: typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url,
      method: init?.method ?? "GET",
    };
    captured.push(request);
    return new Response(JSON.stringify({ code: "2000", data: responder(request) }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  clearStoredAppSessionToken();
  storeAppSessionFromResult({
    code: "2000",
    data: { accessToken: "commerce-test-access-token", authToken: "commerce-test-auth-token" },
  });
  resetClawRouterSdkClients();

  try {
    return await run(captured);
  } finally {
    clearStoredAppSessionToken();
    resetClawRouterSdkClients();
    globalThis.fetch = originalFetch;
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, "window", originalWindowDescriptor);
    } else {
      delete (globalThis as { window?: Window }).window;
    }
  }
}

function assertCanonicalPageQuery(
  request: CapturedCommerceRequest,
  expectedPath: string,
  page: string,
  pageSize: string,
): URLSearchParams {
  const url = new URL(request.url, "http://sdkwork.test");
  assert.equal(request.method, "GET");
  assert.equal(url.pathname, expectedPath);
  assert.equal(url.searchParams.get("page"), page);
  assert.equal(url.searchParams.get("page_size"), pageSize);
  for (const forbiddenName of ["pageSize", "limit", "page_no", "pageNo", "per_page", "size"]) {
    assert.equal(url.searchParams.has(forbiddenName), false, `${forbiddenName} must not be sent on the wire`);
  }
  return url.searchParams;
}

function readPortalFile(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function portalFileExists(relativePath: string): boolean {
  return existsSync(new URL(relativePath, import.meta.url));
}

test("marketing service sends canonical pagination through the generated promotion SDK and preserves pageInfo", async () => {
  const serverPageInfo = {
    mode: "offset",
    page: 3,
    pageSize: 50,
    totalItems: "121",
    totalPages: 3,
    hasMore: false,
  };

  await withCommerceSdkResponder(
    () => ({ items: [{ id: "offer-1" }], pageInfo: serverPageInfo }),
    async (captured) => {
      const result = await backendPromotionOffersList({ page: 3, pageSize: 50, status: "active" });

      assert.equal(captured.length, 1);
      const query = assertCanonicalPageQuery(
        captured[0],
        "/backend/v3/api/promotions/offers",
        "3",
        "50",
      );
      assert.equal(query.get("status"), "active");
      assert.deepEqual(result.pageInfo, serverPageInfo);
      assert.deepEqual(result.items, [{ id: "offer-1" }]);
    },
  );
});

test("membership package services request one generated SDK page and preserve server pageInfo", async () => {
  const pageInfoByPath = new Map<string, Record<string, unknown>>();
  const responseByPath = new Map<string, unknown[]>([
    ["/backend/v3/api/memberships/package_groups", [{
      id: "group-1",
      code: "monthly",
      name: "Monthly",
      billingCycle: "month",
      durationDays: "30",
      sortWeight: "10",
      status: "active",
      packageCount: "4",
    }]],
    ["/backend/v3/api/memberships/packages", [{
      id: "package-1",
      code: "monthly-pro",
      packageGroupId: "group-1",
      planId: "plan-1",
      name: "Monthly Pro",
      priceAmount: "69.90",
      currencyCode: "CNY",
      durationDays: "30",
      status: "active",
    }]],
    ["/backend/v3/api/memberships/plans", [{
      id: "plan-1",
      code: "pro",
      name: "Pro",
      rank: "1",
      status: "active",
      benefits: [],
      updatedAt: "2026-07-31T00:00:00Z",
    }]],
  ]);

  await withCommerceSdkResponder(
    ({ url }) => {
      const path = new URL(url, "http://sdkwork.test").pathname;
      const pageInfo = {
        mode: "offset",
        page: 2,
        pageSize: 20,
        totalItems: path.endsWith("package_groups") ? "24" : "21",
        totalPages: 2,
        hasMore: false,
      };
      pageInfoByPath.set(path, pageInfo);
      return { items: responseByPath.get(path) ?? [], pageInfo };
    },
    async (captured) => {
      const [groups, packages, plans] = await Promise.all([
        fetchMembershipAdminPackageGroups({ page: 2, pageSize: 20, status: "active" }),
        fetchMembershipAdminPackages({
          page: 2,
          pageSize: 20,
          packageGroupId: "group-1",
          planId: "plan-1",
          status: "active",
        }),
        fetchMembershipAdminPlans({ page: 2, pageSize: 20, status: "active" }),
      ]);

      assert.equal(captured.length, 3);
      const requestsByPath = new Map(captured.map((request) => [
        new URL(request.url, "http://sdkwork.test").pathname,
        request,
      ]));
      const groupRequest = requestsByPath.get("/backend/v3/api/memberships/package_groups");
      const packageRequest = requestsByPath.get("/backend/v3/api/memberships/packages");
      const planRequest = requestsByPath.get("/backend/v3/api/memberships/plans");
      assert.ok(groupRequest);
      assert.ok(packageRequest);
      assert.ok(planRequest);
      const groupQuery = assertCanonicalPageQuery(
        groupRequest,
        "/backend/v3/api/memberships/package_groups",
        "2",
        "20",
      );
      const packageQuery = assertCanonicalPageQuery(
        packageRequest,
        "/backend/v3/api/memberships/packages",
        "2",
        "20",
      );
      const planQuery = assertCanonicalPageQuery(
        planRequest,
        "/backend/v3/api/memberships/plans",
        "2",
        "20",
      );
      assert.equal(groupQuery.get("status"), "active");
      assert.equal(packageQuery.get("package_group_id"), "group-1");
      assert.equal(packageQuery.get("plan_id"), "plan-1");
      assert.equal(packageQuery.get("status"), "active");
      assert.equal(planQuery.get("status"), "active");
      assert.deepEqual(groups.pageInfo, pageInfoByPath.get("/backend/v3/api/memberships/package_groups"));
      assert.deepEqual(packages.pageInfo, pageInfoByPath.get("/backend/v3/api/memberships/packages"));
      assert.deepEqual(plans.pageInfo, pageInfoByPath.get("/backend/v3/api/memberships/plans"));
      assert.equal(groups.items[0]?.packageCount, 4);
      assert.equal(packages.items[0]?.groupId, "group-1");
      assert.equal(plans.items[0]?.benefitCount, 0);
    },
  );
});

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
  assert.match(navbarSource, /ClawRouterNavbarWalletEntry/);
  assert.doesNotMatch(navbarSource, /console\.navbar\.coupons/);
  assert.doesNotMatch(navbarSource, /TicketPercent/);
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
  const i18nResourcesSource = readPortalFile(
    "./packages/sdkwork-clawrouter-pc-i18n/src/resources/index.ts",
  );
  const summarySource = readPortalFile("./src/token-plan/tokenPlanMemberSummary.ts");
  const packageJson = JSON.parse(readPortalFile("./package.json")) as {
    dependencies: Record<string, string>;
  };

  assert.equal(packageJson.dependencies["@sdkwork/order-pc-recharge"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/order-pc-checkout"], "workspace:*");
  assert.match(modalSource, /@sdkwork\/order-pc-checkout/);
  assert.match(modalSource, /SdkworkOrderCheckoutDialog/);
  assert.match(modalSource, /SDKWORK_SUBSCRIPTION_I18N_KEYS/);
  assert.match(modalSource, /SDKWORK_SUBSCRIPTION_I18N_KEYS\.checkout\.selectedPlan/);
  assert.match(modalSource, /SDKWORK_SUBSCRIPTION_I18N_KEYS\.checkout\.paymentUnavailableDescription/);
  assert.match(modalSource, /SDKWORK_SUBSCRIPTION_I18N_KEYS\.checkout\.title, "购买套餐"/);
  assert.match(modalSource, /SDKWORK_SUBSCRIPTION_I18N_KEYS\.checkout\.expiresIn/);
  assert.doesNotMatch(modalSource, /membership_checkout\./);
  assert.match(i18nResourcesSource, /sdkworkSubscriptionCheckoutI18nBundle/);
  assert.match(modalSource, /@sdkwork\/order-pc-recharge/);
  assert.match(modalSource, /SdkworkPointsRechargeDialog/);
  assert.match(modalSource, /getClawRouterPointsRechargeService/);
  assert.match(modalSource, /service=\{getClawRouterPointsRechargeService\(\)\}/);
  assert.match(modalSource, /SdkworkCouponRedemptionDialog/);
  assert.match(modalSource, /service=\{getClawRouterCouponRechargeService\(\)\}/);
  assert.doesNotMatch(modalSource, /getClawRouterCouponRechargeService\(\)\.redeem/);
  assert.match(modalSource, /coupon_recharge\.code_label/);
  assert.match(modalSource, /Token Bank/);
  assert.doesNotMatch(modalSource, /createTokenPlanCommerceModal\("redeem"\)/);
  assert.doesNotMatch(modalSource, /createTokenPlanCommerceModal\("points-purchase"\)/);
  assert.doesNotMatch(modalSource, /登录后将跳转到控制台钱包完成操作/);
  assert.match(providerSource, /recharges:\s*orderClient\.recharges/);
  assert.match(
    providerSource,
    /const orderAppService = createSdkworkOrderAppService\(\{\s*appClient:\s*orderClient,\s*\}\);/,
  );
  assert.doesNotMatch(providerSource, /function buildOrderCommercePort/);
  assert.match(providerSource, /configureSdkworkOrderAppServiceProvider\(\(\) => orderAppService\)/);
  assert.match(providerSource, /createSdkworkMembershipCheckoutService/);
  assert.match(providerSource, /createSdkworkCouponRechargeService/);
  assert.match(providerSource, /getClawRouterCouponRechargeService/);
  assert.match(providerSource, /getClawRouterMembershipCheckoutService/);
  assert.doesNotMatch(providerSource, /configureSdkworkMembershipOrderAppServiceProvider/);
  assert.doesNotMatch(providerSource, /MembershipOrderAppTransportClient/);
  assert.match(providerSource, /appService: orderAppService/);
  assert.doesNotMatch(providerSource, /bootstrapMembershipOrderAppService/);
  assert.match(summarySource, /pointBalance:\s*walletState\.overview\.account\.tokenBankAvailable/);
});

test("Compute Credits balances and activity use the Token Bank account", () => {
  const providerSource = readPortalFile(
    "./packages/sdkwork-clawroutes-pc-commons/src/domain-service-providers.ts",
  );
  const dashboardSource = readPortalFile(
    "./packages/sdkwork-clawrouter-pc-console-dashboard/src/dashboardService.ts",
  );
  const dashboardViewSource = readPortalFile(
    "./packages/sdkwork-clawrouter-pc-console-dashboard/src/DashboardView.tsx",
  );
  const tokenBankSources = [
    readPortalFile("./src/console-business/ClawRouterNavbarWalletEntry.tsx"),
    readPortalFile("./src/console-business/ClawRouterNavbarWalletQuickPanel.tsx"),
    readPortalFile("./src/console-business/ClawRouterTokenBankBalancePanel.tsx"),
    readPortalFile("./src/console-business/ClawRouterTokenBankTransactionList.tsx"),
    readPortalFile("./src/console-business/ClawRouterWalletPage.tsx"),
    readPortalFile("./src/console-business/ConsoleAccountView.tsx"),
    readPortalFile("./src/token-plan/tokenPlanMemberSummary.ts"),
  ];

  assert.match(providerSource, /getClawRouterAccountAppService/);
  assert.match(providerSource, /return getSdkworkAccountService\(\)/);
  assert.match(providerSource, /billing:\s*accountClient\.billing/);
  assert.match(providerSource, /tokenBank:\s*accountClient\.tokenBank/);
  assert.match(dashboardSource, /getClawRouterAccountAppService\(\)\.tokenBank\.account\.retrieve\(\)/);
  assert.match(dashboardSource, /tokenBankAvailable\s*=\s*readTokenBankAvailableAmount\(tokenBankResult\.value\)/);
  assert.match(dashboardSource, /Promise\.allSettled/);
  assert.doesNotMatch(dashboardSource, /DASHBOARD_(?:DATA_UNAVAILABLE|PARTIAL_DATA)_WARNING/);
  assert.doesNotMatch(dashboardSource, /warnings\.push/);
  assert.doesNotMatch(dashboardSource, /\['availableCredits', 'balance', 'credits'\]/);
  assert.match(dashboardViewSource, /snapshot\.summary\.tokenBankAvailable/);
  assert.doesNotMatch(dashboardViewSource, /snapshot\.summary\.availableCredits/);
  assert.doesNotMatch(dashboardViewSource, /showFull(?:Loading|Error)/);

  const combinedSource = tokenBankSources.join("\n");
  assert.match(combinedSource, /tokenBankAvailable/);
  assert.match(combinedSource, /tokenBankDelta/);
  assert.doesNotMatch(combinedSource, /account\.availablePoints/);
  assert.doesNotMatch(combinedSource, /\.pointsDelta/);
  assert.doesNotMatch(combinedSource, /formatPoints\s*\(/);
  assert.doesNotMatch(combinedSource, /formatWalletDelta\s*\(/);
});

test("English and Chinese catalogs use the Compute Credits terminology", () => {
  const resourcesRoot = new URL(
    "./packages/sdkwork-clawrouter-pc-i18n/src/resources/",
    import.meta.url,
  );
  const resourcePaths = readdirSync(resourcesRoot, { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".ts"));

  for (const relativePath of resourcePaths) {
    const source = readFileSync(
      new URL(relativePath.replaceAll("\\", "/"), resourcesRoot),
      "utf8",
    );
    assert.doesNotMatch(source, /积分/, `${relativePath} must not display the retired Chinese term`);

    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^\s*"[^"]+":\s*"((?:[^"\\]|\\.)*)",?\s*$/);
      if (!match) {
        continue;
      }
      const displayValue = match[1]
        .replaceAll("Compute Credits", "")
        .replaceAll(/\{\{[^}]+\}\}/g, "")
        .replaceAll(/credit card/gi, "")
        .replaceAll("Unified Social Credit Code", "")
        .replaceAll("Credit Limit", "")
        .replaceAll(/data points/gi, "");
      assert.doesNotMatch(
        displayValue,
        /\b(?:point|points|credit|credits)\b/i,
        `${relativePath} contains an ambiguous English display term: ${match[1]}`,
      );
    }
  }

  const adminAnalyticsSource = readPortalFile(
    "./packages/sdkwork-clawrouter-pc-admin-analytics/src/index.tsx",
  );
  assert.doesNotMatch(adminAnalyticsSource, /t\([^\n]+,\s*['"]Points?['"]\)/);
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

test("console wallet embeds the order-owned points recharge flow", () => {
  const walletSource = readPortalFile("./src/console-business/ClawRouterWalletPage.tsx");
  const ownershipSource = readPortalFile("./src/console-business/consoleBusinessDomains.ts");

  assert.match(walletSource, /SdkworkPointsRechargeInline/);
  assert.match(walletSource, /@sdkwork\/order-pc-recharge/);
  assert.match(walletSource, /getClawRouterPointsRechargeService/);
  assert.match(walletSource, /service=\{pointsRechargeService\}/);
  assert.doesNotMatch(walletSource, /controller\.rechargePoints/);
  assert.doesNotMatch(walletSource, /function RechargePanel/);
  assert.match(ownershipSource, /rechargePackageName:\s*'@sdkwork\/order-pc-recharge'/);
});

test("recharge hosts provide server-expiration checkout copy", () => {
  const tokenPlanSource = readPortalFile("./src/token-plan/ClawRouterTokenPlanCommerceModal.tsx");
  const walletSource = readPortalFile("./src/console-business/ClawRouterWalletPage.tsx");
  const rechargeCatalogSource = readPortalFile(
    "./packages/sdkwork-clawrouter-pc-i18n/src/resources/console/recharge.ts",
  );

  for (const source of [tokenPlanSource, walletSource]) {
    assert.match(source, /points_recharge\.expires_in/);
    assert.match(source, /points_recharge\.expired_description/);
    assert.match(source, /points_recharge\.retry_payment/);
  }
  assert.match(rechargeCatalogSource, /"points_recharge\.expires_in"/);
  assert.match(rechargeCatalogSource, /"points_recharge\.expired_description"/);
  assert.match(rechargeCatalogSource, /"points_recharge\.retry_payment"/);
});

test("token plan and console wallet delegate coupon redemption to the order-owned flow", () => {
  const tokenPlanSource = readPortalFile("./src/token-plan/ClawRouterTokenPlanCommerceModal.tsx");
  const walletSource = readPortalFile("./src/console-business/ClawRouterWalletPage.tsx");

  assert.match(tokenPlanSource, /SdkworkCouponRedemptionDialog/);
  assert.match(walletSource, /SdkworkCouponRedemptionInline/);
  assert.match(walletSource, /service=\{couponRedemptionService\}/);
  assert.match(walletSource, /result\.benefitKind === 'subscription'/);
  assert.match(walletSource, /membershipController\.refresh\(\)/);
  assert.match(walletSource, /controller\.refresh\(\)/);
  assert.doesNotMatch(walletSource, /getSdkworkPromotionService/);
  assert.doesNotMatch(walletSource, /promotions\.codes\.redemptions\.create/);
  assert.doesNotMatch(walletSource, /function RedeemPanel/);
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
  const styleSource = readPortalFile("./src/index.css");

  assert.match(mountSource, /resolveConsoleCouponLocale/);
  assert.match(mountSource, /<SdkworkCouponPage locale=\{locale\} \/>/);
  assert.match(mountSource, /<ConsoleBusinessPageFrame surface="coupons">/);
  assert.match(localeSource, /normalizeSdkworkCouponLocale/);
  assert.match(
    styleSource,
    /data-console-business-page='coupons'\] \[class~='max-w-5xl'\]/,
  );
  assert.match(styleSource, /max-width:\s*none/);
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
    /createSdkworkOrderAppService\(\{\s*appClient:\s*orderClient,\s*\}\)/,
  );
  assert.doesNotMatch(providersSource, /buildOrderCommercePort/);
  assert.match(providersSource, /getSdkworkOrderAppSdkClient\(\)/);
  assert.match(providersSource, /getSdkworkPaymentAppSdkClient\(\)/);
  assert.match(providersSource, /configureSdkworkOrderSessionTokenProvider\(readSessionTokens\)/);
  assert.doesNotMatch(providersSource, /createTokenManager|Authorization|Access-Token/);
});

test("federated commerce runtime mounts the complete Order gateway assembly", () => {
  const runtimeSource = readPortalFile("../../crates/sdkwork-routes-clawrouter-app-api/src/commerce_runtime.rs");

  assert.match(runtimeSource, /sdkwork_api_order_assembly::OrderAssemblyContract::database_module/);
  assert.match(runtimeSource, /sdkwork_api_order_assembly::assemble_app_api_contribution_with_pool/);
  assert.match(runtimeSource, /\.merge\(order_assembly\.router\)/);
  assert.doesNotMatch(runtimeSource, /sdkwork_routes_order_app_api::/);
});
