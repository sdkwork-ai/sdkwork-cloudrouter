#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import process from 'node:process';

const REQUEST_TIMEOUT_MS = 2_000;
const STARTUP_TIMEOUT_MS = Number.parseInt(
  process.env.CLAWROUTER_EDGE_DEV_SMOKE_TIMEOUT_MS ?? '900000',
  10,
);
const PORT_SEARCH_START = Number.parseInt(
  process.env.CLAWROUTER_EDGE_DEV_SMOKE_PORT_START ?? '41000',
  10,
);
const PORT_SEARCH_LIMIT = Number.parseInt(
  process.env.CLAWROUTER_EDGE_DEV_SMOKE_PORT_LIMIT ?? '1000',
  10,
);
const POLL_INTERVAL_MS = 500;
const MAX_CAPTURED_OUTPUT_CHARS = 80_000;

const EXPECTED_RUNTIME_ENV_OUTPUT = [
  'PORTAL_PUBLIC_API_BASE_URL=/v1',
  'PORTAL_PUBLIC_OPEN_API_BASE_URL=/v1',
  'PORTAL_PUBLIC_BACKEND_API_BASE_URL=/backend/v3/api',
  'PORTAL_PUBLIC_APP_API_BASE_URL=/app/v3/api',
];

const BACKEND_SURFACE_OPENAPI_CONTRACT = {
  expectedTitle: 'SDKWork Claw Router Backend API',
  requiredPaths: [
    '/backend/v3/api/ai/model_vendors',
    '/backend/v3/api/recharges/packages',
  ],
};

const APP_SURFACE_OPENAPI_CONTRACT = {
  expectedTitle: 'SDKWork Claw Router App API',
  requiredPaths: [
    '/app/v3/api/ai/models',
    '/app/v3/api/recharges/packages',
  ],
};

const ISOLATED_ENV_NAMES = [
  'SDKWORK_CLAW_DATABASE_URL',
  'SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS',
  'SDKWORK_CLAW_API_KEY_PEPPER',
  'SDKWORK_CLAW_TRUSTED_SUBJECT_SECRET',
  'SDKWORK_CLAW_APP_SESSION_SECRET',
  'SDKWORK_CLAW_PAYMENT_WEBHOOK_SECRET',
  'SDKWORK_CLAW_PROVIDER_RELAY_OPENAI_BASE_URL',
  'SDKWORK_CLAW_PROVIDER_RELAY_OPENAI_BEARER_TOKEN',
  'SDKWORK_CLAW_PROVIDER_SECRET_MAP',
  'SDKWORK_CLAW_USAGE_SETTLEMENT_WORKER_ENABLED',
  'HOST',
  'PORT',
  'OPENAPI_DEV_URL',
  'PORTAL_PUBLIC_SDK_BASE_URL',
  'PORTAL_PUBLIC_API_BASE_URL',
  'PORTAL_PUBLIC_OPEN_API_BASE_URL',
  'PORTAL_PUBLIC_BACKEND_API_BASE_URL',
  'PORTAL_PUBLIC_APP_API_BASE_URL',
  'PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL',
];

function pnpmCommand(platform = process.platform) {
  return platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function shellForPnpm(platform = process.platform) {
  return platform === 'win32';
}

function isEnabled(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());
}

function isProcessSpawnPermissionError(error) {
  return error?.code === 'EPERM' || String(error?.message ?? error).includes('spawn EPERM');
}

function processSpawnPermissionDiagnostic(error) {
  const original = error instanceof Error ? error.message : String(error);
  return (
    'child process spawn is not available in this environment; ' +
    'CLAWROUTER_EDGE_DEV_SMOKE_REQUIRED requires this smoke to launch real processes. ' +
    'Run it from a local shell or CI runner that permits Node child_process.spawn. ' +
    `Original error: ${original}`
  );
}

async function canBindPort(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.once('error', () => resolve(false));
    server.listen({ host: '127.0.0.1', port, exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePorts(count) {
  const ports = [];
  for (let offset = 0; offset < PORT_SEARCH_LIMIT && ports.length < count; offset += 1) {
    const port = PORT_SEARCH_START + offset;
    if (await canBindPort(port)) {
      ports.push(port);
    }
  }

  if (ports.length !== count) {
    throw new Error(
      `Unable to find ${count} available edge dev smoke ports in ` +
        `${PORT_SEARCH_START}-${PORT_SEARCH_START + PORT_SEARCH_LIMIT - 1}`,
    );
  }
  return ports;
}

function isolatedSmokeEnv() {
  const env = { ...process.env, NODE_ENV: 'development' };
  for (const name of ISOLATED_ENV_NAMES) {
    delete env[name];
  }
  return env;
}

function toPortablePath(value) {
  return value.replaceAll(path.sep, '/');
}

function isolatedSmokeDatabaseUrl() {
  const databaseRelativePath = path.join(
    'target',
    'dev-smoke',
    `sdkwork-clawrouter-${process.pid}-${Date.now()}.sqlite`,
  );
  mkdirSync(path.dirname(databaseRelativePath), { recursive: true });
  return `sqlite://${toPortablePath(databaseRelativePath)}`;
}

function appendOutput(output, chunk) {
  output.text += chunk.toString();
  if (output.text.length > MAX_CAPTURED_OUTPUT_CHARS) {
    output.text = output.text.slice(-MAX_CAPTURED_OUTPUT_CHARS);
  }
}

function launchWorkspace({
  serverPort,
  gatewayPort,
  adminApiPort,
  appApiPort,
  portalPort,
  databaseUrl,
}) {
  const command = pnpmCommand();
  const args = [
    'dev:server',
    '--',
    '--database-url',
    databaseUrl,
    '--server-bind',
    `127.0.0.1:${serverPort}`,
    '--gateway-bind',
    `127.0.0.1:${gatewayPort}`,
    '--admin-api-bind',
    `127.0.0.1:${adminApiPort}`,
    '--app-api-bind',
    `127.0.0.1:${appApiPort}`,
    '--portal-bind',
    `127.0.0.1:${portalPort}`,
  ];
  const output = { text: '' };
  const exit = { settled: false, code: null, signal: null, error: null };

  // Launch through the explicit product server entrypoint; pnpm dev is the default browser workflow.
  console.log(`[edge-dev-smoke] launching pnpm dev:server -- ${args.slice(2).join(' ')}`);
  let child;
  try {
    child = spawn(command, args, {
      cwd: process.cwd(),
      env: isolatedSmokeEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: shellForPnpm(),
      detached: process.platform !== 'win32',
      windowsHide: process.platform === 'win32',
    });
  } catch (error) {
    if (isProcessSpawnPermissionError(error)) {
      const diagnostic = processSpawnPermissionDiagnostic(error);
      if (isEnabled(process.env.CLAWROUTER_EDGE_DEV_SMOKE_REQUIRED)) {
        throw new Error(diagnostic);
      }
      console.log(
        `[edge-dev-smoke] skipped: ${diagnostic}. ` +
          'Set CLAWROUTER_EDGE_DEV_SMOKE_REQUIRED=1 to fail instead.',
      );
      return null;
    }
    throw error;
  }

  child.stdout?.on('data', (chunk) => appendOutput(output, chunk));
  child.stderr?.on('data', (chunk) => appendOutput(output, chunk));
  child.on('error', (error) => {
    exit.settled = true;
    exit.error = error;
  });
  child.on('exit', (code, signal) => {
    exit.settled = true;
    exit.code = code;
    exit.signal = signal;
  });

  return { child, output, exit };
}

function capturedOutputSuffix(output) {
  const text = output.text.trim();
  return text ? `\n\nCaptured workspace output:\n${text}` : '';
}

function assertWorkspaceStillRunning(exit, output) {
  if (!exit.settled) {
    return;
  }
  if (exit.error) {
    if (isProcessSpawnPermissionError(exit.error)) {
      throw new Error(processSpawnPermissionDiagnostic(exit.error) + capturedOutputSuffix(output));
    }
    throw new Error(
      `pnpm dev:server failed before the edge dev smoke completed: ${exit.error.message}` +
        capturedOutputSuffix(output),
    );
  }
  throw new Error(
    `pnpm dev:server exited before the edge dev smoke completed ` +
      `(code=${exit.code ?? 'null'}, signal=${exit.signal ?? 'null'})` +
      capturedOutputSuffix(output),
  );
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchText(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body = await response.text();
  return { response, body };
}

async function waitForOutputIncludes({ output, exit, requiredLines, label }) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  let missing = requiredLines;
  while (Date.now() < deadline) {
    assertWorkspaceStillRunning(exit, output);
    missing = requiredLines.filter((line) => !output.text.includes(line));
    if (missing.length === 0) {
      return;
    }
    await delay(POLL_INTERVAL_MS);
  }

  throw new Error(
    `${label} did not appear in startup output before timeout; missing: ${missing.join(', ')}` +
      capturedOutputSuffix(output),
  );
}

async function waitForEndpoint({ url, label, output, exit, validate }) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  let lastError;
  while (Date.now() < deadline) {
    assertWorkspaceStillRunning(exit, output);
    try {
      const result = await fetchText(url);
      validate(result);
      return result;
    } catch (error) {
      lastError = error;
    }
    await delay(POLL_INTERVAL_MS);
  }

  throw new Error(
    `${label} did not become ready at ${url}: ${lastError?.message ?? 'unknown error'}` +
      capturedOutputSuffix(output),
  );
}

function assertStatus(response, label, expectedStatus = 200) {
  if (response.status !== expectedStatus) {
    throw new Error(`${label} returned HTTP ${response.status}; expected HTTP ${expectedStatus}`);
  }
}

function parseJson(body, label) {
  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error(`${label} returned invalid JSON: ${error.message}`);
  }
}

function assertHealth({ response, body }, label, expectedService) {
  assertStatus(response, label);
  const payload = parseJson(body, label);
  if (payload.status !== 'ok') {
    throw new Error(`${label} returned unexpected status: ${body}`);
  }
  if (expectedService && payload.service !== expectedService) {
    throw new Error(`${label} returned unexpected service: ${body}`);
  }
}

function assertGatewayOpenApi({ response, body }, label) {
  assertStatus(response, label);
  const payload = parseJson(body, label);
  if (
    payload.openapi !== '3.0.3'
    || payload.info?.title !== 'Claw Router Open API'
    || payload['x-api-prefix'] !== '/v1'
    || !payload.paths?.['/v1/models']
    || !payload.paths?.['/v1/chat/completions']
    || !payload.paths?.['/v1/responses']
    || !payload.paths?.['/google/v1beta/models/{model}:generateContent']
  ) {
    throw new Error(`${label} did not return the gateway OpenAPI contract: ${body.slice(0, 500)}`);
  }
}

function assertSurfaceOpenApi({ response, body }, label, { expectedTitle, requiredPaths }) {
  assertStatus(response, label);
  const payload = parseJson(body, label);
  const openApiVersion = String(payload.openapi ?? '');
  const missingPaths = requiredPaths.filter((apiPath) => !payload.paths?.[apiPath]);
  if (!/^3\./u.test(openApiVersion) || payload.info?.title !== expectedTitle || missingPaths.length > 0) {
    throw new Error(
      `${label} did not return the ${expectedTitle} surface OpenAPI contract; `
      + `missing paths: ${missingPaths.join(', ') || '<none>'}; ${body.slice(0, 500)}`,
    );
  }
}

function assertPortalHtml({ response, body }, label) {
  assertStatus(response, label);
  if (!body.includes('<div id="root"></div>') || !body.includes('/runtime-env.js')) {
    throw new Error(`${label} did not return the portal SPA HTML`);
  }
}

function assertRuntimeEnv({ response, body }, label) {
  assertStatus(response, label);
  for (const expected of [
    'window.__CLAWROUTER_ENV__ = Object.freeze(',
    '"VITE_API_BASE_URL":"/v1"',
    '"VITE_CLAWROUTER_OPEN_API_BASE_URL":"/v1"',
    '"VITE_CLAWROUTER_BACKEND_API_BASE_URL":"/backend/v3/api"',
    '"VITE_CLAWROUTER_APP_API_BASE_URL":"/app/v3/api"',
  ]) {
    if (!body.includes(expected)) {
      throw new Error(`${label} runtime env is missing ${expected}: ${body}`);
    }
  }
}

function assertPublicBrowseEnvelope({ response, body }, label, expectedText) {
  assertStatus(response, label);
  const payload = parseJson(body, label);
  if (payload.code !== '2000') {
    throw new Error(
      `${label} must not require authorization and must return code 2000: ${body.slice(0, 500)}`,
    );
  }
  const items = payload.data?.items;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(`${label} returned no public browse data: ${body.slice(0, 500)}`);
  }
  if (expectedText && !body.includes(expectedText)) {
    throw new Error(`${label} did not include ${expectedText}: ${body.slice(0, 500)}`);
  }
}

function runProcess(command, args, { timeoutMs = 5_000 } = {}) {
  return new Promise((resolve) => {
    let child;
    let settled = false;
    let timer;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    try {
      child = spawn(command, args, {
        stdio: 'ignore',
        windowsHide: process.platform === 'win32',
      });
    } catch {
      resolve();
      return;
    }
    timer = setTimeout(() => {
      child.kill('SIGTERM');
      finish();
    }, timeoutMs);
    child.on('error', finish);
    child.on('exit', finish);
  });
}

async function waitForChildExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return true;
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.off('exit', onExit);
      resolve(false);
    }, timeoutMs);
    const onExit = () => {
      clearTimeout(timer);
      resolve(true);
    };
    child.once('exit', onExit);
  });
}

async function killProcessTree(child) {
  if (!child.pid || child.killed) {
    return;
  }

  if (process.platform === 'win32') {
    await runProcess('taskkill', ['/pid', String(child.pid), '/t', '/f']);
    await waitForChildExit(child, 5_000);
    return;
  }

  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }
  if (await waitForChildExit(child, 5_000)) {
    return;
  }
  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch {
    child.kill('SIGKILL');
  }
  await waitForChildExit(child, 5_000);
}

async function main() {
  if (!Number.isInteger(STARTUP_TIMEOUT_MS) || STARTUP_TIMEOUT_MS <= 0) {
    throw new Error('CLAWROUTER_EDGE_DEV_SMOKE_TIMEOUT_MS must be a positive integer');
  }
  if (!Number.isInteger(PORT_SEARCH_START) || PORT_SEARCH_START < 1 || PORT_SEARCH_START > 65535) {
    throw new Error('CLAWROUTER_EDGE_DEV_SMOKE_PORT_START must be a valid port');
  }

  const [serverPort, gatewayPort, adminApiPort, appApiPort, portalPort] =
    await findAvailablePorts(5);
  const edgeBaseUrl = `http://127.0.0.1:${serverPort}`;
  const gatewayBaseUrl = `http://127.0.0.1:${gatewayPort}`;
  const adminBaseUrl = `http://127.0.0.1:${adminApiPort}`;
  const appBaseUrl = `http://127.0.0.1:${appApiPort}`;
  const portalBaseUrl = `http://127.0.0.1:${portalPort}`;
  const databaseUrl = isolatedSmokeDatabaseUrl();
  const workspace = launchWorkspace({
    serverPort,
    gatewayPort,
    adminApiPort,
    appApiPort,
    portalPort,
    databaseUrl,
  });
  if (!workspace) {
    return;
  }

  try {
    await waitForOutputIncludes({
      ...workspace,
      label: 'edge access matrix',
      requiredLines: [
        '[start-workspace] Edge Server Access',
        `[start-workspace]   Portal: ${edgeBaseUrl}/`,
        `[start-workspace]   Gateway API: ${edgeBaseUrl}/v1`,
        `[start-workspace]   Backend/Admin API: ${edgeBaseUrl}/backend/v3/api`,
        `[start-workspace]   App API: ${edgeBaseUrl}/app/v3/api`,
        `[start-workspace]   Gateway OpenAPI: ${edgeBaseUrl}/openapi.json`,
        `[start-workspace]   Admin API OpenAPI: ${edgeBaseUrl}/backend/v3/api/openapi.json`,
        `[start-workspace]   App API OpenAPI: ${edgeBaseUrl}/app/v3/api/openapi.json`,
        `[start-workspace]   Direct Portal Dev: ${portalBaseUrl}/`,
        `[start-workspace]   Direct Portal Gateway API Proxy: ${portalBaseUrl}/v1`,
        `[start-workspace]   Direct Portal Backend/Admin API Proxy: ${portalBaseUrl}/backend/v3/api`,
        `[start-workspace]   Direct Portal App API Proxy: ${portalBaseUrl}/app/v3/api`,
        `[start-workspace]   Direct Portal Gateway OpenAPI Proxy: ${portalBaseUrl}/openapi.json`,
        `[start-workspace]   Direct Portal Admin API OpenAPI Proxy: ${portalBaseUrl}/backend/v3/api/openapi.json`,
        `[start-workspace]   Direct Portal App API OpenAPI Proxy: ${portalBaseUrl}/app/v3/api/openapi.json`,
        `[start-workspace]   Edge Server Health: ${edgeBaseUrl}/healthz`,
        `[start-workspace]   Edge Server Ready: ${edgeBaseUrl}/readyz`,
        ...EXPECTED_RUNTIME_ENV_OUTPUT,
      ],
    });

    await waitForEndpoint({
      ...workspace,
      url: `${edgeBaseUrl}/healthz`,
      label: 'edge /healthz',
      validate: (result) => assertHealth(result, 'edge /healthz', 'sdkwork-claw-edge-server'),
    });
    await waitForEndpoint({
      ...workspace,
      url: `${edgeBaseUrl}/readyz`,
      label: 'edge /readyz',
      validate: (result) => assertHealth(result, 'edge /readyz', 'sdkwork-claw-edge-server'),
    });
    await waitForEndpoint({
      ...workspace,
      url: `${edgeBaseUrl}/openapi.json`,
      label: 'edge gateway OpenAPI',
      validate: (result) => assertGatewayOpenApi(result, 'edge gateway OpenAPI'),
    });
    await waitForEndpoint({
      ...workspace,
      url: `${edgeBaseUrl}/backend/v3/api/openapi.json`,
      label: 'edge backend OpenAPI',
      validate: (result) =>
        assertSurfaceOpenApi(result, 'edge backend OpenAPI', BACKEND_SURFACE_OPENAPI_CONTRACT),
    });
    await waitForEndpoint({
      ...workspace,
      url: `${edgeBaseUrl}/app/v3/api/openapi.json`,
      label: 'edge app OpenAPI',
      validate: (result) => assertSurfaceOpenApi(result, 'edge app OpenAPI', APP_SURFACE_OPENAPI_CONTRACT),
    });
    await waitForEndpoint({
      ...workspace,
      url: `${edgeBaseUrl}/`,
      label: 'edge portal route',
      validate: (result) => assertPortalHtml(result, 'edge portal route'),
    });
    await waitForEndpoint({
      ...workspace,
      url: `${edgeBaseUrl}/runtime-env.js`,
      label: 'edge portal runtime env',
      validate: (result) => assertRuntimeEnv(result, 'edge portal runtime env'),
    });
    await waitForEndpoint({
      ...workspace,
      url: `${edgeBaseUrl}/app/v3/api/ai/models?page=1&page_size=6`,
      label: 'edge models public list',
      validate: (result) =>
        assertPublicBrowseEnvelope(result, 'edge models public list'),
    });

    await waitForEndpoint({
      ...workspace,
      url: `${gatewayBaseUrl}/healthz`,
      label: 'direct gateway health',
      validate: (result) => assertHealth(result, 'direct gateway health', 'sdkwork-clawrouter-cloud-gateway'),
    });
    await waitForEndpoint({
      ...workspace,
      url: `${gatewayBaseUrl}/openapi.json`,
      label: 'direct gateway OpenAPI',
      validate: (result) => assertGatewayOpenApi(result, 'direct gateway OpenAPI'),
    });
    await waitForEndpoint({
      ...workspace,
      url: `${adminBaseUrl}/backend/v3/api/openapi.json`,
      label: 'direct backend OpenAPI',
      validate: (result) =>
        assertSurfaceOpenApi(result, 'direct backend OpenAPI', BACKEND_SURFACE_OPENAPI_CONTRACT),
    });
    await waitForEndpoint({
      ...workspace,
      url: `${appBaseUrl}/app/v3/api/openapi.json`,
      label: 'direct app OpenAPI',
      validate: (result) => assertSurfaceOpenApi(result, 'direct app OpenAPI', APP_SURFACE_OPENAPI_CONTRACT),
    });
    await waitForEndpoint({
      ...workspace,
      url: `${appBaseUrl}/app/v3/api/ai/models?page=1&page_size=6`,
      label: 'direct models public list',
      validate: (result) =>
        assertPublicBrowseEnvelope(result, 'direct models public list'),
    });
    await waitForEndpoint({
      ...workspace,
      url: `${portalBaseUrl}/runtime-env.js`,
      label: 'direct portal runtime env',
      validate: (result) => assertRuntimeEnv(result, 'direct portal runtime env'),
    });
    await waitForEndpoint({
      ...workspace,
      url: `${portalBaseUrl}/openapi.json`,
      label: 'direct portal gateway OpenAPI proxy',
      validate: (result) =>
        assertGatewayOpenApi(result, 'direct portal gateway OpenAPI proxy'),
    });
    await waitForEndpoint({
      ...workspace,
      url: `${portalBaseUrl}/backend/v3/api/openapi.json`,
      label: 'direct portal backend OpenAPI proxy',
      validate: (result) =>
        assertSurfaceOpenApi(
          result,
          'direct portal backend OpenAPI proxy',
          BACKEND_SURFACE_OPENAPI_CONTRACT,
        ),
    });
    await waitForEndpoint({
      ...workspace,
      url: `${portalBaseUrl}/app/v3/api/openapi.json`,
      label: 'direct portal app OpenAPI proxy',
      validate: (result) =>
        assertSurfaceOpenApi(
          result,
          'direct portal app OpenAPI proxy',
          APP_SURFACE_OPENAPI_CONTRACT,
        ),
    });
    await waitForEndpoint({
      ...workspace,
      url: `${portalBaseUrl}/app/v3/api/ai/models?page=1&page_size=6`,
      label: 'direct portal models public list proxy',
      validate: (result) =>
        assertPublicBrowseEnvelope(result, 'direct portal models public list proxy'),
    });

    console.log(`[edge-dev-smoke] passed: ${edgeBaseUrl}/`);
  } finally {
    await killProcessTree(workspace.child);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(`[edge-dev-smoke] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
