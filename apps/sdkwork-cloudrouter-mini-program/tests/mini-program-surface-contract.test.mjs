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

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

const manifest = readJson('sdkwork.app.config.json');
const rootSpec = readJson('specs/component.spec.json');
const appJson = readJson('src/app.json');
const deployment = readJson('etc/sdkwork.deployment.config.json');
const rootDeployment = JSON.parse(
  fs
    .readFileSync(path.join(REPO, 'etc/sdkwork.deployment.config.json'), 'utf8')
    .replace(/^\uFEFF/u, ''),
);
const PROFILE_IDS = Object.keys(rootDeployment.profiles);

const capabilityIds = [
  ...fs
    .readFileSync(
      path.join(
        REPO,
        'apps/sdkwork-cloudrouter-common/packages/sdkwork-cloudrouter-contracts/src/capabilities.ts',
      ),
      'utf8',
    )
    .matchAll(/\bid: '(console-[^']+)'/gu),
].map((match) => match[1]);

const PAGE_BY_CAPABILITY_ID = {
  'console-dashboard': 'pages/dashboard/index',
  'console-usage': 'pages/usage/index',
  'console-api-keys': 'pages/api-keys/index',
  'console-catalog': 'pages/catalog/index',
};

const PACKAGE_BY_CAPABILITY_ID = {
  'console-dashboard': 'sdkwork-cloudrouter-mp-console-dashboard',
  'console-usage': 'sdkwork-cloudrouter-mp-console-usage',
  'console-api-keys': 'sdkwork-cloudrouter-mp-console-api-keys',
  'console-catalog': 'sdkwork-cloudrouter-mp-console-catalog',
};

describe('cloudrouter mini program application root', () => {
  it('declares the mini program runtime identity', () => {
    assert.equal(manifest.app.key, 'sdkwork-cloudrouter-mini-program');
    assert.equal(manifest.app.appType, 'APP_UNIAPP');
    assert.equal(manifest.runtime.family, 'mini-program');
    assert.equal(manifest.runtime.framework, 'mp-weixin');
    assert.equal(manifest.runtime.defaultPlatform, 'MP_WEIXIN');
    assert.ok(manifest.runtime.supportedDeploymentProfiles.includes(manifest.runtime.defaultDeploymentProfile));
  });

  it('ships the full package family', () => {
    for (const dir of Object.values(PACKAGE_BY_CAPABILITY_ID)) {
      const packageJson = readJson(`packages/${dir}/package.json`);
      assert.equal(packageJson.name, `@sdkwork/cloudrouter-mp-console-${dir.replace('sdkwork-cloudrouter-mp-console-', '')}`);
      assert.ok(fs.existsSync(path.join(ROOT, 'packages', dir, 'specs/component.spec.json')));
    }
    for (const dir of [
      'sdkwork-cloudrouter-mp-core',
      'sdkwork-cloudrouter-mp-commons',
      'sdkwork-cloudrouter-mp-shell',
      'sdkwork-cloudrouter-mp-i18n',
    ]) {
      assert.ok(fs.existsSync(path.join(ROOT, 'packages', dir, 'package.json')));
      assert.ok(fs.existsSync(path.join(ROOT, 'packages', dir, 'specs/component.spec.json')));
    }
  });

  it('keeps the core package composition subpaths', () => {
    const corePackage = readJson('packages/sdkwork-cloudrouter-mp-core/package.json');
    for (const subpath of ['.', './sdk', './modules', './host', './session', './composition']) {
      assert.ok(subpath in corePackage.exports, `core exports ${subpath}`);
    }
  });

  it('integrates the generated app SDK only through the core package', () => {
    const coreSpec = readJson('packages/sdkwork-cloudrouter-mp-core/specs/component.spec.json');
    assert.deepEqual(coreSpec.contracts.sdkDependencies, [
      { workspace: 'cloudrouter-app-sdk', surface: 'app-api', credentialMode: 'authenticated-app-api' },
    ]);
    for (const dir of Object.values(PACKAGE_BY_CAPABILITY_ID)) {
      const spec = readJson(`packages/${dir}/specs/component.spec.json`);
      assert.ok(!spec.contracts.sdkDependencies, `${dir} must not own SDK dependencies`);
    }
  });

  it('never claims operator scope in the client manifest', () => {
    assert.ok(!manifest.backend.accessTokenPermissionScope.includes('cloudrouter.admin.access'));
  });

  it('registers every shared console capability as a mini program page', () => {
    assert.deepEqual([...capabilityIds].sort(), [
      'console-api-keys',
      'console-catalog',
      'console-dashboard',
      'console-usage',
    ]);
    for (const capabilityId of capabilityIds) {
      const page = PAGE_BY_CAPABILITY_ID[capabilityId];
      assert.ok(appJson.pages.includes(page), `app.json registers ${page}`);
      assert.ok(
        fs.existsSync(path.join(ROOT, 'src', page + '.js')),
        `${page} has a page module`,
      );
      assert.ok(
        fs.existsSync(path.join(ROOT, 'src', page + '.wxml')),
        `${page} has a template`,
      );
      const contribution = readText(
        `packages/${PACKAGE_BY_CAPABILITY_ID[capabilityId]}/src/routes/routeContribution.ts`,
      );
      assert.ok(
        contribution.includes(`capabilityId: '${capabilityId}'`),
        `${capabilityId} package declares its capability id`,
      );
      assert.ok(
        contribution.includes(`pagePath: '${page}'`),
        `${capabilityId} package declares its page path`,
      );
    }
  });

  it('materializes every deployment profile into config/mini-program/', () => {
    assert.deepEqual(deployment.materialization.profiles, PROFILE_IDS);
    assert.equal(deployment.materialization.format, 'mini-program-json');
    assert.equal(
      deployment.materialization.outputPattern,
      '../config/mini-program/runtime-env.{deploymentProfile}.{environment}.json',
    );
    for (const profileId of PROFILE_IDS) {
      const [profile, environment] = profileId.split('.');
      const payload = readJson('config/mini-program/runtime-env.' + profileId + '.json');
      assert.equal(payload.SDKWORK_PROFILE_ID, profileId);
      assert.equal(payload.SDKWORK_DEPLOYMENT_PROFILE, profile);
      assert.equal(payload.SDKWORK_ENVIRONMENT, environment);
      assert.equal(payload.SDKWORK_RUNTIME_TARGET, 'mini-program');
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
      const payload = readJson('config/mini-program/runtime-env.' + profileId + '.json');
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

  it('declares the mini program build gap instead of claiming a bundle', () => {
    const metadata = manifest.artifacts.installConfig.metadata;
    assert.equal(metadata.deferred, true);
    assert.equal(metadata.packageManager, 'pnpm');
    assert.ok(String(metadata.deferredReason).length > 20);
    assert.equal(rootSpec.component.type, 'mini-program-app-root');
    assert.deepEqual(rootSpec.contracts.sdkDependencies, ['cloudrouter-app-sdk']);
  });
});
