import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(ROOT, '../..');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/u, ''));
}

function readJsonAt(abs) {
  return JSON.parse(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/u, ''));
}

function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function listSourceFiles(relRoot) {
  const absolute = path.join(ROOT, relRoot);
  if (!fs.existsSync(absolute)) return [];
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', 'build', 'oh_modules', '.hvigor'].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(path.relative(ROOT, full).replaceAll('\\', '/'));
    }
  };
  walk(absolute);
  return out;
}

const APP = 'sdkwork-cloudrouter-harmony-mobile';
const CAPABILITY_PKGS = [
  APP + '-console-dashboard',
  APP + '-console-usage',
  APP + '-console-api-keys',
  APP + '-console-catalog',
];
const ALL_PKGS = [
  APP + '-core',
  APP + '-commons',
  APP + '-shell',
  APP + '-host',
  ...CAPABILITY_PKGS,
];

const ALLOWED_LAYER_ROLES = new Set([
  'contract',
  'frontend-core',
  'frontend-shell',
  'frontend-feature',
  'frontend-commons',
  'frontend-host',
  'sdk-facade',
  'sdk-generated',
  'tooling',
]);

const rootSpec = readJson('specs/component.spec.json');
const manifest = readJson('sdkwork.app.config.json');
const deployment = readJson('etc/sdkwork.deployment.config.json');
const rootDeployment = readJsonAt(path.join(REPO, 'etc/sdkwork.deployment.config.json'));

const PROFILE_IDS = Object.keys(rootDeployment.profiles);

describe('cloudrouter harmony mobile application root', () => {
  it('declares the harmony mobile app root contract', () => {
    assert.equal(rootSpec.component.type, 'harmony-mobile-app-root');
    assert.equal(rootSpec.component.root, 'apps/' + APP);
    assert.ok(rootSpec.component.languages.includes('arkts'));
    assert.deepEqual(rootSpec.contracts.sdkClients, ['SdkworkAppClient']);
    const dependency = rootSpec.contracts.sdkDependencies[0];
    assert.equal(dependency.workspace, 'cloudrouter-app-sdk');
    assert.equal(dependency.surface, 'app-api');
    assert.equal(dependency.runtimeAdaptation, 'arkts-pending');
  });

  it('ships the core/commons/shell/host/capability package family with a layer role', () => {
    for (const pkg of ALL_PKGS) {
      const packageRoot = 'packages/' + pkg;
      for (const rel of [
        'oh-package.json5',
        'build-profile.json5',
        'src/main/module.json5',
        'src/main/ets/Index.ets',
        'specs/component.spec.json',
        'README.md',
      ]) {
        assert.ok(fs.existsSync(path.join(ROOT, packageRoot, rel)), pkg + '/' + rel + ' must exist');
      }
      const spec = readJson(packageRoot + '/specs/component.spec.json');
      assert.equal(
        spec.component.root,
        'apps/' + APP + '/packages/' + pkg,
        pkg + ' component spec root must use the canonical HarmonyOS package path',
      );
      assert.equal(spec.component.type, 'arkts-package', pkg + ' must declare arkt-package type');
      assert.equal(spec.component.surface, 'console', pkg + ' must declare the console surface');
      assert.ok(
        ALLOWED_LAYER_ROLES.has(spec.contracts.layerRole),
        pkg + ' contracts.layerRole ' + JSON.stringify(spec.contracts.layerRole) + ' is not an allowed composable layer role',
      );
      for (const port of spec.contracts.providedPorts ?? []) {
        assert.ok(
          spec.contracts.publicExports.includes(port.export),
          pkg + ' providedPorts[' + port.name + '].export must reference contracts.publicExports',
        );
      }
    }
  });

  it('keeps core free of capability dependencies and declares the composition exports', () => {
    const coreDir = 'packages/' + APP + '-core';
    const corePackageJson = readJson(coreDir + '/package.json');
    for (const subpath of ['.', './sdk', './modules', './host', './session', './composition']) {
      assert.ok(subpath in corePackageJson.exports, 'core package.json exports[' + subpath + '] is required');
    }
    assert.ok(fs.existsSync(path.join(ROOT, coreDir, 'src/composition/index.ets')));
    const coreSpec = readJson(coreDir + '/specs/component.spec.json');
    assert.equal(coreSpec.contracts.layerRole, 'frontend-core');
    assert.ok(
      coreSpec.contracts.permissionComposition,
      'core declares HTTP sdkDependencies, so contracts.permissionComposition is required',
    );
    assert.equal(coreSpec.contracts.permissionComposition.applicationModule.manifestRef.includes('iam.module.manifest.json'), true);
    const coreSource = listSourceFiles(coreDir + '/src')
      .filter((file) => file.endsWith('.ets'))
      .map((file) => readText(file))
      .join('\n');
    assert.doesNotMatch(
      coreSource,
      new RegExp('@sdkwork/' + APP + '-console-', 'u'),
      'frontend-core must not depend on a capability package',
    );
  });

  it('ships one capability package per console capability on the canonical route id', () => {
    const contracts = fs.readFileSync(
      path.join(REPO, 'apps/sdkwork-cloudrouter-common/packages/sdkwork-cloudrouter-contracts/src/routes.ts'),
      'utf8',
    );
    for (const pkg of CAPABILITY_PKGS) {
      const spec = readJson('packages/' + pkg + '/specs/component.spec.json');
      assert.equal(spec.contracts.layerRole, 'frontend-feature', pkg + ' is a feature package');
      assert.deepEqual(spec.contracts.sdkDependencies, [], pkg + ' owns no generated-SDK dependency');
      assert.deepEqual(spec.contracts.sdkClients, [], pkg + ' owns no SDK client');
      const contributions = readText('packages/' + pkg + '/src/main/ets/routes/RouteContributions.ets');
      const routeId = /id: '([^']+)'/u.exec(contributions)[1];
      const routePath = /pagePath: '([^']+)'/u.exec(contributions)[1];
      assert.ok(contracts.includes("'" + routeId + "'"), routeId + ' is a shared console route id');
      assert.ok(routePath.startsWith('pages/console/'), routePath + ' must be a HarmonyOS page path');
    }
  });

  it('materializes every deployment profile and keeps cloud origins on the root authority', () => {
    assert.deepEqual(deployment.materialization.profiles, PROFILE_IDS);
    assert.equal(deployment.materialization.format, 'json');
    assert.equal(deployment.materialization.runtimeTarget, 'harmony-native');
    for (const profileId of PROFILE_IDS) {
      const [deploymentProfile, environment] = profileId.split('.');
      const payload = readJson('config/app/runtime-env.' + profileId + '.json');
      assert.equal(payload.profileId, profileId);
      assert.equal(payload.deploymentProfile, deploymentProfile);
      assert.equal(payload.environment, environment);
      assert.equal(payload.runtimeTarget, 'harmony-native');
      assert.ok(
        payload.router.appApiBaseUrl.endsWith('/app/v3/api'),
        profileId + ' app api base url must target /app/v3/api',
      );
      assert.ok(
        payload.router.backendApiBaseUrl.endsWith('/backend/v3/api'),
        profileId + ' backend api base url must target /backend/v3/api',
      );
      if (deploymentProfile !== 'cloud') continue;
      const authority = rootDeployment.environments[environment];
      assert.ok(authority, 'root deployment config must declare environment ' + environment);
      const authoritativeApi = authority.cloudApiBaseUrl.split(';')[0].replace(/\/+$/u, '');
      assert.ok(
        payload.router.appApiBaseUrl.startsWith(authoritativeApi + '/'),
        profileId + ' must derive its api origin from the root deployment authority (' + authoritativeApi + '), got ' + payload.router.appApiBaseUrl,
      );
      assert.equal(
        payload.metadata.applicationPublicHttpUrl,
        authority.applicationOrigin.replace(/\/+$/u, ''),
        profileId + ' must derive its public http url from the root deployment authority',
      );
    }
  });

  it('keeps the root entry module thin', () => {
    const pageFiles = listSourceFiles('entry/src/main/ets').filter((file) =>
      /\/pages\/(?!Index\.ets)/u.test(file),
    );
    assert.deepEqual(pageFiles, [], 'root entry/ must stay thin: business pages belong in capability packages');
    const entrySource = listSourceFiles('entry/src/main/ets')
      .filter((file) => file.endsWith('.ets'))
      .map((file) => readText(file))
      .join('\n');
    assert.doesNotMatch(entrySource, /@ohos\.net\.http|http\.createHttp/u, 'entry/ must not perform raw HTTP');
  });

  it('keeps capability packages free of raw transport', () => {
    for (const pkg of CAPABILITY_PKGS) {
      const source = listSourceFiles('packages/' + pkg + '/src')
        .filter((file) => file.endsWith('.ets'))
        .map((file) => readText(file))
        .join('\n');
      assert.doesNotMatch(source, /@ohos\.net\.http|http\.createHttp|fetch\(/u, pkg + ' must not perform raw HTTP transport');
      assert.doesNotMatch(
        source,
        /cloudrouter-app-sdk-typescript|cloudrouter_app_sdk/u,
        pkg + ' must not import a generated SDK transport module directly',
      );
    }
  });

  it('declares the app manifest for HarmonyOS distribution', () => {
    assert.equal(manifest.app.appType, 'APP_HARMONY');
    assert.equal(manifest.runtime.family, 'mobile');
    assert.equal(manifest.runtime.framework, 'harmony-native');
    assert.ok(manifest.publish.platforms.includes('APP_HARMONY'));
    assert.equal(manifest.app.identifiers.packageName, 'com.sdkwork.cloudrouter.mobile');
  });

  it('declares the HarmonyOS toolchain and ArkTS SDK gaps instead of claiming a bundle', () => {
    const metadata = manifest.artifacts.installConfig.metadata;
    assert.equal(metadata.deferred, true);
    assert.equal(metadata.packageManager, 'ohpm');
    assert.ok(String(metadata.deferredReason).length > 20);
    const coreReadme = readText('packages/' + APP + '-core/README.md');
    assert.ok(coreReadme.includes('No **ArkTS** target exists yet'), 'the missing ArkTS SDK target stays documented');
    const sdksReadme = readText('sdks/README.md');
    assert.ok(sdksReadme.includes('arkts'), 'sdks/README.md must record the missing arkts target');
  });

  it('keeps checked-in host descriptors secret-free', () => {
    const hostFiles = listSourceFiles('config/host');
    assert.ok(hostFiles.length > 0, 'config/host must contain checked-in templates');
    const secretPattern = /(signingPrivateKey|privateKey|refreshToken|apiKey|databaseUrl|password)\s*[:=]\s*["'][^"'<]/iu;
    for (const hostFile of hostFiles) {
      assert.doesNotMatch(readText(hostFile), secretPattern, hostFile + ' must not contain secrets');
    }
  });
});
