import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(ROOT, '../..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8').replace(/^\uFEFF/u, ''));
}

const manifest = readJson('sdkwork.app.config.json');
const rootSpec = readJson('specs/component.spec.json');
/**
 * ``capabilities.ts`` is authored TypeScript (bare keys, ``as const``, constant
 * references), so it cannot be parsed as a JSON document. Read the declared
 * capability ids structurally and cross-check them against the artifacts that
 * consume them.
 */
const capabilitiesSource = fs.readFileSync(
  path.join(
    REPO,
    'apps/sdkwork-cloudrouter-common/packages/sdkwork-cloudrouter-contracts/src/capabilities.ts',
  ),
  'utf8',
);
const capabilityIds = [...capabilitiesSource.matchAll(/\bid: '(console-[^']+)'/gu)].map(
  (match) => match[1],
);

/** Every shared console capability must be backed by exactly one H5 package. */
const H5_PACKAGE_BY_CAPABILITY_ID = {
  'console-dashboard': 'sdkwork-cloudrouter-h5-console-dashboard',
  'console-usage': 'sdkwork-cloudrouter-h5-console-usage',
  'console-api-keys': 'sdkwork-cloudrouter-h5-console-api-keys',
  'console-catalog': 'sdkwork-cloudrouter-h5-console-catalog',
};

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

const CAPABILITY_DIRS = [
  'sdkwork-cloudrouter-h5-core',
  'sdkwork-cloudrouter-h5-commons',
  'sdkwork-cloudrouter-h5-shell',
  'sdkwork-cloudrouter-h5-i18n',
  'sdkwork-cloudrouter-h5-console-dashboard',
  'sdkwork-cloudrouter-h5-console-usage',
  'sdkwork-cloudrouter-h5-console-api-keys',
  'sdkwork-cloudrouter-h5-console-catalog',
];

describe('cloudrouter h5 application root', () => {
  it('declares the H5 runtime identity', () => {
    assert.equal(manifest.app.key, 'sdkwork-cloudrouter-h5');
    assert.equal(manifest.runtime.family, 'mobile');
    assert.equal(manifest.runtime.framework, 'react-h5');
    assert.ok(manifest.runtime.supportedDeploymentProfiles.includes(manifest.runtime.defaultDeploymentProfile));
  });

  it('ships the full package family', () => {
    for (const dir of CAPABILITY_DIRS) {
      assert.ok(fs.existsSync(path.join(ROOT, 'packages', dir, 'package.json')), `${dir} package.json`);
      assert.ok(
        fs.existsSync(path.join(ROOT, 'packages', dir, 'specs/component.spec.json')),
        `${dir} component spec`,
      );
    }
  });

  it('keeps the core package composition subpaths', () => {
    const corePackage = readJson('packages/sdkwork-cloudrouter-h5-core/package.json');
    for (const subpath of ['.', './sdk', './modules', './host', './session', './composition']) {
      assert.ok(subpath in corePackage.exports, `core exports ${subpath}`);
    }
    assert.ok(fs.existsSync(path.join(ROOT, 'packages/sdkwork-cloudrouter-h5-core/src/composition/index.ts')));
  });

  it('integrates the generated app SDK only through the core package', () => {
    const coreSpec = readJson('packages/sdkwork-cloudrouter-h5-core/specs/component.spec.json');
    assert.deepEqual(coreSpec.contracts.sdkDependencies, [
      { workspace: 'cloudrouter-app-sdk', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    ]);
    for (const dir of CAPABILITY_DIRS.filter((name) => name.includes('-console-') || name.endsWith('-shell'))) {
      const spec = readJson(`packages/${dir}/specs/component.spec.json`);
      assert.ok(!spec.contracts.sdkDependencies, `${dir} must not own SDK dependencies`);
    }
  });

  it('never claims operator scope in the client manifest', () => {
    assert.ok(!manifest.backend.accessTokenPermissionScope.includes('cloudrouter.admin.access'));
  });

  it('stays aligned with the shared console capability set', () => {
    assert.deepEqual([...capabilityIds].sort(), [
      'console-api-keys',
      'console-catalog',
      'console-dashboard',
      'console-usage',
    ]);
    assert.equal(rootSpec.component.type, 'h5-app-root');
    assert.deepEqual(rootSpec.contracts.sdkDependencies, ['cloudrouter-app-sdk']);
  });

  it('maps every shared capability onto its own package route contribution', () => {
    for (const capabilityId of capabilityIds) {
      const dir = H5_PACKAGE_BY_CAPABILITY_ID[capabilityId];
      assert.ok(dir, `${capabilityId} has a mapped H5 package`);
      assert.ok(
        fs.existsSync(path.join(ROOT, 'packages', dir, 'src/routes/routeContribution.ts')),
        `${dir} owns a route contribution`,
      );
      const contribution = readText(`packages/${dir}/src/routes/routeContribution.ts`);
      assert.ok(
        contribution.includes(`capabilityId: '${capabilityId}'`),
        `${dir} declares capabilityId ${capabilityId}`,
      );
      const spec = readJson(`packages/${dir}/specs/component.spec.json`);
      assert.equal(spec.component.type, 'node-package');
    }
  });
});
