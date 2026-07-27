import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readPortalFile(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("console shell owns responsive content gutters and viewport height", () => {
  const shellSource = readPortalFile(
    "./packages/sdkwork-clawrouter-pc-console-shell/src/ConsoleLayout.tsx",
  );

  assert.match(shellSource, /bg-slate-50 p-3 dark:bg-\[#121212\] sm:p-4 lg:p-5/);
  assert.match(shellSource, /data-console-content/);
  assert.match(shellSource, /data-console-content-main/);
  assert.match(
    shellSource,
    /claw-router-console-commerce-surface h-full min-h-0 min-w-0 w-full max-w-none flex-1/,
  );
});

test("every console route is covered by the shared content gutter contract", () => {
  const appSource = readPortalFile("./src/App.tsx");
  const businessHostSource = readPortalFile("./src/console-business/consoleBusinessHostMount.tsx");
  const routeSource = `${appSource}\n${businessHostSource}`;
  const consoleRoutePaths = [
    "dashboard",
    "usage",
    "gateway",
    "api-keys",
    "account",
    "wallet",
    "coupons",
    "memberships",
    "checkout",
    "payment",
    "settlements",
    "user",
    "settings",
  ];

  for (const routePath of consoleRoutePaths) {
    assert.match(routeSource, new RegExp(`path=["']${routePath}["']`), routePath);
  }
});

test("console business pages do not duplicate shell-owned outer gutters", () => {
  const accountSource = readPortalFile("./src/console-business/ConsoleAccountView.tsx");
  const walletSource = readPortalFile("./src/console-business/ClawRouterWalletPage.tsx");
  const membershipSource = readPortalFile("./src/console-business/ClawRouterMembershipPage.tsx");
  const settlementsSource = readPortalFile("./src/console-business/ConsoleSettlementsView.tsx");
  const businessHostSource = readPortalFile("./src/console-business/consoleBusinessHostMount.tsx");
  const styleSource = readPortalFile("./src/index.css");

  assert.doesNotMatch(accountSource, /px-4 pb-3 sm:px-5 sm:pb-4/);
  assert.doesNotMatch(walletSource, /px-4 pb-3 sm:px-5 sm:pb-4/);
  assert.doesNotMatch(membershipSource, /w-full max-w-none px-4 pb-8/);
  assert.doesNotMatch(settlementsSource, /w-full max-w-none px-4 pb-6/);

  for (const surface of ["checkout", "coupons", "payment"]) {
    assert.match(
      businessHostSource,
      new RegExp(`<ConsoleBusinessPageFrame surface=["']${surface}["']>`),
      surface,
    );
    assert.match(styleSource, new RegExp(`data-console-business-page=["']${surface}["']`), surface);
  }

  assert.match(styleSource, /padding:\s*0/);
});

test("console pages inherit shell height instead of duplicating the navbar offset", () => {
  const consolePagePaths = [
    "./packages/sdkwork-clawrouter-pc-console-api-keys/src/ApiKeysView.tsx",
    "./packages/sdkwork-clawrouter-pc-console-dashboard/src/DashboardView.tsx",
    "./packages/sdkwork-clawrouter-pc-console-gateway/src/GatewayView.tsx",
    "./packages/sdkwork-clawrouter-pc-console-messages/src/MessagesView.tsx",
    "./packages/sdkwork-clawrouter-pc-console-settings/src/SettingsView.tsx",
    "./packages/sdkwork-clawrouter-pc-console-usage/src/UsageView.tsx",
    "./packages/sdkwork-clawrouter-pc-console-user/src/UserView.tsx",
  ];

  for (const consolePagePath of consolePagePaths) {
    const source = readPortalFile(consolePagePath);
    assert.doesNotMatch(source, /calc\(100(?:d)?vh-64px\)/, consolePagePath);
  }
});

test("console dashboard renders a truthful default modality distribution", () => {
  const dashboardSource = readPortalFile(
    "./packages/sdkwork-clawrouter-pc-console-dashboard/src/DashboardView.tsx",
  );

  assert.match(dashboardSource, /chartValue:\s*totalRequests > 0 \? percentage : 1/);
  assert.match(dashboardSource, /dataKey="chartValue"/);
  assert.match(dashboardSource, /opacity=\{hasModalityData \? 1 : 0\.35\}/);
  assert.match(dashboardSource, /hasModalityData \? '100%' : '0%'/);
  assert.doesNotMatch(dashboardSource, /pieData\.length === 0/);
});
