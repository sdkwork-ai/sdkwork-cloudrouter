import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  resolvePortalPackageModule,
} from './lib/portal-workspace-package-resolver.mjs';

const portalRoot = path.resolve(import.meta.dirname, '..');

test('resolver falls back to the composed SDK facade when dist is missing', () => {
  const importer = fileURLToPath(
    new URL('../packages/sdkwork-cloudroutes-pc-commons/src/sdk-clients.ts', import.meta.url),
  );
  const resolved = resolvePortalPackageModule('@sdkwork/prompts-backend-sdk', portalRoot, importer);

  assert.match(resolved ?? '', /[\\/]src[\\/]index\.ts$/u);
});

test('resolver resolves independent payment app SDK to its composed package source', () => {
  const resolved = resolvePortalPackageModule('@sdkwork/payment-app-sdk', portalRoot);

  assert.match(resolved ?? '', /[\\/]src[\\/]index\.ts$/u);
});

test('resolver returns built SDK dist when present', () => {
  const resolved = resolvePortalPackageModule('@sdkwork/agents-app-sdk', portalRoot);

  assert.match(resolved ?? '', /[\\/](?:dist[\\/]index\.js|src[\\/]index\.ts)$/u);
});

test('resolver falls back to ui-pc-react TSX source for deep component imports', () => {
  const resolved = resolvePortalPackageModule(
    '@sdkwork/ui-pc-react/components/ui/button',
    portalRoot,
    path.join(portalRoot, 'src/App.tsx'),
  );

  // The resolver canonicalizes pnpm junctions to their real workspace path,
  // so the package directory is sdkwork-ui-pc-react (not the junction name).
  assert.match(
    (resolved ?? '').replaceAll('\\', '/'),
    /\/sdkwork-ui-pc-react\/(?:src\/components\/ui\/button\.tsx|dist\/ui-button\.js)$/u,
  );
});

test('resolver finds transitive SDK packages from workspace dependency node_modules', () => {
  const importer = path.resolve(
    portalRoot,
    '../../../sdkwork-account/apps/sdkwork-account-common/packages/sdkwork-account-service/src/transport.ts',
  );
  const resolved = resolvePortalPackageModule('@sdkwork/account-app-sdk', portalRoot, importer);

  assert.match(resolved ?? '', /[\\/]src[\\/]index\.ts$/u);
});

test('resolver follows pnpm workspace junctions for transitive runtime dependencies', () => {
  const importer = path.resolve(
    portalRoot,
    '../../../sdkwork-agents/apps/sdkwork-agents-pc/packages/sdkwork-agents-pc-canvas/node_modules/jspdf/dist/jspdf.es.min.js',
  );
  const resolved = resolvePortalPackageModule('@babel/runtime/helpers/typeof', portalRoot, importer);

  assert.match(
    (resolved ?? '').replaceAll('\\', '/'),
    /\/@babel\/runtime\/helpers\/(?:esm\/)?typeof\.js$/u,
  );
});

test('resolver maps retired cloudrouter commons imports to cloudroutes commons', () => {
  const importer = path.join(portalRoot, 'node_modules/@sdkwork/models-pc-admin-catalog/src/modelService.ts');
  const resolved = resolvePortalPackageModule('@sdkwork/cloudrouter-pc-commons/runtime', portalRoot, importer);

  // The resolver canonicalizes pnpm junctions to their real workspace path,
  // so the package directory is sdkwork-cloudroutes-pc-commons.
  assert.match(
    (resolved ?? '').replaceAll('\\', '/'),
    /\/sdkwork-cloudroutes-pc-commons\/src\/runtime\.ts$/u,
  );
});

test('resolver finds order SDK packages from workspace dependency node_modules', () => {
  const importer = path.resolve(
    portalRoot,
    '../../../sdkwork-order/apps/sdkwork-order-common/packages/sdkwork-order-service/src/transport.ts',
  );
  const resolved = resolvePortalPackageModule('@sdkwork/order-app-sdk', portalRoot, importer);

  assert.match(resolved ?? '', /[\\/]src[\\/]index\.ts$/u);
});

test('resolver finds assets-core from sdkwork-assets workspace packages', () => {
  const importer = path.resolve(
    portalRoot,
    '../../../sdkwork-assets/apps/sdkwork-assets-pc/packages/sdkwork-assets-pc-assets/src/gallery/mapGenerationHistoryToGallery.ts',
  );
  const resolved = resolvePortalPackageModule('@sdkwork/assets-core', portalRoot, importer);

  assert.match(resolved ?? '', /[\\/](?:sdkwork-assets-core|node_modules[\\/]@sdkwork[\\/]assets-core)[\\/]src[\\/]index\.ts$/u);
});

test('resolver finds assets-core from image-contracts transitive imports', () => {
  const importer = path.resolve(
    portalRoot,
    '../../../sdkwork-image/apps/sdkwork-image-pc/packages/sdkwork-image-pc-generation/node_modules/@sdkwork/image-contracts/src/index.ts',
  );
  const resolved = resolvePortalPackageModule('@sdkwork/assets-core', portalRoot, importer);

  assert.match(resolved ?? '', /[\\/](?:sdkwork-assets-core|node_modules[\\/]@sdkwork[\\/]assets-core)[\\/]src[\\/]index\.ts$/u);
});

test('resolver finds workspace packages declared only in root pnpm-workspace.yaml', () => {
  const resolved = resolvePortalPackageModule('@sdkwork/assets-core', portalRoot);

  assert.match(resolved ?? '', /[\\/](?:sdkwork-assets-core|node_modules[\\/]@sdkwork[\\/]assets-core)[\\/]src[\\/]index\.ts$/u);
});

test('resolver collapses pnpm junction module ids to one canonical real path', () => {
  const adminPaymentsImporter = path.resolve(
    portalRoot,
    'packages/sdkwork-cloudrouter-pc-admin-payments/src/index.tsx',
  );
  const commonsImporter = path.resolve(
    portalRoot,
    'packages/sdkwork-cloudroutes-pc-commons/src/domain-service-providers.ts',
  );
  const fromAdminPayments = resolvePortalPackageModule(
    '@sdkwork/payment-service',
    portalRoot,
    adminPaymentsImporter,
  );
  const fromCommons = resolvePortalPackageModule(
    '@sdkwork/payment-service',
    portalRoot,
    commonsImporter,
  );

  assert.ok(fromAdminPayments);
  assert.ok(fromCommons);
  // 同一物理文件必须解析为同一模块 ID，否则 vite dev 中出现两个模块实例，
  // 模块级 service provider 状态互相独立（admin 支付中心报 provider not configured）。
  assert.strictEqual(fromAdminPayments, fromCommons);
  assert.ok(
    !fromAdminPayments.includes('node_modules'),
    `expected canonical real path, got junction path: ${fromAdminPayments}`,
  );
  assert.match(fromAdminPayments.replaceAll('\\', '/'), /[\\/]sdkwork-payment-service[\\/]src[\\/]index\.ts$/u);
});
