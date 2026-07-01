import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import type { UserConfig } from "vite";

import portalViteConfig from "./vite.config.ts";
import {
  buildPortalRuntimeEnvScript,
  resolvePortalRuntimeEnv,
  resolvePortalWorkspaceDependencyRoot,
} from "./vite.config.ts";

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

test("dev server enables React Fast Refresh and HMR by default", async () => {
  const config = await resolvePortalViteConfig();
  const plugins: unknown[] = Array.isArray(config.plugins) ? config.plugins.flat() : [];

  assert.ok(plugins.some((plugin) => hasPluginName(plugin, "vite:react-babel")));
  assert.ok(plugins.some((plugin) => hasPluginName(plugin, "vite:react-refresh")));
  assert.deepEqual(config.server?.hmr, {
    clientPort: 3901,
    host: "127.0.0.1",
  });
});

test("dependency optimizer pre-bundles recharts instead of serving its mixed ESM and CommonJS sources", async () => {
  const config = await resolvePortalViteConfig();

  assert.ok(config.optimizeDeps?.include?.includes("recharts"));
  assert.equal(config.optimizeDeps?.needsInterop?.includes("es-toolkit/compat/get"), false);
});

test("generated ClawRouter SDK packages are not served from stale dependency optimizer cache", async () => {
  const config = await resolvePortalViteConfig();

  for (const packageName of [
    "@sdkwork/clawrouter-app-sdk",
    "@sdkwork/clawrouter-backend-sdk",
    "@sdkwork/clawrouter-open-sdk",
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

test("portal workspace packages resolve to source files outside node_modules in dev", async () => {
  const config = await resolvePortalViteConfig();
  const plugins: unknown[] = Array.isArray(config.plugins) ? config.plugins.flat() : [];
  const resolver = plugins.find((plugin) => hasPluginName(plugin, "clawrouter-portal-local-package-resolver"));

  assert.ok(resolver && typeof resolver === "object");
  assert.ok("resolveId" in resolver);

  const resolvedRoot = await callResolveId(
    resolver.resolveId,
    "@sdkwork/documents-pc-api-reference",
    new URL("./src/App.tsx", import.meta.url).pathname,
  );
  const resolvedSubpath = await callResolveId(
    resolver.resolveId,
    "sdkwork-clawroutes-pc-commons/runtime",
    new URL("../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/codeSnippetClient.ts", import.meta.url).pathname,
  );

  assert.equal(
    resolvedRoot,
    path.resolve(import.meta.dirname, "../../../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/index.ts"),
  );
  assert.equal(
    resolvedSubpath,
    path.resolve(import.meta.dirname, "packages/sdkwork-clawroutes-pc-commons/src/runtime.ts"),
  );
  assert.ok(!String(resolvedRoot).includes(`${path.sep}node_modules${path.sep}`));
  assert.ok(!String(resolvedSubpath).includes(`${path.sep}node_modules${path.sep}`));
});

test("portal local packages resolve scoped clawrouter pc downloads to source files", async () => {
  const config = await resolvePortalViteConfig();
  const plugins: unknown[] = Array.isArray(config.plugins) ? config.plugins.flat() : [];
  const resolver = plugins.find((plugin) => hasPluginName(plugin, "clawrouter-portal-local-package-resolver"));

  assert.ok(resolver && typeof resolver === "object");
  assert.ok("resolveId" in resolver);

  const resolvedRoot = await callResolveId(
    resolver.resolveId,
    "@sdkwork/clawrouter-pc-downloads",
    new URL("./packages/sdkwork-clawrouter-pc-home/src/components/DownloadSection.tsx", import.meta.url).pathname,
  );

  assert.equal(
    resolvedRoot,
    path.resolve(import.meta.dirname, "packages/sdkwork-clawrouter-pc-downloads/src/index.ts"),
  );
  assert.ok(existsSync(resolvedRoot));
});

test("portal workspace packages resolve to source files during production build", async () => {
  const config = await resolvePortalViteConfig();
  const plugins: unknown[] = Array.isArray(config.plugins) ? config.plugins.flat() : [];
  const resolver = plugins.find((plugin) => hasPluginName(plugin, "clawrouter-portal-local-package-resolver"));

  assert.ok(resolver && typeof resolver === "object");
  assert.ok("resolveId" in resolver);
  assert.notEqual("apply" in resolver ? resolver.apply : undefined, "serve");

  const resolvedRoot = await callResolveId(
    resolver.resolveId,
    "sdkwork-clawroutes-pc-commons",
    new URL("./src/App.tsx", import.meta.url).pathname,
  );

  assert.equal(
    resolvedRoot,
    path.resolve(import.meta.dirname, "packages/sdkwork-clawroutes-pc-commons/src/index.ts"),
  );
  assert.ok(!String(resolvedRoot).includes(`${path.sep}node_modules${path.sep}`));
});

test("portal dev server may serve workspace SDK sources resolved by aliases", async () => {
  const config = await resolvePortalViteConfig();
  const workspaceRoot = path.resolve(import.meta.dirname, "../..");

  assert.ok(config.server?.fs?.allow?.includes(workspaceRoot));
});

test("portal resolves ClawRouter generated SDK imports to source entries", async () => {
  const config = await resolvePortalViteConfig();
  const aliases = config.resolve?.alias;

  assert.ok(Array.isArray(aliases));
  for (const [packageName, sdkFamily] of [
    ["@sdkwork/clawrouter-app-sdk", "clawrouter-app-sdk"],
    ["@sdkwork/clawrouter-backend-sdk", "clawrouter-backend-sdk"],
    ["@sdkwork/clawrouter-open-sdk", "clawrouter-open-sdk"],
  ] as const) {
    const expectedEntry = path.resolve(
      import.meta.dirname,
      `../../sdks/${sdkFamily}/${sdkFamily}-typescript/generated/server-openapi/src/index.ts`,
    );
    assert.equal(
      aliases.find((alias) => (
        typeof alias === "object"
        && alias !== null
        && "find" in alias
        && alias.find === packageName
      ))?.replacement,
      expectedEntry,
    );
    assert.ok(existsSync(expectedEntry), `${packageName} alias must point to a real generated source file`);
  }
});

test("portal dependency roots resolve to the sibling workspace repository path", () => {
  const fakeConfigDir = path.resolve(
    import.meta.dirname,
    "../../target/test/portal-portability/apps/sdkwork-clawrouter-pc",
  );

  assert.equal(
    resolvePortalWorkspaceDependencyRoot(fakeConfigDir, "sdkwork-ui"),
    path.resolve(fakeConfigDir, "../../..", "sdkwork-ui"),
  );
});

test("portal resolves sdkwork UI workspace imports to the app workspace source root", async () => {
  const config = await resolvePortalViteConfig();
  const aliases = config.resolve?.alias;
  const expectedUiRoot = resolvePortalWorkspaceDependencyRoot(import.meta.dirname, "sdkwork-ui");
  const expectedUiEntry = path.resolve(expectedUiRoot, "sdkwork-ui-pc-react/src/index.ts");

  assert.ok(Array.isArray(aliases));
  assert.equal(
    aliases.find((alias) => (
      typeof alias === "object"
      && alias !== null
      && "find" in alias
      && alias.find === "@sdkwork/ui-pc-react"
    ))?.replacement,
    expectedUiEntry,
  );
  assert.ok(existsSync(expectedUiEntry), "@sdkwork/ui-pc-react alias must point to a real source file");
  assert.ok(
    config.server?.fs?.allow?.includes(expectedUiRoot),
    "Vite dev server must allow serving sdkwork-ui workspace sources",
  );
});

test("portal resolves runtime bootstrap workspace imports to the appbase foundation source root", async () => {
  const config = await resolvePortalViteConfig();
  const aliases = config.resolve?.alias;
  const appbaseRoot = resolvePortalWorkspaceDependencyRoot(import.meta.dirname, "sdkwork-appbase");
  const expectedRuntimeBootstrapEntry = path.resolve(
    appbaseRoot,
    "packages/common/foundation/sdkwork-runtime-bootstrap/src/index.ts",
  );

  assert.ok(Array.isArray(aliases));
  assert.equal(
    aliases.find((alias) => (
      typeof alias === "object"
      && alias !== null
      && "find" in alias
      && alias.find === "@sdkwork/runtime-bootstrap"
    ))?.replacement,
    expectedRuntimeBootstrapEntry,
  );
  assert.ok(
    existsSync(expectedRuntimeBootstrapEntry),
    "@sdkwork/runtime-bootstrap alias must point to a real source file",
  );
});

test("portal resolves SDK common imports for generated SDKs served from sibling workspaces", async () => {
  const config = await resolvePortalViteConfig();
  const aliases = config.resolve?.alias;
  const expectedSdkCommonEntry = path.resolve(
    import.meta.dirname,
    "node_modules/@sdkwork/sdk-common/dist/index.js",
  );

  assert.ok(Array.isArray(aliases));
  assert.equal(
    aliases.find((alias) => (
      typeof alias === "object"
      && alias !== null
      && "find" in alias
      && alias.find === "@sdkwork/sdk-common"
    ))?.replacement,
    expectedSdkCommonEntry,
  );
  assert.ok(existsSync(expectedSdkCommonEntry), "@sdkwork/sdk-common alias must point to an installed SDK common entrypoint");
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
  ]);
});

test("workspace React runtime imports stay bare so Vite optimizer can emit ESM interop", async () => {
  const config = await resolvePortalViteConfig();
  const plugins: unknown[] = Array.isArray(config.plugins) ? config.plugins.flat() : [];
  const resolver = plugins.find((plugin) => hasPluginName(plugin, "clawrouter-portal-workspace-dependency-resolver"));
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

test("portal scripts run dependency preflight before Vite entrypoints", () => {
  const portalPackage = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

  assert.equal(portalPackage.scripts["deps:check"], "node scripts/check-portal-deps.mjs");
  assert.equal(portalPackage.scripts.predev, "node ../../scripts/ensure-claw-router-env.mjs --lifecycle dev");
  assert.equal(portalPackage.scripts.prebuild, "node ../../scripts/ensure-claw-router-env.mjs --lifecycle build");
  assert.equal(portalPackage.scripts.dev, "pnpm deps:check && vite --configLoader native");
  assert.equal(portalPackage.scripts["dev:browser"], "pnpm deps:check && vite --configLoader native");
  assert.equal(portalPackage.scripts.build, "pnpm deps:check && node scripts/build-portal.mjs");
});

test("development mode injects bootstrap access token while production build does not", async () => {
  const developmentConfig = await resolvePortalViteConfig("development", "serve");
  const productionConfig = await resolvePortalViteConfig("production", "build");

  assert.ok(developmentConfig.define?.["process.env.SDKWORK_ACCESS_TOKEN"]);
  assert.equal(productionConfig.define?.["process.env.SDKWORK_ACCESS_TOKEN"], undefined);
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
  const resolver = plugins.find((plugin) => hasPluginName(plugin, "clawrouter-portal-workspace-dependency-resolver"));
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
  const resolver = plugins.find((plugin) => hasPluginName(plugin, "clawrouter-portal-workspace-dependency-resolver"));
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
      VITE_CLAWROUTER_OPEN_API_BASE_URL: "https://tenant.example.com/v1",
      VITE_CLAWROUTER_APP_API_BASE_URL: "/app/v3/api",
      VITE_CLAWROUTER_BACKEND_API_BASE_URL: "/backend/v3/api",
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
  assert.equal(runtimeEnv.VITE_CLAWROUTER_OPEN_API_BASE_URL, "https://open.example.com/v1");
  assert.match(script, /"VITE_CLAWROUTER_OPEN_API_BASE_URL":"https:\/\/open\.example\.com\/v1"/u);
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
  assert.equal(runtimeEnv.VITE_CLAWROUTER_OPEN_API_BASE_URL, "https://tenant.example.com/router/v1");
  assert.equal(runtimeEnv.VITE_CLAWROUTER_APP_API_BASE_URL, "https://tenant.example.com/router/app/v3/api");
  assert.equal(
    runtimeEnv.VITE_CLAWROUTER_BACKEND_API_BASE_URL,
    "https://tenant.example.com/router/backend/v3/api",
  );
  assert.equal(
    runtimeEnv.VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL,
    "https://tenant.example.com/router/backend/v3/api",
  );
});

test("portal runtime env derives Commerce dependency SDK base URLs from one public SDK base URL", () => {
  const runtimeEnv = resolvePortalRuntimeEnv({
    PORTAL_PUBLIC_SDK_BASE_URL: "https://tenant.example.com/router",
    PORTAL_PUBLIC_COMMERCE_APP_API_BASE_URL: "",
    PORTAL_PUBLIC_COMMERCE_BACKEND_API_BASE_URL: "",
  });

  assert.equal(
    runtimeEnv.VITE_SDKWORK_COMMERCE_APP_API_BASE_URL,
    "https://tenant.example.com/router/app/v3/api",
  );
  assert.equal(
    runtimeEnv.VITE_SDKWORK_COMMERCE_BACKEND_API_BASE_URL,
    "https://tenant.example.com/router/backend/v3/api",
  );
});

test("portal runtime env lets Commerce dependency SDK base URLs override the shared SDK base URL", () => {
  const runtimeEnv = resolvePortalRuntimeEnv({
    PORTAL_PUBLIC_SDK_BASE_URL: "https://tenant.example.com/router",
    PORTAL_PUBLIC_COMMERCE_APP_API_BASE_URL: "https://commerce-app.example.com/app/v3/api",
    PORTAL_PUBLIC_COMMERCE_BACKEND_API_BASE_URL: "https://commerce-admin.example.com/backend/v3/api",
  });

  assert.equal(
    runtimeEnv.VITE_SDKWORK_COMMERCE_APP_API_BASE_URL,
    "https://commerce-app.example.com/app/v3/api",
  );
  assert.equal(
    runtimeEnv.VITE_SDKWORK_COMMERCE_BACKEND_API_BASE_URL,
    "https://commerce-admin.example.com/backend/v3/api",
  );
  assert.equal(runtimeEnv.VITE_CLAWROUTER_APP_API_BASE_URL, "https://tenant.example.com/router/app/v3/api");
  assert.equal(
    runtimeEnv.VITE_CLAWROUTER_BACKEND_API_BASE_URL,
    "https://tenant.example.com/router/backend/v3/api",
  );
});

test("production start env lets one public SDK base URL drive portal surfaces unless explicitly overridden", async () => {
  const { resolveStartProductionEnv } = await import("../../scripts/start-claw-router-production.mjs");
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

test("portal runtime env keeps appbase backend SDK base URL independent from claw-router backend", () => {
  const runtimeEnv = resolvePortalRuntimeEnv({
    PORTAL_PUBLIC_BACKEND_API_BASE_URL: "/backend/v3/api",
    PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL: "https://appbase.example.com/backend/v3/api",
  });
  const envExample = readFileSync(new URL("./.env.example", import.meta.url), "utf8");
  const releaseEnvExample = readFileSync(new URL("../../.env.release.example", import.meta.url), "utf8");
  const startProductionSource = readFileSync(
    new URL("../../scripts/start-claw-router-production.mjs", import.meta.url),
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

  assert.equal(runtimeEnv.VITE_CLAWROUTER_BACKEND_API_BASE_URL, "/backend/v3/api");
  assert.equal(
    runtimeEnv.VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL,
    "https://appbase.example.com/backend/v3/api",
  );
  assert.match(envExample, /PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL/);
  assert.match(envExample, /PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL=""/);
  assert.match(releaseEnvExample, /PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL=""/);
  assert.match(releaseEnvExample, /SDKWORK_ACCESS_TOKEN=/);
  assert.doesNotMatch(envExample, /PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL="\/backend\/v3\/api"/);
  assert.doesNotMatch(releaseEnvExample, /PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL="\/backend\/v3\/api"/);
  assert.match(startProductionSource, /PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL/);
  assert.match(startWorkspaceSource, /PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL/);
  assert.match(releasePreflightSource, /PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL/);
});
