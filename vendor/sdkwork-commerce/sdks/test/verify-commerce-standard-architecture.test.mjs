import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const workspaceRoot = path.resolve(import.meta.dirname, "..", "..");
const pcRoot = path.join(workspaceRoot, "apps", "sdkwork-commerce-pc");

const standardRootDirectories = [
  "apis",
  "apps",
  "crates",
  "database",
  "sdks",
  "jobs",
  "tools",
  "plugins",
  "examples",
  "configs",
  "deployments",
  "scripts",
  "docs",
  "tests",
];

const pcApplicationRequiredPaths = [
  "AGENTS.md",
  "CLAUDE.md",
  "CODEX.md",
  "GEMINI.md",
  "sdkwork.workflow.json",
  ".github/workflows/package.yml",
  ".sdkwork/README.md",
  ".sdkwork/.gitignore",
  ".sdkwork/skills/README.md",
  ".sdkwork/plugins/README.md",
  "bin/README.md",
  "bin/windows/README.md",
  "bin/linux/README.md",
  "bin/macos/README.md",
  "config/browser/README.md",
  "config/browser/runtime-env.development.example.json",
  "config/browser/runtime-env.test.example.json",
  "config/browser/runtime-env.staging.example.json",
  "config/browser/runtime-env.production.example.json",
  "config/desktop/README.md",
  "config/desktop/sdkwork-commerce-pc.development.toml.example",
  "config/desktop/sdkwork-commerce-pc.test.toml.example",
  "config/desktop/sdkwork-commerce-pc.staging.toml.example",
  "config/desktop/sdkwork-commerce-pc.production.toml.example",
  "config/server/README.md",
  "config/server/sdkwork-commerce-pc.development.toml.example",
  "config/server/sdkwork-commerce-pc.test.toml.example",
  "config/server/sdkwork-commerce-pc.staging.toml.example",
  "config/server/sdkwork-commerce-pc.production.toml.example",
  "config/container/README.md",
  "config/container/sdkwork-commerce-pc.development.toml.example",
  "config/container/sdkwork-commerce-pc.test.toml.example",
  "config/container/sdkwork-commerce-pc.staging.toml.example",
  "config/container/sdkwork-commerce-pc.production.toml.example",
  "config/tauri/README.md",
  "config/tauri/tauri.conf.json",
  "docs/README.md",
  "public/README.md",
  "scripts/README.md",
  "sdks/README.md",
  "specs/README.md",
  "specs/component.spec.json",
  "src/bootstrap/README.md",
  "src/bootstrap/environment.ts",
  "src/bootstrap/iamRuntime.ts",
  "src/bootstrap/routes.ts",
  "src/bootstrap/runtime.ts",
  "src/bootstrap/sdkClients.ts",
  "src/App.tsx",
  "src/AuthGate.tsx",
  "src/index.css",
  "src/main.tsx",
  "tests/README.md",
  "index.html",
  "package.json",
  "tsconfig.json",
  "vite.config.ts",
  "packages",
];

const apiInputs = [
  "apis/open-api/commerce/commerce-open-api.openapi.json",
  "apis/app-api/commerce/commerce-app-api.openapi.json",
  "apis/backend-api/commerce/commerce-backend-api.openapi.json",
];

const sdkFamilies = [
  {
    root: "sdkwork-commerce-sdk",
    authority: "sdkwork-commerce-open-api",
    input: "apis/open-api/commerce/commerce-open-api.openapi.json",
  },
  {
    root: "sdkwork-commerce-app-sdk",
    authority: "sdkwork-commerce-app-api",
    input: "apis/app-api/commerce/commerce-app-api.openapi.json",
  },
  {
    root: "sdkwork-commerce-backend-sdk",
    authority: "sdkwork-commerce-backend-api",
    input: "apis/backend-api/commerce/commerce-backend-api.openapi.json",
  },
];

const pcPackages = new Map([
  ["sdkwork-commerce-pc-core", "@sdkwork/commerce-pc-core"],
  ["sdkwork-commerce-pc-commons", "@sdkwork/commerce-pc-commons"],
  ["sdkwork-commerce-pc-shell", "@sdkwork/commerce-pc-shell"],
  ["sdkwork-commerce-pc-commerce", "@sdkwork/commerce-pc-commerce"],
  ["sdkwork-commerce-pc-billing", "@sdkwork/commerce-pc-billing"],
  ["sdkwork-commerce-pc-checkout", "@sdkwork/commerce-pc-checkout"],
  ["sdkwork-commerce-pc-coupon", "@sdkwork/commerce-pc-coupon"],
  ["sdkwork-commerce-pc-entitlement", "@sdkwork/commerce-pc-entitlement"],
  ["sdkwork-commerce-pc-invoice", "@sdkwork/commerce-pc-invoice"],
  ["sdkwork-commerce-pc-membership", "@sdkwork/commerce-pc-membership"],
  ["sdkwork-commerce-pc-membership-purchase", "@sdkwork/commerce-pc-membership-purchase"],
  ["sdkwork-commerce-pc-offer", "@sdkwork/commerce-pc-offer"],
  ["sdkwork-commerce-pc-order", "@sdkwork/commerce-pc-order"],
  ["sdkwork-commerce-pc-payment", "@sdkwork/commerce-pc-payment"],
  ["sdkwork-commerce-pc-points", "@sdkwork/commerce-pc-points"],
  ["sdkwork-commerce-pc-pricing", "@sdkwork/commerce-pc-pricing"],
  ["sdkwork-commerce-pc-subscription", "@sdkwork/commerce-pc-subscription"],
  ["sdkwork-commerce-pc-wallet", "@sdkwork/commerce-pc-wallet"],
  ["sdkwork-commerce-pc-admin-core", "@sdkwork/commerce-pc-admin-core"],
  ["sdkwork-commerce-pc-admin-shell", "@sdkwork/commerce-pc-admin-shell"],
  ["sdkwork-commerce-pc-admin-membership", "@sdkwork/commerce-pc-admin-membership"],
  ["sdkwork-commerce-pc-admin-product", "@sdkwork/commerce-pc-admin-product"],
]);

const pcInfrastructurePackages = new Map([
  [
    "sdkwork-commerce-pc-core",
    {
      capability: "core",
      surface: "shared-pc-runtime",
    },
  ],
  [
    "sdkwork-commerce-pc-commons",
    {
      capability: "commons",
      surface: "shared-pc-runtime",
    },
  ],
  [
    "sdkwork-commerce-pc-shell",
    {
      capability: "shell",
      surface: "app",
    },
  ],
  [
    "sdkwork-commerce-pc-admin-core",
    {
      capability: "admin-core",
      surface: "backend-admin",
    },
  ],
  [
    "sdkwork-commerce-pc-admin-shell",
    {
      capability: "admin-shell",
      surface: "backend-admin",
    },
  ],
]);

const commerceLocalRustCrates = new Map([
  ["sdkwork-commerce-bootstrap-manifest", "sdkwork-commerce-bootstrap-manifest"],
  ["sdkwork-commerce-contract-service", "sdkwork-commerce-contract-service"],
  ["sdkwork-commerce-api-server", "sdkwork-commerce-api-server"],
  ["sdkwork-commerce-database-host", "sdkwork-commerce-database-host"],
  ["sdkwork-commerce-service-host", "sdkwork-commerce-service-host"],
  ["sdkwork-commerce-rpc-host", "sdkwork-commerce-rpc-host"],
  ["sdkwork-commerce-rpc", "sdkwork-commerce-rpc"],
  ["sdkwork-commerce-rpc-proto", "sdkwork-commerce-rpc-proto"],
  ["sdkwork-commerce-storage-repository-sqlx", "sdkwork-commerce-storage-repository-sqlx"],
  ["sdkwork-commerce-tauri-host", "sdkwork-commerce-tauri-host"],
]);

const siblingCapabilityComponentSpecs = [
  "../sdkwork-shop/crates/sdkwork-commerce-shop-service/specs/component.spec.json",
  "../sdkwork-merchandise/crates/sdkwork-commerce-merchandise-service/specs/component.spec.json",
  "../sdkwork-inventory/crates/sdkwork-commerce-inventory-service/specs/component.spec.json",
  "../sdkwork-order/crates/sdkwork-commerce-order-service/specs/component.spec.json",
  "../sdkwork-payment/crates/sdkwork-commerce-payment-service/specs/component.spec.json",
  "../sdkwork-account/crates/sdkwork-commerce-account-service/specs/component.spec.json",
  "../sdkwork-promotion/crates/sdkwork-commerce-promotion-service/specs/component.spec.json",
  "../sdkwork-membership/crates/sdkwork-commerce-membership-service/specs/component.spec.json",
  "../sdkwork-invoice/crates/sdkwork-commerce-invoice-service/specs/component.spec.json",
];

const oldPcImportNames = [
  "@sdkwork/commerce-pc-react",
  "@sdkwork/billing-pc-react",
  "@sdkwork/checkout-pc-react",
  "@sdkwork/coupon-pc-react",
  "@sdkwork/entitlement-pc-react",
  "@sdkwork/invoice-pc-react",
  "@sdkwork/membership-admin-pc-react",
  "@sdkwork/membership-pc-react",
  "@sdkwork/membership-purchase-pc-react",
  "@sdkwork/offer-pc-react",
  "@sdkwork/order-pc-react",
  "@sdkwork/payment-pc-react",
  "@sdkwork/points-pc-react",
  "@sdkwork/pricing-pc-react",
  "@sdkwork/subscription-pc-react",
  "@sdkwork/wallet-pc-react",
];

function workspacePath(relativePath) {
  return path.join(workspaceRoot, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(workspacePath(relativePath), "utf8"));
}

function collectOpenApiOperations(document) {
  const operations = [];
  for (const [routePath, methods] of Object.entries(document.paths ?? {})) {
    for (const [method, operation] of Object.entries(methods ?? {})) {
      if (!operation || typeof operation !== "object" || method.startsWith("x-")) {
        continue;
      }
      operations.push({ routePath, method, operation });
    }
  }
  return operations;
}

function read(relativePath) {
  return readFileSync(workspacePath(relativePath), "utf8");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasPackageDependency(manifest, packageName) {
  return ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"].some(
    (section) => Object.hasOwn(manifest[section] ?? {}, packageName),
  );
}

function isSkippedScanDirectory(directoryPath) {
  const segments = path.relative(workspaceRoot, directoryPath).split(path.sep).filter(Boolean);
  return segments.some((segment) => [".git", "node_modules", "target"].includes(segment));
}

function collectFiles(root, predicate) {
  if (!existsSync(root) || isSkippedScanDirectory(root)) {
    return [];
  }
  const files = [];
  for (const entry of readdirSync(root)) {
    const fullPath = path.join(root, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...collectFiles(fullPath, predicate));
      continue;
    }
    if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

test("repository and PC application roots expose the SDKWork standard dictionary", () => {
  for (const directory of standardRootDirectories) {
    assert.equal(existsSync(workspacePath(directory)), true, `${directory} must exist at repository root`);
    assert.equal(existsSync(workspacePath(path.join(directory, "README.md"))), true, `${directory}/README.md must be tracked`);
  }

  for (const relativePath of pcApplicationRequiredPaths) {
    assert.equal(existsSync(path.join(pcRoot, relativePath)), true, `apps/sdkwork-commerce-pc/${relativePath} must exist`);
  }

  const pcAgents = read("apps/sdkwork-commerce-pc/AGENTS.md");
  assert.match(pcAgents, /\.\.\/\.\.\/\.\.\/sdkwork-specs\/SOUL\.md/);
  assert.match(pcAgents, /sdkwork\.app\.config\.json/);

  const pcPackageJson = readJson("apps/sdkwork-commerce-pc/package.json");
  assert.equal(pcPackageJson.name, "@sdkwork/commerce-pc-app");
  assert.equal(pcPackageJson.private, true);
  for (const requiredScript of [
    "dev",
    "dev:server",
    "build",
    "build:staging",
    "build:prod",
    "typecheck",
    "test",
    "test:config",
    "lint",
  ]) {
    assert.equal(
      typeof pcPackageJson.scripts?.[requiredScript],
      "string",
      `apps/sdkwork-commerce-pc package.json must expose ${requiredScript}`,
    );
  }
  assert.match(pcPackageJson.scripts?.["build:staging"], /validate-runtime-config\.mjs --profile staging/);
  assert.match(pcPackageJson.scripts?.["build:prod"], /validate-runtime-config\.mjs --profile production/);
  assert.match(pcPackageJson.scripts?.["test:config"], /validate-runtime-config\.mjs --all/);
  assert.equal(
    existsSync(path.join(pcRoot, "scripts", "validate-runtime-config.mjs")),
    true,
    "PC app root must provide runtime config preflight script",
  );

  const pnpmWorkspace = read("pnpm-workspace.yaml");
  assert.match(pnpmWorkspace, /-\s+"apps\/sdkwork-commerce-pc"/);
});

test("Commerce PC application root declares manifest-driven config and workflow readiness", () => {
  const manifest = readJson("apps/sdkwork-commerce-pc/sdkwork.app.config.json");
  assert.equal(manifest.schemaVersion, 3);
  assert.equal(manifest.kind, "sdkwork.app");
  assert.equal(manifest.app?.key, "sdkwork-commerce-pc");
  assert.equal(manifest.runtime?.family, "web");
  assert.equal(manifest.runtime?.framework, "react");
  assert.deepEqual(manifest.publish?.platforms, ["WEB"]);
  assert.equal(manifest.publish?.defaultPackageId, "web-universal-cloud-browser-zip");
  assert.equal(manifest.artifacts?.installConfig?.defaultPackageId, "web-universal-cloud-browser-zip");
  assert.equal(manifest.artifacts?.installConfig?.packages?.[0]?.id, "web-universal-cloud-browser-zip");
  assert.deepEqual(manifest.release?.notes?.[0]?.packageIds, ["web-universal-cloud-browser-zip"]);

  const componentSpec = readJson("apps/sdkwork-commerce-pc/specs/component.spec.json");
  const canonicalSpecFiles = new Set(componentSpec.canonicalSpecs?.map((spec) => spec.file));
  for (const requiredSpec of [
    "APP_MANIFEST_SPEC.md",
    "CONFIG_SPEC.md",
    "ENVIRONMENT_SPEC.md",
    "GITHUB_WORKFLOW_SPEC.md",
    "RELEASE_SPEC.md",
    "SUPPLY_CHAIN_SECURITY_SPEC.md",
    "QUALITY_GATE_SPEC.md",
  ]) {
    assert.equal(canonicalSpecFiles.has(requiredSpec), true, `PC app component spec must cite ${requiredSpec}`);
  }
  for (const runtimeEntrypoint of [
    "package.json",
    "index.html",
    "vite.config.ts",
    "tsconfig.json",
    "src/main.tsx",
    "src/App.tsx",
    "src/AuthGate.tsx",
    "src/bootstrap/environment.ts",
    "src/bootstrap/runtime.ts",
    "src/bootstrap/sdkClients.ts",
    "src/bootstrap/iamRuntime.ts",
    "src/bootstrap/routes.ts",
  ]) {
    assert.equal(
      componentSpec.contracts?.runtimeEntrypoints?.includes(runtimeEntrypoint),
      true,
      `PC app component spec must list runtime entrypoint ${runtimeEntrypoint}`,
    );
  }

  const workflow = readJson("apps/sdkwork-commerce-pc/sdkwork.workflow.json");
  assert.equal(workflow.schemaVersion, "2026-06-06.sdkwork.workflow.v1");
  assert.equal(workflow.app?.id, "sdkwork-commerce-pc");
  assert.equal(workflow.app?.configPath, "sdkwork.app.config.json");
  assert.equal(workflow.release?.artifactPrefix, "sdkwork-commerce-pc");
  assert.equal(workflow.release?.changelog?.source, "app-manifest");
  assert.equal(workflow.release?.defaultVersion, manifest.release?.currentVersion);
  assert.deepEqual(workflow.security, {
    signingRequired: false,
    sbomRequired: false,
    artifactAttestations: true,
  });
  assert.equal(Array.isArray(workflow.targets), true);
  const webTarget = workflow.targets.find((target) => target.id === "web-universal-cloud-browser-zip");
  assert.ok(webTarget, "workflow must declare web-universal-cloud-browser-zip target");
  assert.equal(webTarget.deploymentProfile, "cloud");
  assert.equal(webTarget.runtimeTarget, "browser");

  const packageWorkflow = read("apps/sdkwork-commerce-pc/.github/workflows/package.yml");
  assert.match(packageWorkflow, /Sdkwork-Cloud\/sdkwork-github-workflow\/\.github\/workflows\/sdkwork-package\.yml@/);
  assert.match(packageWorkflow, /config_path:\s+sdkwork\.workflow\.json/);

  const gitignore = read(".gitignore");
  assert.match(gitignore, /apps\/\*\/config\/\*\/\*\.local\.toml/);

  for (const profile of ["development", "test", "staging", "production"]) {
    const browserConfig = readJson(`apps/sdkwork-commerce-pc/config/browser/runtime-env.${profile}.example.json`);
    assert.equal(browserConfig.appKey, "sdkwork-commerce-pc");
    assert.equal(browserConfig.environment, profile);
    assert.equal(browserConfig.runtimeTarget, "browser");
    assert.equal(browserConfig.deploymentMode, "web");
    assert.equal(typeof browserConfig.appApiBaseUrl, "string");
    assert.equal(browserConfig.auth?.tokenManagerMode, "appbase-global");
    assert.equal(browserConfig.auth?.accessTokenHeader, "Access-Token");
    assert.equal(JSON.stringify(browserConfig).includes("TOKEN"), false, "browser examples must not contain token placeholders");
  }

  const productionServerConfig = read("apps/sdkwork-commerce-pc/config/server/sdkwork-commerce-pc.production.toml.example");
  assert.match(productionServerConfig, /environment = "production"/);
  assert.match(productionServerConfig, /deployment_mode = "server"/);
  assert.match(productionServerConfig, /engine = "postgresql"/);
  assert.match(productionServerConfig, /password_file = "\/etc\/sdkwork\/commerce-pc\/database.secret"/);

  const productionDesktopConfig = read("apps/sdkwork-commerce-pc/config/desktop/sdkwork-commerce-pc.production.toml.example");
  assert.match(productionDesktopConfig, /deployment_mode = "desktop"/);
  assert.match(productionDesktopConfig, /engine = "sqlite"/);
  assert.match(productionDesktopConfig, /enabled = false/);
});

test("React router dependencies are explicit and centralized for PC builds", () => {
  const pnpmWorkspace = read("pnpm-workspace.yaml");
  assert.match(pnpmWorkspace, /^\s*react-router:\s/m, "pnpm catalog must centralize react-router");
  assert.match(pnpmWorkspace, /^\s*react-router-dom:\s/m, "pnpm catalog must centralize react-router-dom");
  assert.equal(
    read("apps/sdkwork-commerce-pc/vite.config.ts").includes('"react-router-dom",\n          "node_modules",\n          "react-router"'),
    false,
    "Vite config must not alias react-router through react-router-dom/node_modules",
  );

  for (const manifestPath of [
    "package.json",
    "apps/sdkwork-commerce-pc/package.json",
    "apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-admin-product/package.json",
  ]) {
    const manifest = readJson(manifestPath);
    if (!hasPackageDependency(manifest, "react-router-dom")) {
      continue;
    }
    assert.equal(
      hasPackageDependency(manifest, "react-router"),
      true,
      `${manifestPath} must declare react-router when it declares react-router-dom`,
    );
  }
});

test("authored Commerce OpenAPI inputs live under apis and SDK metadata traces to them", () => {
  for (const relativePath of apiInputs) {
    assert.equal(existsSync(workspacePath(relativePath)), true, `${relativePath} must exist`);
    const openapi = readJson(relativePath);
    assert.equal(openapi["x-sdkwork-owner"], "sdkwork-commerce", `${relativePath} must be commerce-owned`);
  }

  assert.equal(existsSync(workspacePath("generated/openapi")), false, "generated/openapi must not remain the authored OpenAPI source location");

  for (const family of sdkFamilies) {
    const assembly = readJson(path.join("sdks", family.root, ".sdkwork-assembly.json"));
    const manifest = readJson(path.join("sdks", family.root, "sdk-manifest.json"));
    const expectedInput = `../../${family.input}`;
    assert.equal(assembly.apiAuthority, family.authority);
    assert.equal(assembly.generationInputSpec, expectedInput);
    assert.equal(assembly.authoritySpec, expectedInput);
    assert.equal(manifest.generationInputSpec, expectedInput);
  }
});

test("Commerce PC packages use canonical app-root package names", () => {
  assert.equal(existsSync(path.join(pcRoot, "packages", "commerce")), false, "PC app packages must not remain under packages/commerce");

  for (const [directory, packageName] of pcPackages) {
    const packageJsonPath = path.join("apps/sdkwork-commerce-pc/packages", directory, "package.json");
    assert.equal(existsSync(workspacePath(packageJsonPath)), true, `${directory} package.json must exist`);
    const packageJson = readJson(packageJsonPath);
    assert.equal(packageJson.name, packageName, `${directory} package name must be ${packageName}`);

    const sourceIndexCandidates = [
      path.join("apps/sdkwork-commerce-pc/packages", directory, "src", "index.ts"),
      path.join("apps/sdkwork-commerce-pc/packages", directory, "src", "index.tsx"),
    ];
    assert.equal(
      sourceIndexCandidates.some((sourceIndexPath) => existsSync(workspacePath(sourceIndexPath))),
      true,
      `${directory} must expose src/index.ts or src/index.tsx as its package boundary`,
    );

    const componentSpecPath = path.join("apps/sdkwork-commerce-pc/packages", directory, "specs", "component.spec.json");
    assert.equal(existsSync(workspacePath(componentSpecPath)), true, `${directory} component spec must exist`);
    const componentSpec = readJson(componentSpecPath);
    assert.equal(componentSpec.component?.name, packageName);
    assert.equal(componentSpec.component?.root, `sdkwork-commerce/apps/sdkwork-commerce-pc/packages/${directory}`);
    const canonicalSpecFiles = new Set(componentSpec.canonicalSpecs?.map((spec) => spec.file));
    const infrastructureContract = pcInfrastructurePackages.get(directory);
    if (infrastructureContract) {
      assert.equal(
        componentSpec.component?.capability,
        infrastructureContract.capability,
        `${directory} must declare the reserved infrastructure capability ${infrastructureContract.capability}`,
      );
      assert.equal(
        componentSpec.component?.surface,
        infrastructureContract.surface,
        `${directory} must declare surface ${infrastructureContract.surface}`,
      );
      for (const requiredSpec of [
        "CODE_STYLE_SPEC.md",
        "NAMING_SPEC.md",
        "TYPESCRIPT_CODE_SPEC.md",
        "COMPONENT_SPEC.md",
      ]) {
        assert.equal(canonicalSpecFiles.has(requiredSpec), true, `${directory} must cite ${requiredSpec}`);
      }
      if (directory === "sdkwork-commerce-pc-shell") {
        for (const requiredSpec of [
          "FRONTEND_CODE_SPEC.md",
          "FRONTEND_SPEC.md",
          "UI_ARCHITECTURE_SPEC.md",
          "APP_PC_REACT_UI_SPEC.md",
        ]) {
          assert.equal(canonicalSpecFiles.has(requiredSpec), true, `${directory} must cite ${requiredSpec}`);
        }
      }
      if (directory.includes("pc-admin")) {
        assert.equal(canonicalSpecFiles.has("BACKEND_UI_SPEC.md"), true, `${directory} must cite BACKEND_UI_SPEC.md`);
      }
    }
    if (directory.includes("pc-admin")) {
      assert.equal(componentSpec.component?.surface, "backend-admin", `${directory} must declare backend-admin surface`);
    }
  }

  const pcAppPackageJson = readJson("apps/sdkwork-commerce-pc/package.json");
  for (const directory of pcInfrastructurePackages.keys()) {
    const packageName = pcPackages.get(directory);
    assert.equal(
      pcAppPackageJson.dependencies?.[packageName],
      "workspace:*",
      `apps/sdkwork-commerce-pc package.json must depend on ${packageName}`,
    );
  }

  const tsconfig = read("tsconfig.base.json");
  for (const packageName of pcPackages.values()) {
    assert.match(tsconfig, new RegExp(`"${escapeRegExp(packageName)}"`));
  }
  for (const oldName of oldPcImportNames) {
    assert.equal(tsconfig.includes(`"${oldName}"`), false, `tsconfig must not keep old package alias ${oldName}`);
  }
  assert.equal(tsconfig.includes('"sdkwork-commerce-pc-admin-product"'), false, "tsconfig must not keep unscoped product admin alias");

  const appSource = read("apps/sdkwork-commerce-pc/src/App.tsx");
  assert.match(appSource, /@sdkwork\/commerce-pc-shell/, "root App.tsx must compose the app shell package");
  for (const rootShellClass of [
    "sdkwork-commerce-pc-rail",
    "sdkwork-commerce-pc-nav",
    "sdkwork-commerce-pc-main",
  ]) {
    assert.equal(
      appSource.includes(rootShellClass),
      false,
      `root App.tsx must not own shell layout class ${rootShellClass}`,
    );
  }
});

test("Commerce PC bootstrap consumes core and backend-admin surface boundaries", () => {
  const sdkClientsSource = read("apps/sdkwork-commerce-pc/src/bootstrap/sdkClients.ts");
  assert.match(sdkClientsSource, /@sdkwork\/commerce-pc-core/);
  assert.match(sdkClientsSource, /@sdkwork\/commerce-pc-admin-core/);
  assert.match(sdkClientsSource, /listSdkworkCommercePcAppSdkFamilies/);
  assert.match(sdkClientsSource, /listSdkworkCommercePcBackendAdminSdkFamilies/);

  const coreSource = read("apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-core/src/index.ts");
  assert.match(coreSource, /sdkwork-commerce-app-sdk/);
  assert.match(coreSource, /sdkwork-iam-app-sdk/);
  assert.equal(
    /sdkwork-commerce-backend-sdk|sdkwork-iam-backend-sdk/u.test(coreSource),
    false,
    "pc-core must not expose backend-admin SDK families",
  );
  const coreComponentSpec = readJson("apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-core/specs/component.spec.json");
  assert.equal(
    coreComponentSpec.contracts?.publicExports?.includes("createSdkworkCommercePcRouteRegistry"),
    true,
    "pc-core component spec must declare createSdkworkCommercePcRouteRegistry as a public export",
  );
  assert.deepEqual(coreComponentSpec.contracts?.sdkClients, [], "pc-core must not declare generated SDK clients");
  assert.deepEqual(
    new Set(coreComponentSpec.contracts?.sdkDependencies),
    new Set(["sdkwork-commerce-app-sdk", "sdkwork-commerce-sdk", "sdkwork-iam-app-sdk"]),
    "pc-core component spec must mirror app-side SDK family inventory",
  );
  assert.deepEqual(
    coreComponentSpec.contracts?.dependencyApiExports ?? null,
    [],
    "pc-core component spec must declare dependency APIs are not re-exported",
  );

  const adminCoreSource = read("apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-admin-core/src/index.ts");
  assert.match(adminCoreSource, /sdkwork-commerce-backend-sdk/);
  assert.match(adminCoreSource, /sdkwork-iam-backend-sdk/);
  const adminCoreComponentSpec = readJson("apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-admin-core/specs/component.spec.json");
  assert.deepEqual(adminCoreComponentSpec.contracts?.sdkClients, [], "pc-admin-core must not declare generated SDK clients");
  assert.deepEqual(
    new Set(adminCoreComponentSpec.contracts?.sdkDependencies),
    new Set(["sdkwork-commerce-backend-sdk", "sdkwork-iam-backend-sdk"]),
    "pc-admin-core component spec must mirror backend-admin SDK family inventory",
  );

  const routesSource = read("apps/sdkwork-commerce-pc/src/bootstrap/routes.ts");
  assert.match(routesSource, /@sdkwork\/commerce-pc-admin-shell/);
  assert.match(routesSource, /SdkworkCommercePcAdminSurface/);
});

test("Commerce PC routes are contributed by owning packages and only assembled by bootstrap", () => {
  const coreSource = read("apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-core/src/index.ts");
  assert.match(coreSource, /SdkworkCommercePcRouteContribution/);
  assert.match(coreSource, /createSdkworkCommercePcRouteRegistry/);

  const packageRouteExports = [
    [
      "apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-commerce/src/index.ts",
      "apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-commerce/src/routes.ts",
      "sdkworkCommercePcCommerceRoutes",
    ],
    [
      "apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-billing/src/index.ts",
      "apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-billing/src/routes.ts",
      "sdkworkCommercePcBillingRoutes",
    ],
    [
      "apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-admin-product/src/index.tsx",
      "apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-admin-product/src/routes.ts",
      "sdkworkCommercePcAdminProductRoutes",
    ],
  ];

  for (const [indexPath, routesPath, routeExport] of packageRouteExports) {
    const indexSource = read(indexPath);
    const routesSource = read(routesPath);
    assert.match(indexSource, /routes/, `${indexPath} must export its routes module`);
    assert.match(routesSource, new RegExp(routeExport), `${routesPath} must declare ${routeExport}`);
    assert.match(routesSource, /titleKey/, `${routesPath} route metadata must include i18n titleKey`);
  }

  const routeComponentSpecs = [
    [
      "apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-commerce/specs/component.spec.json",
      "sdkworkCommercePcCommerceRoutes",
      [],
    ],
    [
      "apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-billing/specs/component.spec.json",
      "sdkworkCommercePcBillingRoutes",
      [],
    ],
    [
      "apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-admin-product/specs/component.spec.json",
      "sdkworkCommercePcAdminProductRoutes",
      ["sdkwork-commerce-backend-sdk"],
    ],
  ];

  for (const [componentSpecPath, routeExport, sdkDependencies] of routeComponentSpecs) {
    const componentSpec = readJson(componentSpecPath);
    const canonicalSpecFiles = new Set(componentSpec.canonicalSpecs?.map((spec) => spec.file));
    assert.equal(canonicalSpecFiles.has("CODE_STYLE_SPEC.md"), true, `${componentSpecPath} must cite CODE_STYLE_SPEC.md`);
    assert.equal(canonicalSpecFiles.has("NAMING_SPEC.md"), true, `${componentSpecPath} must cite NAMING_SPEC.md`);
    assert.equal(
      componentSpec.contracts?.publicExports?.includes(routeExport),
      true,
      `${componentSpecPath} must declare ${routeExport} as a public route contribution export`,
    );
    assert.deepEqual(componentSpec.contracts?.sdkClients, [], `${componentSpecPath} must not list runtime SDK clients`);
    assert.deepEqual(
      componentSpec.contracts?.sdkDependencies ?? null,
      sdkDependencies,
      `${componentSpecPath} must declare SDK family dependencies explicitly`,
    );
    assert.deepEqual(
      componentSpec.contracts?.dependencyApiExports ?? null,
      [],
      `${componentSpecPath} must declare that dependency APIs are not re-exported`,
    );
  }

  const routesSource = read("apps/sdkwork-commerce-pc/src/bootstrap/routes.ts");
  for (const routeExport of [
    "sdkworkCommercePcCommerceRoutes",
    "sdkworkCommercePcBillingRoutes",
    "sdkworkCommercePcAdminProductRoutes",
  ]) {
    assert.match(routesSource, new RegExp(routeExport), `bootstrap routes must assemble ${routeExport}`);
  }
  assert.match(routesSource, /createSdkworkCommercePcRouteRegistry/);
  for (const ownedRoutePath of ["/app/commerce", "/app/billing", "/admin/commerce/products"]) {
    assert.equal(
      routesSource.includes(`path: "${ownedRoutePath}"`),
      false,
      `bootstrap routes must not own package route path ${ownedRoutePath}`,
    );
  }
});

test("Rust crates use responsibility-specific SDKWork names", () => {
  const crateDirectoryNames = readdirSync(workspacePath("crates"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  assert.deepEqual(
    crateDirectoryNames.filter((name) => name.endsWith("-rust")).sort(),
    [],
    "Rust crate directories must not keep the old -rust suffix",
  );

  for (const [directory, packageName] of commerceLocalRustCrates) {
    const cargoPath = path.join("crates", directory, "Cargo.toml");
    assert.equal(existsSync(workspacePath(cargoPath)), true, `${directory} Cargo.toml must exist`);
    assert.match(read(cargoPath), new RegExp(`^name\\s*=\\s*"${packageName}"$`, "m"));
  }

  const workspaceCargo = read("Cargo.toml");
  for (const directory of commerceLocalRustCrates.keys()) {
    assert.match(workspaceCargo, new RegExp(`"crates/${escapeRegExp(directory)}"`));
  }
  for (const forbidden of ["sdkwork_commerce_core", "sdkwork_commerce_runtime", "sdkwork_commerce_http"]) {
    assert.equal(workspaceCargo.includes(forbidden), false, `Cargo workspace must not keep forbidden dependency alias ${forbidden}`);
  }
});

test("commerce workspace aligns with sdkwork-web-framework, database, and route manifest standards", () => {
  const routeManifestPaths = [
    "sdks/_route-manifests/app-api/sdkwork-commerce-api-server.route-manifest.json",
    "sdks/_route-manifests/backend-api/sdkwork-commerce-api-server.route-manifest.json",
  ];
  for (const manifestPath of routeManifestPaths) {
    assert.equal(existsSync(workspacePath(manifestPath)), true, `${manifestPath} must exist`);
    const manifest = readJson(manifestPath);
    assert.ok(Array.isArray(manifest.routes) && manifest.routes.length > 0, `${manifestPath} must declare routes`);
  }

  const apiServerSpec = readJson("crates/sdkwork-commerce-api-server/specs/component.spec.json");
  assert.equal(apiServerSpec.component.status, "stable");
  assert.equal(apiServerSpec.component.type, "rust-route-crate");
  assert.match(apiServerSpec.contracts?.routeManifest ?? "", /_route-manifests/);
  const apiSpecFiles = new Set(apiServerSpec.canonicalSpecs?.map((spec) => spec.file));
  assert.equal(apiSpecFiles.has("WEB_FRAMEWORK_SPEC.md"), true);
  assert.equal(apiSpecFiles.has("API_SPEC.md"), true);
  assert.equal(apiSpecFiles.has("SDK_WORKSPACE_GENERATION_SPEC.md"), true);

  const appManifest = readJson("sdks/_route-manifests/app-api/sdkwork-commerce-api-server.route-manifest.json");
  assert.match(appManifest.source?.openapiAuthority ?? "", /^apis\/app-api\//);
  assert.equal(
    appManifest.source?.contractsRoot ?? null,
    null,
    "route manifest must not keep contractsRoot as authority input",
  );

  const storageSpec = readJson("crates/sdkwork-commerce-storage-repository-sqlx/specs/component.spec.json");
  assert.equal(storageSpec.component.status, "stable");
  const storageSpecFiles = new Set(storageSpec.canonicalSpecs?.map((spec) => spec.file));
  assert.equal(storageSpecFiles.has("DATABASE_SPEC.md"), true);

  const storageLib = read("crates/sdkwork-commerce-storage-repository-sqlx/src/lib.rs");
  assert.match(storageLib, /mod database_pool;/);
  assert.match(storageLib, /commerce_sqlite_memory_pool/);

  const webBootstrap = read("crates/sdkwork-commerce-api-server/src/web_bootstrap.rs");
  assert.match(webBootstrap, /with_web_request_context/);
  assert.match(webBootstrap, /build_web_framework_layer/);

  const membershipRequestIdentity = read(
    "../sdkwork-membership/crates/sdkwork-commerce-membership-repository-sqlx/src/request_identity.rs",
  );
  assert.match(membershipRequestIdentity, /with_commerce_app_request_context/);
  assert.match(membershipRequestIdentity, /with_commerce_backend_request_context/);
  assert.equal(
    membershipRequestIdentity.includes("with_server_request_identity"),
    false,
    "membership routers must not keep legacy with_server_request_identity",
  );

  const serviceHostSpec = readJson("crates/sdkwork-commerce-service-host/specs/component.spec.json");
  assert.equal(serviceHostSpec.component.status, "stable");

  const contractServiceSpec = readJson("crates/sdkwork-commerce-contract-service/specs/component.spec.json");
  assert.equal(contractServiceSpec.component.status, "stable");

  const membershipRepositorySpec = readJson(
    "../sdkwork-membership/crates/sdkwork-commerce-membership-repository-sqlx/specs/component.spec.json",
  );
  assert.equal(membershipRepositorySpec.component.status, "stable");

  for (const componentPath of [
    "crates/sdkwork-commerce-rpc/specs/component.spec.json",
    "crates/sdkwork-commerce-rpc-proto/specs/component.spec.json",
    "crates/sdkwork-commerce-tauri-host/specs/component.spec.json",
    ...siblingCapabilityComponentSpecs,
  ]) {
    const spec = readJson(componentPath);
    assert.equal(
      spec.component.status,
      "stable",
      `${componentPath} must be stable after domain contract alignment`,
    );
  }

  const rpcContractsSpec = readJson(
    "packages/common/commerce/sdkwork-commerce-rpc-contracts/specs/component.spec.json",
  );
  assert.equal(rpcContractsSpec.component.status, "standard");
  assert.match(rpcContractsSpec.contracts?.protoRoot ?? "", /commerce-rpc-contracts\/proto$/);

  const sdkDownloaderSpec = readJson("sdks/sdkwork-sdk-downloader/specs/component.spec.json");
  assert.equal(sdkDownloaderSpec.component.status, "stable");
  assert.equal(
    sdkDownloaderSpec.component.root,
    "sdkwork-commerce/sdks/sdkwork-sdk-downloader",
  );

  const lingeringStandardizingSpecs = collectFiles(workspaceRoot, (filePath) => {
    const relativePath = path.relative(workspaceRoot, filePath).replaceAll("\\", "/");
    return relativePath.endsWith("/specs/component.spec.json");
  }).filter((filePath) => {
    const spec = JSON.parse(readFileSync(filePath, "utf8"));
    return spec.component?.status === "standardizing";
  });
  assert.deepEqual(
    lingeringStandardizingSpecs.map((filePath) =>
      path.relative(workspaceRoot, filePath).replaceAll("\\", "/"),
    ),
    [],
    "component specs must not remain in standardizing after alignment",
  );

  const workspaceComponentSpec = readJson("specs/component.spec.json");
  const workspaceSpecFiles = new Set(workspaceComponentSpec.canonicalSpecs?.map((spec) => spec.file));
  assert.equal(workspaceSpecFiles.has("WEB_FRAMEWORK_SPEC.md"), true);
  assert.equal(workspaceSpecFiles.has("DATABASE_SPEC.md"), true);
  assert.equal(workspaceSpecFiles.has("SECURITY_SPEC.md"), true);

  assert.equal(existsSync(workspacePath(".github/workflows/verify.yml")), true);
  assert.match(read("package.json"), /route-manifest:check/);
  assert.match(read("package.json"), /route-manifest:export/);
  assert.match(read("package.json"), /db:validate/);

  for (const openapiPath of apiInputs) {
    const openapi = readJson(openapiPath);
    for (const { operation } of collectOpenApiOperations(openapi)) {
      assert.equal(
        operation["x-sdkwork-request-context"],
        "WebRequestContext",
        `${openapiPath} must declare WebRequestContext on every operation`,
      );
      assert.match(
        String(operation["x-sdkwork-api-surface"] ?? ""),
        /-api$/,
        `${openapiPath} must declare canonical x-sdkwork-api-surface on every operation`,
      );
    }
  }

  assert.equal(existsSync(workspacePath("database/database.manifest.json")), true);
  assert.equal(existsSync(workspacePath("database/contract/schema.yaml")), true);

  const rawSqliteConnectViolations = collectFiles(workspaceRoot, (filePath) => {
    const relativePath = path.relative(workspaceRoot, filePath).replaceAll("\\", "/");
    if (
      !relativePath.endsWith(".rs") ||
      relativePath === "crates/sdkwork-commerce-storage-repository-sqlx/src/database_pool.rs"
    ) {
      return false;
    }
    return readFileSync(filePath, "utf8").includes("SqlitePool::connect");
  }).map((filePath) => path.relative(workspaceRoot, filePath).replaceAll("\\", "/"));
  assert.deepEqual(
    rawSqliteConnectViolations,
    [],
    "Commerce Rust sources must create SQLite pools through sdkwork-database helpers",
  );
});

test("new source references avoid old PC and Rust architecture names", () => {
  const textFiles = collectFiles(workspaceRoot, (filePath) => {
    const relativePath = path.relative(workspaceRoot, filePath).replaceAll("\\", "/");
    if (
      relativePath.startsWith(".git/") ||
      relativePath.startsWith("node_modules/") ||
      relativePath.startsWith("target/") ||
      relativePath.startsWith("docs/superpowers/specs/") ||
      relativePath.startsWith("docs/superpowers/plans/") ||
      relativePath === "sdks/test/verify-commerce-standard-architecture.test.mjs" ||
      relativePath.includes("/generated/server-openapi/")
    ) {
      return false;
    }
    return /\.(json|toml|md|mjs|ts|tsx|rs|yaml|yml)$/.test(relativePath);
  });

  const forbiddenMarkers = [
    "apps/sdkwork-commerce-pc/packages/commerce",
    "generated/openapi",
    ...oldPcImportNames,
    "sdkwork-commerce-core-rust",
    "sdkwork-commerce-runtime-rust",
    "sdkwork-commerce-http-rust",
    "sdkwork-commerce-bootstrap-rust",
    "sdkwork-commerce-tauri-rust",
  ];
  const violations = [];
  for (const filePath of textFiles) {
    const source = readFileSync(filePath, "utf8");
    for (const marker of forbiddenMarkers) {
      if (source.includes(marker)) {
        violations.push(`${path.relative(workspaceRoot, filePath).replaceAll("\\", "/")}: ${marker}`);
      }
    }
    const oldRustName = source.match(/sdkwork-commerce-(?:account|bootstrap|catalog|core|http|inventory|invoice|membership|membership-sqlx|order|payment|promotion|rpc|runtime|storage-sqlx|tauri)-rust/u);
    if (oldRustName) {
      violations.push(`${path.relative(workspaceRoot, filePath).replaceAll("\\", "/")}: ${oldRustName[0]}`);
    }
  }
  assert.deepEqual(violations, []);
});


