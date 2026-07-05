import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function portalFileUrl(relativePath: string): URL {
  return new URL(relativePath, import.meta.url);
}

function portalFileExists(relativePath: string): boolean {
  return existsSync(portalFileUrl(relativePath));
}

function readPortalFile(relativePath: string): string {
  return readFileSync(portalFileUrl(relativePath), "utf8");
}

const CONSOLE_LAYOUT_FILE = "./packages/sdkwork-clawrouter-pc-console-shell/src/ConsoleLayout.tsx";

const implementationCaveatPatterns = [
  /Read-only/i,
  /read-only/i,
  /command contract/i,
  /command contracts/i,
  /App SDK contract/i,
  /app contract/i,
  /contract/i,
  /before they can be enabled/i,
  /contract exists/i,
  /not available in the current app contract/i,
];

function assertNoImplementationCaveats(source: string): void {
  for (const pattern of implementationCaveatPatterns) {
    assert.doesNotMatch(source, pattern);
  }
}

function expectedLocalDateTime(value: string): string {
  const date = new Date(value);
  const pad2 = (part: number) => String(part).padStart(2, "0");
  return [
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
    `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`,
  ].join(" ");
}

const usageI18nKeys = [
  "console.usage.title",
  "console.usage.loadedCost",
  "console.usage.rows",
  "console.usage.tokens",
  "console.usage.startTimePlaceholder",
  "console.usage.endTimePlaceholder",
  "console.usage.searchPlaceholder",
  "console.usage.status.all",
  "console.usage.status.success",
  "console.usage.status.error",
  "console.usage.loading",
  "console.usage.loadErrorTitle",
  "console.usage.loadErrorFallback",
  "console.usage.emptyTitle",
  "console.usage.emptyDescription",
  "console.usage.table.time",
  "console.usage.table.key",
  "console.usage.table.group",
  "console.usage.table.status",
  "console.usage.table.type",
  "console.usage.table.model",
  "console.usage.table.latency",
  "console.usage.table.input",
  "console.usage.table.output",
  "console.usage.table.cost",
  "console.usage.table.ip",
  "console.usage.table.userAgent",
  "console.usage.table.details",
  "console.usage.badge.stream",
  "console.usage.metric.cache",
  "console.usage.metric.multiplier",
  "console.usage.metric.input",
  "console.usage.metric.output",
  "console.usage.unit.tokens",
  "console.usage.detail.requestId",
  "console.usage.detail.cacheTokens",
  "console.usage.detail.pricing",
  "console.usage.detail.formula",
  "console.usage.detail.reasoning",
  "console.usage.detail.path",
  "console.usage.detail.error",
  "console.usage.detail.inputPrice",
  "console.usage.detail.outputPrice",
  "console.usage.detail.cachePrice",
  "console.usage.detail.reference",
  "console.usage.pagination.showing",
  "console.usage.pagination.page",
  "console.usage.pagination.pageSize",
];

const usageHardcodedUiPatterns = [
  />\s*API usage logs\s*</,
  />\s*Loaded cost\s*</,
  />\s*Rows\s*</,
  />\s*Tokens\s*</,
  /placeholder="startTime, for example 2026-04-21T00:00:00Z"/,
  /placeholder="endTime, for example 2026-04-21T23:59:59Z"/,
  /placeholder="Search key, model, request, path\.\.\."/,
  />\s*All statuses\s*</,
  />\s*Success\s*</,
  />\s*Error\s*</,
  /title="Loading usage logs\.\.\."/,
  /title="Usage logs could not be loaded"/,
  /title="No usage logs found"/,
  /description="The usage logs API returned an empty page for the current query\."/,
  />\s*Time\s*</,
  />\s*Key\s*</,
  />\s*Group\s*</,
  />\s*Type\s*</,
  />\s*Model\s*</,
  />\s*Latency\s*</,
  />\s*Input\s*</,
  />\s*Output\s*</,
  />\s*Cost\s*</,
  />\s*IP\s*</,
  />\s*Details\s*</,
  />\s*Request ID\s*</,
  />\s*Cache tokens\s*</,
  />\s*Pricing\s*</,
  />\s*Formula\s*</,
  />\s*Reasoning\s*</,
  />\s*Path\s*</,
  />\s*Reference only; the ledger is the source of truth\.\s*</,
  /Showing \{visibleStart\} - \{visibleEnd\} of \{totalLogs\}/,
  /Page \{page\} \/ \{pageCount\}/,
  />\s*10 \/ page\s*</,
  />\s*20 \/ page\s*</,
  />\s*50 \/ page\s*</,
];

const simplifiedConsolePageFiles = [
  "./packages/sdkwork-clawrouter-pc-console-dashboard/src/DashboardView.tsx",
  "./packages/sdkwork-clawrouter-pc-console-usage/src/UsageView.tsx",
  "./packages/sdkwork-clawrouter-pc-console-gateway/src/GatewayView.tsx",
  "./packages/sdkwork-clawrouter-pc-console-api-keys/src/ApiKeysView.tsx",
  "./packages/sdkwork-clawrouter-pc-console-user/src/UserView.tsx",
  "./packages/sdkwork-clawrouter-pc-console-settings/src/SettingsView.tsx",
].filter(portalFileExists);

const deferredConsolePageFiles = [
  "./packages/sdkwork-clawrouter-pc-console-messages/src/MessagesView.tsx",
];

const removedConsolePageTitlePatterns = [
  {
    file: "./packages/sdkwork-clawrouter-pc-console-gateway/src/GatewayView.tsx",
    pattern: /<h1[^>]*>\s*\{t\('console\.gateway\.title'/,
  },
  {
    file: "./packages/sdkwork-clawrouter-pc-console-messages/src/MessagesView.tsx",
    pattern: /<h1[^>]*>\s*<Bell[^>]*>\s*\{t\('console\.messages\.title'/,
  },
  {
    file: "./packages/sdkwork-clawrouter-pc-console-settings/src/SettingsView.tsx",
    pattern: /<h1[^>]*>\s*\{t\("console\.settings\.settingsview\.text\.18giiv0"/,
  },
  {
    file: "./packages/sdkwork-clawrouter-pc-console-usage/src/UsageView.tsx",
    pattern: /<h1[^>]*>\s*\{t\('console\.usage\.title'/,
  },
  {
    file: "./packages/sdkwork-clawrouter-pc-console-user/src/UserView.tsx",
    pattern: /<h1[^>]*>\s*\{t\("console\.user\.userview\.text\.jgg9i5"/,
  },
].filter(({ file }) => portalFileExists(file));

function viewportClassNames(source: string): string[] {
  return [...source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)]
    .map((match) => match[1] ?? match[2] ?? "")
    .filter((className) => /(?:^|\s)(?:h|min-h)-\[calc\(100vh-72px\)\](?:\s|$)/.test(className));
}

test("console usage logs copy is routed through i18n without read-only caveats", () => {
  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-console-usage/src/UsageView.tsx");

  assert.match(source, /t\('console\.usage\.table\.cost', 'Spend'\)/);
  assert.match(source, /const SPEND_DECIMAL_DIGITS = 9;/);
  assert.match(source, /formatDecimalAmount\(log\.cost, SPEND_DECIMAL_DIGITS\)/);
  assert.doesNotMatch(source, /t\('console\.usage\.loadedCost', 'Loaded cost'\)/);
  assert.doesNotMatch(source, /t\('console\.usage\.table\.cost', 'Cost'\)/);
  assert.match(source, /placeholder=\{t\('console\.usage\.startTimePlaceholder'/);
  assert.match(source, /placeholder=\{t\('console\.usage\.endTimePlaceholder'/);
  assert.match(source, /placeholder=\{t\('console\.usage\.searchPlaceholder'/);
  for (const pattern of usageHardcodedUiPatterns) {
    assert.doesNotMatch(source, pattern);
  }
  assertNoImplementationCaveats(source);
});

test("console usage page does not render a loaded summary header row", () => {
  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-console-usage/src/UsageView.tsx");

  assert.doesNotMatch(source, /loadedSpendTotal/);
  assert.doesNotMatch(source, /loadedTokenTotal/);
  assert.doesNotMatch(source, /t\('console\.usage\.loadedCost'/);
  assert.doesNotMatch(source, /t\('console\.usage\.rows'/);
  assert.doesNotMatch(source, /t\('console\.usage\.tokens'/);
  assert.doesNotMatch(source, /className="[^"]*shrink-0[^"]*justify-end/);
});

test("console routed pages keep compact 5px page padding below the global header", () => {
  for (const file of simplifiedConsolePageFiles) {
    const source = readPortalFile(file);
    const viewportClasses = viewportClassNames(source);

    assert.ok(viewportClasses.length > 0, `${file} must define a console viewport root`);
    for (const className of viewportClasses) {
      assert.match(className, /(?:^|\s)p-\[5px\](?:\s|$)/, `${file} viewport root must use 5px page padding on every side`);
      assert.doesNotMatch(
        className,
        /(?:^|\s)(?:(?:p-(?!\[5px\])|(?:px|py|pt|pb|pl|pr)-)|(?:(?:sm|md|lg|xl):(?:p|px|py|pt|pb|pl|pr)-))/,
        `${file} viewport root must not override the 5px page padding`,
      );
    }
    assert.doesNotMatch(source, /\{\/\*\s*Header\s*\*\/\}/, `${file} must not keep page header chrome comments`);
  }

  for (const { file, pattern } of removedConsolePageTitlePatterns) {
    assert.doesNotMatch(readPortalFile(file), pattern, `${file} must not render a page-level title header`);
  }
});

test("console usage log time renders as local yyyy-MM-dd HH:mm:ss without ISO separator", async () => {
  const usageFormatting = await import("./packages/sdkwork-clawrouter-pc-console-usage/src/usageFormatting.ts");
  const formatUsageLogLocalTime = (usageFormatting as {
    formatUsageLogLocalTime?: (value: string) => string;
  }).formatUsageLogLocalTime;

  assert.equal(typeof formatUsageLogLocalTime, "function");
  const formatted = formatUsageLogLocalTime("2026-04-21T12:34:56.789Z");
  assert.equal(formatted, expectedLocalDateTime("2026-04-21T12:34:56.789Z"));
  assert.match(formatted, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  assert.doesNotMatch(formatted, /[TZ]/);
  assert.equal(formatUsageLogLocalTime("2026-04-21 12:34:56"), "2026-04-21 12:34:56");
  assert.equal(formatUsageLogLocalTime("not-a-date"), "not-a-date");
  assert.equal(formatUsageLogLocalTime(""), "-");

  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-console-usage/src/UsageView.tsx");
  assert.match(source, /formatUsageLogLocalTime\(log\.time\)/);
  assert.doesNotMatch(source, /\{log\.time\}/);
});

test("console usage logs keep pagination visible while the table body scrolls inside the viewport", () => {
  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-console-usage/src/UsageView.tsx");

  assert.match(source, /h-\[calc\(100vh-72px\)\][^"]*overflow-hidden[^"]*flex[^"]*flex-col/);
  assert.match(source, /className="[^"]*shrink-0[^"]*flex[^"]*flex-col[^"]*md:flex-row/);
  assert.match(source, /className="[^"]*flex[^"]*flex-col[^"]*flex-1[^"]*min-h-0/);
  assert.match(source, /className="[^"]*flex-1[^"]*min-h-0[^"]*overflow-auto/);
  assert.match(source, /className="[^"]*sticky[^"]*top-0[^"]*z-10/);
  assert.match(source, /className="[^"]*shrink-0[^"]*border-t/);
});

test("console usage logs do not expand the first record until the user clicks it", () => {
  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-console-usage/src/UsageView.tsx");

  assert.match(source, /setUsageLogs\(data\.logs\);\s*setTotalLogs\(data\.total\);\s*setExpandedIds\(\[\]\);/);
  assert.doesNotMatch(source, /setExpandedIds\(data\.logs\.length > 0 \? \[data\.logs\[0\]\.id\] : \[\]\)/);
  assert.match(source, /onClick=\{\(e\) => toggleExpand\(log\.id, e\)\}/);
});

test("console usage service reads SdkWork list totals from pageInfo.totalItems", () => {
  const serviceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-console-usage/src/usageService.ts");

  assert.match(serviceSource, /readUsageLogPageTotal/);
  assert.match(serviceSource, /totalItems', 'total_items'/);
  assert.match(serviceSource, /readRequiredApiItems\(data,/);
});

test("console usage model cell displays provider native model and exposes catalog key as hover title", () => {
  const viewSource = readPortalFile("./packages/sdkwork-clawrouter-pc-console-usage/src/UsageView.tsx");
  const serviceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-console-usage/src/usageService.ts");

  assert.match(serviceSource, /providerNativeModel:/);
  assert.match(serviceSource, /requestedModelCatalogKey:/);
  assert.match(serviceSource, /readOptionalString\(item, 'providerNativeModel'\)/);
  assert.match(serviceSource, /readOptionalString\(item, 'requestedModelCatalogKey'\)/);
  assert.match(viewSource, /const displayModel = log\.providerNativeModel \|\| log\.model;/);
  assert.match(viewSource, /const modelTooltip = log\.requestedModelCatalogKey \|\| displayModel;/);
  assert.match(viewSource, /title=\{modelTooltip\}/);
  assert.match(viewSource, /\{displayModel\}/);
  assert.doesNotMatch(viewSource, /\{log\.model\}/);
});

test("console usage table displays compact user agent device info with the full header as tooltip", () => {
  const viewSource = readPortalFile("./packages/sdkwork-clawrouter-pc-console-usage/src/UsageView.tsx");
  const serviceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-console-usage/src/usageService.ts");

  assert.match(serviceSource, /userAgent:/);
  assert.match(serviceSource, /readOptionalString\(item, 'userAgent'\)/);
  assert.match(viewSource, /formatUserAgentDeviceLabel/);
  assert.match(viewSource, /console\.usage\.table\.userAgent/);
  assert.match(viewSource, /title=\{log\.userAgent\}/);
  assert.match(viewSource, /formatUserAgentDeviceLabel\(log\.userAgent\)/);
  assert.match(viewSource, /colSpan=\{13\}/);
});

test("console usage logs i18n resources include English and Chinese entries", () => {
  const resourceIndex = readPortalFile("./packages/sdkwork-clawrouter-pc-i18n/src/resources/index.ts");
  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-i18n/src/resources/console/usage.ts");

  assert.match(resourceIndex, /consoleUsageMessages/);

  for (const key of usageI18nKeys) {
    assert.equal(
      source.match(new RegExp(`"${key}"`, "g"))?.length,
      2,
      `${key} must be translated in both locales`,
    );
  }
  assert.match(source, /"console\.usage\.loadedCost": "Loaded spend"/);
  assert.match(source, /"console\.usage\.table\.cost": "Spend"/);
  assert.match(source, /"console\.usage\.loadedCost": "已加载花�?/);
  assert.match(source, /"console\.usage\.table\.cost": "花费"/);
});

test("console dashboard stays product-focused without read-only caveats", () => {
  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-console-dashboard/src/DashboardView.tsx");

  assertNoImplementationCaveats(source);
});

test("console settlement reports stay product-focused without read-only caveats", () => {
  const settlementsSource = readPortalFile("./src/console-business/ConsoleSettlementsView.tsx");
  assertNoImplementationCaveats(settlementsSource);
});

test("console settlement reports keep order breakdown visible when there is no data", () => {
  const orderPagePath = "../../../sdkwork-order/apps/sdkwork-order-pc/packages/sdkwork-order-pc-order/src/pages/OrderPage.tsx";
  if (!portalFileExists(orderPagePath)) {
    return;
  }
  const source = readPortalFile(orderPagePath);

  assert.match(source, /SdkworkOrderPage|controller/);
  assert.doesNotMatch(source, /read-only/i);
});

test("console settlement page keeps menu copy in navigation without page title chrome", () => {
  const menuSource = readPortalFile(CONSOLE_LAYOUT_FILE);
  const coreMessages = readPortalFile("./packages/sdkwork-clawrouter-pc-i18n/src/resources/console/core.ts");
  const appSource = readPortalFile("./src/App.tsx");

  assert.match(menuSource, /labelKey: 'console\.menu\.settlements'/);
  assert.match(coreMessages, /"console\.menu\.settlements": "Bills and Reports"/);
  assert.match(coreMessages, /"console\.menu\.settlements": "账单与报�?/);
  assert.match(appSource, /path="settlements" element=\{<SettlementsView/);
  assert.match(appSource, /ConsoleSettlementsView/);
});

test("console order dashboard is owned by sdkwork-order package", () => {
  const orderPagePath = "../../../sdkwork-order/apps/sdkwork-order-pc/packages/sdkwork-order-pc-order/src/pages/OrderPage.tsx";
  if (!portalFileExists(orderPagePath)) {
    return;
  }
  const source = readPortalFile(orderPagePath);

  assert.match(source, /SdkworkOrderPage|createSdkworkOrderController/);
  assertNoImplementationCaveats(source);
});

test("console commerce business pages stay product-focused without command-contract caveats", () => {
  const businessPageFiles = [
    ...simplifiedConsolePageFiles,
    ...deferredConsolePageFiles,
  ].filter(portalFileExists);

  for (const file of businessPageFiles) {
    assertNoImplementationCaveats(readPortalFile(file));
  }
});

test("console message center stays product-focused without implementation caveats", { skip: !portalFileExists("./packages/sdkwork-clawrouter-pc-console-messages/src/MessagesView.tsx") }, () => {
  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-console-messages/src/MessagesView.tsx");

  assert.doesNotMatch(source, /<h1[^>]*>\s*<Bell[^>]*>\s*\{t\('console\.messages\.title'/);
  assertNoImplementationCaveats(source);
});

test("console message center constrains the detail pane to the available viewport height", { skip: !portalFileExists("./packages/sdkwork-clawrouter-pc-console-messages/src/MessagesView.tsx") }, () => {
  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-console-messages/src/MessagesView.tsx");

  assert.match(source, /h-\[calc\(100vh-72px\)\][^"]*overflow-hidden[^"]*flex[^"]*flex-col/);
  assert.match(source, /className="[^"]*flex-1[^"]*min-h-0[^"]*overflow-hidden[^"]*flex[^"]*flex-col[^"]*md:flex-row/);
  assert.match(source, /className=\{`[^`]*flex-1[^`]*min-h-0[^`]*flex[^`]*flex-col/);
  assert.match(source, /className="[^"]*flex-1[^"]*min-h-0[^"]*overflow-y-auto[^"]*custom-scrollbar/);
  assert.match(source, /className="[^"]*flex-1[^"]*min-h-0[^"]*overflow-hidden[^"]*bg-white/);
  assert.doesNotMatch(source, /min-h-\[650px\]/);
});

test("console gateway tooling stays product-focused without implementation caveats", () => {
  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-console-gateway/src/GatewayView.tsx");

  assert.doesNotMatch(source, /<h1[^>]*>\s*\{t\('console\.gateway\.title'/);
  assertNoImplementationCaveats(source);
});

test("console account and recharge surfaces are owned by T1 domain PC packages", () => {
  const appSource = readPortalFile("./src/App.tsx");
  const accountSource = readPortalFile("./src/console-business/ConsoleAccountView.tsx");
  const mountSource = readPortalFile("./src/console-business/consoleBusinessHostMount.tsx");
  const packageJson = JSON.parse(readPortalFile("./package.json")) as { dependencies: Record<string, string> };

  assert.match(accountSource, /@sdkwork\/account-pc-wallet/);
  assert.match(mountSource, /SdkworkWalletPage/);
  assert.match(appSource, /ClawRouterConsoleBusinessHostRoutes/);
  assert.equal(packageJson.dependencies["@sdkwork/account-pc-wallet"], "workspace:*");
  assert.equal(packageJson.dependencies["@sdkwork/commerce-pc-host"], undefined);
  assert.doesNotMatch(appSource, /clawrouter-pc-console-account/);
  assert.doesNotMatch(appSource, /clawrouter-pc-console-recharge/);
});

test("console user settings stay product-focused without implementation caveats", () => {
  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-console-user/src/UserView.tsx");

  assertNoImplementationCaveats(source);
});

test("console settings center constrains the settings panel to the available viewport height", () => {
  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-console-settings/src/SettingsView.tsx");

  assert.match(source, /h-\[calc\(100vh-72px\)\][^"]*overflow-hidden[^"]*flex[^"]*flex-col/);
  assert.match(source, /className="[^"]*flex-1[^"]*min-h-0[^"]*overflow-hidden[^"]*flex[^"]*flex-col[^"]*md:flex-row/);
  assert.match(source, /className="[^"]*flex-1[^"]*min-h-0[^"]*overflow-hidden[^"]*flex[^"]*flex-col[^"]*bg-white/);
  assert.match(source, /className="[^"]*flex-1[^"]*min-h-0[^"]*overflow-y-auto[^"]*custom-scrollbar[^"]*p-6/);
  assert.doesNotMatch(source, /min-h-\[500px\]/);
});

test("console appearance preferences support system mode and theme colors", () => {
  const settingsSource = readPortalFile("./packages/sdkwork-clawrouter-pc-console-settings/src/SettingsView.tsx");
  const themePreferenceSource = readPortalFile("./src/themePreference.ts");
  const appSource = readPortalFile("./src/App.tsx");
  const consoleLayoutSource = readPortalFile(CONSOLE_LAYOUT_FILE);

  assert.match(themePreferenceSource, /export type ThemePreference = 'system' \| 'light' \| 'dark'/);
  assert.match(themePreferenceSource, /export type ThemeColorPreference =/);
  assert.match(themePreferenceSource, /CLAW_ROUTER_THEME_COLOR_STORAGE_KEY/);
  assert.match(themePreferenceSource, /resolveEffectiveThemePreference/);
  assert.match(themePreferenceSource, /applyThemeColorPreference/);
  assert.match(themePreferenceSource, /--color-lobster-500/);

  assert.match(settingsSource, /themeModeOptions/);
  assert.match(settingsSource, /id: 'system'/);
  assert.match(settingsSource, /"跟随系统"/);
  assert.match(settingsSource, /themeColorOptions/);
  assert.match(settingsSource, /"主题颜色"/);
  assert.match(settingsSource, /setThemeColor\(option\.id\)/);
  assert.match(settingsSource, /aria-pressed=\{themeColor === option\.id\}/);

  assert.match(appSource, /resolveInitialThemeColorPreference/);
  assert.match(appSource, /applyThemeColorPreference\(themeColor\)/);
  assert.match(appSource, /themeColor=\{themeColor\}/);
  assert.match(appSource, /setThemeColor=\{setThemeColor\}/);

  assert.match(consoleLayoutSource, /theme: ConsoleThemePreference/);
  assert.match(consoleLayoutSource, /themeColor: ConsoleThemeColorPreference/);
  assert.match(consoleLayoutSource, /setThemeColor:/);
});

test("console theme color palettes cover every active brand shade", () => {
  const cssSource = readPortalFile("./src/index.css");
  const themePreferenceSource = readPortalFile("./src/themePreference.ts");
  const activeBrandShades = ["50", "100", "200", "300", "400", "500", "600", "700", "900"];

  for (const shade of activeBrandShades) {
    assert.match(cssSource, new RegExp(`--color-lobster-${shade}:`), `index.css must declare lobster-${shade}`);
    assert.match(themePreferenceSource, new RegExp(`'${shade}':`), `themePreference.ts must remap lobster-${shade}`);
  }
});

test("console theme-aware primary surfaces do not hardcode blue accents", () => {
  const settingsSource = readPortalFile("./packages/sdkwork-clawrouter-pc-console-settings/src/SettingsView.tsx");
  const consoleLayoutSource = readPortalFile(CONSOLE_LAYOUT_FILE);
  const bluePrimaryPattern = /(?:bg|text|border|ring|focus:ring|focus:border|hover:bg|hover:border|dark:bg|dark:text|dark:border)-blue-(?:50|100|200|300|400|500|600|700)/;

  assert.doesNotMatch(settingsSource, bluePrimaryPattern);
  assert.doesNotMatch(consoleLayoutSource, bluePrimaryPattern);
  assert.match(settingsSource, /focus:border-lobster-500/);
  assert.match(settingsSource, /bg-lobster-600 hover:bg-lobster-700/);
  assert.match(consoleLayoutSource, /sdkwork-portal-sidebar-item/);
});

test("portal applies persisted theme preferences before first React render", () => {
  const mainSource = readPortalFile("./src/main.tsx");
  const themePreferenceSource = readPortalFile("./src/themePreference.ts");

  assert.match(themePreferenceSource, /export function initializeThemePreferences/);
  assert.match(mainSource, /initializeThemePreferences\(\);[\s\S]*createRoot/);
});

test("console wallet recharge UI is owned by sdkwork-account wallet package", () => {
  const walletPagePath = "../../../sdkwork-account/apps/sdkwork-account-pc/packages/sdkwork-account-pc-wallet/src/pages/WalletPage.tsx";
  if (!portalFileExists(walletPagePath)) {
    return;
  }
  const source = readPortalFile(walletPagePath);

  assert.match(source, /navigateWalletRechargeCheckout|checkoutBasePath/);
  assertNoImplementationCaveats(source);
});

test("console auth unavailable copy stays product-focused without app-contract caveats", () => {
  const routeSource = readPortalFile("./src/auth/ClawRouterAuthRoutes.tsx");
  const controllerSource = readPortalFile("./src/auth/clawRouterAuthController.ts");

  assertNoImplementationCaveats(routeSource);
  assertNoImplementationCaveats(controllerSource);
});

test("playground unavailable states stay product-focused without implementation caveats", () => {
  const files = [
    "../../../sdkwork-generations/apps/sdkwork-generations-pc/packages/sdkwork-generations-pc-playground/src/components/views/AudioView.tsx",
    "../../../sdkwork-generations/apps/sdkwork-generations-pc/packages/sdkwork-generations-pc-playground/src/components/views/ImageView.tsx",
    "../../../sdkwork-generations/apps/sdkwork-generations-pc/packages/sdkwork-generations-pc-playground/src/components/views/MusicView.tsx",
    "../../../sdkwork-generations/apps/sdkwork-generations-pc/packages/sdkwork-generations-pc-playground/src/components/views/SfxView.tsx",
    "../../../sdkwork-generations/apps/sdkwork-generations-pc/packages/sdkwork-generations-pc-playground/src/components/views/VideoView.tsx",
    "../../../sdkwork-generations/apps/sdkwork-generations-pc/packages/sdkwork-generations-pc-playground/src/components/views/SharedHistoryView.tsx",
  ];

  for (const file of files) {
    assertNoImplementationCaveats(readPortalFile(file));
  }
});

test("admin guidance copy stays product-focused without implementation caveats", () => {
  const adminUserSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-user/src/index.tsx");
  const adminChannelSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx");

  assert.doesNotMatch(adminUserSource, /backend contract/i);
  assert.doesNotMatch(adminChannelSource, /routing strategy contract/i);
});

test("admin user management keeps search on the left and the primary action on the right", () => {
  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-user/src/index.tsx");
  const searchIndex = source.indexOf("data-admin-user-search");
  const primaryActionIndex = source.indexOf("data-admin-user-primary-action");

  assert.match(source, /data-admin-user-toolbar/);
  assert.match(source, /data-admin-user-search/);
  assert.match(source, /data-admin-user-primary-action/);
  assert.match(source, /className="[^"]*justify-between/);
  assert.doesNotMatch(source, /className="flex shrink-0 justify-end gap-3"/);
  assert.ok(searchIndex > -1 && primaryActionIndex > -1 && searchIndex < primaryActionIndex);
});

test("console API key management keeps search on the left and create action on the right", () => {
  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-console-api-keys/src/ApiKeysView.tsx");
  const searchIndex = source.indexOf("data-console-api-keys-search");
  const primaryActionIndex = source.indexOf("data-console-api-keys-primary-action");

  assert.match(source, /data-console-api-keys-toolbar/);
  assert.match(source, /data-console-api-keys-search/);
  assert.match(source, /data-console-api-keys-primary-action/);
  assert.match(source, /className="[^"]*justify-between/);
  assert.ok(searchIndex > -1 && primaryActionIndex > -1 && searchIndex < primaryActionIndex);
});

test("admin searchable list toolbars keep search before primary create actions", () => {
  const toolbarSpecs = [
    {
      file: "./packages/sdkwork-clawrouter-pc-admin-user/src/index.tsx",
      toolbar: "data-admin-user-toolbar",
      search: "data-admin-user-search",
      primaryAction: "data-admin-user-primary-action",
    },
    {
      file: "./packages/sdkwork-clawrouter-pc-admin-channel/src/index.tsx",
      toolbar: "data-admin-channel-toolbar",
      search: "data-admin-channel-search",
      primaryAction: "data-admin-channel-primary-action",
    },
  ].filter(({ file }) => portalFileExists(file));

  for (const spec of toolbarSpecs) {
    const source = readPortalFile(spec.file);
    const toolbarIndex = source.indexOf(spec.toolbar);
    const searchIndex = source.indexOf(spec.search);
    const primaryActionIndex = source.indexOf(spec.primaryAction);

    assert.ok(toolbarIndex > -1, `${spec.file} should mark the searchable list toolbar`);
    assert.ok(searchIndex > -1, `${spec.file} should mark the search control`);
    assert.ok(primaryActionIndex > -1, `${spec.file} should mark the primary create action`);
    assert.ok(searchIndex < primaryActionIndex, `${spec.file} should place search before the primary action`);
    assert.match(source.slice(Math.max(0, toolbarIndex - 240), toolbarIndex + 240), /justify-between/);
  }
});

test("shared navigation notifications stay product-focused without read-only labels", () => {
  const source = readPortalFile("./packages/sdkwork-clawroutes-pc-commons/src/components/Navbar.tsx");

  assert.doesNotMatch(source, /readOnlyNotifications/);
  assert.doesNotMatch(source, />\s*只读\s*</);
  assert.doesNotMatch(source, />\s*Read-only\s*</);
});

test("i18n product copy avoids implementation contract wording for routed model guidance", () => {
  const source = readPortalFile("./packages/sdkwork-clawrouter-pc-i18n/src/index.ts");

  assert.doesNotMatch(source, /current channel contract/i);
});
