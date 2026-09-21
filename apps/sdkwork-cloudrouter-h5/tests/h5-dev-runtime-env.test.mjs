import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { default: defineViteConfig } = await import('../vite.config.ts');

function createFakeDevServer() {
  const handlers = [];
  return {
    handlers,
    middlewares: {
      use: (handler) => handlers.push(handler),
    },
  };
}

function runMiddleware(handler, url) {
  return new Promise((resolve) => {
    const response = {
      statusCode: 0,
      headers: {},
      setHeader(name, value) {
        this.headers[name] = value;
      },
      end(body) {
        resolve({ statusCode: this.statusCode, headers: this.headers, body });
      },
    };
    handler({ url }, response, () => resolve(null));
  });
}

async function resolveRuntimeEnvPlugin(mode) {
  const config = await defineViteConfig({ mode, command: 'serve' });
  const plugins = (config.plugins ?? []).flat();
  const plugin = plugins.find((candidate) => candidate?.name === 'cloudrouter-runtime-env-document');
  assert.ok(plugin, `${mode} must register the runtime-env document plugin`);
  return plugin;
}

test('dev server answers /runtime-env.json with a same-origin document', async () => {
  for (const mode of ['standalone.development', 'cloud.development']) {
    const plugin = await resolveRuntimeEnvPlugin(mode);
    const server = createFakeDevServer();
    plugin.configureServer(server);
    assert.equal(server.handlers.length, 1);

    const response = await runMiddleware(server.handlers[0], '/runtime-env.json');
    assert.equal(response.statusCode, 200, mode);
    assert.equal(response.headers['Content-Type'], 'application/json; charset=utf-8', mode);
    assert.equal(response.headers['Cache-Control'], 'no-store', mode);

    const document = JSON.parse(response.body);
    // APP_RUNTIME_TOPOLOGY_SPEC §8.2 / CONFIG_SPEC §3.1: in dev the page origin
    // is the adaptive web ingress and every API base stays same-origin relative.
    assert.equal(document.browserOriginMode, 'same-origin', mode);
    assert.equal(document.profileId, mode);
    assert.equal(document.deploymentProfile, mode.split('.')[0], mode);
    assert.equal(document.environment, mode.split('.')[1], mode);
    assert.equal(document.appApiBaseUrl, '/app/v3/api', mode);
    assert.equal(document.backendApiBaseUrl, '/backend/v3/api', mode);
    assert.equal(document.openApiBaseUrl, '/v1', mode);
  }
});

test('non-runtime-env requests pass through to the vite static stack', async () => {
  const plugin = await resolveRuntimeEnvPlugin('standalone.development');
  const server = createFakeDevServer();
  plugin.configureServer(server);
  const passed = await runMiddleware(server.handlers[0], '/index.html');
  assert.equal(passed, null);
});

test('the source tree never carries a deploy-time runtime-env.json that would poison dev', () => {
  // public/runtime-env.json is a build artifact materialized per profile by the
  // canonical browser build runner (gitignored). A leftover of a previous
  // cloud-profile build served verbatim by the dev server used to point the
  // H5 browser at the deploy-time cloud edge instead of the same-origin
  // ingress; the dev middleware now shadows it, and the checkout must not
  // carry one either.
  assert.equal(fs.existsSync(path.join(ROOT, 'public', 'runtime-env.json')), false);
});
