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

test('cloudrouter console surface no longer depends on retired commerce PC packages', () => {
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

test('cloudrouter admin mounts standalone business control centers without legacy commerce facades', () => {
  const packageJson = JSON.parse(readPortalFile('./package.json')) as { dependencies: Record<string, string> };
  const appSource = readPortalFile('./src/App.tsx');
  const registrySource = readPortalFile('./packages/sdkwork-cloudrouter-pc-admin-shell/src/adminModuleRegistry.ts');
  const permissionSource = readPortalFile('./packages/sdkwork-cloudrouter-pc-admin-shell/src/admin-route-permission-hints.ts');
  const sdkInventorySource = readPortalFile('./packages/sdkwork-cloudrouter-pc-admin-core/src/composition/sdk-inventory.ts');

  const retiredAdminPackages = [
    '@sdkwork/cloudrouter-pc-admin-inventory',
    '@sdkwork/cloudrouter-pc-admin-file-platform',
    '@sdkwork/file-platform-pc-react',
    '@sdkwork/cloudrouter-pc-admin-catalog',
    '@sdkwork/cloudrouter-pc-admin-orders',
    '@sdkwork/cloudrouter-pc-admin-finance',
    '@sdkwork/cloudrouter-pc-admin-wallet',
    '@sdkwork/cloudrouter-pc-admin-messaging',
    '@sdkwork/cloudrouter-pc-admin-agents',
    '@sdkwork/cloudrouter-pc-admin-prompts',
    '@sdkwork/cloudrouter-pc-admin-mcp',
    '@sdkwork/cloudrouter-pc-admin-announcement',
    '@sdkwork/cloudrouter-pc-admin-user',
    '@sdkwork/cloudrouter-pc-admin-organization',
    '@sdkwork/cloudrouter-pc-admin-oauth',
    '@sdkwork/cloudrouter-pc-admin-service-provider',
  ];

  for (const pkg of retiredAdminPackages) {
    assert.equal(packageJson.dependencies[pkg], undefined, `package.json must not depend on ${pkg}`);
  }

  for (const pkg of [
    '@sdkwork/cloudrouter-pc-admin-marketing',
    '@sdkwork/cloudrouter-pc-admin-memberships',
    '@sdkwork/cloudrouter-pc-admin-community',
    '@sdkwork/cloudrouter-pc-admin-payments',
    '@sdkwork/cloudrouter-pc-admin-storage',
  ]) {
    assert.equal(packageJson.dependencies[pkg], 'workspace:*', `package.json must compose ${pkg}`);
  }

  assert.doesNotMatch(appSource, /InventoryAdmin|FilePlatformAdmin|DriveAdmin|CatalogAdmin|OrdersAdmin|FinanceAdmin|WalletAdmin|MessagingAdmin|AgentsAdmin|SkillAdmin|PromptsAdmin|McpAdmin|AnnouncementAdmin|UserAdmin|OrganizationAdmin|OauthAdmin|ServiceProviderAdmin/);
  assert.match(registrySource, /id:\s*'membershipCenter'/);
  assert.match(registrySource, /id:\s*'communityCenter'/);
  assert.match(registrySource, /id:\s*'marketingCenter'/);
  assert.match(registrySource, /id:\s*'paymentCenter'/);
  assert.match(registrySource, /id:\s*'storageCenter'/);
  assert.match(registrySource, /PRODUCT_CENTER_ADMIN_MODULE_DEF/);
  assert.match(registrySource, /from '@sdkwork\/cloudrouter-pc-admin-product\/contribution'/);
  assert.doesNotMatch(registrySource, /driveCenter|transactionCenter|financeCenter|serviceProviderCenter|messagingCenter/);
  assert.doesNotMatch(permissionSource, /\/admin\/inventory|\/admin\/drive|\/admin\/catalog|\/admin\/orders|\/admin\/finance|\/admin\/wallet|\/admin\/oauth|\/admin\/service-providers|commerce\./);
  assert.match(permissionSource, /PRODUCT_CENTER_ADMIN_PERMISSION_HINTS/);
  assert.match(registrySource, /id:\s*'home'/);
  assert.match(registrySource, /id:\s*'operations'/);
  assert.doesNotMatch(sdkInventorySource, /commerce-backend-sdk|commerce-app-sdk/);
  assert.match(sdkInventorySource, /cloudrouter-backend-sdk/);

  for (const servicePath of [
    './packages/sdkwork-cloudrouter-pc-admin-marketing/src/marketingService.ts',
    './packages/sdkwork-cloudrouter-pc-admin-memberships/src/membershipsService.ts',
    './packages/sdkwork-cloudrouter-pc-admin-payments/src/paymentsService.ts',
    './packages/sdkwork-cloudrouter-pc-admin-storage/src/storageService.ts',
  ]) {
    const serviceSource = readPortalFile(servicePath);
    assert.match(serviceSource, /getCloudRouterBackendSdkClient\(\)/, `${servicePath} must use the backend SDK boundary`);
    assert.doesNotMatch(serviceSource, /\bfetch\s*\(|axios|XMLHttpRequest/, `${servicePath} must not bypass the generated SDK`);
  }
  const communityServiceSource = readPortalFile('./packages/sdkwork-cloudrouter-pc-admin-community/src/communityService.ts');
  assert.match(communityServiceSource, /getSdkworkCommunityBackendSdkClient\(\)/, 'communityService must use the community backend SDK boundary');
  assert.doesNotMatch(communityServiceSource, /\bfetch\s*\(|axios|XMLHttpRequest/, 'communityService must not bypass the generated SDK');
});

test('cloudrouter admin owns storage governance without mounting inventory or Drive control planes', () => {
  const packageJson = JSON.parse(readPortalFile('./package.json')) as { dependencies: Record<string, string> };
  const appSource = readPortalFile('./src/App.tsx');
  const registrySource = readPortalFile('./packages/sdkwork-cloudrouter-pc-admin-shell/src/adminModuleRegistry.ts');
  const permissionSource = readPortalFile('./packages/sdkwork-cloudrouter-pc-admin-shell/src/admin-route-permission-hints.ts');

  assert.equal(packageJson.dependencies['@sdkwork/cloudrouter-pc-admin-inventory'], undefined);
  assert.equal(packageJson.dependencies['@sdkwork/cloudrouter-pc-admin-file-platform'], undefined);
  assert.equal(packageJson.dependencies['@sdkwork/file-platform-pc-react'], undefined);
  assert.equal(packageJson.dependencies['@sdkwork/cloudrouter-pc-admin-storage'], 'workspace:*');
  assert.doesNotMatch(appSource, /InventoryAdmin|FilePlatformAdmin|DriveAdmin/);
  assert.match(registrySource, /storageCenter/);
  assert.match(registrySource, /\/admin\/storage\/providers/);
  assert.doesNotMatch(registrySource, /driveCenter|\/admin\/inventory/);
  assert.doesNotMatch(permissionSource, /\/admin\/inventory|\/admin\/drive/);
});

test('cloudrouter portal no longer declares legacy commerce facade packages', () => {
  const packageJson = JSON.parse(readPortalFile('./package.json')) as {
    dependencies: Record<string, string>;
    workspaces: string[];
  };
  const commonsPackageJson = JSON.parse(
    readPortalFile('./packages/sdkwork-cloudroutes-pc-commons/package.json'),
  ) as { dependencies: Record<string, string> };
  const sdkClientsSource = readPortalFile('./packages/sdkwork-cloudroutes-pc-commons/src/sdk-clients.ts');

  for (const pkg of FORBIDDEN_PORTAL_COMMERCE_PACKAGES) {
    assert.equal(packageJson.dependencies[pkg], undefined, `package.json must not depend on ${pkg}`);
    assert.equal(commonsPackageJson.dependencies[pkg], undefined, `commons package.json must not depend on ${pkg}`);
  }

  assert.doesNotMatch(sdkClientsSource, /@sdkwork\/commerce-service/);
  assert.doesNotMatch(sdkClientsSource, /getSdkworkCommerceService/);
  assert.doesNotMatch(sdkClientsSource, /DomainTransport|createAppDomainCanonicalFacade/);
  assert.doesNotMatch(sdkClientsSource, /BackendDomainDependencyOverlay|facade\.catalog\.spus|attachManagementAlias/);
  assert.doesNotMatch(sdkClientsSource, /getCloudRouterBackendSdkClient\(\)\.commerce/);
  for (const capability of ['Account', 'Catalog', 'Membership', 'Order', 'Payment', 'Promotion']) {
    assert.match(sdkClientsSource, new RegExp(`getSdkwork${capability}AppSdkClient`));
  }

  for (const workspaceEntry of packageJson.workspaces) {
    assert.doesNotMatch(workspaceEntry, /packages\/common\/commerce/);
    assert.doesNotMatch(workspaceEntry, /sdkwork-commerce-app-sdk/);
    assert.doesNotMatch(workspaceEntry, /sdkwork-commerce-backend-sdk/);
  }

  assert.equal(packageJson.dependencies['@sdkwork/account-pc-wallet'], 'workspace:*');
  assert.equal(packageJson.dependencies['@sdkwork/promotion-pc-coupon'], 'workspace:*');
});

test('product center composes the owning modules instead of legacy commerce facades', () => {
  const packageJson = JSON.parse(readPortalFile('./package.json')) as { dependencies: Record<string, string> };
  const hostMountSource = readPortalFile('./src/admin/cloudRouterAdminHostMount.tsx');
  const registrySource = readPortalFile('./packages/sdkwork-cloudrouter-pc-admin-shell/src/adminModuleRegistry.ts');
  const serviceSource = readPortalFile(
    './packages/sdkwork-cloudrouter-pc-admin-product/src/productCenterService.ts',
  );
  const contributionSource = readPortalFile(
    './packages/sdkwork-cloudrouter-pc-admin-product/src/contribution.ts',
  );

  assert.equal(
    packageJson.dependencies['@sdkwork/cloudrouter-pc-admin-product'],
    'workspace:*',
    'the product center must be composed as a first-party admin package',
  );
  assert.equal(
    packageJson.dependencies['@sdkwork/shop-backend-sdk'],
    'workspace:*',
    'catalog management is owned by the storefront backend SDK',
  );
  assert.equal(
    packageJson.dependencies['@sdkwork/inventory-backend-sdk'],
    'workspace:*',
    'stock management is owned by the inventory backend SDK',
  );
  assert.equal(
    packageJson.dependencies['@sdkwork/order-backend-sdk'],
    'workspace:*',
    'shipment management is owned by the order backend SDK',
  );

  assert.match(registrySource, /PRODUCT_CENTER_ADMIN_MODULE_DEF/);
  assert.match(registrySource, /PRODUCT_CENTER_ADMIN_MENU/);
  assert.match(hostMountSource, /PRODUCT_CENTER_ADMIN_ROUTE_RECORDS/);
  assert.match(hostMountSource, /PRODUCT_CENTER_SCREEN_OWNER/);
  assert.match(contributionSource, /id:\s*'productCenter'/);
  assert.match(contributionSource, /'admin\.header\.productCenter'/);

  // The service is the only data entry point and it must go through the
  // generated dependency clients, never through raw HTTP.
  assert.match(serviceSource, /getSdkworkShopBackendSdkClient/);
  assert.match(serviceSource, /getSdkworkInventoryBackendSdkClient/);
  assert.match(serviceSource, /getSdkworkOrderBackendSdkClient/);
  assert.doesNotMatch(serviceSource, /\bfetch\s*\(|axios|XMLHttpRequest/);
  assert.doesNotMatch(serviceSource, /commerce-backend-sdk|commerce-app-sdk/);
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

test('cloudrouter SDKs compose owner transports only through the ./domains facade', () => {
  const appDomains = readRepoFile(
    'sdks/cloudrouter-app-sdk/cloudrouter-app-sdk-typescript/src/domains/index.ts',
  );
  assert.match(appDomains, /generated\/commerce-server-openapi/);
  const backendDomains = readRepoFile(
    'sdks/cloudrouter-backend-sdk/cloudrouter-backend-sdk-typescript/src/domains/index.ts',
  );
  assert.match(backendDomains, /generated\/commerce-server-openapi/);

  const externalClientsSource = readPortalFile('./packages/sdkwork-cloudrouter-pc-core/src/sdk/external-dependency-clients.ts');
  for (const ownerPackage of ['account', 'catalog', 'membership', 'order', 'payment', 'promotion']) {
    assert.match(externalClientsSource, new RegExp(`@sdkwork/${ownerPackage}-app-sdk`));
  }
  assert.doesNotMatch(externalClientsSource, /@sdkwork\/cloudrouter-(?:app|backend)-sdk\/domains/);
  assert.doesNotMatch(externalClientsSource, /domain-transport-generated-typescript/);
  assert.doesNotMatch(externalClientsSource, /commerce-capability/);
  assert.doesNotMatch(externalClientsSource, /sdks\/sdkwork-commerce-/);
});

test('console bootstrap wires T1 domain service providers from cloudroutes commons', () => {
  const mainSource = readPortalFile('./src/main.tsx');
  const providerSource = readPortalFile('./packages/sdkwork-cloudroutes-pc-commons/src/domain-service-providers.ts');

  assert.match(mainSource, /configureCloudRouterDomainServiceProviders\(\)/);
  assert.doesNotMatch(mainSource, /getCloudRouterAppSdkClient/);
  assert.match(providerSource, /buildAccountCommercePort/);
  assert.match(providerSource, /accountClient\.wallet/);
  assert.match(
    providerSource,
    /createSdkworkOrderAppService\(\{\s*appClient:\s*orderClient,\s*\}\)/,
  );
  assert.match(providerSource, /recharges:\s*orderClient\.recharges/);
  assert.doesNotMatch(providerSource, /function buildOrderCommercePort/);
  assert.match(providerSource, /client\.commerce\.payments/);
  assert.match(providerSource, /client\.promotions/);
  assert.doesNotMatch(providerSource, /getCloudRouterAppSdkClient\(\)\.commerce/);
});

test('legacy commerce common packages directory is removed', () => {
  const legacyCommerceRoot = new URL('../../packages/common/commerce', import.meta.url);
  assert.equal(existsSync(legacyCommerceRoot), false);
});

test('frontend field contract exposes standalone business centers and excludes retired external routes', () => {
  const contractSource = readPortalFile('../../docs/schema-registry/frontend-field-contracts.yaml');

  for (const retiredPrefix of [
    '/admin/channel',
    '/admin/catalog',
    '/admin/orders',
    '/admin/wallet',
    '/admin/inventory',
    '/admin/messaging',
    '/admin/mcp',
    '/admin/service_providers',
    '/admin/reports',
    '/admin/iam',
    '/admin/system/after_sales',
    '/admin/system/marketing',
    '/admin/system/shops',
  ]) {
    assert.doesNotMatch(
      contractSource,
      new RegExp(`^\s*- route: ${retiredPrefix.replaceAll('/', '\\/')}`, 'm'),
      `frontend_operations must not declare retired admin surface ${retiredPrefix}`,
    );
  }

  assert.match(contractSource, /^\s*- route: \/admin\/cache$/m);
  assert.match(contractSource, /^\s*- route: \/admin\/memberships\//m);
  assert.match(contractSource, /^\s*- route: \/admin\/marketing\//m);
  assert.match(contractSource, /^\s*- route: \/admin\/payments\/channels$/m);
  assert.match(contractSource, /^\s*- route: \/admin\/payments\//m);
  assert.match(contractSource, /^\s*- route: \/admin\/storage\//m);
});

test('backend SDK exposes system settings resources for admin control-plane pages', () => {
  const systemApiSource = readRepoFile(
    'sdks/cloudrouter-backend-sdk/cloudrouter-backend-sdk-typescript/generated/server-openapi/src/api/system.ts',
  );
  const siteServiceSource = readPortalFile('./packages/sdkwork-cloudrouter-pc-admin-site/src/SiteSettingsService.ts');
  const authServiceSource = readPortalFile('./packages/sdkwork-cloudrouter-pc-admin-site/src/AuthSettingsService.ts');
  const runtimeRegionServiceSource = readPortalFile(
    './packages/sdkwork-cloudrouter-pc-admin-runtime-region/src/runtimeRegionService.ts',
  );

  assert.match(systemApiSource, /class SystemAuthSettingsApi/);
  assert.match(systemApiSource, /class SystemSiteSettingsApi/);
  assert.match(systemApiSource, /class SystemRuntimeRegionSettingsApi/);
  assert.match(siteServiceSource, /getCloudRouterBackendSdkClient\(\)\.system\.site\.settings\.update\(/);
  assert.match(authServiceSource, /getCloudRouterBackendSdkClient\(\)\.system\.auth\.settings\.update\(input/);
  assert.match(runtimeRegionServiceSource, /getCloudRouterBackendSdkClient\(\)\.system\.runtimeRegion\.settings\.update\(input\)/);
  assert.doesNotMatch(siteServiceSource, /\bfetch\s*\(/);
  assert.doesNotMatch(authServiceSource, /\bfetch\s*\(/);
  assert.doesNotMatch(runtimeRegionServiceSource, /\bfetch\s*\(/);
});
