import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const portalRoot = new URL('./', import.meta.url);
const repoRoot = new URL('../../', import.meta.url);

function source(path) {
  return readFileSync(new URL(path, portalRoot), 'utf8');
}

function repoSource(path) {
  return readFileSync(new URL(path, repoRoot), 'utf8');
}

function json(path) {
  return JSON.parse(source(path));
}

test('portal workspace declares appbase app and backend composed SDK packages', () => {
  const packageJson = json('package.json');
  const commonsPackageJson = json('packages/sdkwork-clawroutes-pc-commons/package.json');
  const workspaceSource = repoSource('pnpm-workspace.yaml');
  const tsconfigSource = source('tsconfig.json');
  const typecheckSource = source('tsconfig.typecheck.json');
  const viteConfigSource = source('vite.config.ts');

  assert.equal(packageJson.dependencies['@sdkwork/iam-app-sdk'], 'workspace:*');
  assert.equal(packageJson.dependencies['@sdkwork/iam-backend-sdk'], 'workspace:*');
  assert.equal(commonsPackageJson.dependencies['@sdkwork/iam-app-sdk'], 'workspace:*');
  assert.equal(commonsPackageJson.dependencies['@sdkwork/iam-backend-sdk'], 'workspace:*');

  for (const [appPattern, rootPattern] of [
    [
      '../../../sdkwork-iam/sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript',
      '../sdkwork-iam/sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-typescript',
    ],
    [
      '../../../sdkwork-iam/sdks/sdkwork-iam-backend-sdk/sdkwork-iam-backend-sdk-typescript',
      '../sdkwork-iam/sdks/sdkwork-iam-backend-sdk/sdkwork-iam-backend-sdk-typescript',
    ],
  ]) {
    assert.ok(packageJson.workspaces.includes(appPattern), `package workspaces must include ${appPattern}`);
    assert.ok(workspaceSource.includes(rootPattern), `pnpm workspace must include ${rootPattern}`);
  }

  for (const forbiddenPattern of [
    '../../../sdkwork-iam/sdks/sdkwork-iam-app-sdk/*-typescript/generated/server-openapi',
    '../../../sdkwork-iam/sdks/sdkwork-iam-backend-sdk/*-typescript/generated/server-openapi',
    '../sdkwork-iam/sdks/sdkwork-iam-app-sdk/*-typescript/generated/server-openapi',
    '../sdkwork-iam/sdks/sdkwork-iam-backend-sdk/*-typescript/generated/server-openapi',
  ]) {
    assert.ok(!packageJson.workspaces.includes(forbiddenPattern), `package workspaces must not include generated transport ${forbiddenPattern}`);
    assert.ok(!workspaceSource.includes(forbiddenPattern), `pnpm workspace must not include generated transport ${forbiddenPattern}`);
  }
  assert.ok(
    !packageJson.workspaces.some((entry) => entry.includes('generated/server-openapi')),
    'portal package workspaces must not register generated transport outputs',
  );

  for (const [packageName, sdkFamily] of [
    ['@sdkwork/iam-app-sdk', 'sdkwork-iam-app-sdk'],
    ['@sdkwork/iam-backend-sdk', 'sdkwork-iam-backend-sdk'],
  ]) {
    assert.equal(packageJson.dependencies[packageName], 'workspace:*');
    assert.ok(workspaceSource.includes(`sdks/${sdkFamily}/${sdkFamily}-typescript`));
  }

  assert.match(viteConfigSource, /clawrouter-portal-pnpm-workspace-resolver/);
  assert.doesNotMatch(viteConfigSource, /find: '@sdkwork\//);

  assert.doesNotMatch(
    typecheckSource,
    /sdkwork-iam-backend-sdk-typescript\/src\/index\.ts/,
    'typecheck must not point at the stale appbase backend SDK source root',
  );
});

test('portal workspace composes business capabilities through independent owner SDK clients', () => {
  const packageJson = json('package.json');
  const commonsPackageJson = json('packages/sdkwork-clawroutes-pc-commons/package.json');
  const pcCorePackageJson = json('packages/sdkwork-clawrouter-pc-core/package.json');
  const workspaceSource = repoSource('pnpm-workspace.yaml');
  const tsconfigSource = source('tsconfig.json');
  const typecheckSource = source('tsconfig.typecheck.json');
  const viteConfigSource = source('vite.config.ts');
  const sdkClientsSource = source('packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts');

  assert.equal(packageJson.dependencies['sdkwork-commerce-app-sdk-generated-typescript'], undefined);
  assert.equal(packageJson.dependencies['sdkwork-commerce-backend-sdk-generated-typescript'], undefined);
  assert.equal(packageJson.dependencies['@sdkwork/commerce-service'], undefined);
  assert.equal(commonsPackageJson.dependencies['@sdkwork/commerce-service'], undefined);
  assert.equal(commonsPackageJson.dependencies['@sdkwork/clawrouter-pc-core'], 'workspace:*');
  assert.equal(pcCorePackageJson.dependencies['sdkwork-commerce-app-sdk-generated-typescript'], undefined);
  assert.equal(pcCorePackageJson.dependencies['sdkwork-commerce-backend-sdk-generated-typescript'], undefined);
  for (const packageName of [
    '@sdkwork/account-app-sdk',
    '@sdkwork/catalog-app-sdk',
    '@sdkwork/membership-app-sdk',
    '@sdkwork/order-app-sdk',
    '@sdkwork/payment-app-sdk',
    '@sdkwork/promotion-app-sdk',
  ]) {
    assert.equal(pcCorePackageJson.dependencies[packageName], 'workspace:*');
  }
  assert.equal(pcCorePackageJson.dependencies['@sdkwork/clawrouter-backend-sdk'], undefined);

  assert.doesNotMatch(workspaceSource, /packages\/common\/commerce/);
  assert.doesNotMatch(workspaceSource, /sdks\/sdkwork-commerce-app-sdk/);
  assert.doesNotMatch(workspaceSource, /sdks\/sdkwork-commerce-backend-sdk/);

  assert.doesNotMatch(tsconfigSource, /sdkwork-commerce-app-sdk-generated-typescript/);
  assert.doesNotMatch(typecheckSource, /sdkwork-commerce-app-sdk-generated-typescript/);
  assert.doesNotMatch(viteConfigSource, /sdkwork-commerce-app-sdk-generated-typescript/);
  assert.doesNotMatch(viteConfigSource, /sdkwork-commerce-backend-sdk-generated-typescript/);
  assert.match(viteConfigSource, /shouldResolvePortalPnpmWorkspaceSpecifier/);
  assert.match(viteConfigSource, /clawrouter-portal-pnpm-workspace-resolver/);
  assert.doesNotMatch(viteConfigSource, /find: 'clawrouter-app-domain-transport-generated-typescript'/);
  assert.doesNotMatch(viteConfigSource, /find: '@sdkwork\/clawrouter-app-sdk'/);
  assert.doesNotMatch(sdkClientsSource, /readonly commerce:/);
  assert.doesNotMatch(sdkClientsSource, /DomainTransport|createAppDomainCanonicalFacade|createBackendDomainCanonicalFacade/);
  assert.doesNotMatch(sdkClientsSource, /attachReadOnlyProperty|attachManagementAlias|facade\.catalog\.spus/);
  for (const capability of ['Account', 'Catalog', 'Membership', 'Order', 'Payment', 'Promotion']) {
    assert.match(sdkClientsSource, new RegExp(`getSdkwork${capability}AppSdkClient`));
  }
  assert.doesNotMatch(sdkClientsSource, /@sdkwork\/commerce-service/);
});

test('clawrouter backend SDK is owner-only and does not regenerate business capability SDKs', () => {
  const appManifest = json('../../sdks/clawrouter-app-sdk/sdk-manifest.json');
  const backendManifest = json('../../sdks/clawrouter-backend-sdk/sdk-manifest.json');
  const appOpenapi = json('../../sdks/clawrouter-app-sdk/openapi/clawrouter-app-sdk.openapi.json');
  const backendOpenapi = json('../../sdks/clawrouter-backend-sdk/openapi/clawrouter-backend-sdk.openapi.json');

  for (const workspace of [
    'sdkwork-iam-app-sdk',
    'sdkwork-account-app-sdk',
    'sdkwork-membership-app-sdk',
    'sdkwork-catalog-app-sdk',
    'sdkwork-order-app-sdk',
    'sdkwork-payment-app-sdk',
    'sdkwork-promotion-app-sdk',
    'sdkwork-models-app-sdk',
  ]) {
    assert.ok(
      appManifest.sdkDependencies.some((dependency) => dependency.workspace === workspace),
      `ClawRouter app SDK must declare ${workspace}`,
    );
  }
  const catalogDependency = appManifest.sdkDependencies.find(
    (dependency) => dependency.workspace === 'sdkwork-catalog-app-sdk',
  );
  assert.equal(catalogDependency?.dependencyMode, 'consumer-sdk');
  assert.equal(catalogDependency?.packageByLanguage?.typescript, '@sdkwork/catalog-app-sdk');
  assert.equal(
    appManifest.sdkDependencies.some((dependency) => dependency.dependencyMode === 'internal-capability'),
    false,
  );

  assert.deepEqual(
    backendManifest.sdkDependencies.map((dependency) => dependency.workspace),
    ['sdkwork-iam-backend-sdk', 'sdkwork-models-backend-sdk'],
  );
  assert.equal(
    backendManifest.sdkDependencies.some((dependency) => dependency.dependencyMode === 'internal-capability'),
    false,
  );

  for (const path of [
    '/app/v3/api/catalog/products',
    '/app/v3/api/catalog/spus',
    '/app/v3/api/orders',
    '/app/v3/api/payments/intents',
    '/app/v3/api/promotions/discount_applications',
  ]) {
    assert.equal(appOpenapi.paths[path], undefined, `${path} belongs to an independent owner app SDK`);
  }
  assert.equal(
    existsSync(new URL('../../sdks/clawrouter-app-sdk/openapi/clawrouter-app-domain-transport.openapi.json', portalRoot)),
    false,
    'ClawRouter app SDK must not publish an aggregate domain transport authority',
  );

  for (const path of [
    '/backend/v3/api/ai/resources',
    '/backend/v3/api/ai/resource_groups',
    '/backend/v3/api/ai/model_mappings',
    '/backend/v3/api/catalog/products',
    '/backend/v3/api/payments/providers',
    '/backend/v3/api/memberships/entitlements',
    '/backend/v3/api/promotions/coupon_stocks',
  ]) {
    assert.equal(backendOpenapi.paths[path], undefined, `${path} belongs to an independent owner backend SDK`);
  }

  assert.equal(
    existsSync(new URL('../../sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/src/api/commerce.ts', portalRoot)),
    false,
    'ClawRouter app generated SDK must not contain a Commerce API module',
  );
  assert.equal(
    existsSync(new URL('../../sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/src/api/commerce.ts', portalRoot)),
    false,
    'ClawRouter backend generated SDK must not contain a Commerce API module',
  );
  assert.equal(
    existsSync(new URL('../../sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/src/domains/index.ts', portalRoot)),
    false,
    'ClawRouter app SDK must not expose a cross-domain aggregation subpath',
  );
  assert.equal(
    existsSync(new URL('../../sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/src/domains/index.ts', portalRoot)),
    false,
    'ClawRouter backend SDK must not expose a cross-domain aggregation subpath',
  );

  const backendSystemApi = source('../../sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/src/api/system.ts');
  assert.doesNotMatch(
    backendSystemApi,
    /SystemPromotions(?:Offers|CouponStocks|UserCoupons|DiscountApplications|DiscountAllocations|CouponLedgerEntries)/,
    'Commerce promotion resources must stay in Commerce backend SDK, not ClawRouter system SDK',
  );
});

test('admin host composes owner admin modules through the backend-admin core SDK boundary', () => {
  const appSource = source('src/App.tsx');
  const hostSource = source('src/admin/clawRouterAdminHostMount.tsx');
  const permissionSource = source('packages/sdkwork-clawrouter-pc-admin-shell/src/admin-route-permission-hints.ts');
  const menuSource = source('packages/sdkwork-clawrouter-pc-admin-shell/src/adminModuleRegistry.ts');
  const portalPackage = json('package.json');
  const adminCorePackage = json('packages/sdkwork-clawrouter-pc-admin-core/package.json');
  const adminCoreComponent = json('packages/sdkwork-clawrouter-pc-admin-core/specs/component.spec.json');
  const adminCoreSdkSource = source('packages/sdkwork-clawrouter-pc-admin-core/src/sdk/index.ts');
  const adminCoreInventorySource = source('packages/sdkwork-clawrouter-pc-admin-core/src/composition/sdk-inventory.ts');
  const upstreamPackage = json('packages/sdkwork-clawrouter-pc-admin-upstream/package.json');
  const upstreamService = source('packages/sdkwork-clawrouter-pc-admin-upstream/src/upstreamService.ts');

  assert.match(appSource, /ClawRouterAdminHostRoutes/);
  assert.doesNotMatch(appSource, /const (?:Dashboard|Model|Upstream)Admin = lazyRoute/);
  assert.equal((hostSource.match(/\broute\('/g) ?? []).length, 18);
  assert.match(hostSource, /'sdkwork-models', '@sdkwork\/models-pc-admin-catalog', \['sdkwork-models-backend-sdk'\]/);
  assert.match(hostSource, /'sdkwork-clawrouter', '@sdkwork\/clawrouter-pc-admin-upstream', \['clawrouter-backend-sdk'\]/);

  const contributions = [...hostSource.matchAll(
    /\broute\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*\[([^\]]*)\]\s*,\s*'([^']+)'/g,
  )].map((match) => ({
    path: `/admin/${match[1]}`,
    owner: match[2],
    adminPackage: match[3],
    backendSdkFamilies: [...match[4].matchAll(/'([^']+)'/g)].map((sdkMatch) => sdkMatch[1]),
    requiredPermission: match[5],
  }));
  const menuPaths = [...menuSource.matchAll(/itemBlock\(\{\s*path:\s*'([^']+)'/g)].map((match) => match[1]);
  const permissionHints = [...permissionSource.matchAll(
    /\{\s*pathPrefix:\s*'([^']+)'\s*,\s*requiredPermission:\s*'([^']+)'\s*\}/g,
  )].map((match) => ({ pathPrefix: match[1], requiredPermission: match[2] }));
  const contributionPaths = contributions.map((contribution) => contribution.path);

  assert.equal(new Set(contributionPaths).size, contributions.length, 'admin host routes must be unique');
  assert.deepEqual([...menuPaths].sort(), [...contributionPaths].sort(), 'menu routes and host contributions must match');
  for (const contribution of contributions) {
    const matchingHint = permissionHints
      .filter((hint) => contribution.path === hint.pathPrefix || contribution.path.startsWith(`${hint.pathPrefix}/`))
      .sort((left, right) => right.pathPrefix.length - left.pathPrefix.length)[0];
    assert.ok(matchingHint, `admin route ${contribution.path} must have a permission hint`);
    assert.equal(
      matchingHint.requiredPermission,
      contribution.requiredPermission,
      `admin route ${contribution.path} permission must match its host contribution`,
    );
    assert.equal(
      portalPackage.dependencies[contribution.adminPackage],
      'workspace:*',
      `admin route ${contribution.path} package must be a portal workspace dependency`,
    );
    assert.ok(contribution.backendSdkFamilies.length > 0, `${contribution.path} must declare an owner SDK family`);
    if (contribution.owner === 'sdkwork-models') {
      assert.deepEqual(contribution.backendSdkFamilies, ['sdkwork-models-backend-sdk']);
    }
  }

  assert.deepEqual(Object.keys(adminCorePackage.dependencies).sort(), [
    '@sdkwork/clawrouter-backend-sdk',
    '@sdkwork/clawroutes-pc-commons',
    '@sdkwork/models-backend-sdk',
  ]);
  assert.deepEqual(
    adminCoreComponent.contracts.sdkDependencies.map((dependency) => dependency.workspace),
    ['clawrouter-backend-sdk', 'sdkwork-models-backend-sdk'],
  );
  const adminCoreInventory = [...adminCoreInventorySource.matchAll(
    /\{\s*workspace:\s*'([^']+)'\s*,\s*surface:\s*'([^']+)'\s*,\s*credentialMode:\s*'([^']+)'\s*\}/g,
  )].map((match) => ({
    workspace: match[1],
    surface: match[2],
    credentialMode: match[3],
  }));
  assert.deepEqual(adminCoreInventory, adminCoreComponent.contracts.sdkDependencies);
  assert.match(adminCoreSdkSource, /from '@sdkwork\/models-backend-sdk'/);
  assert.match(adminCoreSdkSource, /getModelsBackendSdkClient/);

  assert.equal(upstreamPackage.dependencies['@sdkwork/models-backend-sdk'], undefined);
  assert.match(upstreamService, /from '@sdkwork\/clawrouter-pc-admin-core\/sdk'/);
  assert.match(upstreamService, /getClawRouterBackendSdkClient/);
  assert.doesNotMatch(upstreamService, /fetch\(|axios|XMLHttpRequest|authorization/i);
});

test('commons SDK client bootstrap composes appbase, product and open SDKs through standard credentials', () => {
  const sdkClientsSource = source('packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts');

  assert.match(sdkClientsSource, /from '@sdkwork\/iam-app-sdk'/);
  assert.match(sdkClientsSource, /from '@sdkwork\/iam-backend-sdk'/);
  assert.match(sdkClientsSource, /from '@sdkwork\/clawrouter-app-sdk'/);
  assert.match(sdkClientsSource, /from '@sdkwork\/clawrouter-backend-sdk'/);
  assert.match(sdkClientsSource, /from '@sdkwork\/clawrouter-open-sdk'/);
  assert.match(sdkClientsSource, /createTokenManager/);
  assert.match(sdkClientsSource, /getClawRouterGlobalTokenManager/);
  assert.match(sdkClientsSource, /createSdkworkAppbaseAppSdkClient/);
  assert.match(sdkClientsSource, /getSdkworkAppbaseAppSdkClient/);
  assert.match(sdkClientsSource, /__SDKWORK_APPBASE_APP_SDK_CLIENT__/);
  assert.match(sdkClientsSource, /tokenManager:\s*resolveClawRouterSdkTokenManager\(options\.tokenManager\)/);
  assert.match(sdkClientsSource, /buildAppbaseAppConfig/);
  assert.match(sdkClientsSource, /buildAppbaseBackendConfig/);

  assert.doesNotMatch(sdkClientsSource, /appClientSessionKey/);
  assert.doesNotMatch(sdkClientsSource, /backendClientSessionKey/);
  assert.doesNotMatch(sdkClientsSource, /appbaseBackendClientSessionKey/);
  assert.doesNotMatch(sdkClientsSource, /createSessionKey/);
});

test('commons SDK bootstrap keeps app composition separate and backend client owner-only', () => {
  const sdkClientsSource = source('packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts');

  assert.match(sdkClientsSource, /from '@sdkwork\/clawrouter-pc-core\/sdk'/);
  assert.doesNotMatch(sdkClientsSource, /DomainTransport|domain-transport|createAppDomainCanonicalFacade/);
  assert.doesNotMatch(sdkClientsSource, /__SDKWORK_CLAWROUTER_APP_CAPABILITY_SDK_CLIENT__/);
  assert.doesNotMatch(sdkClientsSource, /__SDKWORK_CLAWROUTER_BACKEND_CAPABILITY_SDK_CLIENT__/);
  assert.match(sdkClientsSource, /VITE_CLAWROUTER_APP_API_BASE_URL/);
  assert.match(sdkClientsSource, /VITE_CLAWROUTER_BACKEND_API_BASE_URL/);
  assert.match(sdkClientsSource, /tokenManager:\s*resolveClawRouterSdkTokenManager\(options\.tokenManager\)/);
  assert.doesNotMatch(sdkClientsSource, /attachReadOnlyProperty\(client, 'commerce'/);
  assert.doesNotMatch(sdkClientsSource, /createBackendDomainCanonicalFacade|BackendDomainDependencyOverlay|attachManagementAlias|facade\.catalog\.spus/);
  for (const capability of ['Account', 'Catalog', 'Membership', 'Order', 'Payment', 'Promotion']) {
    assert.match(sdkClientsSource, new RegExp(`createSdkwork${capability}AppSdkClient`));
    assert.match(sdkClientsSource, new RegExp(`getSdkwork${capability}AppSdkClient`));
  }
  assert.doesNotMatch(sdkClientsSource, /@sdkwork\/commerce-service/);
  assert.doesNotMatch(sdkClientsSource, /getSdkworkCommerceService/);
});

test('IAM runtime uses the high-level appbase auth runtime while binding app SDK clients to the shared token manager', () => {
  const iamRuntimeSource = source('packages/sdkwork-clawroutes-pc-commons/src/iam-runtime.ts');

  assert.match(iamRuntimeSource, /createSdkworkAppbasePcAuthRuntime/);
  assert.match(iamRuntimeSource, /createAppbaseAppClient:\s*getSdkworkAppbaseAppSdkClient/);
  assert.match(iamRuntimeSource, /credentialEntry:\s*\{[\s\S]*prepareTokens:\s*prepareClawRouterCredentialEntryTokens/u);
  assert.doesNotMatch(iamRuntimeSource, /wrapCredentialEntryClient|skipWrap/u);
  assert.match(iamRuntimeSource, /tokenManager,/);
  assert.match(iamRuntimeSource, /sessionBridge:/);
  assert.doesNotMatch(iamRuntimeSource, /createAppbaseBackendClient/);
  assert.doesNotMatch(iamRuntimeSource, /appbaseBackendApiBaseUrl/);
  assert.doesNotMatch(iamRuntimeSource, /getSdkworkAppbaseBackendSdkClient/);
  assert.doesNotMatch(iamRuntimeSource, /getClawRouterBackendSdkClient/);
  assert.doesNotMatch(iamRuntimeSource, /resolveRequiredAppbaseBackendBaseUrl/);
  assert.doesNotMatch(iamRuntimeSource, /@sdkwork\/iam-sdk-adapter/);
  assert.doesNotMatch(iamRuntimeSource, /createIamAppSdkAdapter/);
  assert.doesNotMatch(iamRuntimeSource, /createIamBackendSdkAdapter/);
});

test('appbase-owned app capabilities no longer call the product clawrouter app SDK', () => {
  const sessionServiceSource = source('packages/sdkwork-clawroutes-pc-commons/src/sessionService.ts');
  const portalSessionSource = source('packages/sdkwork-clawroutes-pc-commons/src/portal-session.ts');
  const iamDirectorySource = source('packages/sdkwork-clawroutes-pc-commons/src/iamDirectoryApiOperations.ts');
  const authSettingsSource = source('src/auth/clawRouterAuthSettingsService.ts');
  const userServiceSource = source('packages/sdkwork-clawrouter-pc-console-user/src/userService.ts');

  for (const [name, fileSource] of [
    ['sessionService', sessionServiceSource],
    ['portal-session', portalSessionSource],
    ['iamDirectoryApiOperations', iamDirectorySource],
    ['clawRouterAuthSettingsService', authSettingsSource],
    ['userService', userServiceSource],
  ]) {
    assert.match(fileSource, /getSdkworkAppbaseAppSdkClient/, `${name} must use appbase app SDK`);
  }

  assert.doesNotMatch(sessionServiceSource, /getClawRouterAppSdkClient/);
  assert.doesNotMatch(portalSessionSource, /getClawRouterAppSdkClient/);
  assert.doesNotMatch(iamDirectorySource, /getClawRouterAppSdkClient/);
  assert.doesNotMatch(authSettingsSource, /getClawRouterAppSdkClient/);
  assert.doesNotMatch(userServiceSource, /getClawRouterAppSdkClient/);
  assert.doesNotMatch(userServiceSource, /@sdkwork\/clawrouter-app-sdk/);

  assert.match(sessionServiceSource, /getSdkworkAppbaseAppSdkClient\(options\)\.auth\.sessions\.create/);
  assert.doesNotMatch(sessionServiceSource, /getClawRouterAppSdkClient\(\)\.auth\.sessions\.create/);
  assert.match(sessionServiceSource, /\.auth\.sessions\.current\.delete/);
  assert.match(portalSessionSource, /\.auth\.sessions\.current\.retrieve/);
  assert.match(portalSessionSource, /\.auth\.sessions\.current\.delete/);
  assert.match(authSettingsSource, /\.system\.iam\.runtime\.retrieve\(\)/);
  assert.match(authSettingsSource, /\.system\.iam\.verificationPolicy\.retrieve\(\)/);
  assert.match(userServiceSource, /\.iam\.users\.current\.retrieve\(\)/);
});

test('app surface component spec declares permission inheritance and core SDK inventory', () => {
  const appSpec = json('specs/component.spec.json');
  const coreSpec = json('packages/sdkwork-clawrouter-pc-core/specs/component.spec.json');
  const coreInventorySource = source('packages/sdkwork-clawrouter-pc-core/src/composition/sdk-inventory.ts');
  const iamModuleManifest = json('specs/iam.module.manifest.json');

  assert.equal(appSpec.kind, 'sdkwork.component.spec');
  assert.ok(appSpec.contracts?.permissionComposition?.moduleCatalogRefs?.length > 0);
  assert.equal(appSpec.contracts?.permissionComposition?.consumerPolicy?.forbidLocalPermissionCatalogForDependencyDomains, true);

  assert.ok(coreSpec.contracts?.sdkDependencies?.length >= 4, 'app core must declare dependency SDK inventory');
  assert.doesNotMatch(JSON.stringify(appSpec.contracts?.sdkInventory ?? []), /clawrouter-app-sdk\.commerce/);
  assert.doesNotMatch(JSON.stringify(appSpec.contracts?.sdkInventory ?? []), /clawrouter-backend-sdk\.commerce/);
  assert.doesNotMatch(JSON.stringify(appSpec.contracts?.sdkInventory ?? []), /clawrouter-app-capability/);
  assert.doesNotMatch(coreInventorySource, /dependency\.composition\.json/);
  assert.equal(iamModuleManifest.moduleId, 'clawrouter');
  assert.ok(iamModuleManifest.permissions.catalog.some((entry) => entry.code === 'clawrouter.console.access'));
  assert.deepEqual(
    iamModuleManifest.roles.roleGrantExtensions,
    [
      { roleCode: 'org_admin', patterns: ['clawrouter.*'] },
      { roleCode: 'platform_system_admin', patterns: ['clawrouter.*'] },
    ],
    'the manager org_admin role and platform system admins must inherit the Claw Router admin domain',
  );
});

test('commons package does not depend on low-level appbase IAM SDK adapters', () => {
  const commonsPackageJson = json('packages/sdkwork-clawroutes-pc-commons/package.json');
  const typecheckShimsSource = source('src/typecheck-shims.d.ts');

  assert.equal(commonsPackageJson.dependencies['@sdkwork/auth-runtime-pc-react'], 'workspace:*');
  assert.equal(commonsPackageJson.dependencies['@sdkwork/iam-sdk-adapter'], undefined);
  assert.doesNotMatch(typecheckShimsSource, /declare module '@sdkwork\/iam-sdk-adapter'/);
  assert.doesNotMatch(typecheckShimsSource, /appbaseBackendApiBaseUrl/);
  assert.doesNotMatch(typecheckShimsSource, /createAppbaseBackendClient/);
});
