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

/**
 * Canonical console tab order, read from the shared contract authority instead
 * of restated here, so the H5 tab bar cannot silently drift from
 * `CLOUDROUTER_CONSOLE_ROUTE_ORDER`.
 */
const routesSource = fs.readFileSync(
  path.join(
    REPO,
    'apps/sdkwork-cloudrouter-common/packages/sdkwork-cloudrouter-contracts/src/routes.ts',
  ),
  'utf8',
);
const consoleRouteOrder = [...routesSource.matchAll(/CLOUDROUTER_CONSOLE_ROUTE_ORDER = \[([^\]]+)\]/gu)]
  .map((match) => [...match[1].matchAll(/'([^']+)'/gu)].map((key) => key[1]))
  .at(0);

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

  it('renders the console tab bar from the shared tab descriptors', () => {
    const navigation = readText('packages/sdkwork-cloudrouter-h5-shell/src/navigation/consoleNavigation.ts');
    assert.ok(
      navigation.includes('CLOUDROUTER_CONSOLE_TABS'),
      'navigation derives from the shared tab authority',
    );
    for (const glyph of ['dashboard', 'receipt', 'key', 'barChart']) {
      assert.ok(navigation.includes(`${glyph}: '`), `ICON_BY_GLYPH covers the ${glyph} glyph`);
    }
    assert.ok(!navigation.includes('/sign-in'), 'the sign-in route is not a tab');
  });

  it('keeps the tab bar on the tab roots only, with native selected slots', () => {
    const layout = readText('packages/sdkwork-cloudrouter-h5-shell/src/layout/ConsoleShellLayout.tsx');
    assert.ok(layout.includes('cr-tabbar fixed bottom-0'), 'the tab bar sits outside the scroll flow');
    assert.ok(layout.includes('grid-cols-4'), 'the tab bar declares one column per console tab');
    // The app canvas is the only scroll container; the document frame never
    // scrolls.
    assert.ok(layout.includes('overflow-y-auto'), 'the canvas scrolls vertically');
    assert.ok(layout.includes('overscroll-behavior-contain'), 'scroll never chains to the document');
    assert.ok(layout.includes('overflow-hidden'), 'the app frame itself never scrolls');
    // Filled/outline pair of the same glyph through the native selected slot,
    // never a color-only swap.
    assert.ok(layout.includes("fill={isActive ? 'currentColor' : 'none'}"));
    const routes = readText('src/routes/consoleRoutes.tsx');
    for (const key of consoleRouteOrder) {
      assert.ok(
        routes.includes(`CLOUDROUTER_CONSOLE_ROUTES.${key}.path`),
        `console routes mount the ${key} tab inside the shell`,
      );
    }
    assert.ok(
      !routes.includes('CLOUDROUTER_CONSOLE_ROUTES.signIn.path'),
      'the sign-in route renders outside the tab shell',
    );
  });

  it('contains document scrolling to the app canvas and the tab bar', () => {
    const css = readText('src/index.css');
    assert.match(css, /--cr-tabbar-height:/u);
    assert.match(
      css,
      /\.cr-canvas\s*\{[^}]*padding-bottom:\s*calc\(var\(--cr-tabbar-height\)/u,
      'the canvas reserves the tab bar height plus the safe-area inset',
    );
    assert.match(css, /\.cr-canvas\s*\{[^}]*scrollbar-width:\s*none/u, 'the canvas scrollbar is hidden');
    assert.match(css, /\.cr-tabbar\s*\{[^}]*padding-bottom:\s*env\(safe-area-inset-bottom/u);
    assert.match(css, /#root\s*\{[^}]*overflow:\s*hidden/u, 'document scrolling stays disabled');
  });
});
