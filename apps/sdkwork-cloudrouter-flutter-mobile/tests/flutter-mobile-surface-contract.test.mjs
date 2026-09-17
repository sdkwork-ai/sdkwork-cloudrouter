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

function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function readJsonAt(abs) {
  return JSON.parse(fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/u, ''));
}

const CAPABILITY_KEYS = ["dashboard","usage","api_keys","catalog"];
const CAPABILITY_PKGS = ["sdkwork_cloudrouter_flutter_mobile_console_dashboard","sdkwork_cloudrouter_flutter_mobile_console_usage","sdkwork_cloudrouter_flutter_mobile_console_api_keys","sdkwork_cloudrouter_flutter_mobile_console_catalog"];
const PROFILE_IDS = ["standalone.development","standalone.test","standalone.staging","standalone.production","standalone.demo","cloud.development","cloud.test","cloud.staging","cloud.production","cloud.demo"];

const rootSpec = readJson('specs/component.spec.json');
const manifest = readJson('sdkwork.app.config.json');
const deployment = readJson('etc/sdkwork.deployment.config.json');
const rootDeployment = readJsonAt(path.join(REPO, 'etc/sdkwork.deployment.config.json'));

describe('cloudrouter flutter mobile application root', () => {
  it('declares the flutter mobile app root contract', () => {
    assert.equal(rootSpec.component.type, 'flutter-mobile-app-root');
    assert.equal(rootSpec.component.root, 'apps/sdkwork-cloudrouter-flutter-mobile');
    assert.deepEqual(rootSpec.component.manifests, ['pubspec.yaml', 'sdkwork.app.config.json']);
    assert.deepEqual(rootSpec.contracts.sdkClients, ['SdkworkAppClient']);
    const dependency = rootSpec.contracts.sdkDependencies[0];
    assert.equal(dependency.workspace, 'cloudrouter-app-sdk');
    assert.equal(dependency.packageName, 'cloudrouter_app_sdk');
  });

  it('registers every capability package from the root pubspec', () => {
    const pubspec = readText('pubspec.yaml');
    for (const pkg of CAPABILITY_PKGS) {
      assert.ok(pubspec.includes('  ' + pkg + ':'), pkg + ' is a root dependency');
      assert.ok(pubspec.includes('path: packages/' + pkg), pkg + ' resolves by path');
    }
  });

  it('ships one package per capability with a layerRole contract', () => {
    for (const [index, pkg] of CAPABILITY_PKGS.entries()) {
      const spec = readJson('packages/' + pkg + '/specs/component.spec.json');
      assert.equal(spec.contracts.layerRole, 'frontend-feature', pkg + ' is a feature package');
      assert.deepEqual(spec.contracts.sdkDependencies, [], pkg + ' owns no SDK dependency');
      assert.deepEqual(spec.contracts.sdkClients, [], pkg + ' owns no SDK client');
      assert.equal(spec.component.capability, CAPABILITY_KEYS[index]);
      assert.ok(fs.existsSync(path.join(ROOT, 'packages', pkg, 'pubspec.yaml')));
      assert.ok(fs.existsSync(path.join(ROOT, 'packages', pkg, 'lib', pkg + '.dart')));
    }
  });

  it('reuses the canonical console route ids and paths', () => {
    const contracts = fs.readFileSync(
      path.join(REPO, 'apps/sdkwork-cloudrouter-common/packages/sdkwork-cloudrouter-contracts/src/routes.ts'),
      'utf8',
    );
    for (const pkg of CAPABILITY_PKGS) {
      const contributions = readText('packages/' + pkg + '/lib/src/routes/route_contributions.dart');
      const routeId = /id: '([^']+)'/u.exec(contributions)[1];
      const routePath = /routeName: '([^']+)'/u.exec(contributions)[1];
      assert.ok(contracts.includes("'" + routeId + "'"), routeId + ' is a shared route id');
      assert.ok(contracts.includes("'" + routePath + "'"), routePath + ' is a shared route path');
    }
  });

  it('materializes every deployment profile into env/', () => {
    assert.deepEqual(deployment.materialization.profiles, PROFILE_IDS);
    assert.equal(deployment.materialization.format, 'dart-define-json');
    for (const profileId of PROFILE_IDS) {
      const [profile, environment] = profileId.split('.');
      const payload = readJson('env/sdkwork.' + profile + '.' + environment + '.json');
      assert.equal(payload.SDKWORK_PROFILE_ID, profileId);
      assert.equal(payload.SDKWORK_DEPLOYMENT_PROFILE, profile);
      assert.equal(payload.SDKWORK_ENVIRONMENT, environment);
      assert.equal(payload.SDKWORK_RUNTIME_TARGET, 'flutter-android');
      assert.equal(payload.SDKWORK_CLOUDROUTER_ROUTER_PROFILE_ID, profileId);
      assert.ok(
        /^https?:\/\/\S+$/u.test(payload.SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL || ''),
        profileId + ' must carry an absolute application public http url',
      );
      // The standalone topology registers no platform gateway, so the app api
      // binding resolves to nothing and the materializer omits the key instead
      // of emitting an empty string.
      assert.equal(
        Object.hasOwn(payload, 'SDKWORK_CLOUDROUTER_ROUTER_APP_API_BASE_URL'),
        profile === 'cloud',
        profileId + ' app api base url presence must match the binding resolution',
      );
    }
  });

  it('declares the permission composition contract the core SDK dependency requires', () => {
    const coreSpec = readJson(
      'packages/sdkwork_cloudrouter_flutter_mobile_core/specs/component.spec.json',
    );
    const composition = coreSpec.contracts.permissionComposition;
    assert.ok(
      composition,
      'core declares HTTP sdkDependencies, so contracts.permissionComposition is required',
    );
    assert.equal(composition.inheritanceMode, 'module-catalog-with-overrides');
    for (const ref of [
      composition.applicationModule.manifestRef,
      ...composition.moduleCatalogRefs.map((entry) => entry.manifestRef),
    ]) {
      const resolved = path.resolve(
        ROOT,
        'packages/sdkwork_cloudrouter_flutter_mobile_core',
        ref,
      );
      assert.ok(fs.existsSync(resolved), 'permissionComposition manifestRef must resolve: ' + ref);
    }
  });

  it('keeps every cloud base url on the root deployment authority', () => {
    assert.deepEqual(deployment.materialization.profiles, Object.keys(rootDeployment.profiles));
    // APP_RUNTIME_TOPOLOGY_SPEC section 4.2: non-dotenv client surfaces carry the
    // ';'-joined multi-origin cloud API list verbatim, while the vite dotenv
    // surface folds it to the primary registered origin. The joining form is
    // owned by sdkwork-specs/tools/materialize-client-env.mjs; `pnpm check:client-env`
    // is the byte-level verifier for the profiles this repository can materialize.
    const developmentTopology = fs.readFileSync(
      path.join(REPO, 'etc/topology/cloud.development.env'),
      'utf8',
    );
    const localGateway =
      /^SDKWORK_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL=(.+)$/mu.exec(developmentTopology)?.[1]?.trim();
    for (const profileId of PROFILE_IDS) {
      const [profile, environment] = profileId.split('.');
      if (profile !== 'cloud') continue;
      const authority = rootDeployment.environments[environment];
      assert.ok(authority, 'root deployment config must declare environment ' + environment);
      const payload = readJson('env/sdkwork.' + profile + '.' + environment + '.json');
      assert.equal(
        payload.SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL,
        authority.applicationOrigin.replace(/\/+$/u, ''),
        profileId + ' must derive its public http url from the root deployment authority',
      );
      if (environment === 'development') {
        assert.ok(localGateway, 'cloud.development topology must declare a local gateway override');
        assert.equal(
          payload.SDKWORK_CLOUDROUTER_ROUTER_APP_API_BASE_URL,
          localGateway,
          profileId + ' must carry the topology local gateway override',
        );
        continue;
      }
      assert.equal(
        payload.SDKWORK_CLOUDROUTER_ROUTER_APP_API_BASE_URL,
        authority.cloudApiBaseUrl,
        profileId + ' must carry the root authority multi-origin cloud api list verbatim',
      );
    }
  });

  it('keeps feature packages free of generated SDK imports', () => {
    for (const pkg of CAPABILITY_PKGS) {
      const lib = path.join(ROOT, 'packages', pkg, 'lib');
      const stack = [lib];
      while (stack.length > 0) {
        const current = stack.pop();
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
          const full = path.join(current, entry.name);
          if (entry.isDirectory()) stack.push(full);
          else if (entry.name.endsWith('.dart')) {
            const text = fs.readFileSync(full, 'utf8');
            assert.ok(!text.includes('cloudrouter_app_sdk'), full + ' must not import the generated transport');
          }
        }
      }
    }
  });

  it('declares the Flutter toolchain gap instead of claiming a bundle', () => {
    const metadata = manifest.artifacts.installConfig.metadata;
    assert.equal(metadata.deferred, true);
    assert.equal(metadata.packageManager, 'flutter');
    assert.ok(String(metadata.deferredReason).length > 20);
    const coreReadme = fs.readFileSync(
      path.join(ROOT, 'packages', 'sdkwork_cloudrouter_flutter_mobile_core', 'README.md'),
      'utf8',
    );
    assert.ok(coreReadme.includes('apiKeysCreate()'), 'the generated Dart SDK gap stays documented');
  });
});
