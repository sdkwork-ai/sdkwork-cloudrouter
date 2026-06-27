#!/usr/bin/env node
/**
 * Scans sdkwork-space sibling repositories for sdkwork-commerce technical debt.
 *
 * Strict mode (default): fails when consumer repositories still declare retired
 * console-era commerce PC packages in package manifests.
 *
 * Report mode (--report): prints transitional commerce dependencies without failing.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, '../..');
const clawRouterRoot = path.resolve(scriptDir, '..');

const FORBIDDEN_CONSOLE_COMMERCE_PACKAGES = [
  '@sdkwork/commerce-pc-host',
  '@sdkwork/commerce-pc-wallet',
  '@sdkwork/commerce-pc-billing',
  '@sdkwork/commerce-pc-checkout',
  '@sdkwork/commerce-pc-membership',
  '@sdkwork/commerce-pc-membership',
  '@sdkwork/commerce-pc-membership-purchase',
  '@sdkwork/commerce-pc-payment',
  '@sdkwork/commerce-pc-order',
  '@sdkwork/commerce-pc-subscription',
  '@sdkwork/commerce-pc-coupon',
  '@sdkwork/commerce-runtime',
];

const ALLOWED_TRANSITIONAL_COMMERCE = [
  '@sdkwork/commerce-service',
  '@sdkwork/commerce-contracts',
  '@sdkwork/commerce-sdk-ports',
  '@sdkwork/commerce-pc-admin-product',
  '@sdkwork/commerce-app-sdk',
  '@sdkwork/commerce-backend-sdk',
  'sdkwork-commerce-app-sdk-generated-typescript',
  'sdkwork-commerce-backend-sdk-generated-typescript',
];

const VENDOR_COMMERCE_RELATIVE = path.join('vendor', 'sdkwork-commerce');

function isVendorCommercePath(filePath) {
  const normalized = filePath.split(path.sep).join(path.posix.sep);
  return normalized.includes(VENDOR_COMMERCE_RELATIVE.split(path.sep).join(path.posix.sep));
}

const EXCLUDED_REPOS = new Set(['sdkwork-commerce']);

const EXCLUDED_MANIFEST_SCAN_REPOS = new Set(['sdkwork-commerce']);

const MALL_DOMAIN_MIGRATED_PACKAGES = [
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-wallet',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-order',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-membership',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-coupon',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-payment',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-points',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-offer',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-subscription',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-membership-purchase',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-checkout',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-pricing',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-billing',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-invoice',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-address',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-shop',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-home',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-search',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-catalog',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-activity',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-reviews',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-messages',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-after-sales',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-cart',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-cms',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-merchant',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-admin-shops',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-admin-settlement',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-admin-risk',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-admin-reports',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-admin-orders',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-admin-marketing',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-admin-product',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-admin-membership',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-admin-permissions',
  'apps/sdkwork-mall-pc/packages/sdkwork-mall-pc-commerce',
];

function parseArgs(argv) {
  return {
    reportOnly: argv.includes('--report'),
  };
}

function listTopLevelRepos(root) {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name))
    .filter((repoPath) => {
      const name = path.basename(repoPath);
      return name.startsWith('sdkwork-') && existsSync(path.join(repoPath, 'package.json'));
    })
    .sort();
}

function walkPackageJsonFiles(rootDir, visitor) {
  if (!existsSync(rootDir)) {
    return;
  }

  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (
          entry.name === 'node_modules'
          || entry.name === '.git'
          || entry.name === 'target'
          || isVendorCommercePath(fullPath)
        ) {
          continue;
        }
        stack.push(fullPath);
        continue;
      }

      if (entry.name !== 'package.json') {
        continue;
      }

      visitor(fullPath);
    }
  }
}

function readDependencyNames(packageJsonPath) {
  let json;
  try {
    json = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  } catch {
    return [];
  }

  const names = new Set();
  for (const bucket of [json.dependencies, json.devDependencies, json.peerDependencies]) {
    if (!bucket || typeof bucket !== 'object') {
      continue;
    }
    for (const dep of Object.keys(bucket)) {
      names.add(dep);
    }
  }
  return [...names];
}

function scanRepoManifests(repoPath) {
  const repoName = path.basename(repoPath);
  if (EXCLUDED_MANIFEST_SCAN_REPOS.has(repoName)) {
    return { forbidden: [], transitional: [] };
  }

  const forbidden = [];
  const transitional = [];

  walkPackageJsonFiles(repoPath, (packageJsonPath) => {
    const deps = readDependencyNames(packageJsonPath);
    for (const dep of deps) {
      if (FORBIDDEN_CONSOLE_COMMERCE_PACKAGES.includes(dep)) {
        forbidden.push({
          repo: repoName,
          file: path.relative(workspaceRoot, packageJsonPath),
          packageName: dep,
        });
      }

      if (
        ALLOWED_TRANSITIONAL_COMMERCE.includes(dep)
        || (dep.startsWith('@sdkwork/commerce-') && !FORBIDDEN_CONSOLE_COMMERCE_PACKAGES.includes(dep))
      ) {
        transitional.push({
          repo: repoName,
          file: path.relative(workspaceRoot, packageJsonPath),
          packageName: dep,
        });
      }
    }
  });

  return { forbidden, transitional };
}

function walkCssFiles(rootDir, visitor) {
  if (!existsSync(rootDir)) {
    return;
  }

  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (
          entry.name === 'node_modules'
          || entry.name === '.git'
          || entry.name === 'target'
          || isVendorCommercePath(fullPath)
        ) {
          continue;
        }
        stack.push(fullPath);
        continue;
      }

      if (!fullPath.endsWith('.css')) {
        continue;
      }

      visitor(fullPath);
    }
  }
}

function scanBroadTailwindGlob(repoPath) {
  const repoName = path.basename(repoPath);
  if (EXCLUDED_REPOS.has(repoName)) {
    return [];
  }

  const findings = [];
  const cssRoots = [
    path.join(repoPath, 'apps'),
    path.join(repoPath, 'src'),
  ];

  for (const root of cssRoots) {
    walkCssFiles(root, (filePath) => {
      const source = readFileSync(filePath, 'utf8');
      if (source.includes('sdkwork-commerce/apps/sdkwork-commerce-pc/packages/*/src')) {
        findings.push({
          repo: repoName,
          file: path.relative(workspaceRoot, filePath),
          kind: 'broad-commerce-tailwind-glob',
        });
      }
    });
  }

  return findings;
}

function scanMallDomainMigratedPackageManifests() {
  const mallRoot = path.join(workspaceRoot, 'sdkwork-mall');
  const findings = [];

  for (const relativePackageDir of MALL_DOMAIN_MIGRATED_PACKAGES) {
    const packageJsonPath = path.join(mallRoot, relativePackageDir, 'package.json');
    if (!existsSync(packageJsonPath)) {
      continue;
    }

    const deps = readDependencyNames(packageJsonPath);
    if (deps.includes('@sdkwork/commerce-service')) {
      findings.push({
        repo: 'sdkwork-mall',
        file: path.relative(workspaceRoot, packageJsonPath),
        packageName: '@sdkwork/commerce-service',
      });
    }
  }

  return findings;
}

function summarizeTransitional(findings) {
  const byRepo = new Map();
  for (const finding of findings) {
    const current = byRepo.get(finding.repo) ?? new Set();
    current.add(finding.packageName);
    byRepo.set(finding.repo, current);
  }

  return [...byRepo.entries()]
    .map(([repo, packages]) => ({ repo, packages: [...packages].sort() }))
    .sort((left, right) => left.repo.localeCompare(right.repo));
}

const { reportOnly } = parseArgs(process.argv.slice(2));
const repos = listTopLevelRepos(workspaceRoot);
const forbiddenFindings = [];
const transitionalFindings = [];
const tailwindFindings = [];
const mallMigratedManifestFindings = scanMallDomainMigratedPackageManifests();

for (const repoPath of repos) {
  const manifestScan = scanRepoManifests(repoPath);
  forbiddenFindings.push(...manifestScan.forbidden);
  transitionalFindings.push(...manifestScan.transitional);
  tailwindFindings.push(...scanBroadTailwindGlob(repoPath));
}

console.log('SDKWork commerce debt scan');
console.log(`Workspace: ${workspaceRoot}`);
console.log(`Repositories scanned: ${repos.length}`);
console.log('');

const transitionalSummary = summarizeTransitional(transitionalFindings);
if (transitionalSummary.length > 0) {
  console.log('Transitional commerce dependencies still present:');
  for (const summary of transitionalSummary) {
    console.log(`- ${summary.repo}: ${summary.packages.join(', ')}`);
  }
  console.log('');
}

if (tailwindFindings.length > 0) {
  console.log('Broad commerce tailwind globs still present:');
  for (const finding of tailwindFindings) {
    console.log(`- [${finding.repo}] ${finding.file}`);
  }
  console.log('');
}

const clawRouterForbidden = forbiddenFindings.filter((finding) => finding.repo === 'sdkwork-clawrouter');
const otherForbidden = forbiddenFindings.filter((finding) => finding.repo !== 'sdkwork-clawrouter');

if (clawRouterForbidden.length === 0) {
  console.log('sdkwork-clawrouter: no forbidden console-era commerce PC package manifests found.');
} else {
  console.error('sdkwork-clawrouter forbidden commerce manifests:');
  for (const finding of clawRouterForbidden) {
    console.error(`- ${finding.file} -> ${finding.packageName}`);
  }
}

if (otherForbidden.length > 0) {
  console.log('');
  console.log('Other repositories with forbidden console-era commerce manifests:');
  for (const finding of otherForbidden) {
    console.log(`- [${finding.repo}] ${finding.file} -> ${finding.packageName}`);
  }
}

if (mallMigratedManifestFindings.length === 0) {
  console.log('sdkwork-mall: domain-migrated packages no longer declare @sdkwork/commerce-service peers.');
} else {
  console.error('sdkwork-mall domain-migrated packages still declare @sdkwork/commerce-service:');
  for (const finding of mallMigratedManifestFindings) {
    console.error(`- ${finding.file}`);
  }
}

if (reportOnly) {
  process.exit(0);
}

const shouldFail =
  clawRouterForbidden.length > 0
  || mallMigratedManifestFindings.length > 0
  || tailwindFindings.some((finding) => finding.repo === 'sdkwork-clawrouter');
process.exit(shouldFail ? 1 : 0);
