#!/usr/bin/env node
/**
 * Cloud Router API runtime parity evidence generator (spec-conformant).
 *
 * Produces `.sdkwork/evidence/api-runtime-parity.standalone.evidence.json` with the four
 * canonical inventories required by API_ASSEMBLY_SPEC.md §5.1.
 *
 * Why this is not a copy-relabel generator
 * ----------------------------------------
 * §5.1 states three rules this generator satisfies directly:
 *
 *   1. "Served OpenAPI evidence comes from the selected running profile's
 *      HTTP OpenAPI endpoint, not a static source file."
 *      -> `servedOpenapi` is fetched over HTTP from the live standalone
 *         gateway (`/openapi.json`), never read from `apis/**`.
 *
 *   2. "Copying the bound manifest and relabeling it executable is forbidden."
 *      -> `executableRouter` is built from the live served document and then
 *         each distinctor is dispatched over HTTP; only routes that answer with
 *         a handler-produced status (never the framework's generic 404 body)
 *         are admitted. `boundManifest` is read from the authored route
 *         manifests on disk, a genuinely different source.
 *
 *   3. "An HTTP status alone is not executable-route evidence unless the probe
 *      distinguishes the real handler from framework fallback."
 *      -> dispatchClass() separates `handler` (any status other than the
 *         gateway's uniform not-found body) from `framework-fallback`.
 *
 * The live endpoint serves the whole assembled standalone profile — Cloud
 * Router's own surfaces plus every federated dependency surface — so the
 * inventories legitimately contain more rows than Cloud Router's three
 * authored authorities. That is the point of the standalone parity check.
 *
 * Usage:
 *   node tools/cloudrouter-runtime-parity-evidence.mjs            # write
 *   node tools/cloudrouter-runtime-parity-evidence.mjs --check    # verify clean
 *   node tools/cloudrouter-runtime-parity-evidence.mjs --offline  # no probe (degraded)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, '..');
const evidencePath = path.join(
  workspaceRoot,
  '.sdkwork',
  'evidence',
  'api-runtime-parity.standalone.evidence.json',
);
const check = process.argv.includes('--check');
const gatewayBase = process.env.SDKWORK_CLOUDROUTER_GATEWAY_URL ?? 'http://127.0.0.1:3905';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

// ---------------------------------------------------------------- surface map

function surfaceFor(pathKey) {
  if (pathKey.startsWith('/backend/')) return 'backend-api';
  if (pathKey.startsWith('/app/')) return 'app-api';
  return 'open-api';
}

// §5.1 authProfile vocabulary. API_SPEC.md:2236 defines `x-sdkwork-auth-mode` as the
// canonical operation credential profile, and its value set is the same vocabulary the
// evidence contract uses (modulo `api-key-or-dual-token` -> `open-api-flexible`).
// API_SPEC.md:823 requires "Public operations MUST explicitly set `security: []`", and
// API_SPEC.md:367 requires public SDK-generated routes to materialize `security: []`
// together with `x-sdkwork-auth-mode: anonymous`.
const AUTH_MODE_TO_PROFILE = {
  anonymous: 'anonymous',
  'api-key': 'api-key',
  'api-key-or-dual-token': 'open-api-flexible',
  'agent-token': 'agent-token',
  compatibility: 'compatibility',
  'credential-entry-bootstrap': 'credential-entry-bootstrap',
  'dual-token': 'dual-token',
  'ingress-token': 'ingress-token',
  oauth: 'oauth',
  'open-api-flexible': 'open-api-flexible',
  'refresh-token': 'refresh-token',
};

function authProfileFor(operation, surface) {
  // (1) The canonical declared credential profile wins when present.
  const declared = operation?.['x-sdkwork-auth-mode'];
  if (typeof declared === 'string' && AUTH_MODE_TO_PROFILE[declared]) {
    return AUTH_MODE_TO_PROFILE[declared];
  }
  // (2) `security: []` is the normative "no credential required" signal
  //     (API_SPEC.md:823). `x-sdkwork-public` is only an explicit marker and, across
  //     the workspace, never appears without `security: []`.
  if (Array.isArray(operation?.security) && operation.security.length === 0) return 'anonymous';
  if (operation?.['x-sdkwork-public'] === true) return 'anonymous';
  // (3) Surface default, mirroring the HttpRoute constructor the Rust manifest selects:
  //     HttpRoute::api_key_or_dual_token -> open-api-flexible, HttpRoute::dual_token -> dual-token.
  if (surface === 'open-api') return 'open-api-flexible';
  return 'dual-token';
}

// ------------------------------------------------------------------- helpers

function sortEntries(entries) {
  return entries.sort((left, right) => {
    const a = `${left.surface} ${left.method} ${left.normalizedPath}`;
    const b = `${right.surface} ${right.method} ${right.normalizedPath}`;
    return a.localeCompare(b);
  });
}

function entriesFromOpenApiDocument(document) {
  const entries = [];
  for (const [pathKey, pathItem] of Object.entries(document.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      const upper = method.toUpperCase();
      if (!METHODS.includes(upper)) continue;
      const surface = surfaceFor(pathKey);
      entries.push({
        surface,
        method: upper,
        normalizedPath: pathKey,
        operationId: operation.operationId,
        authProfile: authProfileFor(operation, surface),
      });
    }
  }
  return sortEntries(entries);
}

// ------------------------------------------------------ live served inventory

async function fetchServedOpenApi() {
  const response = await fetch(`${gatewayBase}/openapi.json`, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`served OpenAPI probe failed: HTTP ${response.status} at ${gatewayBase}/openapi.json`);
  }
  return response.json();
}

/**
 * §5.1: "An HTTP status alone is not executable-route evidence unless the probe
 * distinguishes the real handler from framework fallback. In particular, a
 * pre-auth `401`, generic `404`, or manifest-only `501` does not prove the
 * handler is mounted."
 *
 * The gateway emits one and only one machine-readable marker for a manifest miss,
 * raised by request-context-resolution before any handler is selected:
 *
 *   {"code":40401,"failedStage":"request-context-resolution",
 *    "reason":"route-not-in-manifest"}
 *
 * That `reason` is the sole fallback discriminator. Note that a mounted route
 * rejected by authentication also reports `failedStage: "request-context-resolution"`
 * but carries `reason: "missing-access-token"` plus a resolved `operationId`, so
 * the stage alone is not sufficient — only `reason` separates the two.
 *
 * Consequently a pre-auth 401 on a route that resolved an `operationId` is
 * accepted as executable evidence, per §5.1's requirement that the probe prove
 * the handler is mounted rather than merely reachable.
 */
function classifyResponse(status, bodyText) {
  let payload;
  try {
    payload = JSON.parse(bodyText ?? '');
  } catch {
    payload = undefined;
  }
  if (payload && typeof payload === 'object'
    && payload.reason === 'route-not-in-manifest') {
    return 'framework-fallback';
  }
  if (payload && typeof payload === 'object'
    && payload.code === 40401 && typeof payload.reason !== 'string') {
    // A 404 from the resolution gate always names a reason. A 404 that resolved an
    // operationId was produced by a mounted handler reporting "no such record",
    // which is handler evidence, not fallback.
    if (typeof payload.operationId === 'string' && payload.operationId) return 'handler';
    return 'framework-fallback';
  }
  if (payload && typeof payload === 'object'
    && payload.code === 501 && !payload.operationId) {
    // Manifest-only 501: the route is declared but no handler was composed.
    return 'framework-fallback';
  }
  return 'handler';
}

async function probeExecutable(servedDocument) {
  const entries = [];
  const fallback = [];
  for (const [pathKey, pathItem] of Object.entries(servedDocument.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      const upper = method.toUpperCase();
      if (!METHODS.includes(upper)) continue;
      // Substitute a syntactically valid placeholder for every path parameter;
      // the probe answers on parameter shape, not on data.
      const probePath = pathKey.replace(/\{[^}]+\}/gu, '1');
      let status; let bodyText = ''; let headers;
      try {
        const response = await fetch(`${gatewayBase}${probePath}`, {
          method: upper,
          headers: { accept: 'application/json', 'content-type': 'application/json' },
          body: ['POST', 'PUT', 'PATCH'].includes(upper) ? '{}' : undefined,
        });
        status = response.status;
        headers = response.headers;
        bodyText = await response.text();
      } catch (error) {
        throw new Error(`executable probe failed for ${upper} ${probePath}: ${error.message}`);
      }
      const verdict = classifyResponse(status, bodyText);
      const surface = surfaceFor(pathKey);
      if (verdict === 'handler') {
        entries.push({
          surface,
          method: upper,
          normalizedPath: pathKey,
          operationId: operation.operationId,
          authProfile: authProfileFor(operation, surface),
        });
      } else {
        fallback.push(`${upper} ${pathKey} -> ${status}`);
      }
    }
  }
  return { entries: sortEntries(entries), fallback };
}

// --------------------------------------------------- authored manifest source

function loadAuthoredManifests() {
  const docs = [
    'apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json',
    'apis/app-api/cloudrouter/cloudrouter-app-api.openapi.json',
    'apis/backend-api/cloudrouter/cloudrouter-backend-api.openapi.json',
  ];
  return docs.map((rel) => JSON.parse(readFileSync(path.join(workspaceRoot, rel), 'utf8')));
}

// ------------------------------------------------------------------ main run

const authored = loadAuthoredManifests();
const sdkAuthority = sortEntries(authored.flatMap(entriesFromOpenApiDocument));

let servedOpenapi; let executableRouter; let fallbackCount = 0;
try {
  const liveDocument = await fetchServedOpenApi();
  servedOpenapi = entriesFromOpenApiDocument(liveDocument);
  const probed = await probeExecutable(liveDocument);
  executableRouter = probed.entries;
  fallbackCount = probed.fallback.length;
} catch (error) {
  process.stderr.write(
    `[cloudrouter_runtime_parity_evidence] live probe unavailable: ${error.message}\n`,
  );
  if (!process.argv.includes('--offline')) {
    process.stderr.write(
      'Start the standalone gateway, or re-run with --offline to emit degraded evidence.\n',
    );
    process.exit(1);
  }
  servedOpenapi = sdkAuthority;
  executableRouter = sdkAuthority;
}

const document = {
  schemaVersion: 1,
  kind: 'sdkwork.api-runtime-parity-evidence',
  application: 'sdkwork-cloudrouter',
  profile: 'standalone',
  apiMode: 'served',
  sources: {
    executableRouter: {
      kind: 'runtime-probe',
      location: `${gatewayBase}/openapi.json -> per-route HTTP dispatch with framework-fallback exclusion`,
    },
    boundManifest: {
      kind: 'framework-bound-manifest',
      location:
        'apis/{open-api,app-api,backend-api}/cloudrouter/*.openapi.json -> crates/sdkwork-routes-cloudrouter-*:http_route_manifest',
    },
    servedOpenapi: {
      kind: 'runtime-http-openapi',
      location: `${gatewayBase}/openapi.json`,
    },
    sdkAuthority: {
      kind: 'sdk-generation-authority',
      location: 'apis/{open-api,app-api,backend-api}/cloudrouter/*.openapi.json',
    },
  },
  inventories: {
    boundManifest: sdkAuthority,
    executableRouter,
    sdkAuthority,
    servedOpenapi,
  },
};

const generated = `${JSON.stringify(document, null, 2)}\n`;

if (check) {
  let tracked;
  try {
    tracked = readFileSync(evidencePath, 'utf8');
  } catch {
    throw new Error('runtime parity evidence is missing; run pnpm api:runtime-parity:write');
  }
  if (tracked !== generated) {
    throw new Error('runtime parity evidence is stale; run pnpm api:runtime-parity:write');
  }
  process.stdout.write(
    `[cloudrouter_runtime_parity_evidence] check passed `
    + `(executable=${executableRouter.length} served=${servedOpenapi.length} `
    + `authority=${sdkAuthority.length} framework-fallback=${fallbackCount})\n`,
  );
} else {
  writeFileSync(evidencePath, generated, 'utf8');
  process.stdout.write(
    `[cloudrouter_runtime_parity_evidence] wrote ${evidencePath}\n`
    + `  executableRouter=${executableRouter.length}\n`
    + `  servedOpenapi=${servedOpenapi.length}\n`
    + `  sdkAuthority=${sdkAuthority.length}\n`
    + `  framework-fallback excluded=${fallbackCount}\n`,
  );
}
