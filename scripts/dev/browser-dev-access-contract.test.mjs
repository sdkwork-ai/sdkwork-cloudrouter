/**
 * Browser dev access contract — standalone × cloud mode matrix.
 *
 * Single source of truth: `specs/topology.spec.json` + `etc/topology/*.env`.
 * For each development profile the test resolves the REAL execution plan
 * (`sdkwork-app dev --dry-run`) and the REAL dev runtime documents of both
 * browser surfaces (PC `/runtime-env.js` bag, H5 `/runtime-env.json`),
 * then asserts the shared same-origin contract:
 *
 * - one browser-visible ingress origin (WEB_DEV_INGRESS_BIND) for both modes;
 * - profile-only server-side fan-out: standalone → application.public-ingress,
 *   cloud → the local platform gateway anchor;
 * - private PC/H5 renderer ports, never browser entry points;
 * - dev runtime documents: same-origin relative API bases, no loopback
 *   origins, no process-only topology `_HTTP_URL` keys.
 *
 * Run via `pnpm test:topology`.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  assertBrowserDevRuntimeEnvDocument,
  buildBrowserDevRuntimeEnvDocument,
} from '../lib/cloud-router-browser-env-contract.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SDKWORK_APP_CLI = path.resolve(REPO, '../sdkwork-app-topology/scripts/sdkwork-app.mjs');

const DEV_PROFILES = ['standalone.development', 'cloud.development'];

function parseEnvFile(profileId) {
  const relativePath = `etc/topology/${profileId}.env`;
  const values = {};
  for (const rawLine of fs.readFileSync(path.join(REPO, relativePath), 'utf8').split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator <= 0) continue;
    values[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return values;
}

function parseAppDotEnv(appRoot, mode) {
  const dotenvPath = path.join(REPO, appRoot, `.env.${mode}`);
  if (!fs.existsSync(dotenvPath)) return {};
  const values = {};
  for (const rawLine of fs.readFileSync(dotenvPath, 'utf8').split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator <= 0) continue;
    values[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return values;
}

function resolveDevPlan(deploymentProfile) {
  const result = spawnSync(process.execPath, [
    SDKWORK_APP_CLI,
    'dev',
    '--root', REPO,
    '--deployment-profile', deploymentProfile,
    '--dry-run',
  ], { cwd: REPO, encoding: 'utf8' });
  assert.equal(result.status, 0, `${deploymentProfile} plan failed: ${result.stderr || result.stdout}`);
  const stdout = result.stdout.slice(result.stdout.indexOf('{'));
  return JSON.parse(stdout).plan;
}

function browserVisibleOriginFromBind(bind) {
  const match = /^(.+):(\d+)$/u.exec(bind.trim());
  assert.ok(match, `WEB_DEV_INGRESS_BIND must be <host>:<port>, got ${bind}`);
  return `http://${match[1]}:${match[2]}`;
}

for (const profileId of DEV_PROFILES) {
  const deploymentProfile = profileId.split('.')[0];
  const profileEnv = parseEnvFile(profileId);
  const expectedIngressOrigin = browserVisibleOriginFromBind(
    profileEnv.SDKWORK_CLOUDROUTER_ROUTER_WEB_DEV_INGRESS_BIND,
  );
  const expectedPcRendererPort = profileEnv.SDKWORK_CLOUDROUTER_ROUTER_PC_INTERNAL_DEV_PORT;
  const expectedH5RendererPort = profileEnv.SDKWORK_CLOUDROUTER_ROUTER_H5_INTERNAL_DEV_PORT;

  test(`[${profileId}] plan keeps one browser entry and profile-only server-side API fan-out`, () => {
    const plan = resolveDevPlan(deploymentProfile);
    assert.equal(plan.activeProfile, profileId);
    assert.equal(plan.forbiddenProcesses.length, 0);

    // One adaptive delivery, one browser-visible origin for both modes.
    const delivery = plan.browserDeliveries.find((candidate) => candidate.id === 'cloudrouter-adaptive-web');
    assert.ok(delivery, 'adaptive browser delivery must be declared');
    assert.equal(delivery.browserVisibleOrigin, expectedIngressOrigin);
    assert.equal(delivery.originMode, 'same-origin');
    assert.equal(delivery.deliveryMode, 'dev-server-proxy');
    assert.deepEqual(delivery.clientArchitectures, ['pc-web', 'h5']);

    // Renderers stay private client tooling on the profile-declared ports.
    const rendererPorts = Object.fromEntries(
      delivery.renderers.map((renderer) => [renderer.architecture, String(renderer.port)]),
    );
    assert.deepEqual(rendererPorts, { 'pc-web': expectedPcRendererPort, h5: expectedH5RendererPort });

    // Profile-only server-side fan-out: standalone fronts its own application
    // ingress; cloud fronts the locally started platform gateway anchor.
    if (deploymentProfile === 'standalone') {
      assert.equal(delivery.apiSurfaceId, 'application.public-ingress');
      assert.equal(
        delivery.apiTargetOrigin,
        profileEnv.SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL,
      );
      const gatewayProcesses = plan.localProcesses.filter((process) => process.role === 'api-standalone-gateway');
      assert.equal(gatewayProcesses.length, 1);
      assert.equal(plan.localDataStores.length, 0, 'browser dev must not own a database process');
    } else {
      assert.equal(delivery.apiSurfaceId, 'platform.api-gateway');
      assert.equal(
        delivery.apiTargetOrigin,
        profileEnv.SDKWORK_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL,
        'cloud dev must bind the locally started sdkwork-api-cloud-gateway',
      );
      for (const process of plan.localProcesses) {
        assert.equal(process.role, 'client', `cloud dev must not start local ${process.role} processes`);
      }
    }

    // The single browser entry is the primary access endpoint.
    assert.equal(plan.primaryAccessEndpoint.url, `${expectedIngressOrigin}/`);
    assert.equal(plan.primaryAccessEndpoint.primary, true);
  });

  test(`[${profileId}] plan documents match the same-origin dev runtime contract`, async () => {
    const plan = resolveDevPlan(deploymentProfile);
    const delivery = plan.browserDeliveries.find((candidate) => candidate.id === 'cloudrouter-adaptive-web');
    const ingressOrigin = delivery.browserVisibleOrigin;

    // Renderer process env, as built by the adaptive delivery host: the
    // delivery surface's clientHttpEnv is bound to the browser-visible origin.
    const rendererEnv = {
      ...profileEnv,
      ...parseAppDotEnv('apps/sdkwork-cloudrouter-pc', profileId),
    };
    const surfaceClientEnvByProfile = deploymentProfile === 'standalone'
      ? 'VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL'
      : 'VITE_SDKWORK_CLOUDROUTER_ROUTER_PLATFORM_API_GATEWAY_HTTP_URL';
    rendererEnv[surfaceClientEnvByProfile] = ingressOrigin;

    const pc = await import('../../apps/sdkwork-cloudrouter-pc/vite.config.ts');
    const script = pc.buildPortalRuntimeEnvScript(pc.resolvePortalDevBrowserRuntimeEnv(rendererEnv));
    const freezeMarker = 'Object.freeze(';
    const freezeStart = script.indexOf(freezeMarker) + freezeMarker.length;
    const pcDocument = JSON.parse(
      script.slice(freezeStart, script.indexOf('});', freezeStart) + 1),
    );
    assertBrowserDevRuntimeEnvDocument(pcDocument, { profileId });
    // BROWSER_RUNTIME_ENV_SPEC.md section 4: the served script publishes the
    // canonical global so shared SDK packages resolve mode/base in-browser.
    assert.match(script, /globalThis\.SDKWORK_RUNTIME_ENV = window\.__CLOUDROUTER_ENV__;/u);
    assert.equal(pcDocument.VITE_SDKWORK_CLOUDROUTER_ROUTER_PROFILE_ID, profileId);
    assert.equal(pcDocument.VITE_SDKWORK_DEPLOYMENT_PROFILE, deploymentProfile);
    assert.equal(
      pcDocument.VITE_SDKWORK_CLOUDROUTER_ROUTER_DEPLOYMENT_PROFILE,
      deploymentProfile,
    );

    const h5 = await import('../../apps/sdkwork-cloudrouter-h5/vite.config.ts');
    const config = await h5.default({ mode: profileId, command: 'serve' });
    const plugin = (config.plugins ?? []).flat()
      .find((candidate) => candidate?.name === 'cloudrouter-runtime-env-document');
    assert.ok(plugin, 'h5 dev runtime-env document middleware must be registered');
    let handler;
    plugin.configureServer({ middlewares: { use: (registered) => { handler = registered; } } });
    let response;
    handler({ url: '/runtime-env.json' }, {
      statusCode: 0,
      headers: {},
      setHeader(name, value) { this.headers[name] = value; },
      end(body) { response = { statusCode: this.statusCode, body }; },
    }, () => { throw new Error('runtime-env.json request must not pass through'); });
    assert.equal(response.statusCode, 200);
    const h5Document = JSON.parse(response.body);
    assertBrowserDevRuntimeEnvDocument(h5Document, { profileId });

    // Both surfaces serve the SAME document shape for the same profile — the
    // deployment profile never changes the browser-visible contract.
    const expectedDocument = buildBrowserDevRuntimeEnvDocument({ profileId });
    assert.deepEqual(h5Document, { ...expectedDocument });
    for (const [key, expected] of Object.entries({
      // The PC bag carries the VITE_-prefixed forms of the shared document.
      VITE_CLOUDROUTER_APP_API_BASE_URL: expectedDocument.appApiBaseUrl,
      VITE_CLOUDROUTER_BACKEND_API_BASE_URL: expectedDocument.backendApiBaseUrl,
      VITE_CLOUDROUTER_OPEN_API_BASE_URL: expectedDocument.openApiBaseUrl,
    })) {
      assert.equal(pcDocument[key], expected, `pc ${key} must match the shared dev document`);
    }
  });
}
