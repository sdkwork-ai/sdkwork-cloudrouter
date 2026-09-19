#!/usr/bin/env node
/**
 * Builds the CloudRouter mini program runtime bundle and materializes the
 * runtime environment the WeChat runtime reads at launch.
 *
 * Authority: `MINI_PROGRAM_APP_ARCHITECTURE_SPEC.md` sections 5 and 6.
 *
 * Two artifacts are produced from one source of truth:
 *
 * 1. `src/runtime/cloudrouter-app.js` — esbuild bundle of
 *    `src/bootstrap/runtime.ts`. The WeChat runtime loads plain CommonJS while
 *    the capability packages are TypeScript modules resolved through
 *    workspace-relative entry points, so `src/app.js` and the platform pages
 *    require this bundle and never a workspace package. The bundle is committed
 *    (as in `sdkwork-im-mini-program`) so the devtools can open the project
 *    without a build step and so the checked-in test suite asserts against the
 *    same bytes that ship.
 * 2. `src/runtime/runtime-env.js` — the materialized profile projected into the
 *    only location the mini program can read at launch. A WeChat mini program
 *    has no `import.meta.env`, so the values come from
 *    `config/mini-program/runtime-env.<profileId>.json` (written by
 *    `pnpm workflow:materialize-client-env` at the repository root) and are
 *    injected on `globalThis` before `App()` runs.
 *
 * The bundle is loaded back through `new Function` instead of `require` because
 * the repository's root `package.json` declares `"type": "module"`, so Node
 * would parse a `.js` file containing CommonJS as ESM. The bundle is fully
 * self-contained (`bundle: true`, no externals), so no `require` shim is
 * needed.
 *
 * Usage:
 *   node scripts/build-runtime.mjs
 *   node scripts/build-runtime.mjs --deployment-profile cloud --environment staging
 */

import * as esbuild from 'esbuild';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const scriptsRoot = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptsRoot, '..');

/**
 * Reads and parses a JSON file, tolerating a UTF-8 BOM.
 *
 * `JSON.parse` rejects a leading BOM, and several manifests in this workspace
 * carry one, so a bare `JSON.parse(readFileSync(...))` would fail on a file that
 * is otherwise perfectly valid.
 */
function readJsonFile(file) {
  return JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/u, ''));
}

/**
 * A gateway origin is either an absolute `http(s)` origin or a same-origin
 * absolute path (`/backend/v3/api`). Anything else — a bare host, a relative
 * path, a `file:` URL — resolves against the mini program's own bundle root on
 * device instead of the gateway, and WeChat surfaces that as an opaque request
 * failure rather than a configuration error.
 */
function assertGatewayOrigin(value, field) {
  const candidate = String(value).trim();
  if (candidate.startsWith('/')) {
    if (candidate.startsWith('//')) {
      throw new Error(
        `${field} must not be a protocol-relative URL; received ${JSON.stringify(candidate)}`,
      );
    }
    return;
  }
  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error(
      `${field} must be an absolute http(s) origin or a same-origin path; ` +
        `received ${JSON.stringify(candidate)}`,
    );
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error(
      `${field} must be an absolute http(s) origin without credentials; ` +
        `received ${JSON.stringify(candidate)}`,
    );
  }
}

/** Must stay identical to `etc/sdkwork.deployment.config.json#materialization.profiles`. */
const DEPLOYMENT_PROFILES = ['standalone', 'cloud'];
const ENVIRONMENTS = ['development', 'test', 'staging', 'demo', 'production'];

/** Must stay identical to the `SDKWORK_RUNTIME_TARGET` value the materializer writes. */
const RUNTIME_TARGET = 'mini-program';

const BUNDLE_RELATIVE_PATH = 'src/runtime/cloudrouter-app.js';
const ENV_RELATIVE_PATH = 'src/runtime/runtime-env.js';
const MANIFEST_RELATIVE_PATH = 'src/runtime/build-manifest.json';
const BUNDLE_ENTRY_RELATIVE_PATH = 'src/bootstrap/runtime.ts';

/**
 * A bundle that silently collapses to a few hundred bytes means esbuild
 * resolved the entry point but dropped the capability packages (for example a
 * `external` rule or a mis-declared `exports` map). The floor is deliberately
 * far below the real size so it only catches that class of failure.
 */
const MIN_BUNDLE_BYTES = 2_000;

/** Exports `src/app.js` and the pages depend on; the build proves they exist. */
const REQUIRED_BUNDLE_EXPORTS = ['bootstrapMiniProgramApplication'];

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    'deployment-profile': { type: 'string', default: 'standalone' },
    environment: { type: 'string', default: 'development' },
  },
  strict: true,
});

const deploymentProfile = values['deployment-profile'];
const environment = values.environment;
if (!DEPLOYMENT_PROFILES.includes(deploymentProfile)) {
  throw new Error(`--deployment-profile must be one of ${DEPLOYMENT_PROFILES.join(', ')}`);
}
if (!ENVIRONMENTS.includes(environment)) {
  throw new Error(`--environment must be one of ${ENVIRONMENTS.join(', ')}`);
}

const profileId = `${deploymentProfile}.${environment}`;

const deploymentConfig = readJsonFile(
  path.join(appRoot, 'etc', 'sdkwork.deployment.config.json'),
);
if (!deploymentConfig.materialization?.profiles?.includes(profileId)) {
  throw new Error(
    `etc/sdkwork.deployment.config.json must materialize ${profileId}; ` +
      `declares ${(deploymentConfig.materialization?.profiles ?? []).join(', ')}`,
  );
}

const runtimeConfigPath = path.join(
  appRoot,
  'config',
  'mini-program',
  `runtime-env.${profileId}.json`,
);
if (!existsSync(runtimeConfigPath)) {
  throw new Error(
    `Mini program runtime profile does not exist: ${runtimeConfigPath}. ` +
      'Run `pnpm workflow:materialize-client-env` from the repository root to materialize it.',
  );
}

/**
 * Reads the materialized profile and proves it is the profile we asked for.
 *
 * A bundle built from a stale or hand-edited profile is the one failure that
 * cannot be seen from the running app: the identity keys would still be
 * well-formed and the app would simply point at the wrong gateway.
 *
 * Both key families are asserted because the materializer writes the identity
 * twice — once scoped to the application and once workspace-scoped. A
 * half-regenerated profile can update one family only, which would boot the
 * mini program under an identity that contradicts its own gateway origin.
 */
const runtimeConfig = readJsonFile(runtimeConfigPath);
for (const [key, expected] of Object.entries({
  SDKWORK_DEPLOYMENT_PROFILE: deploymentProfile,
  SDKWORK_ENVIRONMENT: environment,
  SDKWORK_PROFILE_ID: profileId,
  SDKWORK_RUNTIME_TARGET: RUNTIME_TARGET,
  SDKWORK_CLOUDROUTER_ROUTER_DEPLOYMENT_PROFILE: deploymentProfile,
  SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT: environment,
  SDKWORK_CLOUDROUTER_ROUTER_PROFILE_ID: profileId,
  SDKWORK_CLOUDROUTER_ROUTER_RUNTIME_TARGET: RUNTIME_TARGET,
})) {
  if (runtimeConfig[key] !== expected) {
    throw new Error(
      `${runtimeConfigPath} must declare ${key}=${JSON.stringify(expected)}; ` +
        `received ${JSON.stringify(runtimeConfig[key] ?? null)}`,
    );
  }
}

/**
 * The mini program resolves every gateway origin from the materialized profile.
 * A missing or malformed origin would surface only as a request failure on
 * device, so refuse to emit a bundle that cannot boot.
 *
 * The reachability key is profile-dependent and both forms are legitimate: a
 * `cloud` profile reaches the platform gateway through
 * `..._APP_API_BASE_URL`, while a collapsed `standalone` profile reaches the
 * application's own ingress through `..._APPLICATION_PUBLIC_HTTP_URL`.
 * Requiring the cloud-only key would reject every standalone bundle, and
 * accepting either without validating the shape would accept a value the
 * runtime cannot resolve.
 */
const API_BASE_URL_KEYS = [
  'SDKWORK_CLOUDROUTER_ROUTER_APP_API_BASE_URL',
  'SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL',
];
const apiBaseUrlKey = API_BASE_URL_KEYS
  .find((key) => typeof runtimeConfig[key] === 'string' && runtimeConfig[key].trim());
if (!apiBaseUrlKey) {
  throw new Error(
    `${runtimeConfigPath} must declare one of ${API_BASE_URL_KEYS.join(', ')} ` +
      'so the mini program can reach a gateway',
  );
}
assertGatewayOrigin(runtimeConfig[apiBaseUrlKey], apiBaseUrlKey);

/**
 * Every page registered in `src/app.json` must have a platform implementation
 * on disk. `app.json` is authored (the route contributions do not own the
 * platform page list), so nothing else would catch a registered-but-absent
 * page before it fails on device.
 */
const appJsonPath = path.join(appRoot, 'src', 'app.json');
const appJson = readJsonFile(appJsonPath);
for (const page of appJson.pages ?? []) {
  for (const extension of ['.js', '.json', '.wxml']) {
    const pagePath = path.join(appRoot, 'src', `${page}${extension}`);
    if (!existsSync(pagePath)) {
      throw new Error(
        `src/app.json registers ${page} but src/${page}${extension} does not exist`,
      );
    }
  }
}
for (const subpackage of appJson.subPackages ?? []) {
  for (const page of subpackage.pages ?? []) {
    const pagePath = path.join(appRoot, 'src', subpackage.root, page, 'index.js');
    if (!existsSync(pagePath)) {
      throw new Error(
        `src/app.json registers subpackage page ${subpackage.root}/${page} but ` +
          `${path.relative(appRoot, pagePath)} does not exist`,
      );
    }
  }
}

const runtimeDir = path.join(appRoot, 'src', 'runtime');
mkdirSync(runtimeDir, { recursive: true });
const bundlePath = path.join(appRoot, BUNDLE_RELATIVE_PATH);

await esbuild.build({
  entryPoints: [path.join(appRoot, BUNDLE_ENTRY_RELATIVE_PATH)],
  bundle: true,
  outfile: bundlePath,
  platform: 'browser',
  format: 'cjs',
  target: 'es2019',
  legalComments: 'none',
  logLevel: 'info',
});

/**
 * Loads the bundle that was just written.
 *
 * Loading the built artifact (rather than importing the TypeScript sources a
 * second time) is deliberate: the assertions then describe exactly the code
 * that ships, so a bundling failure cannot leave `app.js` requiring a bundle
 * that does not contain the bootstrap.
 */
function loadRuntimeBundle(file) {
  const source = readFileSync(file, 'utf8');
  if (source.length < MIN_BUNDLE_BYTES) {
    throw new Error(`Runtime bundle looks truncated (${source.length} bytes): ${file}`);
  }
  const loaded = { exports: {} };
  const factory = new Function('module', 'exports', 'require', source);
  factory(loaded, loaded.exports, (specifier) => {
    throw new Error(
      `Runtime bundle must be self-contained but required ${JSON.stringify(specifier)}`,
    );
  });
  return loaded.exports;
}

const runtime = loadRuntimeBundle(bundlePath);
for (const exportName of REQUIRED_BUNDLE_EXPORTS) {
  if (typeof runtime[exportName] !== 'function') {
    throw new Error(`Runtime bundle must export the function ${exportName}`);
  }
}

/**
 * Projection of the materialized profile into the only place the mini program
 * can read at launch. `src/app.js` requires this module and assigns it onto
 * `globalThis` before calling the bundled bootstrap, which is what
 * `resolveRuntimeEnv()` in `@sdkwork/cloudrouter-mp-core` reads by default.
 */
writeFileSync(
  path.join(appRoot, ENV_RELATIVE_PATH),
  `module.exports = ${JSON.stringify(runtimeConfig, null, 2)};\n`,
  'utf8',
);

writeFileSync(
  path.join(appRoot, MANIFEST_RELATIVE_PATH),
  `${JSON.stringify(
    {
      appKey: 'sdkwork-cloudrouter-mini-program',
      deploymentProfile,
      environment,
      profileId,
      runtimeTarget: RUNTIME_TARGET,
      platform: 'MP_WEIXIN',
      bundle: BUNDLE_RELATIVE_PATH,
      runtimeEnv: ENV_RELATIVE_PATH,
      appJson: {
        pages: (appJson.pages ?? []).length,
        subPackages: (appJson.subPackages ?? []).length,
        tabBar: appJson.tabBar !== undefined,
      },
    },
    null,
    2,
  )}\n`,
  'utf8',
);

console.log(
  `CloudRouter mini program built: ${profileId} ` +
    `(${(appJson.pages ?? []).length} main page(s), ` +
    `${(appJson.subPackages ?? []).length} subpackage(s), ` +
    `tabBar=${appJson.tabBar !== undefined ? 'on' : 'off'})`,
);
