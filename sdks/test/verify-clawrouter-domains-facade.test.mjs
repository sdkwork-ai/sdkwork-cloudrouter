import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(testDir, '..', '..');
const familyRoot = path.join(appRoot, 'sdks', 'clawrouter-app-sdk');
const packageRoot = path.join(familyRoot, 'clawrouter-app-sdk-typescript');
const ownerPackages = [
  '@sdkwork/account-app-sdk',
  '@sdkwork/catalog-app-sdk',
  '@sdkwork/membership-app-sdk',
  '@sdkwork/order-app-sdk',
  '@sdkwork/payment-app-sdk',
  '@sdkwork/promotion-app-sdk',
];

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

test('Claw Router domains export delegates to owner SDK packages', () => {
  const packageJson = readJson(path.join(packageRoot, 'package.json'));
  const manifest = readJson(path.join(familyRoot, 'sdk-manifest.json'));
  const component = readJson(path.join(familyRoot, 'specs', 'component.spec.json'));
  const facadePath = path.join(packageRoot, 'src', 'domains', 'index.ts');
  const facade = readFileSync(facadePath, 'utf8');

  assert.deepEqual(packageJson.exports?.['./domains'], {
    types: './dist/domains/index.d.ts',
    import: './dist/domains/index.js',
    require: './dist/domains/index.cjs',
  });
  assert.equal(packageJson.imports, undefined);
  for (const packageName of ownerPackages) {
    assert.equal(packageJson.dependencies?.[packageName], 'workspace:*');
    assert.match(facade, new RegExp(`from '${packageName.replaceAll('/', '\\/')}'`, 'u'));
  }
  assert.match(facade, /readonly catalog: SdkworkCatalogAppClient\['catalog'\]/u);
  assert.match(
    facade,
    /this\.catalog = createCatalogClient\(resolveDomainConfig\(config, 'catalog'\)\)\.catalog;/u,
  );
  assert.doesNotMatch(facade, /readonly catalog: SdkworkCatalogAppClient;/u);

  assert.equal(
    existsSync(path.join(packageRoot, 'generated', 'domains')),
    false,
    'dependency APIs must not be copied into a generated domains transport',
  );
  assert.deepEqual(component.contracts?.dependencyApiExports, manifest.dependencyApiExports);
  assert.deepEqual(
    manifest.dependencyApiExports.map((entry) => entry.packageExport),
    ownerPackages.map(() => './domains'),
  );
  for (const entry of manifest.dependencyApiExports) {
    assert.equal(entry.exportMode, 'composed-wrapper');
    assert.equal(entry.surface, 'app-api');
    assert.equal(entry.apiPrefix, '/app/v3/api');
    assert.equal(entry.runtimeRequired, false);
  }
});
