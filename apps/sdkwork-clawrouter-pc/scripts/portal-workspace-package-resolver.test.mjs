import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  resolvePortalPackageModule,
} from './lib/portal-workspace-package-resolver.mjs';

const portalRoot = path.resolve(import.meta.dirname, '..');

test('resolver falls back to generated server-openapi source when SDK dist is missing', () => {
  const importer = fileURLToPath(
    new URL('../packages/sdkwork-clawroutes-pc-commons/src/sdk-clients.ts', import.meta.url),
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

  assert.match(resolved ?? '', /[\\/]src[\\/]components[\\/]ui[\\/]button\.tsx$/u);
});

test('resolver finds transitive SDK packages from workspace dependency node_modules', () => {
  const importer = path.resolve(
    portalRoot,
    '../../../sdkwork-account/apps/sdkwork-account-common/packages/sdkwork-account-service/src/transport.ts',
  );
  const resolved = resolvePortalPackageModule('@sdkwork/account-app-sdk', portalRoot, importer);

  assert.match(resolved ?? '', /[\\/]src[\\/]index\.ts$/u);
});

test('resolver maps retired clawrouter commons imports to clawroutes commons', () => {
  const importer = path.join(portalRoot, 'node_modules/@sdkwork/models-pc-admin-catalog/src/modelService.ts');
  const resolved = resolvePortalPackageModule('@sdkwork/clawrouter-pc-commons/runtime', portalRoot, importer);

  assert.match(resolved ?? '', /[\\/]@sdkwork[\\/]clawroutes-pc-commons[\\/]src[\\/]runtime\.ts$/u);
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
