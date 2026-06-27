import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

async function exists(relativePath) {
  try {
    await stat(path.join(ROOT, relativePath));
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function read(relativePath) {
  return readFile(path.join(ROOT, relativePath), 'utf8');
}

async function readJson(relativePath) {
  return JSON.parse(await read(relativePath));
}

test('declares v2 topology spec and profile env files for sdkwork-clawrouter', async () => {
  assert.equal(await exists('specs/topology.spec.json'), true);
  assert.equal(await exists('scripts/lib/claw-router-topology.mjs'), true);
  assert.equal(await exists('scripts/claw-router-dev.mjs'), true);
  assert.equal(await exists('docs/topology-standard.md'), true);

  const spec = await readJson('specs/topology.spec.json');
  assert.equal(spec.schemaVersion, 2);
  assert.equal(spec.kind, 'sdkwork.app.topology');
  assert.equal(spec.appId, 'sdkwork-clawrouter');
  assert.equal(spec.archetype, 'application-http-gateway');
  assert.equal(spec.defaults.developmentProfileId, 'standalone.unified-process.development');
  assert.ok(spec.surfaces['application.public-ingress']);
  assert.ok(spec.surfaces['application.backend-http']);
  assert.ok(spec.surfaces['application.open-http']);
  assert.ok(spec.surfaces['platform.api-gateway']);

  for (const profileId of [
    'standalone.unified-process.development',
    'standalone.split-services.development',
    'standalone.unified-process.production',
    'standalone.split-services.production',
    'cloud.unified-process.development',
    'cloud.unified-process.production',
    'cloud.split-services.development',
    'cloud.split-services.production',
  ]) {
    const profilePath = spec.profileFiles[profileId];
    assert.equal(await exists(profilePath), true, `${profilePath} should exist`);
    const profileEnv = await read(profilePath);
    assert.match(profileEnv, /SDKWORK_CLAW_ROUTER_PROFILE_ID=/);
    assert.match(profileEnv, /VITE_SDKWORK_CLAW_ROUTER_APPLICATION_PUBLIC_HTTP_URL=/);
    assert.match(profileEnv, /VITE_SDKWORK_CLAW_ROUTER_PLATFORM_API_GATEWAY_HTTP_URL=/);
  }
});

test('root package.json wires @sdkwork/app-topology and canonical dev scripts', async () => {
  const packageJson = await readJson('package.json');
  const spec = await readJson('specs/topology.spec.json');
  assert.equal(packageJson.dependencies['@sdkwork/app-topology'], 'file:../sdkwork-app-topology');
  assert.equal(packageJson.scripts.dev, 'pnpm install:deps:ensure && pnpm dev:browser');
  assert.equal(packageJson.scripts['dev:browser'], 'pnpm dev:browser:postgres:unified-process:standalone');
  assert.match(packageJson.scripts['dev:browser:postgres:unified-process:standalone'], /scripts\/claw-router-dev\.mjs/);
  assert.match(packageJson.scripts['dev:browser:postgres:unified-process:standalone'], /--deployment-profile standalone/u);
  assert.match(packageJson.scripts['dev:browser:postgres:unified-process:standalone'], /--service-layout unified-process/u);
  assert.match(packageJson.scripts['dev:browser:postgres:unified-process:standalone'], /--target browser/u);
  assert.match(packageJson.scripts['dev:browser:postgres:unified-process:standalone'], /--database postgres/u);
  assert.match(packageJson.scripts['dev:browser:postgres:split-services:cloud'], /--service-layout split-services/u);
  assert.match(packageJson.scripts['dev:browser:postgres:split-services:cloud'], /--deployment-profile cloud/u);
  assert.equal(packageJson.scripts['dev:desktop'], 'pnpm dev:desktop:postgres:unified-process:standalone');
  assert.match(packageJson.scripts['dev:desktop:postgres:unified-process:standalone'], /--target desktop/u);
  assert.match(packageJson.scripts['topology:validate'], /sdkwork-topology\.mjs validate/);
  assert.match(packageJson.scripts['gateway:matrix'], /sdkwork-topology\.mjs print-matrix/);
  assert.match(packageJson.scripts['gateway:package:cloud'], /gateway-cloud-bundle\.mjs bundle/);
  assert.equal(spec.scripts.clawRouterDev, 'scripts/claw-router-dev.mjs');
  assert.equal(spec.scripts.gatewayCloudBundle, 'scripts/gateway-cloud-bundle.mjs');
  assert.equal(spec.scripts.pnpm.dev.deploymentProfile, 'standalone');
  assert.equal(spec.scripts.pnpm.dev.serviceLayout, 'unified-process');
});

test('declares cloud gateway config bundles referenced by topology spec', async () => {
  const spec = await readJson('specs/topology.spec.json');
  for (const configFile of spec.packaging.cloudConfigFiles) {
    const configPath = path.join('configs', configFile);
    assert.equal(await exists(configPath), true, `${configPath} should exist`);
  }
});

test('start-workspace loads topology profile env from adapter', async () => {
  const workspaceScript = await read('scripts/dev/start-workspace.mjs');
  assert.match(workspaceScript, /loadTopologyProfileForWorkspace/);
  assert.match(workspaceScript, /IAM_APPLICATION_BOOTSTRAP_ENV/);
  assert.match(workspaceScript, /applyTopologyProfileToWorkspaceSettings/);
  assert.match(workspaceScript, /waitForWorkspaceHealthSurfaces/);
  assert.match(workspaceScript, /bridgeTopologyBindEnvToLegacyRustEnv/);
  assert.match(workspaceScript, /--deployment-profile/);
  assert.match(workspaceScript, /--service-layout/);
  assert.match(workspaceScript, /--topology is retired/);
});

test('workspace health gate resolves URLs from topology runtime mode', async () => {
  const {
    loopbackHealthUrlFromBind,
    resolveWorkspaceHealthCheckUrls,
    waitForWorkspaceHealthSurfaces,
  } = await import('./lib/claw-router-topology.mjs');

  assert.equal(loopbackHealthUrlFromBind('0.0.0.0:3900'), 'http://127.0.0.1:3900/healthz');
  assert.deepEqual(resolveWorkspaceHealthCheckUrls({
    runtimeMode: 'all-in-one',
    serverBind: '0.0.0.0:3900',
  }), ['http://127.0.0.1:3900/healthz']);
  assert.deepEqual(resolveWorkspaceHealthCheckUrls({
    runtimeMode: 'client',
    sdkworkApiGatewayBind: '127.0.0.1:3902',
  }), ['http://127.0.0.1:3902/healthz']);

  const calls = [];
  await waitForWorkspaceHealthSurfaces({
    runtimeMode: 'all-in-one',
    serverBind: '0.0.0.0:3900',
  }, {
    waitFn: async (url) => {
      calls.push(url);
      return true;
    },
    sleep: async () => {},
  });
  assert.deepEqual(calls, ['http://127.0.0.1:3900/healthz']);
});

test('bridgeTopologyBindEnvToLegacyRustEnv maps topology binds to Rust service env keys', async () => {
  const { bridgeTopologyBindEnvToLegacyRustEnv } = await import('./lib/claw-router-topology.mjs');
  const bridged = bridgeTopologyBindEnvToLegacyRustEnv({
    SDKWORK_CLAW_ROUTER_APPLICATION_PUBLIC_INGRESS_BIND: '0.0.0.0:3900',
    SDKWORK_CLAW_ROUTER_APPLICATION_OPEN_HTTP_BIND: '127.0.0.1:18080',
    SDKWORK_CLAW_ROUTER_APPLICATION_BACKEND_HTTP_BIND: '127.0.0.1:18081',
    SDKWORK_CLAW_ROUTER_INTERNAL_APP_API_BIND: '127.0.0.1:18082',
    SDKWORK_CLAW_ROUTER_INTERNAL_PORTAL_RENDERER_BIND: '127.0.0.1:3901',
  });
  assert.equal(bridged.SDKWORK_CLAW_SERVER_BIND, '0.0.0.0:3900');
  assert.equal(bridged.SDKWORK_CLAW_GATEWAY_BIND, '127.0.0.1:18080');
  assert.equal(bridged.SDKWORK_CLAW_ADMIN_API_BIND, '127.0.0.1:18081');
  assert.equal(bridged.SDKWORK_CLAW_APP_API_BIND, '127.0.0.1:18082');
  assert.equal(bridged.SDKWORK_CLAW_PORTAL_BIND, '127.0.0.1:3901');
});

test('claw-router dev dry-run resolves surface URLs from profile env', async () => {
  const { loadTopologyProfileForWorkspace, resolveSurfaceHttpUrl, REPO_ROOT } = await import('./lib/claw-router-topology.mjs');
  const { env } = loadTopologyProfileForWorkspace();
  assert.equal(resolveSurfaceHttpUrl(env, 'application.public-ingress'), 'http://127.0.0.1:3900');
  assert.equal(resolveSurfaceHttpUrl(env, 'platform.api-gateway'), 'http://127.0.0.1:3902');
  assert.equal(env.SDKWORK_APP_ROOT, REPO_ROOT);
  assert.equal(env.SDKWORK_CLAW_ROUTER_APP_ROOT, REPO_ROOT);
  assert.equal(env.SDKWORK_IAM_APP_ROOT, path.resolve(REPO_ROOT, '..', 'sdkwork-iam'));
});

test('portal vite config uses topology client env for dev proxy fallbacks', async () => {
  const viteConfig = await read('apps/sdkwork-clawrouter-pc/vite.config.ts');
  assert.match(viteConfig, /VITE_SDKWORK_CLAW_ROUTER_APPLICATION_PUBLIC_HTTP_URL/);
  assert.match(viteConfig, /VITE_SDKWORK_CLAW_ROUTER_APPLICATION_BACKEND_HTTP_URL/);
  assert.match(viteConfig, /VITE_SDKWORK_CLAW_ROUTER_APPLICATION_OPEN_HTTP_URL/);
  assert.match(viteConfig, /VITE_SDKWORK_CLAW_ROUTER_PLATFORM_API_GATEWAY_HTTP_URL/);
  assert.doesNotMatch(viteConfig, /PORTAL_DEV_PROXY_GATEWAY_TARGET:\s*'http:\/\/127\.0\.0\.1:3902'/);
});

test('claw-router topology adapter bridges legacy portal env keys', async () => {
  const { bridgeLegacyWorkspaceEnv } = await import('./lib/claw-router-topology.mjs');
  const profileEnv = {
    SDKWORK_CLAW_ROUTER_APPLICATION_PUBLIC_HTTP_URL: 'http://127.0.0.1:3900',
    SDKWORK_CLAW_ROUTER_APPLICATION_BACKEND_HTTP_URL: 'http://127.0.0.1:3900',
    SDKWORK_CLAW_ROUTER_APPLICATION_OPEN_HTTP_URL: 'http://127.0.0.1:3900',
    SDKWORK_CLAW_ROUTER_PLATFORM_API_GATEWAY_HTTP_URL: 'http://127.0.0.1:3902',
  };
  const allInOne = bridgeLegacyWorkspaceEnv(profileEnv, { runtimeMode: 'all-in-one' });
  assert.equal(allInOne.VITE_CLAWROUTER_APP_API_BASE_URL, undefined);
  assert.equal(allInOne.PORTAL_PUBLIC_APP_API_BASE_URL, '/app/v3/api');

  const client = bridgeLegacyWorkspaceEnv(profileEnv, { runtimeMode: 'client' });
  assert.equal(client.VITE_CLAWROUTER_APP_API_BASE_URL, 'http://127.0.0.1:3902/app/v3/api');
  assert.equal(client.VITE_CLAWROUTER_BACKEND_API_BASE_URL, 'http://127.0.0.1:3902/backend/v3/api');
  assert.equal(client.VITE_CLAWROUTER_OPEN_API_BASE_URL, 'http://127.0.0.1:3902/v1');
  assert.equal(client.VITE_SDKWORK_IAM_APP_API_BASE_URL, 'http://127.0.0.1:3902');
});

test('profile env files do not use retired topology vocabulary', async () => {
  const spec = await readJson('specs/topology.spec.json');
  const retiredEnvKeys = spec.retired?.envKeys ?? [];
  for (const profileId of Object.keys(spec.profileFiles)) {
    const profileEnv = await read(spec.profileFiles[profileId]);
    for (const retiredKey of retiredEnvKeys) {
      assert.doesNotMatch(
        profileEnv,
        new RegExp(`^${retiredKey}=`, 'm'),
        `${profileId} must not declare retired env key ${retiredKey}`,
      );
    }
    assert.doesNotMatch(profileEnv, /^SDKWORK_CLAW_ROUTER_TOPOLOGY=/m);
    assert.match(profileEnv, /SDKWORK_CLAW_ROUTER_DEPLOYMENT_PROFILE=/);
    assert.match(profileEnv, /SDKWORK_CLAW_ROUTER_SERVICE_LAYOUT=/);
    assert.match(profileEnv, /SDKWORK_CLAW_ROUTER_PROFILE_ID=/);
  }
});

test('parseWorkspaceArgs rejects retired topology CLI flags', async () => {
  const { parseWorkspaceArgs } = await import('./dev/start-workspace.mjs');
  assert.throws(
    () => parseWorkspaceArgs(['--topology', 'standalone']),
    /--topology is retired/u,
  );
  assert.throws(
    () => parseWorkspaceArgs(['--internal-distributed']),
    /--internal-distributed is retired/u,
  );
  assert.throws(
    () => parseWorkspaceArgs(['--all-in-one']),
    /--all-in-one is retired/u,
  );
});

test('sdkwork.workflow.json references topology cloud-config packaging target', async () => {
  const spec = await readJson('specs/topology.spec.json');
  const workflow = await readJson('sdkwork.workflow.json');
  const topologyTarget = spec.packaging.targets.find(
    (target) => target.id === 'platform-config-bundle-tar-gz',
  );
  const workflowTarget = workflow.targets.find(
    (target) => target.outputGlobs?.includes(topologyTarget.outputGlob),
  );

  assert.ok(topologyTarget);
  assert.ok(workflowTarget);
  assert.equal(workflowTarget.profile, 'container');
  assert.equal(workflowTarget.deploymentProfile, 'cloud');
  assert.equal(workflowTarget.variant, 'config-bundle');
  assert.deepEqual(workflowTarget.outputGlobs, [topologyTarget.outputGlob]);
  const packageStep = workflow.lifecycle.package.find(
    (step) => step.name === 'Package cloud gateway config bundle',
  );
  const validateStep = workflow.lifecycle.validate.find(
    (step) => step.name === 'Validate cloud gateway config bundle',
  );
  assert.ok(packageStep?.run.includes('gateway:package:cloud'));
  assert.ok(validateStep?.run.includes('gateway:validate:cloud'));
});

test('claw-router dev orchestrator loads topology profile and forwards workspace flags', async () => {
  const devScript = await read('scripts/lib/claw-router-dev-main.mjs');
  assert.match(devScript, /loadTopologyProfileForWorkspace/);
  assert.match(devScript, /--deployment-profile/);
  assert.match(devScript, /--service-layout/);
  assert.match(devScript, /--target/);
  assert.match(devScript, /--database/);
  assert.match(devScript, /run-claw-router-application\.mjs/);
  assert.match(devScript, /topology is retired/);
});

test('CI verification plan includes commercial contract guardians and portal typecheck', async () => {
  const module = await import('./verify-claw-router-application.mjs');
  const plan = module.buildVerificationPlan({ ci: true }, {});
  const labels = plan.map((step) => step.label);

  assert.ok(labels.includes('frontend contract guard'));
  assert.ok(labels.includes('openapi precision audit'));
  assert.ok(labels.includes('portal frontend typecheck'));
});

test('verification plan runs topology checks before tooling contract tests', async () => {
  const module = await import('./verify-claw-router-application.mjs');
  const plan = module.buildVerificationPlan({ fast: true }, {});
  const labels = plan.map((step) => step.label);
  const topologyValidateIndex = labels.indexOf('topology spec validate');
  const topologyContractIndex = labels.indexOf('topology contract tests');
  const toolingIndex = labels.indexOf('tooling contract tests');

  assert.ok(topologyValidateIndex >= 0);
  assert.ok(topologyContractIndex >= 0);
  assert.ok(toolingIndex >= 0);
  assert.ok(topologyValidateIndex < toolingIndex);
  assert.ok(topologyContractIndex < toolingIndex);
});

test('claw-router embedded IAM bootstrap standard stays aligned with sdkwork-iam framework', async () => {
  const { spawnSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const path = await import('node:path');
  const scriptPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'dev',
    'sdkwork-clawrouter-iam-application-bootstrap-standard.test.mjs',
  );
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
