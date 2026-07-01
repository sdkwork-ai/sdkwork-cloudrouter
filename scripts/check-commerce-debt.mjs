#!/usr/bin/env node
/**
 * Scans Claw Router for transitional commerce/vendor technical debt.
 *
 * - `pnpm check:commerce-debt` (--report): print findings, exit 0 while debt is tracked.
 * - `pnpm check:commerce-debt:strict`: fail on forbidden console-era commerce PC packages,
 *   legacy commerce facade packages, and broad commerce tailwind globs.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PORTAL_ROOT = path.join(REPO_ROOT, 'apps', 'sdkwork-clawrouter-pc');

const REPORT_ONLY = process.argv.includes('--report');

const FORBIDDEN_CONSOLE_COMMERCE_PACKAGES = [
  '@sdkwork/commerce-pc-host',
  '@sdkwork/commerce-pc-wallet',
  '@sdkwork/commerce-pc-billing',
  '@sdkwork/commerce-pc-checkout',
  '@sdkwork/commerce-pc-membership',
  '@sdkwork/commerce-pc-membership-purchase',
  '@sdkwork/commerce-pc-payment',
  '@sdkwork/commerce-runtime',
];

const FORBIDDEN_PORTAL_COMMERCE_PACKAGES = [
  '@sdkwork/commerce-service',
  '@sdkwork/commerce-sdk-ports',
  '@sdkwork/commerce-contracts',
  'sdkwork-commerce-app-sdk-generated-typescript',
  'sdkwork-commerce-backend-sdk-generated-typescript',
];

const FORBIDDEN_PORTAL_SOURCE_PATTERNS = [
  /@sdkwork\/commerce-service/,
  /@sdkwork\/commerce-sdk-ports/,
  /@sdkwork\/commerce-contracts/,
  /getSdkworkCommerceService/,
  /createSdkworkCommerceService/,
  /configureSdkworkCommerceServiceProvider/,
  /sdkwork-commerce-app-sdk-generated-typescript/,
  /sdkwork-commerce-backend-sdk-generated-typescript/,
  /packages\/common\/commerce\//,
  /sdks\/sdkwork-commerce-app-sdk/,
  /sdks\/sdkwork-commerce-backend-sdk/,
];

const FORBIDDEN_METADATA_PATTERNS = [
  /commerce-capability/,
  /commerce-capability-generated-typescript/,
  /getClawRouterAppCapabilitySdkClient/,
  /getClawRouterBackendCapabilitySdkClient/,
  /createClawRouterAppCapabilitySdkClient/,
  /createClawRouterBackendCapabilitySdkClient/,
  /BackendCommerceService/,
  /getClawRouterBackendSdkClient\(\)\.commerce\./,
  /clawrouter-app-sdk\.commerce/,
  /clawrouter-backend-sdk\.commerce/,
  /clawrouter-app-capability/,
  /clawrouter-backend-capability/,
  /sdkwork-commerce \(deleted\)/,
  /sdkwork-commerce-pc-admin-product/,
  /sdkwork-commerce-backend-sdk-generated-typescript/,
  /sdkwork-commerce-app-sdk-generated-typescript/,
  /"x-sdkwork-owner": "sdkwork-commerce"/,
  /"domain": "commerce"/,
  /createCommerceProductAdminService/,
  /CommerceProductAdminService/,
  /@sdkwork\/commerce-pc-admin-product/,
  /sdkworkCommercePcAdminProductRoutes/,
  /\/admin\/commerce\/products/,
  /"declaredDomain": "commerce"/,
];

const SCANNED_REPO_METADATA_FILES = [
  'sdks/clawrouter-app-sdk/specs/component.spec.json',
  'sdks/clawrouter-backend-sdk/specs/component.spec.json',
  'sdks/clawrouter-app-sdk/README.md',
  'sdks/clawrouter-backend-sdk/README.md',
  'sdks/clawrouter-app-sdk/clawrouter-app-domain-transport-typescript/generated/server-openapi/sdkwork-sdk.json',
  'sdks/clawrouter-backend-sdk/clawrouter-backend-domain-transport-typescript/generated/server-openapi/sdkwork-sdk.json',
  'sdks/clawrouter-app-sdk/openapi/clawrouter-app-domain-transport.openapi.json',
  'sdks/clawrouter-backend-sdk/openapi/clawrouter-backend-domain-transport.openapi.json',
  'sdks/clawrouter-app-sdk/clawrouter-app-domain-transport-typescript/generated/server-openapi/README.md',
  'sdks/clawrouter-backend-sdk/clawrouter-backend-domain-transport-typescript/generated/server-openapi/README.md',
  'apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-core/specs/component.spec.json',
  'apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-core/specs/component.spec.json',
  'apps/sdkwork-clawrouter-pc/packages/sdkwork-clawroutes-pc-commons/specs/component.spec.json',
  'apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-commons/specs/component.spec.json',
  'apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-wallet/specs/component.spec.json',
  'apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-orders/specs/component.spec.json',
  'apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-payments/specs/component.spec.json',
  'apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/specs/component.spec.json',
  'apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/catalogService.ts',
  'apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/routes.ts',
  'apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/specs/README.md',
  'apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-inventory/specs/component.spec.json',
  'apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-inventory/README.md',
  'apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-finance/specs/component.spec.json',
  'apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-finance/README.md',
  'apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-marketing/specs/component.spec.json',
  'apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-marketing/README.md',
  'apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/specs/component.spec.json',
  'apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/README.md',
  'apps/sdkwork-clawrouter-pc/specs/component.spec.json',
  'crates/sdkwork-routes-payment-open-api/specs/component.spec.json',
  'docs/architecture/tech/TECH-2026-05-23-admin-membership-center-completeness.md',
  'docs/architecture/tech/TECH-2026-05-23-admin-membership-center-completeness-design.md',
  'docs/architecture/tech/TECH-2026-06-10-admin-product-center-commercial.md',
  'docs/architecture/tech/TECH-2026-06-10-admin-product-center-commercial-design.md',
  'docs/architecture/tech/TECH-2026-05-20-appbase-commerce-platform-design.md',
  'docs/architecture/tech/TECH-2026-05-20-appbase-commerce-account-wallet-ledger.md',
  'docs/architecture/tech/TECH-2026-05-21-appbase-commerce-standard-design.md',
  'docs/architecture/tech/TECH-2026-05-21-appbase-commerce-standard-phase1.md',
  'docs/superpowers/specs/2026-05-20-appbase-commerce-platform-design.md',
  'docs/architecture/tech/TECH-2026-05-22-admin-product-center-design.md',
  'docs/architecture/tech/TECH-2026-05-22-admin-product-center.md',
  'docs/superpowers/specs/2026-05-22-admin-product-center-design.md',
  'docs/superpowers/plans/2026-05-22-admin-product-center.md',
  'apps/sdkwork-clawrouter-pc/src/main.tsx',
];

const SCANNED_PORTAL_FILES = [
  'package.json',
  'src/App.tsx',
  'src/console-business/consoleBusinessHostMount.tsx',
  'src/portal-external-tailwind-sources.ts',
  'src/index.css',
  'packages/sdkwork-clawroutes-pc-commons/package.json',
  'packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts',
  'packages/sdkwork-clawroutes-pc-commons/src/domain-service-providers.ts',
  'packages/sdkwork-clawrouter-pc-core/package.json',
  'tsconfig.json',
  'tsconfig.typecheck.json',
  'vite.config.ts',
];

function listTrackedVendorPaths() {
  try {
    const output = execSync('git ls-files vendor', {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function readPortal(relativePath) {
  const absolutePath = path.join(PORTAL_ROOT, relativePath);
  if (!existsSync(absolutePath)) {
    return null;
  }
  return readFileSync(absolutePath, 'utf8');
}

function readRepo(relativePath) {
  const absolutePath = path.join(REPO_ROOT, relativePath);
  if (!existsSync(absolutePath)) {
    return null;
  }
  return readFileSync(absolutePath, 'utf8');
}

function collectIssues() {
  const issues = [];

  const trackedVendor = listTrackedVendorPaths();
  if (trackedVendor.length > 0) {
    issues.push({
      severity: 'error',
      code: 'vendor-tracked',
      message: `${trackedVendor.length} git-tracked paths remain under vendor/; run git rm -r vendor after commerce dissolution`,
    });
  }

  if (existsSync(path.join(PORTAL_ROOT, 'pnpm-workspace.yaml'))) {
    issues.push({
      severity: 'error',
      code: 'nested-pnpm-workspace',
      message: 'apps/sdkwork-clawrouter-pc/pnpm-workspace.yaml is forbidden; declare workspace packages at repository root only',
    });
  }

  if (existsSync(path.join(REPO_ROOT, 'packages/common/commerce'))) {
    issues.push({
      severity: 'error',
      code: 'legacy-commerce-common-packages',
      message: 'packages/common/commerce must be removed; commerce capabilities are composed through clawrouter SDK clients',
    });
  }

  if (existsSync(path.join(REPO_ROOT, 'sdks', 'sdkwork-commerce-app-sdk'))) {
    issues.push({
      severity: 'error',
      code: 'legacy-commerce-app-sdk-family',
      message: 'sdks/sdkwork-commerce-app-sdk must be removed; domain transport lives under sdks/clawrouter-app-sdk/clawrouter-app-domain-transport-typescript',
    });
  }

  if (existsSync(path.join(REPO_ROOT, 'sdks', 'sdkwork-commerce-backend-sdk'))) {
    issues.push({
      severity: 'error',
      code: 'legacy-commerce-backend-sdk-family',
      message: 'sdks/sdkwork-commerce-backend-sdk must be removed; domain transport lives under sdks/clawrouter-backend-sdk/clawrouter-backend-domain-transport-typescript',
    });
  }

  const workspaceSource = readRepo('pnpm-workspace.yaml') ?? '';
  for (const legacyWorkspacePattern of [
    'packages/common/commerce',
    'sdks/sdkwork-commerce-app-sdk',
    'sdks/sdkwork-commerce-backend-sdk',
  ]) {
    if (workspaceSource.includes(legacyWorkspacePattern)) {
      issues.push({
        severity: 'error',
        code: 'legacy-commerce-workspace-entry',
        message: `pnpm-workspace.yaml must not declare ${legacyWorkspacePattern}`,
      });
    }
  }

  const packageJsonSource = readPortal('package.json');
  if (packageJsonSource) {
    const packageJson = JSON.parse(packageJsonSource);
    const dependencies = packageJson.dependencies ?? {};
    const workspaces = packageJson.workspaces ?? [];

    for (const pkg of FORBIDDEN_CONSOLE_COMMERCE_PACKAGES) {
      if (dependencies[pkg] !== undefined) {
        issues.push({
          severity: 'error',
          code: 'forbidden-console-commerce-package',
          message: `apps/sdkwork-clawrouter-pc/package.json must not depend on ${pkg}`,
        });
      }
    }

    for (const pkg of FORBIDDEN_PORTAL_COMMERCE_PACKAGES) {
      if (dependencies[pkg] !== undefined) {
        issues.push({
          severity: 'error',
          code: 'forbidden-portal-commerce-package',
          message: `apps/sdkwork-clawrouter-pc/package.json must not depend on ${pkg}`,
        });
      }
    }

    for (const workspaceEntry of workspaces) {
      if (
        workspaceEntry.includes('packages/common/commerce')
        || workspaceEntry.includes('sdkwork-commerce-app-sdk')
        || workspaceEntry.includes('sdkwork-commerce-backend-sdk')
      ) {
        issues.push({
          severity: 'error',
          code: 'legacy-commerce-nested-workspace',
          message: `apps/sdkwork-clawrouter-pc/package.json workspaces must not include ${workspaceEntry}`,
        });
      }
    }
  }

  for (const relativePath of SCANNED_PORTAL_FILES) {
    const source = readPortal(relativePath);
    if (!source) {
      continue;
    }
    if (source.includes('vendor/sdkwork-commerce')) {
      issues.push({
        severity: 'error',
        code: 'vendor-commerce-reference',
        message: `${relativePath} still references vendor/sdkwork-commerce`,
      });
    }
    for (const pkg of FORBIDDEN_CONSOLE_COMMERCE_PACKAGES) {
      if (source.includes(pkg)) {
        issues.push({
          severity: 'error',
          code: 'forbidden-console-commerce-reference',
          message: `${relativePath} still references forbidden package ${pkg}`,
        });
      }
    }
    for (const pkg of FORBIDDEN_PORTAL_COMMERCE_PACKAGES) {
      if (source.includes(pkg)) {
        issues.push({
          severity: 'error',
          code: 'forbidden-portal-commerce-reference',
          message: `${relativePath} still references forbidden package ${pkg}`,
        });
      }
    }
    for (const pattern of FORBIDDEN_PORTAL_SOURCE_PATTERNS) {
      if (pattern.test(source)) {
        issues.push({
          severity: 'error',
          code: 'forbidden-portal-commerce-pattern',
          message: `${relativePath} still matches forbidden commerce pattern ${pattern}`,
        });
      }
    }
    if (
      /sdkwork-commerce\/apps\/sdkwork-commerce-pc\/packages\/\*\/src/u.test(source)
    ) {
      issues.push({
        severity: 'error',
        code: 'broad-commerce-tailwind-glob',
        message: `${relativePath} still uses broad vendor commerce tailwind glob`,
      });
    }
  }

  for (const relativePath of SCANNED_REPO_METADATA_FILES) {
    const source = readRepo(relativePath);
    if (!source) {
      continue;
    }
    for (const pattern of FORBIDDEN_METADATA_PATTERNS) {
      if (pattern.test(source)) {
        issues.push({
          severity: 'error',
          code: 'forbidden-commerce-metadata-pattern',
          message: `${relativePath} still matches forbidden commerce metadata pattern ${pattern}`,
        });
      }
    }
  }

  return issues;
}

function main() {
  const issues = collectIssues();
  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warn');

  console.log('[check-commerce-debt] commerce alignment scan');
  if (issues.length === 0) {
    console.log('[check-commerce-debt] no commerce debt findings');
    process.exit(0);
  }

  for (const issue of warnings) {
    console.log(`  warn ${issue.code}: ${issue.message}`);
  }
  for (const issue of errors) {
    console.error(`  error ${issue.code}: ${issue.message}`);
  }

  if (REPORT_ONLY) {
    console.log(
      `[check-commerce-debt] report mode: ${errors.length} error(s), ${warnings.length} warning(s)`,
    );
    process.exit(0);
  }

  if (errors.length > 0) {
    console.error('[check-commerce-debt] strict mode failed');
    process.exit(1);
  }

  console.log('[check-commerce-debt] strict mode passed with warnings only');
}

main();
