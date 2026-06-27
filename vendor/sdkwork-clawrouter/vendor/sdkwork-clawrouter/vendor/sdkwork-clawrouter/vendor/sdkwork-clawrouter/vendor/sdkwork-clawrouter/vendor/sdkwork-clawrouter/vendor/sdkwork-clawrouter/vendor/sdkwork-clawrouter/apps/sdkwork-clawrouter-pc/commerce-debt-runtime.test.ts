import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

function readPortalFile(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

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

test('clawrouter console surface no longer depends on retired commerce PC packages', () => {
  const packageJson = JSON.parse(readPortalFile('./package.json')) as { dependencies: Record<string, string> };
  const appSource = readPortalFile('./src/App.tsx');
  const mountSource = readPortalFile('./src/console-business/consoleBusinessHostMount.tsx');
  const tailwindSource = readPortalFile('./src/portal-external-tailwind-sources.ts');
  const indexCssSource = readPortalFile('./src/index.css');

  for (const pkg of FORBIDDEN_CONSOLE_COMMERCE_PACKAGES) {
    assert.equal(packageJson.dependencies[pkg], undefined, `package.json must not depend on ${pkg}`);
    assert.doesNotMatch(appSource, new RegExp(pkg.replace('/', '\\/')));
    assert.doesNotMatch(mountSource, new RegExp(pkg.replace('/', '\\/')));
  }

  assert.doesNotMatch(tailwindSource, /sdkwork-commerce\/apps\/sdkwork-commerce-pc\/packages\/\*\/src/);
  assert.doesNotMatch(indexCssSource, /sdkwork-commerce\/apps\/sdkwork-commerce-pc\/packages\/\*\/src/);
  assert.match(tailwindSource, /sdkwork-account-pc-wallet\/src/);
  assert.match(tailwindSource, /sdkwork-promotion-pc-coupon\/src/);
});

test('clawrouter admin memberships no longer imports commerce-service facade', () => {
  const membershipsServiceSource = readPortalFile(
    './packages/sdkwork-clawrouter-pc-admin-memberships/src/membershipsService.ts',
  );
  const membershipsPackageJson = JSON.parse(
    readPortalFile('./packages/sdkwork-clawrouter-pc-admin-memberships/package.json'),
  ) as { dependencies: Record<string, string> };

  assert.doesNotMatch(membershipsServiceSource, /getSdkworkCommerceService/);
  assert.match(membershipsServiceSource, /getClawRouterBackendSdkClient\(\)\.commerce\.memberships\.plans\.list/);
  assert.equal(membershipsPackageJson.dependencies['@sdkwork/commerce-service'], undefined);
});

test('clawrouter transitional commerce dependencies are limited to admin catalog and composed SDKs', () => {
  const packageJson = JSON.parse(readPortalFile('./package.json')) as { dependencies: Record<string, string> };

  assert.equal(packageJson.dependencies['@sdkwork/commerce-pc-admin-product'], 'workspace:*');
  assert.equal(packageJson.dependencies['@sdkwork/commerce-service'], 'workspace:*');
  assert.equal(packageJson.dependencies['sdkwork-commerce-backend-sdk-generated-typescript'], 'workspace:*');
  assert.equal(packageJson.dependencies['@sdkwork/account-pc-wallet'], 'workspace:*');
  assert.equal(packageJson.dependencies['@sdkwork/promotion-pc-coupon'], 'workspace:*');
});

test('workspace commerce debt scan script exists', () => {
  const scriptPath = new URL('../../scripts/check-commerce-debt.mjs', import.meta.url);
  assert.equal(existsSync(scriptPath), true);
});
