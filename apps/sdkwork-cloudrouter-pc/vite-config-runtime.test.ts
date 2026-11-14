// WORKSPACE-PATH:allow-fixture - this file is a test fixture that simulates a foreign
// checkout root, so the sdkwork-<name> segment below is the value under assertion rather
// than a binding to a real sibling checkout. PORTABILITY_SPEC.md section 5.2 governs it.
import assert from "node:assert/strict";
import fs, { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { UserConfig } from "vite";

import portalViteConfig from "./vite.config.ts";
import {
  buildCloudrouterMarkdownCjsDefaultExportShimSource,
  buildPortalRuntimeEnvScript,
  findStaticChunkCycle,
  resolvePortalDevBrowserRuntimeEnv,
  resolvePortalDevProxy,
  resolvePortalRuntimeEnv,
  resolvePortalWorkspaceDependencyRoot,
} from "./vite.config.ts";
import {
  createPortalOptimizeDepsEsbuildPlugin,
  shouldResolvePortalOptimizeDepsImport,
} from "./scripts/lib/portal-optimize-deps-esbuild-resolver.mjs";
import { resolvePortalPackageModule } from "./scripts/lib/portal-workspace-package-resolver.mjs";

async function resolvePortalViteConfig(mode = 'development', command: 'serve' | 'build' = 'serve'): Promise<UserConfig> {
  if (typeof portalViteConfig !== "function") {
    return portalViteConfig as UserConfig;
  }

  return portalViteConfig({
    command,
    mode,
    isSsrBuild: false,
    isPreview: false,
  }) as UserConfig | Promise<UserConfig>;
}

async function callResolveId(
  resolveId: unknown,
  source: string,
  importer: string,
): Promise<unknown> {
  if (typeof resolveId === "function") {
    return resolveId.call({}, source, importer, {});
  }
  if (
    typeof resolveId === "object"
    && resolveId !== null
    && "handler" in resolveId
    && typeof resolveId.handler === "function"
  ) {
    return resolveId.handler.call({}, source, importer, {});
  }
  throw new TypeError("resolveId hook is not callable");
}

function hasPluginName(plugin: unknown, name: string): plugin is { name: string; resolveId?: unknown } {
  return (
    typeof plugin === "object"
    && plugin !== null
    && !Array.isArray(plugin)
    && "name" in plugin
    && plugin.name === name
  );
}

/**
 * Committed-public-application-token fixture.
 *
 * Production renderers must carry the public application token instead of the
 * private development bootstrap token (IAM_CREDENTIAL_ENTRY_SPEC.md section 4),
 * and the canonical Vite plugin rejects any other token shape. Tests that
 * resolve a non-development config therefore install this fixture first.
 * @param environment - lifecycle claim carried by the token.
 * @returns a public application access token JWT.
 */
function createPublicApplicationAccessTokenFixture(environment: string): string {
  const encode = (value: Record<string, unknown>): string =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", kid: "public-app-token", typ: "JWT" })}.${
    encode({
      app_id: "sdkwork-cloudrouter",
      environment,
      exp: 4102444800,
      token_class: "application",
      token_type: "access",
    })
  }.public`;
}

function withPublicApplicationAccessToken<T>(environment: string, run: () => Promise<T>): Promise<T> {
  const previousAccessToken = process.env.SDKWORK_ACCESS_TOKEN;
  process.env.SDKWORK_ACCESS_TOKEN = createPublicApplicationAccessTokenFixture(environment);
  return run().finally(() => {
    if (previousAccessToken === undefined) {
      delete process.env.SDKWORK_ACCESS_TOKEN;
    } else {
      process.env.SDKWORK_ACCESS_TOKEN = previousAccessToken;
    }
  });
}

test("dependency optimizer compiles workspace TSX with automatic React runtime", async () => {
  const config = await resolvePortalViteConfig();

  assert.equal(config.optimizeDeps?.esbuildOptions?.jsx, "automatic");
  assert.equal(config.optimizeDeps?.esbuildOptions?.jsxImportSource, "react");
  assert.ok(
    config.optimizeDeps?.include?.includes("react/jsx-runtime"),
    "React production JSX runtime must be pre-bundled as ESM",
  );
  assert.ok(
    config.optimizeDeps?.include?.includes("react/jsx-dev-runtime"),
    "React dev JSX runtime must be pre-bundled as ESM so workspace TSX can import jsxDEV",
  );
  assert.ok(
    config.optimizeDeps?.needsInterop?.includes("react/jsx-runtime"),
    "React production JSX runtime is CommonJS and needs Vite named-import interop",
  );
  assert.ok(
    config.optimizeDeps?.needsInterop?.includes("react/jsx-dev-runtime"),
    "React dev JSX runtime is CommonJS and needs Vite named-import interop for jsxDEV",
  );
});

test("production chunks let Rollup keep qrcode with its CommonJS dependencies", async () => {
  const config = await withPublicApplicationAccessToken("production", () => resolvePortalViteConfig("production", "build"));
  const output = config.build?.rollupOptions?.output;

  assert.ok(output && !Array.isArray(output));
  assert.equal(typeof output.manualChunks, "function");
  // Route packages are lazy-loaded by the router; their chunk assignment is
  // left to rollup's automatic splitting so the entry never gains a static
  // dependency on a lazy route chunk (see LOCAL_ROUTE_PACKAGE_PATTERN).
  assert.equal(
    (output.manualChunks as (id: string, meta: unknown) => string | null | undefined)(
      "E:/sdkwork-space/sdkwork-cloudrouter/apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudrouter-pc-admin-dashboard/src/AdminDashboardPage.tsx",
      {} as never,
    ),
    undefined,
  );
  assert.equal(
    (output.manualChunks as (id: string, meta: unknown) => string | null | undefined)(
      "E:/sdkwork-space/sdkwork-cloudrouter/apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudrouter-pc-admin-core/src/index.ts",
      {} as never,
    ),
    undefined,
  );
  assert.equal(
    (output.manualChunks as (id: string, meta: unknown) => string | null | undefined)(
      "C:/workspace/node_modules/.pnpm/qrcode@1.5.4/node_modules/qrcode/lib/browser.js",
      {} as never,
    ),
    undefined,
  );
  assert.equal(
    (output.manualChunks as (id: string, meta: unknown) => string | null | undefined)(
      "C:/workspace/node_modules/.pnpm/jspdf@3.0.4/node_modules/jspdf/dist/jspdf.es.min.js",
      {} as never,
    ),
    "vendor-pdf",
  );
  assert.equal(
    (output.manualChunks as (id: string, meta: unknown) => string | null | undefined)(
      "E:/sdkwork-space/sdkwork-account/sdks/sdkwork-account-app-sdk/sdkwork-account-app-sdk-typescript/src/index.ts",
      {} as never,
    ),
    "vendor-ui-sdk",
  );
  assert.equal(
    (output.manualChunks as (id: string, meta: unknown) => string | null | undefined)(
      "E:/sdkwork-space/sdkwork-cloudrouter/apps/sdkwork-cloudrouter-pc/node_modules/@sdkwork/cloudrouter-backend-sdk/dist/index.js",
      {} as never,
    ),
    "vendor-ui-sdk",
  );
});

test("static production chunk cycles are detected with the complete cycle path", () => {
  assert.deepEqual(
    findStaticChunkCycle(new Map([
      ["vendor.js", ["vendor-qrcode.js"]],
      ["vendor-qrcode.js", ["vendor.js"]],
    ])),
    ["vendor.js", "vendor-qrcode.js", "vendor.js"],
  );
  assert.equal(
    findStaticChunkCycle(new Map([
      ["entry.js", ["vendor.js"]],
      ["vendor.js", []],
    ])),
    null,
  );
});

test("dev server enables React Fast Refresh and HMR by default", async () => {
  const config = await resolvePortalViteConfig();
  const plugins: unknown[] = Array.isArray(config.plugins) ? config.plugins.flat() : [];

  assert.ok(plugins.some((plugin) => hasPluginName(plugin, "vite:react-babel")));
  assert.ok(plugins.some((plugin) => hasPluginName(plugin, "vite:react-refresh")));
  assert.deepEqual(config.server?.hmr, {
    // Bare `vite` fallback port; `sdkwork-app dev` overrides it with the
    // topology-declared PC renderer port (4736) through --port.
    clientPort: 4736,
    host: "127.0.0.1",
  });
});

test("dev proxy forwards every OpenAPI schema route to the gateway", async () => {
  const config = await resolvePortalViteConfig();
  const proxy = config.server?.proxy as Record<string, unknown> | undefined;

  for (const route of [
    "/openapi/schema-tabs.json",
    "/openapi.json",
    "/payments/v3/openapi.json",
    "/paas/v3/openapi.json",
    "/cloud/v3/openapi.json",
  ]) {
    assert.ok(proxy?.[route], `${route} must be proxied instead of falling back to index.html`);
  }
});

test("dependency optimizer pre-bundles recharts instead of serving its mixed ESM and CommonJS sources", async () => {
  const config = await resolvePortalViteConfig();

  assert.ok(config.optimizeDeps?.include?.includes("recharts"));
  assert.equal(config.optimizeDeps?.needsInterop?.includes("es-toolkit/compat/get"), false);
});

test("generated CloudRouter SDK packages are not served from stale dependency optimizer cache", async () => {
  const config = await resolvePortalViteConfig();

  for (const packageName of [
    "@sdkwork/cloudrouter-app-sdk",
    "@sdkwork/cloudrouter-backend-sdk",
    "@sdkwork/cloudrouter-open-sdk",
  ]) {
    assert.ok(
      config.optimizeDeps?.exclude?.includes(packageName),
      `${packageName} must bypass Vite dep-scan pre-bundling and resolve through source aliases`,
    );
  }
});

test("API reference workspace package is not served from stale dependency optimizer cache", async () => {
  const config = await resolvePortalViteConfig();

  assert.ok(config.optimizeDeps?.exclude?.includes("@sdkwork/documents-pc-api-reference"));
});

test("SDK reference workspace package is not served from stale dependency optimizer cache", async () => {
  const config = await resolvePortalViteConfig();

  assert.ok(config.optimizeDeps?.exclude?.includes("@sdkwork/documents-pc-sdk-reference"));
});

test("portal workspace packages resolve through pnpm workspace exports", async () => {
  const config = await resolvePortalViteConfig();
  const plugins: unknown[] = Array.isArray(config.plugins) ? config.plugins.flat() : [];
  const resolver = plugins.find((plugin) => hasPluginName(plugin, "cloudrouter-portal-pnpm-workspace-resolver"));

  assert.ok(resolver && typeof resolver === "object");
  assert.ok("resolveId" in resolver);

  const documentsImporter = path.resolve(
    import.meta.dirname,
    "../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/ideToolProfiles.ts",
  );
  const resolvedDocumentsRoot = await callResolveId(
    resolver.resolveId,
    "@sdkwork/documents-pc-api-reference",
    new URL("./src/App.tsx", import.meta.url).pathname,
  );
  const resolvedGatewayEndpoint = await callResolveId(
    resolver.resolveId,
    "@sdkwork/utils/gatewayEndpoint",
    documentsImporter,
  );
  const resolvedLocalSubpath = await callResolveId(
    plugins.find((plugin) => hasPluginName(plugin, "cloudrouter-portal-local-package-resolver"))?.resolveId,
    "sdkwork-cloudroutes-pc-commons/runtime",
    documentsImporter,
  );

  assert.equal(
    resolvedDocumentsRoot,
    path.resolve(
      import.meta.dirname,
      "../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/index.ts",
    ),
  );
  assert.equal(
    resolvedGatewayEndpoint,
    path.resolve(
      import.meta.dirname,
      "../../../sdkwork-utils/packages/sdkwork-utils-typescript/src/gatewayEndpoint.ts",
    ),
  );
  assert.equal(
    resolvedLocalSubpath,
    path.resolve(import.meta.dirname, "packages/sdkwork-cloudroutes-pc-commons/src/runtime.ts"),
  );
});

test("portal local packages resolve scoped cloudrouter pc downloads through package exports", async () => {
  const config = await resolvePortalViteConfig();
  const plugins: unknown[] = Array.isArray(config.plugins) ? config.plugins.flat() : [];
  const resolver = plugins.find((plugin) => hasPluginName(plugin, "cloudrouter-portal-pnpm-workspace-resolver"));

  assert.ok(resolver && typeof resolver === "object");
  assert.ok("resolveId" in resolver);

  const resolvedRoot = await callResolveId(
    resolver.resolveId,
    "@sdkwork/cloudrouter-pc-downloads",
    new URL("./packages/sdkwork-cloudrouter-pc-home/src/components/DownloadSection.tsx", import.meta.url).pathname,
  );

  assert.equal(
    resolvedRoot,
    path.resolve(
      import.meta.dirname,
      "packages/sdkwork-cloudrouter-pc-downloads/src/index.ts",
    ),
  );
  assert.ok(existsSync(resolvedRoot));
});

test("portal workspace packages resolve to source files during production build", async () => {
  const config = await resolvePortalViteConfig();
  const plugins: unknown[] = Array.isArray(config.plugins) ? config.plugins.flat() : [];
  const resolver = plugins.find((plugin) => hasPluginName(plugin, "cloudrouter-portal-local-package-resolver"));

  assert.ok(resolver && typeof resolver === "object");
  assert.ok("resolveId" in resolver);
  assert.notEqual("apply" in resolver ? resolver.apply : undefined, "serve");

  const resolvedRoot = await callResolveId(
    resolver.resolveId,
    "sdkwork-cloudroutes-pc-commons",
    new URL("./src/App.tsx", import.meta.url).pathname,
  );

  assert.equal(
    resolvedRoot,
    path.resolve(import.meta.dirname, "packages/sdkwork-cloudroutes-pc-commons/src/index.ts"),
  );
  assert.ok(!String(resolvedRoot).includes(`${path.sep}node_modules${path.sep}`));
});

test("portal dev server may serve workspace SDK sources resolved by aliases", async () => {
  const config = await resolvePortalViteConfig();
  const workspaceRoot = path.resolve(import.meta.dirname, "../..");

  assert.ok(config.server?.fs?.allow?.includes(workspaceRoot));
});

test("portal resolves CloudRouter generated SDK imports through workspace package exports", async () => {
  const config = await resolvePortalViteConfig();
  const plugins: unknown[] = Array.isArray(config.plugins) ? config.plugins.flat() : [];
  const resolver = plugins.find((plugin) => hasPluginName(plugin, "cloudrouter-portal-pnpm-workspace-resolver"));

  assert.ok(resolver && typeof resolver === "object");
  assert.ok("resolveId" in resolver);

  for (const packageName of [
    "@sdkwork/cloudrouter-app-sdk",
    "@sdkwork/cloudrouter-backend-sdk",
    "@sdkwork/cloudrouter-open-sdk",
  ] as const) {
    const resolvedEntry = await callResolveId(
      resolver.resolveId,
      packageName,
      new URL("./src/App.tsx", import.meta.url).pathname,
    );
    assert.match(
      String(resolvedEntry),
      /[\\/]sdks[\\/]cloudrouter-(?:app|backend|open)-sdk[\\/]cloudrouter-(?:app|backend|open)-sdk-typescript[\\/]dist[\\/]index\.js$/u,
      `${packageName} must resolve through the portal install graph`,
    );
    assert.ok(existsSync(resolvedEntry as string), `${packageName} must resolve to an existing workspace entry`);
  }
});

test("portal dependency roots resolve to the sibling workspace repository path", () => {
  const fakeConfigDir = path.resolve(
    import.meta.dirname,
    "../../target/test/portal-portability/apps/sdkwork-cloudrouter-pc",
  );

  assert.equal(
    resolvePortalWorkspaceDependencyRoot(fakeConfigDir, "sdkwork-ui"),
    path.resolve(fakeConfigDir, "../../..", "sdkwork-ui"),
  );
});

test("portal resolves sdkwork UI workspace imports through package exports", async () => {
  const config = await resolvePortalViteConfig();
  const plugins: unknown[] = Array.isArray(config.plugins) ? config.plugins.flat() : [];
  const resolver = plugins.find((plugin) => hasPluginName(plugin, "cloudrouter-portal-pnpm-workspace-resolver"));
  const expectedUiRoot = resolvePortalWorkspaceDependencyRoot(import.meta.dirname, "sdkwork-ui");
  const expectedUiEntry = path.resolve(
    import.meta.dirname,
    "../../../sdkwork-ui/sdkwork-ui-pc-react/dist/index.js",
  );
  const membershipHeroImporter = path.resolve(
    import.meta.dirname,
    "../../../sdkwork-membership/apps/sdkwork-membership-pc/packages/sdkwork-membership-pc-membership/src/components/membership-hero.tsx",
  );
  const expectedUiButtonEntry = path.resolve(
    import.meta.dirname,
    "../../../sdkwork-ui/sdkwork-ui-pc-react/dist/ui-button.js",
  );

  assert.ok(resolver && typeof resolver === "object");
  assert.ok("resolveId" in resolver);
  assert.equal(
    await callResolveId(
      resolver.resolveId,
      "@sdkwork/ui-pc-react",
      new URL("./src/App.tsx", import.meta.url).pathname,
    ),
    expectedUiEntry,
  );
  assert.equal(
    await callResolveId(
      resolver.resolveId,
      "@sdkwork/ui-pc-react/components/ui/button",
      membershipHeroImporter,
    ),
    expectedUiButtonEntry,
  );
  assert.ok(existsSync(expectedUiEntry), "@sdkwork/ui-pc-react must resolve through workspace exports");
  assert.ok(
    existsSync(expectedUiButtonEntry),
    "@sdkwork/ui-pc-react deep component imports must fall back to TSX source",
  );
  assert.ok(
    config.optimizeDeps?.exclude?.includes("@sdkwork/ui-pc-react"),
    "@sdkwork/ui-pc-react must bypass stale dependency optimizer cache for deep component imports",
  );
  assert.ok(
    config.server?.fs?.allow?.includes(expectedUiRoot),
    "Vite dev server must allow serving sdkwork-ui workspace sources",
  );
});

test("portal resolves commerce SDK imports from sibling workspace packages", async () => {
  const config = await resolvePortalViteConfig();
  const plugins: unknown[] = Array.isArray(config.plugins) ? config.plugins.flat() : [];
  const resolver = plugins.find((plugin) => hasPluginName(plugin, "cloudrouter-portal-pnpm-workspace-resolver"));
  const accountTransportImporter = path.resolve(
    import.meta.dirname,
    "../../../sdkwork-account/apps/sdkwork-account-common/packages/sdkwork-account-service/src/transport.ts",
  );
  const orderTransportImporter = path.resolve(
    import.meta.dirname,
    "../../../sdkwork-order/apps/sdkwork-order-common/packages/sdkwork-order-service/src/transport.ts",
  );

  assert.ok(resolver && typeof resolver === "object");
  assert.ok("resolveId" in resolver);

  const resolvedAccountAppSdk = await callResolveId(
    resolver.resolveId,
    "@sdkwork/account-app-sdk",
    accountTransportImporter,
  );
  const resolvedOrderAppSdk = await callResolveId(
    resolver.resolveId,
    "@sdkwork/order-app-sdk",
    orderTransportImporter,
  );

  assert.match(
    String(resolvedAccountAppSdk),
    /[\\/]sdkwork-account[\\/]sdks[\\/]sdkwork-account-app-sdk[\\/]sdkwork-account-app-sdk-typescript[\\/]src[\\/]index\.ts$/u,
  );
  assert.match(
    String(resolvedOrderAppSdk),
    /[\\/]sdkwork-order[\\/]sdks[\\/]sdkwork-order-app-sdk[\\/]sdkwork-order-app-sdk-typescript[\\/]src[\\/]index\.ts$/u,
  );
  assert.ok(existsSync(String(resolvedAccountAppSdk)));
  assert.ok(existsSync(String(resolvedOrderAppSdk)));
});

test("portal maps retired cloudrouter commons imports to cloudroutes commons", async () => {
  const config = await resolvePortalViteConfig();
  const plugins: unknown[] = Array.isArray(config.plugins) ? config.plugins.flat() : [];
  const resolver = plugins.find((plugin) => hasPluginName(plugin, "cloudrouter-portal-pnpm-workspace-resolver"));
  const modelsImporter = path.resolve(
    import.meta.dirname,
    "node_modules/@sdkwork/models-pc-admin-catalog/src/modelService.ts",
  );

  assert.ok(resolver && typeof resolver === "object");
  assert.ok("resolveId" in resolver);

  const resolvedRuntime = await callResolveId(
    resolver.resolveId,
    "@sdkwork/cloudrouter-pc-commons/runtime",
    modelsImporter,
  );

  assert.match(
    String(resolvedRuntime),
    /[\\/]packages[\\/]sdkwork-cloudroutes-pc-commons[\\/]src[\\/]runtime\.ts$/u,
  );
  assert.ok(existsSync(String(resolvedRuntime)));
});

test("dependency optimizer resolves lucide-react for sibling workspace packages", async () => {
  const config = await resolvePortalViteConfig("development", "serve");
  const paymentImporter = path.resolve(
    import.meta.dirname,
    "../../../sdkwork-payment/apps/sdkwork-payment-pc/packages/sdkwork-payment-pc-payment/src/pages/PaymentPage.tsx",
  );
  const paymentRoot = resolvePortalWorkspaceDependencyRoot(import.meta.dirname, "sdkwork-payment");
  const optimizedBareDependencies = new Set([
    "react",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
    "react-dom",
    "react-dom/client",
    "react-router",
    "react-router/dom",
    "react-router-dom",
    "cookie",
    "set-cookie-parser",
    "motion/react",
    "react-i18next",
    "html-parse-stringify",
    "void-elements",
    "framer-motion",
    "i18next",
    "recharts",
  ]);
  const optimizePlugins = config.optimizeDeps?.esbuildOptions?.plugins ?? [];

  assert.ok(config.optimizeDeps?.include?.includes("lucide-react"));
  assert.ok(
    optimizePlugins.some((plugin) => plugin && typeof plugin === "object" && plugin.name === "portal-optimize-deps-resolver"),
    "optimizeDeps must install a portal resolver esbuild plugin for sibling workspace imports",
  );
  assert.ok(
    shouldResolvePortalOptimizeDepsImport(
      "lucide-react",
      paymentImporter,
      [paymentRoot],
      optimizedBareDependencies,
    ),
  );

  const resolvedLucide = resolvePortalPackageModule(
    "lucide-react",
    import.meta.dirname,
    paymentImporter,
  );

  assert.match(resolvedLucide ?? "", /[\\/]lucide-react[\\/]/u);
  assert.ok(
    typeof createPortalOptimizeDepsEsbuildPlugin(import.meta.dirname, [paymentRoot], optimizedBareDependencies).setup
      === "function",
  );
});

test("portal resolves runtime bootstrap workspace imports through package exports", async () => {
  const config = await resolvePortalViteConfig();
  const plugins: unknown[] = Array.isArray(config.plugins) ? config.plugins.flat() : [];
  const resolver = plugins.find((plugin) => hasPluginName(plugin, "cloudrouter-portal-pnpm-workspace-resolver"));
  const appbaseRoot = resolvePortalWorkspaceDependencyRoot(import.meta.dirname, "sdkwork-appbase");
  const expectedRuntimeBootstrapEntry = path.resolve(
    import.meta.dirname,
    "../../../sdkwork-appbase/packages/common/foundation/sdkwork-runtime-bootstrap/src/index.ts",
  );

  assert.ok(resolver && typeof resolver === "object");
  assert.ok("resolveId" in resolver);
  assert.equal(
    await callResolveId(
      resolver.resolveId,
      "@sdkwork/runtime-bootstrap",
      new URL("./src/App.tsx", import.meta.url).pathname,
    ),
    expectedRuntimeBootstrapEntry,
  );
  assert.ok(
    existsSync(expectedRuntimeBootstrapEntry),
    "@sdkwork/runtime-bootstrap must resolve through workspace exports",
  );
});

test("portal resolves SDK common imports through workspace package exports", async () => {
  const config = await resolvePortalViteConfig();
  const plugins: unknown[] = Array.isArray(config.plugins) ? config.plugins.flat() : [];
  const resolver = plugins.find((plugin) => hasPluginName(plugin, "cloudrouter-portal-pnpm-workspace-resolver"));
  const expectedSdkCommonEntry = path.resolve(
    import.meta.dirname,
    "../../../sdkwork-sdk-commons/sdkwork-sdk-common-typescript/dist/index.js",
  );

  assert.ok(resolver && typeof resolver === "object");
  assert.ok("resolveId" in resolver);
  assert.equal(
    await callResolveId(
      resolver.resolveId,
      "@sdkwork/sdk-common",
      new URL("./src/App.tsx", import.meta.url).pathname,
    ),
    expectedSdkCommonEntry,
  );
  assert.ok(existsSync(expectedSdkCommonEntry), "@sdkwork/sdk-common must resolve through workspace exports");
});

test("workspace SDKWork packages are not mapped through Vite aliases", async () => {
  const config = await resolvePortalViteConfig();
  const aliases = config.resolve?.alias;

  assert.ok(Array.isArray(aliases));
  for (const alias of aliases) {
    if (typeof alias !== "object" || alias === null || !("find" in alias)) {
      continue;
    }
    const find = alias.find;
    if (typeof find === "string") {
      assert.equal(find.startsWith("@sdkwork/"), false, `${find} must not use a Vite alias`);
      assert.equal(find.endsWith("-generated-typescript"), false, `${find} must not use a Vite alias`);
    }
  }
});

test("workspace package imports resolve to one React and router runtime instance", async () => {
  const config = await resolvePortalViteConfig();

  assert.equal(
    config.resolve?.preserveSymlinks,
    undefined,
    "third-party pnpm packages should resolve through their real package roots",
  );
  assert.deepEqual(config.resolve?.dedupe, [
    "react",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
    "react-dom",
    "react-dom/client",
    "react-router",
    "react-router/dom",
    "react-router-dom",
    "i18next",
    "i18next-browser-languagedetector",
    "react-i18next",
  ]);
});

test("workspace React runtime imports stay bare so Vite optimizer can emit ESM interop", async () => {
  const config = await resolvePortalViteConfig();
  const plugins: unknown[] = Array.isArray(config.plugins) ? config.plugins.flat() : [];
  const resolver = plugins.find((plugin) => hasPluginName(plugin, "cloudrouter-portal-workspace-dependency-resolver"));
  const appbaseRoot = resolvePortalWorkspaceDependencyRoot(import.meta.dirname, "sdkwork-appbase");
  const appbaseNotificationSource = path.resolve(
    appbaseRoot,
    "packages/pc-react/notification/sdkwork-notification-pc-react/src/NotificationBell.tsx",
  );

  assert.ok(resolver && typeof resolver === "object");
  assert.ok("resolveId" in resolver);

  for (const source of [
    "react",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
    "react-dom",
    "react-dom/client",
  ]) {
    assert.equal(
      await callResolveId(resolver.resolveId, source, appbaseNotificationSource),
      null,
      `${source} must not resolve to a raw CommonJS file from node_modules`,
    );
  }
});

test("third-party runtime dependencies are direct dependencies instead of Vite aliases", async () => {
  const config = await resolvePortalViteConfig();
  const aliases = config.resolve?.alias;
  const portalPackage = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
  const dependencies = portalPackage.dependencies as Record<string, string>;
  const directRuntimeDependencies = [
    "clsx",
    "cookie",
    "decimal.js-light",
    "es-toolkit",
    "framer-motion",
    "html-parse-stringify",
    "motion",
    "motion-dom",
    "motion-utils",
    "react-hook-form",
    "react-router",
    "react-router-dom",
    "recharts",
    "scheduler",
    "set-cookie-parser",
    "use-sync-external-store",
    "victory-vendor",
    "void-elements",
  ];
  const forbiddenAliasFinds = [
    "clsx",
    "cookie",
    "decimal.js-light",
    "framer-motion",
    "html-parse-stringify",
    "motion",
    "motion-dom",
    "motion-utils",
    "react-hook-form",
    "react-router",
    "react-router-dom",
    "recharts",
    "scheduler",
    "set-cookie-parser",
    "victory-vendor",
    "void-elements",
  ];

  assert.ok(Array.isArray(aliases));
  for (const dependency of directRuntimeDependencies) {
    assert.ok(dependencies[dependency], `${dependency} must be declared by the portal package`);
  }
  for (const forbidden of forbiddenAliasFinds) {
    assert.equal(
      aliases.some((alias) => (
        typeof alias === "object"
        && alias !== null
        && "find" in alias
        && (
          alias.find === forbidden
          || (alias.find instanceof RegExp && alias.find.source.includes(forbidden.replaceAll("-", "\\-")))
        )
      )),
      false,
      `${forbidden} should resolve through package.json and package exports, not Vite aliases`,
    );
  }
  assert.equal(
    aliases.some((alias) => (
      typeof alias === "object"
      && alias !== null
      && "find" in alias
      && alias.find instanceof RegExp
      && (alias.find.source.includes("es-toolkit") || alias.find.source.includes("victory-vendor"))
    )),
    false,
    "nested recharts dependencies should not be remapped through Vite aliases",
  );
});

test("React external-store shim aliases cover every dependency-tree specifier form", async () => {
  const config = await resolvePortalViteConfig();
  const aliases = config.resolve?.alias;
  assert.ok(Array.isArray(aliases));

  // A string `find` is a Vite *prefix* rule whose residual subpath is appended
  // to the replacement, so a plain `use-sync-external-store/shim` entry rewrote
  // the explicit `shim/index.js` specifier emitted by @tiptap/react into
  // `<compat>.ts/index.js` and failed to resolve.
  assert.equal(
    aliases.filter((alias) => (
      typeof alias === "object"
      && alias !== null
      && "find" in alias
      && typeof alias.find === "string"
      && alias.find.includes("use-sync-external-store")
    )).length,
    0,
    "external-store shim aliases must be anchored RegExps, not string prefixes",
  );

  const portalRoot = path.dirname(fileURLToPath(import.meta.url));
  const expectations = [
    {
      specifiers: [
        "use-sync-external-store/shim",
        "use-sync-external-store/shim/index.js",
      ],
      compatModule: "src/auth/useSyncExternalStoreShimCompat.ts",
    },
    {
      specifiers: [
        "use-sync-external-store/shim/with-selector",
        "use-sync-external-store/shim/with-selector.js",
      ],
      compatModule: "src/auth/useSyncExternalStoreWithSelectorCompat.ts",
    },
  ];

  for (const { specifiers, compatModule } of expectations) {
    for (const specifier of specifiers) {
      const matched = aliases.filter((alias) => (
        typeof alias === "object"
        && alias !== null
        && "find" in alias
        && alias.find instanceof RegExp
        && alias.find.test(specifier)
      ));
      assert.equal(matched.length, 1, `${specifier} must match exactly one Vite alias`);
      assert.equal(
        matched[0].replacement,
        path.resolve(portalRoot, compatModule),
        `${specifier} must be served by the ESM compat module, not the CommonJS package`,
      );
      assert.ok(existsSync(path.resolve(portalRoot, compatModule)), `${compatModule} must exist`);
    }
  }
});

test("portal scripts run dependency preflight before Vite entrypoints", () => {
  const portalPackage = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

  assert.equal(portalPackage.scripts["check:dependencies"], "node scripts/check-portal-deps.mjs");
  assert.equal(portalPackage.scripts.predev, "node ../../scripts/ensure-cloud-router-env.mjs --lifecycle dev");
  assert.equal(portalPackage.scripts.prebuild, "node ../../scripts/ensure-cloud-router-env.mjs --lifecycle build");
  // The portal-local dev entrypoints run the renderer Vite directly with the
  // native config loader: the renderer is internal client tooling whose base
  // URLs come from the shared browser runtime-env contract, while the
  // workspace-root `pnpm dev` facade keeps owning the adaptive ingress and
  // renderer selection (APP_RUNTIME_TOPOLOGY_SPEC section 8.2). The
  // dependency preflight stays in front of the direct Vite run.
  assert.equal(
    portalPackage.scripts.dev,
    "node ../../scripts/ensure-cloud-router-env.mjs --lifecycle dev && vite --configLoader native",
  );
  assert.equal(
    portalPackage.scripts["dev:browser"],
    "node ../../scripts/ensure-cloud-router-env.mjs --lifecycle dev && vite --configLoader native",
  );
  assert.ok(
    portalPackage.scripts["dev:standalone"].startsWith("pnpm exec sdkwork-app dev --root ../"),
    "dev:standalone must delegate to the sdkwork-app facade",
  );
  assert.equal(
    portalPackage.scripts["_sdkwork:client:browser"],
    "pnpm check:dependencies && node --import ./scripts/register-portal-workspace-resolver.mjs ./node_modules/vite/bin/vite.js --configLoader native",
  );
  assert.equal(portalPackage.scripts.build, "pnpm check:dependencies && node scripts/build-portal.mjs");
});

test("development uses the private bootstrap handoff while production embeds the public application token", async () => {
  const previousAccessToken = process.env.SDKWORK_ACCESS_TOKEN;
  process.env.SDKWORK_ACCESS_TOKEN = createPublicApplicationAccessTokenFixture("production");
  try {
    const developmentConfig = await resolvePortalViteConfig("development", "serve");
    const productionConfig = await resolvePortalViteConfig("production", "build");
    const developmentPlugins = Array.isArray(developmentConfig.plugins)
      ? developmentConfig.plugins.flat()
      : [];
    const productionPlugins = Array.isArray(productionConfig.plugins)
      ? productionConfig.plugins.flat()
      : [];

    assert.ok(developmentPlugins.some((plugin) => (
      hasPluginName(plugin, "sdkwork-iam-credential-entry-bootstrap")
    )), "development keeps the private bootstrap token handoff");
    assert.equal(productionPlugins.some((plugin) => (
      hasPluginName(plugin, "sdkwork-iam-credential-entry-bootstrap")
    )), false, "production must never receive the private bootstrap token");

    const publicApplicationTokenPlugin = productionPlugins.find((plugin) => (
      hasPluginName(plugin, "sdkwork-iam-public-application-access-token")
    )) as {
      generateBundle: (this: { emitFile: (file: { fileName: string; source: string }) => string }) => void;
      transformIndexHtml: { handler: (html: string) => { tags: Array<{ attrs?: { src?: string } }> } };
    } | undefined;
    assert.ok(
      publicApplicationTokenPlugin,
      "production must carry the committed public application access token",
    );
    const emitted: Array<{ fileName: string; source: string }> = [];
    publicApplicationTokenPlugin.generateBundle.call({
      emitFile: (file) => { emitted.push(file); return file.fileName; },
    });
    assert.equal(emitted.length, 1);
    assert.match(emitted[0]?.fileName ?? "", /^credential-entry-bootstrap-[0-9a-f]{12}\.js$/u);
    assert.match(emitted[0]?.source ?? "", /__SDKWORK_CREDENTIAL_ENTRY_BOOTSTRAP_ACCESS_TOKEN__/u);
    const injectedTag = publicApplicationTokenPlugin.transformIndexHtml
      .handler("<html></html>")
      .tags[0];
    // The token travels as a same-origin external script: the production CSP is
    // `script-src 'self'`, so an inline bootstrap script would be refused.
    assert.equal(injectedTag?.attrs?.src, `/${emitted[0]?.fileName}`);
  } finally {
    if (previousAccessToken === undefined) {
      delete process.env.SDKWORK_ACCESS_TOKEN;
    } else {
      process.env.SDKWORK_ACCESS_TOKEN = previousAccessToken;
    }
  }
});

test("development builds also carry the public application token as an external script", async () => {
  const config = await withPublicApplicationAccessToken("development", () => resolvePortalViteConfig("development", "build"));
  const plugins = Array.isArray(config.plugins) ? config.plugins.flat() : [];

  assert.equal(plugins.some((plugin) => (
    hasPluginName(plugin, "sdkwork-iam-credential-entry-bootstrap")
  )), false, "a development build must not embed the private bootstrap token");
  assert.ok(plugins.some((plugin) => (
    hasPluginName(plugin, "sdkwork-iam-public-application-access-token")
  )), "a development build must still carry a credential-entry token");
});

test("production Vite config never probes a retired bootstrap overlay", async () => {
  const originalExistsSync = fs.existsSync;
  const isRetiredOverlay = (candidate: unknown): boolean => {
    const base = path.basename(String(candidate));
    return base.startsWith(".env.") && base.includes("bootstrap");
  };
  let productionBootstrapProbeDetected = false;

  fs.existsSync = (candidate) => {
    if (isRetiredOverlay(candidate)) {
      productionBootstrapProbeDetected = true;
      return false;
    }
    return originalExistsSync(candidate);
  };

  try {
    await withPublicApplicationAccessToken("production", () => resolvePortalViteConfig("production", "build"));
  } finally {
    fs.existsSync = originalExistsSync;
  }

  assert.equal(productionBootstrapProbeDetected, false);
});

test("portal runtime env script never exposes bootstrap access token", () => {
  const script = buildPortalRuntimeEnvScript({
    PORTAL_PUBLIC_API_BASE_URL: "/v1",
    SDKWORK_ACCESS_TOKEN: "must-not-leak",
    VITE_API_BASE_URL: "/v1",
  });

  assert.doesNotMatch(script, /SDKWORK_ACCESS_TOKEN/u);
  assert.doesNotMatch(script, /must-not-leak/u);
  assert.match(script, /VITE_API_BASE_URL/u);
});

test("portal dependency preflight verifies Vite command shims before passing", () => {
  const preflightSource = readFileSync(new URL("./scripts/check-portal-deps.mjs", import.meta.url), "utf8");

  assert.ok(preflightSource.includes("assertPortalCommandShims"));
  assert.ok(preflightSource.includes("node_modules', '.bin', 'vite"));
  assert.ok(preflightSource.includes("pnpm install"));
});

test("motion React entrypoint has browser-visible named exports after dependency optimization", async () => {
  const config = await resolvePortalViteConfig();
  const include = config.optimizeDeps?.include ?? [];

  assert.ok(include.includes("motion/react"));
  assert.ok(include.includes("framer-motion"));
});

test("react-i18next HTML parser interop dependencies are served through dependency optimization", async () => {
  const config = await resolvePortalViteConfig();
  const include = config.optimizeDeps?.include ?? [];
  const plugins: unknown[] = Array.isArray(config.plugins) ? config.plugins.flat() : [];
  const resolver = plugins.find((plugin) => hasPluginName(plugin, "cloudrouter-portal-workspace-dependency-resolver"));
  const appbaseRoot = resolvePortalWorkspaceDependencyRoot(import.meta.dirname, "sdkwork-appbase");
  const externalWorkspaceImporter = path.resolve(
    appbaseRoot,
    "packages/pc-react/fake/src/index.tsx",
  );

  assert.ok(resolver && typeof resolver === "object");
  assert.ok("resolveId" in resolver);
  for (const dependency of [
    "react-i18next",
    "i18next",
    "html-parse-stringify",
    "void-elements",
  ]) {
    assert.ok(include.includes(dependency), `${dependency} must be pre-bundled by Vite`);
    assert.equal(
      await callResolveId(resolver.resolveId, dependency, externalWorkspaceImporter),
      null,
      `${dependency} must remain a bare import so Vite can rewrite it to .vite/deps`,
    );
  }
});

test("React Router cookie interop dependencies are served through dependency optimization", async () => {
  const config = await resolvePortalViteConfig();
  const include = config.optimizeDeps?.include ?? [];
  const needsInterop = config.optimizeDeps?.needsInterop ?? [];
  const plugins: unknown[] = Array.isArray(config.plugins) ? config.plugins.flat() : [];
  const resolver = plugins.find((plugin) => hasPluginName(plugin, "cloudrouter-portal-workspace-dependency-resolver"));
  const appbaseRoot = resolvePortalWorkspaceDependencyRoot(import.meta.dirname, "sdkwork-appbase");
  const externalWorkspaceImporter = path.resolve(
    appbaseRoot,
    "packages/pc-react/fake/src/index.tsx",
  );

  assert.ok(resolver && typeof resolver === "object");
  assert.ok("resolveId" in resolver);
  for (const dependency of [
    "react-router",
    "react-router/dom",
    "react-router-dom",
    "cookie",
    "set-cookie-parser",
  ]) {
    assert.ok(include.includes(dependency), `${dependency} must be pre-bundled by Vite`);
    assert.equal(
      await callResolveId(resolver.resolveId, dependency, externalWorkspaceImporter),
      null,
      `${dependency} must remain a bare import so Vite can rewrite it to .vite/deps`,
    );
  }
  for (const dependency of ["cookie", "set-cookie-parser"]) {
    assert.ok(needsInterop.includes(dependency), `${dependency} must use Vite CommonJS named-export interop`);
  }
});

test("markdown CJS interop shim imports resolved package entry instead of bare specifier", () => {
  const source = buildCloudrouterMarkdownCjsDefaultExportShimSource("extend", import.meta.dirname);

  assert.doesNotMatch(source, /from "extend";/);
  assert.match(source, /extend[\\/].*index\.js/);
});

test("markdown CJS interop shim only redirects packages with a physical shim file", async () => {
  const config = await resolvePortalViteConfig();
  const plugin = config.plugins?.find((entry) => hasPluginName(entry, "cloudrouter-markdown-cjs-interop-shim"));
  assert.ok(plugin, "cloudrouter-markdown-cjs-interop-shim plugin must be registered");

  const resolvedStyleToJs = await callResolveId(
    plugin.resolveId,
    "style-to-js",
    path.join(import.meta.dirname, "packages/sdkwork-cloudrouter-pc-playground/src/pages/Playground.tsx"),
  );
  assert.equal(
    resolvedStyleToJs,
    path.join(import.meta.dirname, "scripts/shims/style-to-js.ts"),
  );

  const resolvedExtend = await callResolveId(
    plugin.resolveId,
    "extend",
    path.join(import.meta.dirname, "packages/sdkwork-cloudrouter-pc-playground/src/pages/Playground.tsx"),
  );
  assert.equal(resolvedExtend, null);

  const fromShimModule = await callResolveId(
    plugin.resolveId,
    "style-to-js",
    path.join(import.meta.dirname, "scripts/shims/style-to-js.ts"),
  );
  assert.equal(fromShimModule, null);
});

test("playground markdown interop dependencies are served through dependency optimization", async () => {
  const config = await resolvePortalViteConfig();
  const include = config.optimizeDeps?.include ?? [];
  const needsInterop = config.optimizeDeps?.needsInterop ?? [];
  const plugins: unknown[] = Array.isArray(config.plugins) ? config.plugins.flat() : [];
  const resolver = plugins.find((plugin) => hasPluginName(plugin, "cloudrouter-portal-workspace-dependency-resolver"));
  const agentsRoot = resolvePortalWorkspaceDependencyRoot(import.meta.dirname, "sdkwork-agents");
  const externalWorkspaceImporter = path.resolve(
    agentsRoot,
    "apps/sdkwork-agents-pc/packages/sdkwork-agents-pc-commons/src/components/MarkdownRendererImpl.tsx",
  );

  assert.ok(resolver && typeof resolver === "object");
  assert.ok("resolveId" in resolver);
  for (const dependency of [
    "hast-util-to-jsx-runtime",
    "hast-util-sanitize",
    "style-to-js",
    "style-to-object",
    "react-markdown",
    "remark-gfm",
    "rehype-sanitize",
  ]) {
    assert.ok(include.includes(dependency), `${dependency} must be pre-bundled by Vite`);
  }

  const source = readFileSync(new URL("./vite.config.ts", import.meta.url), "utf8");
  assert.match(source, /resolvePortalMarkdownOptimizeEntries/);
  assert.match(source, /sdkwork-agents-pc-playground\/src\/index\.ts/);
  assert.match(source, /sdkwork-agents-pc-commons\/src\/components\/MarkdownRendererImpl\.tsx/);
  assert.match(source, /scripts\/shims\/style-to-js\.ts/);
  assert.match(source, /cloudrouter-markdown-cjs-interop-shim/);
  for (const dependency of [
    "style-to-js",
    "style-to-object",
    "debug",
    "escape-string-regexp",
    "extend",
    "lowlight",
  ]) {
    assert.ok(
      needsInterop.includes(dependency),
      `${dependency} must use Vite CommonJS default-export interop`,
    );
    assert.equal(
      await callResolveId(resolver.resolveId, dependency, externalWorkspaceImporter),
      null,
      `${dependency} must remain a bare import so Vite can rewrite it to .vite/deps`,
    );
  }
});

test("production TypeScript transform does not allocate source maps when build sourcemaps are disabled", () => {
  const source = readFileSync(new URL("./vite.config.ts", import.meta.url), "utf8");

  assert.match(source, /const\s+ENABLE_TYPESCRIPT_TRANSFORM_SOURCE_MAPS\s*=\s*false/);
  assert.match(source, /sourceMap:\s*ENABLE_TYPESCRIPT_TRANSFORM_SOURCE_MAPS/);
  assert.match(source, /inlineSources:\s*ENABLE_TYPESCRIPT_TRANSFORM_SOURCE_MAPS/);
  assert.match(source, /map:\s*ENABLE_TYPESCRIPT_TRANSFORM_SOURCE_MAPS/);
  assert.doesNotMatch(source, /sourceMap:\s*true/);
  assert.doesNotMatch(source, /inlineSources:\s*true/);
});

test("portal runtime env exposes an open SDK base URL that defaults to the public API base URL", () => {
  assert.deepEqual(
    resolvePortalRuntimeEnv({
      PORTAL_PUBLIC_API_BASE_URL: "https://tenant.example.com/v1",
      PORTAL_PUBLIC_APP_API_BASE_URL: "/app/v3/api",
      PORTAL_PUBLIC_BACKEND_API_BASE_URL: "/backend/v3/api",
    }),
    {
      VITE_API_BASE_URL: "https://tenant.example.com/v1",
      VITE_CLOUDROUTER_OPEN_API_BASE_URL: "https://tenant.example.com/v1",
      VITE_CLOUDROUTER_APP_API_BASE_URL: "/app/v3/api",
      VITE_CLOUDROUTER_BACKEND_API_BASE_URL: "/backend/v3/api",
      VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL: "/backend/v3/api",
    },
  );
});

test("portal runtime env allows the open SDK base URL to differ from the public API reference base URL", () => {
  const runtimeEnv = resolvePortalRuntimeEnv({
    PORTAL_PUBLIC_API_BASE_URL: "https://tenant.example.com/v1",
    PORTAL_PUBLIC_OPEN_API_BASE_URL: "https://open.example.com/v1",
  });
  const script = buildPortalRuntimeEnvScript(runtimeEnv);

  assert.equal(runtimeEnv.VITE_API_BASE_URL, "https://tenant.example.com/v1");
  assert.equal(runtimeEnv.VITE_CLOUDROUTER_OPEN_API_BASE_URL, "https://open.example.com/v1");
  assert.match(script, /"VITE_CLOUDROUTER_OPEN_API_BASE_URL":"https:\/\/open\.example\.com\/v1"/u);
});

test("portal runtime env derives SDK surface base URLs from one public SDK base URL", () => {
  const runtimeEnv = resolvePortalRuntimeEnv({
    PORTAL_PUBLIC_SDK_BASE_URL: "https://tenant.example.com/router",
    PORTAL_PUBLIC_API_BASE_URL: "",
    PORTAL_PUBLIC_OPEN_API_BASE_URL: "",
    PORTAL_PUBLIC_APP_API_BASE_URL: "",
    PORTAL_PUBLIC_BACKEND_API_BASE_URL: "",
  });

  assert.equal(runtimeEnv.VITE_API_BASE_URL, "https://tenant.example.com/router/v1");
  assert.equal(runtimeEnv.VITE_CLOUDROUTER_OPEN_API_BASE_URL, "https://tenant.example.com/router/v1");
  assert.equal(runtimeEnv.VITE_CLOUDROUTER_APP_API_BASE_URL, "https://tenant.example.com/router/app/v3/api");
  assert.equal(
    runtimeEnv.VITE_CLOUDROUTER_BACKEND_API_BASE_URL,
    "https://tenant.example.com/router/backend/v3/api",
  );
  assert.equal(
    runtimeEnv.VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL,
    "https://tenant.example.com/router/backend/v3/api",
  );
});

test("dev browser document retires the consumer-less Commerce SDK base keys", () => {
  // BROWSER_RUNTIME_ENV_SPEC.md §5.4: every browser-visible SDK base key must be
  // consumed by a generated client. The Commerce dependency pair had no reader
  // anywhere in the repository (`git grep` found only the retired
  // vite.config.ts mapping and these assertions), so publishing them only leaked
  // a deploy-time domain into the dev document. The dev authoring step now
  // strips them; the release host keeps whatever it declares for its own
  // surfaces.
  const runtimeEnv = resolvePortalDevBrowserRuntimeEnv({
    PORTAL_PUBLIC_SDK_BASE_URL: "https://tenant.example.com/router",
    PORTAL_PUBLIC_COMMERCE_APP_API_BASE_URL: "https://commerce-app.example.com/app/v3/api",
    PORTAL_PUBLIC_COMMERCE_BACKEND_API_BASE_URL: "https://commerce-admin.example.com/backend/v3/api",
  });

  assert.equal(runtimeEnv.VITE_SDKWORK_COMMERCE_APP_API_BASE_URL, undefined);
  assert.equal(runtimeEnv.VITE_SDKWORK_COMMERCE_BACKEND_API_BASE_URL, undefined);
});

test("dev browser document folds every router-owned SDK base to same-origin", () => {
  // BROWSER_RUNTIME_ENV_SPEC.md §2.2/§2.3: no absolute API base may survive in a
  // dev document — the dev ingress fronts the whole router-owned surface. The
  // appbase backend key is consumed by `resolveRequiredAppbaseBackendBaseUrl`
  // and used to keep its deploy origin, which bypassed the ingress fan-out.
  const runtimeEnv = resolvePortalDevBrowserRuntimeEnv({
    PORTAL_PUBLIC_SDK_BASE_URL: "https://tenant.example.com/router",
    PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL: "https://api.sdkwork.com/backend/v3/api",
  });

  assert.equal(runtimeEnv.VITE_CLOUDROUTER_APP_API_BASE_URL, "/app/v3/api");
  assert.equal(runtimeEnv.VITE_CLOUDROUTER_BACKEND_API_BASE_URL, "/backend/v3/api");
  assert.equal(runtimeEnv.VITE_CLOUDROUTER_OPEN_API_BASE_URL, "/v1");
  assert.equal(runtimeEnv.VITE_API_BASE_URL, "/v1");
  assert.equal(runtimeEnv.VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL, "/backend/v3/api");
  for (const [key, value] of Object.entries(runtimeEnv)) {
    assert.equal(
      typeof value === "string" && /^https?:\/\//u.test(value),
      false,
      `${key} must not carry an absolute origin in a dev document, got ${value}`,
    );
  }
});

test("production start env lets one public SDK base URL drive portal surfaces unless explicitly overridden", async () => {
  const { resolveStartProductionEnv } = await import("../../scripts/start-cloud-router-production.mjs");
  const runtimeEnv = resolveStartProductionEnv({
    PORTAL_PUBLIC_SDK_BASE_URL: "https://tenant.example.com/router",
    PORTAL_PUBLIC_API_BASE_URL: "",
    PORTAL_PUBLIC_OPEN_API_BASE_URL: "",
    PORTAL_PUBLIC_APP_API_BASE_URL: "",
    PORTAL_PUBLIC_BACKEND_API_BASE_URL: "",
  });

  assert.equal(runtimeEnv.PORTAL_PUBLIC_SDK_BASE_URL, "https://tenant.example.com/router");
  assert.equal(runtimeEnv.PORTAL_PUBLIC_API_BASE_URL, undefined);
  assert.equal(runtimeEnv.PORTAL_PUBLIC_OPEN_API_BASE_URL, undefined);
  assert.equal(runtimeEnv.PORTAL_PUBLIC_APP_API_BASE_URL, undefined);
  assert.equal(runtimeEnv.PORTAL_PUBLIC_BACKEND_API_BASE_URL, undefined);

  const runtimeEnvWithOverride = resolveStartProductionEnv({
    PORTAL_PUBLIC_SDK_BASE_URL: "https://tenant.example.com/router",
    PORTAL_PUBLIC_BACKEND_API_BASE_URL: "https://admin.example.com/backend/v3/api",
  });
  assert.equal(
    runtimeEnvWithOverride.PORTAL_PUBLIC_BACKEND_API_BASE_URL,
    "https://admin.example.com/backend/v3/api",
  );
  assert.equal(runtimeEnvWithOverride.PORTAL_PUBLIC_APP_API_BASE_URL, undefined);
});

test("portal public runtime helper derives appbase backend from a configured SDK gateway", async () => {
  const { resolvePortalPublicRuntimeEnv } = await import("../../scripts/portal-public-runtime-env.mjs");
  const runtimeEnv = resolvePortalPublicRuntimeEnv({
    PORTAL_PUBLIC_SDK_BASE_URL: "https://tenant.example.com/router",
    PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL: "",
  });

  assert.equal(runtimeEnv.PORTAL_PUBLIC_SDK_BASE_URL, "https://tenant.example.com/router");
  assert.equal(runtimeEnv.PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL, "https://tenant.example.com/router/backend/v3/api");
  assert.equal(runtimeEnv.PORTAL_PUBLIC_BACKEND_API_BASE_URL, undefined);
});

test("portal public runtime helper derives appbase backend from verified product backend mount", async () => {
  const { resolvePortalPublicRuntimeEnv } = await import("../../scripts/portal-public-runtime-env.mjs");
  const runtimeEnv = resolvePortalPublicRuntimeEnv({
    PORTAL_PUBLIC_BACKEND_API_BASE_URL: "/backend/v3/api",
  });

  assert.equal(runtimeEnv.PORTAL_PUBLIC_BACKEND_API_BASE_URL, "/backend/v3/api");
  assert.equal(runtimeEnv.PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL, "/backend/v3/api");
});

test("portal public runtime helper defaults appbase backend to verified same-origin backend mount", async () => {
  const { resolvePortalPublicRuntimeEnv } = await import("../../scripts/portal-public-runtime-env.mjs");
  const runtimeEnv = resolvePortalPublicRuntimeEnv({
    PORTAL_PUBLIC_BACKEND_API_BASE_URL: "/backend/v3/api",
    PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL: "",
  });

  assert.equal(runtimeEnv.PORTAL_PUBLIC_BACKEND_API_BASE_URL, "/backend/v3/api");
  assert.equal(runtimeEnv.PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL, "/backend/v3/api");
});

test("portal runtime env passes through optional federated SDK overrides", () => {
  const runtimeEnv = resolvePortalRuntimeEnv({
    VITE_SDKWORK_ASSETS_APP_API_BASE_URL: "https://tenant.example.test/app/v3/api",
    VITE_SDKWORK_FEEDS_OPEN_API_BASE_URL: "https://tenant.example.test",
  });

  assert.equal(runtimeEnv.VITE_SDKWORK_ASSETS_APP_API_BASE_URL, "https://tenant.example.test/app/v3/api");
  assert.equal(runtimeEnv.VITE_SDKWORK_FEEDS_OPEN_API_BASE_URL, "https://tenant.example.test");
});

test("portal runtime env merges browser development VITE_* values into the runtime bag", () => {
  const runtimeEnv = resolvePortalRuntimeEnv({
    VITE_CLOUDROUTER_APP_API_BASE_URL: "/app/v3/api",
    VITE_CLOUDROUTER_BACKEND_API_BASE_URL: "/backend/v3/api",
    VITE_SDKWORK_AGENT_APP_API_BASE_URL: "/app/v3/api",
    VITE_SDKWORK_ASSETS_APP_API_BASE_URL: "/app/v3/api",
    VITE_SDKWORK_FEEDS_OPEN_API_BASE_URL: "/feeds/v3/api",
  });
  const script = buildPortalRuntimeEnvScript(runtimeEnv);

  assert.equal(runtimeEnv.VITE_CLOUDROUTER_APP_API_BASE_URL, "/app/v3/api");
  assert.equal(runtimeEnv.VITE_SDKWORK_AGENT_APP_API_BASE_URL, "/app/v3/api");
  assert.match(script, /"VITE_CLOUDROUTER_APP_API_BASE_URL":"\/app\/v3\/api"/u);
  assert.match(script, /"VITE_SDKWORK_AGENT_APP_API_BASE_URL":"\/app\/v3\/api"/u);
});

test("portal runtime env prefers browser development VITE_* over release PORTAL_PUBLIC derivations", () => {
  const runtimeEnv = resolvePortalRuntimeEnv({
    PORTAL_PUBLIC_SDK_BASE_URL: "http://127.0.0.1:3902",
    VITE_CLOUDROUTER_APP_API_BASE_URL: "/app/v3/api",
    VITE_CLOUDROUTER_BACKEND_API_BASE_URL: "/backend/v3/api",
    VITE_CLOUDROUTER_OPEN_API_BASE_URL: "/v1",
  });

  assert.equal(runtimeEnv.VITE_CLOUDROUTER_APP_API_BASE_URL, "/app/v3/api");
  assert.equal(runtimeEnv.VITE_CLOUDROUTER_BACKEND_API_BASE_URL, "/backend/v3/api");
  assert.equal(runtimeEnv.VITE_CLOUDROUTER_OPEN_API_BASE_URL, "/v1");
});

test("portal runtime env aligns platform dependency app SDK bases to same-origin dev proxy", () => {
  const runtimeEnv = resolvePortalRuntimeEnv({
    PORTAL_PUBLIC_SDK_BASE_URL: "http://127.0.0.1:3902",
    VITE_CLOUDROUTER_APP_API_BASE_URL: "/app/v3/api",
    VITE_CLOUDROUTER_BACKEND_API_BASE_URL: "/backend/v3/api",
    VITE_SDKWORK_ACCOUNT_APP_API_BASE_URL: "http://127.0.0.1:3902/app/v3/api",
    VITE_SDKWORK_MEMBERSHIP_APP_API_BASE_URL: "http://127.0.0.1:3902/app/v3/api",
    VITE_SDKWORK_MODELS_BACKEND_API_BASE_URL: "http://127.0.0.1:3902/backend/v3/api",
  });

  assert.equal(runtimeEnv.VITE_SDKWORK_ACCOUNT_APP_API_BASE_URL, "/app/v3/api");
  assert.equal(runtimeEnv.VITE_SDKWORK_MEMBERSHIP_APP_API_BASE_URL, "/app/v3/api");
  assert.equal(runtimeEnv.VITE_SDKWORK_MODELS_BACKEND_API_BASE_URL, "/backend/v3/api");
});

test("portal dev proxy targets the application ingress, never a private loopback bind", () => {
  // The standalone.development topology starts exactly two processes: the
  // standalone gateway bound to the public ingress (0.0.0.0:3905) and the Vite
  // renderer. It starts NO open/backend surface listener, so forwarding a
  // same-origin dev API path to the private loopback binds reported by the
  // materialized `.env.standalone.development` (18080/18081) is guaranteed
  // `ECONNREFUSED`. The ingress leads every fallback (API_ASSEMBLY_SPEC §6.1.1).
  const env = {
    SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL: "http://127.0.0.1:3905",
    VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL: "http://127.0.0.1:4734",
    VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_BACKEND_HTTP_URL: "http://127.0.0.1:18081",
    VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_OPEN_HTTP_URL: "http://127.0.0.1:18080",
  };

  const proxy = resolvePortalDevProxy(env);

  assert.equal(proxy["/v1"]?.target, "http://127.0.0.1:3905");
  assert.equal(proxy["/feeds/v3/api"]?.target, "http://127.0.0.1:3905");
  assert.equal(proxy["/backend/v3/api"]?.target, "http://127.0.0.1:3905");
  assert.equal(proxy["/app/v3/api"]?.target, "http://127.0.0.1:3905");
  // The web dev ingress (4734) is the page's own origin, never an API target.
  assert.notEqual(proxy["/app/v3/api"]?.target, "http://127.0.0.1:4734");
});

test("portal dev proxy honours an explicit dev-proxy origin override", () => {
  const proxy = resolvePortalDevProxy({
    SDKWORK_CLOUDROUTER_BROWSER_DEV_PROXY_OPEN_API_ORIGIN: "http://127.0.0.1:3999",
    SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL: "http://127.0.0.1:3905",
  });

  assert.equal(proxy["/v1"]?.target, "http://127.0.0.1:3999");
  // Unset surfaces still fall back to the ingress.
  assert.equal(proxy["/app/v3/api"]?.target, "http://127.0.0.1:3905");
});

test("portal runtime env rewrites standalone topology leaks to same-origin SDK bases", () => {
  const runtimeEnv = resolvePortalRuntimeEnv({
    VITE_CLOUDROUTER_APP_API_BASE_URL: "/app/v3/api",
    VITE_CLOUDROUTER_BACKEND_API_BASE_URL: "/backend/v3/api",
    VITE_CLOUDROUTER_OPEN_API_BASE_URL: "/v1",
    VITE_SDKWORK_DRIVE_BACKEND_API_BASE_URL: "http://127.0.0.1:3900",
    VITE_SDKWORK_MEMBERSHIP_BACKEND_API_BASE_URL: "http://127.0.0.1:3905/backend/v3/api",
    VITE_SDKWORK_FEEDS_OPEN_API_BASE_URL: "http://127.0.0.1:3902/feeds/v3/api",
    VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL: "http://127.0.0.1:3905",
    VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_BACKEND_HTTP_URL: "http://127.0.0.1:18081",
    VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_OPEN_HTTP_URL: "http://127.0.0.1:18080",
  });
  const script = buildPortalRuntimeEnvScript(runtimeEnv);

  assert.equal(runtimeEnv.VITE_SDKWORK_DRIVE_BACKEND_API_BASE_URL, "/backend/v3/api");
  assert.equal(runtimeEnv.VITE_SDKWORK_MEMBERSHIP_BACKEND_API_BASE_URL, "/backend/v3/api");
  assert.equal(runtimeEnv.VITE_SDKWORK_FEEDS_OPEN_API_BASE_URL, "/feeds/v3/api");
  assert.equal(runtimeEnv.VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL, undefined);
  assert.equal(runtimeEnv.VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_BACKEND_HTTP_URL, undefined);
  assert.equal(runtimeEnv.VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_OPEN_HTTP_URL, undefined);
  assert.doesNotMatch(script, /127\.0\.0\.1/u);
});

test("portal runtime env rewrites loopback PORTAL_PUBLIC derivations for open API", () => {
  const runtimeEnv = resolvePortalRuntimeEnv({
    PORTAL_PUBLIC_SDK_BASE_URL: "http://127.0.0.1:3902",
    VITE_CLOUDROUTER_APP_API_BASE_URL: "/app/v3/api",
    VITE_CLOUDROUTER_BACKEND_API_BASE_URL: "/backend/v3/api",
    VITE_CLOUDROUTER_OPEN_API_BASE_URL: "/v1",
  });

  assert.equal(runtimeEnv.VITE_API_BASE_URL, "/v1");
  assert.equal(runtimeEnv.VITE_CLOUDROUTER_OPEN_API_BASE_URL, "/v1");
});

test("playground agents workbench wires federated assets and feeds SDKs through portal commons", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-cloudrouter-pc-playground/src/pages/Playground.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /getAssetsAppSdkClient:\s*getSdkworkAssetsAppSdkClient/);
  assert.match(source, /getFeedsOpenSdkClient:\s*getSdkworkFeedsOpenSdkClient/);
  assert.doesNotMatch(source, /configureFeedsOpenSdkClientProvider/);
  assert.doesNotMatch(source, /8095|18095/);
});

test("feeds open SDK defaults to same-origin api-assembly gateway prefix", () => {
  const source = readFileSync(
    new URL("./packages/sdkwork-cloudroutes-pc-commons/src/sdk-clients.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /FEEDS_OPEN_API_PREFIX/);
  assert.match(source, /VITE_SDKWORK_FEEDS_OPEN_API_BASE_URL/);
  assert.doesNotMatch(source, /VITE_SDKWORK_AGENTS_PC_FEEDS_OPEN_API_BASE_URL/);
  assert.doesNotMatch(source, /18095/);
});

test("portal runtime env keeps appbase backend SDK base URL independent from cloud-router backend", () => {
  const runtimeEnv = resolvePortalRuntimeEnv({
    PORTAL_PUBLIC_BACKEND_API_BASE_URL: "/backend/v3/api",
    PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL: "https://appbase.example.com/backend/v3/api",
  });
  const envExample = readFileSync(new URL("./.env.example", import.meta.url), "utf8");
  const releaseEnvExample = readFileSync(new URL("../../.env.standalone.production.example", import.meta.url), "utf8");
  const startProductionSource = readFileSync(
    new URL("../../scripts/start-cloud-router-production.mjs", import.meta.url),
    "utf8",
  );
  const startWorkspaceSource = readFileSync(
    new URL("../../scripts/dev/start-workspace.mjs", import.meta.url),
    "utf8",
  );
  const releasePreflightSource = readFileSync(
    new URL("../../scripts/release-preflight.mjs", import.meta.url),
    "utf8",
  );

  assert.equal(runtimeEnv.VITE_CLOUDROUTER_BACKEND_API_BASE_URL, "/backend/v3/api");
  assert.equal(
    runtimeEnv.VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL,
    "https://appbase.example.com/backend/v3/api",
  );
  assert.match(envExample, /PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL/);
  assert.match(envExample, /PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL=""/);
  assert.match(releaseEnvExample, /PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL=""/);
  assert.doesNotMatch(releaseEnvExample, /SDKWORK_ACCESS_TOKEN/u);
  assert.doesNotMatch(envExample, /PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL="\/backend\/v3\/api"/);
  assert.doesNotMatch(releaseEnvExample, /PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL="\/backend\/v3\/api"/);
  assert.match(startProductionSource, /PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL/);
  assert.match(startWorkspaceSource, /PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL/);
  assert.match(releasePreflightSource, /PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL/);
});

test("portal resolve extensions prefer authored TypeScript over stale compiled JavaScript", async () => {
  // A build resolves the credential-entry token; supply the profile fixture.
  const config = await withPublicApplicationAccessToken("development", () => resolvePortalViteConfig("development", "build"));
  const extensions = config.resolve?.extensions;
  assert.ok(Array.isArray(extensions), "portal resolve.extensions must be declared");
  const tsIndex = extensions.indexOf(".ts");
  const tsxIndex = extensions.indexOf(".tsx");
  const jsIndex = extensions.indexOf(".js");
  assert.ok(tsIndex >= 0 && tsxIndex >= 0 && jsIndex >= 0, `unexpected extension list: ${extensions.join(",")}`);
  assert.ok(
    tsIndex < jsIndex && tsxIndex < jsIndex,
    `authored .ts/.tsx must resolve before a stale compiled .js sibling: ${extensions.join(",")}`,
  );
  assert.equal(extensions.at(-1), ".json");
});

async function resolvePortalModuleId(
  config: UserConfig,
  source: string,
  importer: string,
): Promise<string | null> {
  const extensions = config.resolve?.extensions;
  assert.ok(Array.isArray(extensions) && extensions.length > 0);
  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL(".", import.meta.url)),
    logLevel: "silent",
    resolve: { extensions: [...extensions] },
    server: { middlewareMode: true },
  });
  try {
    const container = (server as unknown as {
      pluginContainer: { resolveId(source: string, importer: string): Promise<{ id: string } | null> };
    }).pluginContainer;
    const resolved = await container.resolveId(source, importer);
    return resolved?.id ?? null;
  } finally {
    await server.close();
  }
}

function canonicalPath(filePath: string): string {
  try {
    return fs.realpathSync.native(filePath);
  } catch {
    return path.resolve(filePath);
  }
}

test("workspace SDK facades resolve their internal modules from TypeScript sources", async () => {
  // A build resolves the credential-entry token; supply the profile fixture.
  const config = await withPublicApplicationAccessToken("development", () => resolvePortalViteConfig("development", "build"));
  const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
  const facadeRoots = [
    // This repository's own composed SDK facade.
    path.join(repositoryRoot, "sdks/cloudrouter-app-sdk/cloudrouter-app-sdk-typescript"),
    // Sibling dependency whose stale generated base class produced the
    // production "Cannot read properties of undefined (reading 'demandClaims')"
    // crash when the facade and the generated transport came from different
    // revisions.
    path.join(repositoryRoot, "../sdkwork-order/sdks/sdkwork-order-app-sdk/sdkwork-order-app-sdk-typescript"),
  ];

  let checked = 0;
  for (const facadeRoot of facadeRoots) {
    const importer = path.join(facadeRoot, "src/index.ts");
    if (!existsSync(importer)) {
      continue;
    }

    const resolved = await resolvePortalModuleId(config, "../generated/server-openapi/src/index", importer);
    assert.ok(resolved, `failed to resolve the generated transport entry from ${importer}`);
    // A `tsc` run leaves gitignored `generated/server-openapi/src/index.js`
    // next to the authored TypeScript. Binding to it mixes revisions: the
    // facade comes from `src/index.ts` (package exports) while its generated
    // base class comes from the stale `.js`.
    assert.equal(
      canonicalPath(resolved),
      canonicalPath(path.join(facadeRoot, "generated/server-openapi/src/index.ts")),
      "an extensionless workspace import must bind to the authored .ts, never a stale compiled .js sibling",
    );
    checked += 1;
  }

  assert.ok(checked > 0, "expected at least one workspace SDK facade to verify");
});

function normalizeFsPath(value: string): string {
  return path.resolve(value).replaceAll("\\", "/").replace(/\/+$/u, "");
}

/**
 * Translate every Tailwind `@source` entry into the directories it scans.
 *
 * `**` spans any depth, `*` spans one path segment, and a bare directory entry
 * scans that directory recursively — the same semantics Tailwind v4 applies,
 * which is why an entry naming an ancestor directory covers every package
 * below it.
 */
function tailwindSourceRoots(indexCss: string, cssDirectory: string): Array<{ pattern: RegExp }> {
  return [...indexCss.matchAll(/@source\s+"([^"]+)"/gu)].map((match) => {
    let pattern = normalizeFsPath(path.resolve(cssDirectory, match[1]));
    const scansRecursively = pattern.endsWith("/**");
    if (scansRecursively) {
      pattern = pattern.slice(0, -3);
    }
    let source = "";
    for (let index = 0; index < pattern.length; index += 1) {
      const character = pattern[index];
      if (character === "*") {
        const isGlobstar = pattern[index + 1] === "*";
        source += isGlobstar ? ".*" : "[^/]*";
        if (isGlobstar) {
          index += 1;
        }
      } else if ("\\^$.|?+()[]{}".includes(character)) {
        source += `\\${character}`;
      } else {
        source += character;
      }
    }
    return { pattern: new RegExp(`^${source}${scansRecursively ? "(?:/.*)?" : ""}$`, "u") };
  });
}

function isDirectoryScannedBy(roots: Array<{ pattern: RegExp }>, directory: string): boolean {
  const normalized = normalizeFsPath(directory);
  const candidates: string[] = [];
  let current = normalized;
  while (current.includes("/")) {
    candidates.push(current);
    current = current.slice(0, current.lastIndexOf("/"));
  }
  return candidates.some((candidate) => roots.some((root) => root.pattern.test(candidate)));
}

test("Smart Hardware console sibling pages are served in dev and scanned by the CSS build", async () => {
  // Regression guard: a sibling-repo page package embedded through the pnpm
  // workspace resolves to TSX *source* outside this app. Both host integrations
  // are easy to forget when such a page is added:
  //   - `server.fs.allow` must cover its repository, or the dev server answers
  //     403 and the route cannot load at all;
  //   - `src/index.css` must `@source` its directory, or its Tailwind utilities
  //     are never generated. A partially generated inverted pair
  //     (`bg-zinc-900 dark:bg-zinc-100` + `text-white dark:text-zinc-900`)
  //     collapsed the hardware console's primary action and active page tab
  //     into `dark:text-zinc-900` on `bg-zinc-900`: invisible labels.
  const config = await resolvePortalViteConfig();
  const allowList = (config.server?.fs?.allow ?? []).map(normalizeFsPath);
  const cssDirectory = fileURLToPath(new URL("./src/", import.meta.url));
  const sourceRoots = tailwindSourceRoots(readFileSync(path.join(cssDirectory, "index.css"), "utf8"), cssDirectory);
  const consoleHardwareManifest = JSON.parse(
    readFileSync(
      new URL("./packages/sdkwork-cloudrouter-pc-console-hardware/package.json", import.meta.url),
      "utf8",
    ),
  ) as { dependencies?: Record<string, string> };
  const embeddedPackages = Object.keys(consoleHardwareManifest.dependencies ?? {})
    .filter((packageName) => packageName.startsWith("@sdkwork/"));
  const importer = new URL("./src/App.tsx", import.meta.url).pathname;

  let verified = 0;
  for (const packageName of embeddedPackages) {
    const resolvedEntry = resolvePortalPackageModule(packageName, import.meta.dirname, importer);
    if (!resolvedEntry) {
      continue;
    }
    const sourceDirectory = path.dirname(resolvedEntry);
    const authorsUtilities = [...collectSourceFiles(sourceDirectory)]
      .some((filePath) => /className/u.test(readFileSync(filePath, "utf8")));
    if (!authorsUtilities) {
      continue;
    }
    verified += 1;
    assert.ok(
      allowList.some((root) => normalizeFsPath(resolvedEntry).startsWith(`${root}/`)),
      `${packageName} resolves to ${resolvedEntry}, which Vite dev refuses to serve; its repository must join server.fs.allow`,
    );
    assert.ok(
      isDirectoryScannedBy(sourceRoots, sourceDirectory),
      `${packageName} authors Tailwind utilities in ${sourceDirectory}, which no @source entry scans; its utilities would be missing from the CSS build`,
    );
  }

  assert.ok(verified > 0, "expected at least one embedded sibling page package to verify");
});

function* collectSourceFiles(directory: string): Generator<string> {
  if (!existsSync(directory)) {
    return;
  }
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") {
        continue;
      }
      yield* collectSourceFiles(path.join(directory, entry.name));
      continue;
    }
    if (/\.(?:tsx|ts)$/u.test(entry.name) && !/\.d\.ts$/u.test(entry.name)) {
      yield path.join(directory, entry.name);
    }
  }
}
