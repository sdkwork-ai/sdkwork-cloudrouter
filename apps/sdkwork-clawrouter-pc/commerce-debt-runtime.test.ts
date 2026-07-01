import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

function readPortalFile(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

function readRepoFile(relativePath: string): string {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
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

const FORBIDDEN_PORTAL_COMMERCE_PACKAGES = [
  '@sdkwork/commerce-service',
  '@sdkwork/commerce-sdk-ports',
  '@sdkwork/commerce-contracts',
  'sdkwork-commerce-app-sdk-generated-typescript',
  'sdkwork-commerce-backend-sdk-generated-typescript',
];

const LEGACY_COMMERCE_SDK_DIRS = [
  '../../sdks/sdkwork-commerce-app-sdk',
  '../../sdks/sdkwork-commerce-backend-sdk',
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

test('clawrouter admin is relay-focused and no longer mounts commerce or platform control-plane packages', () => {
  const packageJson = JSON.parse(readPortalFile('./package.json')) as { dependencies: Record<string, string> };
  const appSource = readPortalFile('./src/App.tsx');
  const registrySource = readPortalFile('./packages/sdkwork-clawrouter-pc-admin-shell/src/adminModuleRegistry.ts');
  const permissionSource = readPortalFile('./packages/sdkwork-clawrouter-pc-admin-shell/src/admin-route-permission-hints.ts');
  const sdkInventorySource = readPortalFile('./packages/sdkwork-clawrouter-pc-admin-core/src/composition/sdk-inventory.ts');

  const retiredAdminPackages = [
    '@sdkwork/clawrouter-pc-admin-inventory',
    '@sdkwork/clawrouter-pc-admin-file-platform',
    '@sdkwork/file-platform-pc-react',
    '@sdkwork/clawrouter-pc-admin-catalog',
    '@sdkwork/clawrouter-pc-admin-orders',
    '@sdkwork/clawrouter-pc-admin-payments',
    '@sdkwork/clawrouter-pc-admin-memberships',
    '@sdkwork/clawrouter-pc-admin-marketing',
    '@sdkwork/clawrouter-pc-admin-finance',
    '@sdkwork/clawrouter-pc-admin-wallet',
    '@sdkwork/clawrouter-pc-admin-messaging',
    '@sdkwork/clawrouter-pc-admin-agents',
    '@sdkwork/clawrouter-pc-admin-skill',
    '@sdkwork/clawrouter-pc-admin-prompts',
    '@sdkwork/clawrouter-pc-admin-mcp',
    '@sdkwork/clawrouter-pc-admin-announcement',
    '@sdkwork/clawrouter-pc-admin-user',
    '@sdkwork/clawrouter-pc-admin-organization',
    '@sdkwork/clawrouter-pc-admin-oauth',
    '@sdkwork/clawrouter-pc-admin-service-provider',
  ];

  for (const pkg of retiredAdminPackages) {
    assert.equal(packageJson.dependencies[pkg], undefined, `package.json must not depend on ${pkg}`);
  }

  assert.doesNotMatch(appSource, /InventoryAdmin|FilePlatformAdmin|DriveAdmin|CatalogAdmin|OrdersAdmin|PaymentsAdmin|MembershipsAdmin|MarketingAdmin|FinanceAdmin|WalletAdmin|MessagingAdmin|AgentsAdmin|SkillAdmin|PromptsAdmin|McpAdmin|AnnouncementAdmin|UserAdmin|OrganizationAdmin|OauthAdmin|ServiceProviderAdmin/);
  assert.doesNotMatch(registrySource, /storageCenter|driveCenter|productCenter|transactionCenter|memberCenter|marketingCenter|financeCenter|serviceProviderCenter|messagingCenter|appCenter/);
  assert.doesNotMatch(permissionSource, /\/admin\/inventory|\/admin\/storage|\/admin\/drive|\/admin\/catalog|\/admin\/orders|\/admin\/payments|\/admin\/memberships|\/admin\/marketing|\/admin\/finance|\/admin\/wallet|\/admin\/oauth|\/admin\/service-providers|commerce\./);
  assert.match(registrySource, /id:\s*'home'/);
  assert.match(registrySource, /id:\s*'operations'/);
  assert.doesNotMatch(sdkInventorySource, /commerce-backend-sdk|commerce-app-sdk/);
  assert.match(sdkInventorySource, /clawrouter-backend-sdk/);
});

test('clawrouter admin no longer mounts inventory or file-platform control-plane packages', () => {
  const packageJson = JSON.parse(readPortalFile('./package.json')) as { dependencies: Record<string, string> };
  const appSource = readPortalFile('./src/App.tsx');
  const registrySource = readPortalFile('./packages/sdkwork-clawrouter-pc-admin-shell/src/adminModuleRegistry.ts');
  const permissionSource = readPortalFile('./packages/sdkwork-clawrouter-pc-admin-shell/src/admin-route-permission-hints.ts');

  assert.equal(packageJson.dependencies['@sdkwork/clawrouter-pc-admin-inventory'], undefined);
  assert.equal(packageJson.dependencies['@sdkwork/clawrouter-pc-admin-file-platform'], undefined);
  assert.equal(packageJson.dependencies['@sdkwork/file-platform-pc-react'], undefined);
  assert.doesNotMatch(appSource, /InventoryAdmin|FilePlatformAdmin|DriveAdmin/);
  assert.doesNotMatch(registrySource, /storageCenter|driveCenter|\/admin\/inventory/);
  assert.doesNotMatch(permissionSource, /\/admin\/inventory|\/admin\/storage|\/admin\/drive/);
});

test('clawrouter portal no longer declares legacy commerce facade packages', () => {
  const packageJson = JSON.parse(readPortalFile('./package.json')) as {
    dependencies: Record<string, string>;
    workspaces: string[];
  };
  const commonsPackageJson = JSON.parse(
    readPortalFile('./packages/sdkwork-clawroutes-pc-commons/package.json'),
  ) as { dependencies: Record<string, string> };
  const sdkClientsSource = readPortalFile('./packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts');

  for (const pkg of FORBIDDEN_PORTAL_COMMERCE_PACKAGES) {
    assert.equal(packageJson.dependencies[pkg], undefined, `package.json must not depend on ${pkg}`);
    assert.equal(commonsPackageJson.dependencies[pkg], undefined, `commons package.json must not depend on ${pkg}`);
  }

  assert.doesNotMatch(sdkClientsSource, /@sdkwork\/commerce-service/);
  assert.doesNotMatch(sdkClientsSource, /getSdkworkCommerceService/);
  assert.match(sdkClientsSource, /getClawRouterAppDomainTransportSdkClient/);
  assert.match(sdkClientsSource, /getClawRouterBackendDomainTransportSdkClient/);
  assert.doesNotMatch(sdkClientsSource, /getClawRouterBackendSdkClient\(\)\.commerce/);

  for (const workspaceEntry of packageJson.workspaces) {
    assert.doesNotMatch(workspaceEntry, /packages\/common\/commerce/);
    assert.doesNotMatch(workspaceEntry, /sdkwork-commerce-app-sdk/);
    assert.doesNotMatch(workspaceEntry, /sdkwork-commerce-backend-sdk/);
  }

  assert.equal(packageJson.dependencies['@sdkwork/account-pc-wallet'], 'workspace:*');
  assert.equal(packageJson.dependencies['@sdkwork/promotion-pc-coupon'], 'workspace:*');
});

test('workspace commerce debt scan script exists', () => {
  const scriptPath = new URL('../../scripts/check-commerce-debt.mjs', import.meta.url);
  assert.equal(existsSync(scriptPath), true);
});

test('repository workspace no longer declares legacy commerce package paths', () => {
  const workspaceSource = readRepoFile('pnpm-workspace.yaml');
  assert.doesNotMatch(workspaceSource, /^\s*- 'packages\/pc-react\//m);
  assert.doesNotMatch(workspaceSource, /packages\/common\/commerce/);
  assert.doesNotMatch(workspaceSource, /sdks\/sdkwork-commerce-app-sdk/);
  assert.doesNotMatch(workspaceSource, /sdks\/sdkwork-commerce-backend-sdk/);
});

test('legacy sdkwork-commerce SDK family directories are removed', () => {
  for (const relativePath of LEGACY_COMMERCE_SDK_DIRS) {
    assert.equal(existsSync(new URL(relativePath, import.meta.url)), false, `${relativePath} must be removed`);
  }
});

test('domain transport lives under clawrouter SDK families', () => {
  assert.equal(
    existsSync(new URL('../../sdks/clawrouter-app-sdk/clawrouter-app-domain-transport-typescript/generated/server-openapi/src/index.ts', import.meta.url)),
    true,
  );
  assert.equal(
    existsSync(new URL('../../sdks/clawrouter-backend-sdk/clawrouter-backend-domain-transport-typescript/generated/server-openapi/src/index.ts', import.meta.url)),
    true,
  );

  const externalClientsSource = readPortalFile('./packages/sdkwork-clawrouter-pc-core/src/sdk/external-dependency-clients.ts');
  assert.match(externalClientsSource, /clawrouter-app-domain-transport-generated-typescript/);
  assert.match(externalClientsSource, /clawrouter-backend-domain-transport-generated-typescript/);
  assert.doesNotMatch(externalClientsSource, /commerce-capability/);
  assert.doesNotMatch(externalClientsSource, /sdks\/sdkwork-commerce-/);
});

test('console bootstrap wires T1 domain service providers from clawroutes commons', () => {
  const mainSource = readPortalFile('./src/main.tsx');
  const providerSource = readPortalFile('./packages/sdkwork-clawroutes-pc-commons/src/domain-service-providers.ts');

  assert.match(mainSource, /configureClawRouterDomainServiceProviders/);
  assert.match(mainSource, /getClawRouterAppSdkClient/);
  assert.match(providerSource, /buildAccountCommercePort/);
  assert.match(providerSource, /client\.wallet/);
  assert.doesNotMatch(providerSource, /getClawRouterAppSdkClient\(\)\.commerce/);
});

test('legacy commerce common packages directory is removed', () => {
  const legacyCommerceRoot = new URL('../../packages/common/commerce', import.meta.url);
  assert.equal(existsSync(legacyCommerceRoot), false);
});

test('frontend field contract excludes retired relay-external admin operation routes', () => {
  const contractSource = readPortalFile('../../docs/schema-registry/frontend-field-contracts.yaml');

  for (const retiredPrefix of [
    '/admin/catalog',
    '/admin/orders',
    '/admin/payments',
    '/admin/memberships',
    '/admin/promotions',
    '/admin/wallet',
    '/admin/inventory',
    '/admin/messaging',
    '/admin/mcp',
    '/admin/service_providers',
    '/admin/storage',
    '/admin/reports',
    '/admin/iam',
  ]) {
    assert.doesNotMatch(
      contractSource,
      new RegExp(`^- route: ${retiredPrefix.replaceAll('/', '\\/')}`, 'm'),
      `frontend_operations must not declare retired admin surface ${retiredPrefix}`,
    );
  }

  assert.match(contractSource, /^- route: \/admin\/ai\//m);
  assert.match(contractSource, /^- route: \/admin\/system\//m);
});

test('backend SDK exposes typed system settings contracts for admin control-plane pages', () => {
  const systemApiSource = readRepoFile(
    'sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/generated/server-openapi/src/api/system.ts',
  );
  const typesIndexSource = readRepoFile(
    'sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/generated/server-openapi/src/types/index.ts',
  );
  const siteServiceSource = readPortalFile('./packages/sdkwork-clawrouter-pc-admin-site/src/SiteSettingsService.ts');
  const authServiceSource = readPortalFile('./packages/sdkwork-clawrouter-pc-admin-site/src/AuthSettingsService.ts');
  const runtimeRegionServiceSource = readPortalFile(
    './packages/sdkwork-clawrouter-pc-admin-runtime-region/src/runtimeRegionService.ts',
  );

  assert.match(typesIndexSource, /AdminAuthSettingsUpdateRequest/);
  assert.match(typesIndexSource, /AdminSiteSettingsUpdateRequest/);
  assert.match(typesIndexSource, /AdminRuntimeRegionSettingsUpdateRequest/);
  assert.match(systemApiSource, /async update\(body: AdminAuthSettingsUpdateRequest\)/);
  assert.match(systemApiSource, /async update\(body: AdminSiteSettingsUpdateRequest\)/);
  assert.match(systemApiSource, /async update\(body: AdminRuntimeRegionSettingsUpdateRequest\)/);
  assert.match(siteServiceSource, /getClawRouterBackendSdkClient\(\)\.system\.site\.settings\.update\(/);
  assert.match(authServiceSource, /getClawRouterBackendSdkClient\(\)\.system\.auth\.settings\.update\(input/);
  assert.match(runtimeRegionServiceSource, /getClawRouterBackendSdkClient\(\)\.system\.runtimeRegion\.settings\.update\(input\)/);
  assert.doesNotMatch(siteServiceSource, /\bfetch\s*\(/);
  assert.doesNotMatch(authServiceSource, /\bfetch\s*\(/);
  assert.doesNotMatch(runtimeRegionServiceSource, /\bfetch\s*\(/);
});
