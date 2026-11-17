#!/usr/bin/env node

/**
 * Fail-closed gate for the deploy application identity anchor of every client
 * surface's public application access token.
 *
 * IAM's hard cut ("make the deploy application the identity of every access
 * token") makes `app_id`/`aud` of a public application token the installation's
 * deploy application, so the build-time token generator must take its `appId`
 * from `SDKWORK_DEPLOY_APPLICATION_ID` instead of a compiled-in value. This gate
 * verifies both halves of that contract and names the variable on every failure:
 *
 * 1. `etc/client-env.materialization.json` must source each surface's app id from
 *    `accessToken.appIdEnv=SDKWORK_DEPLOY_APPLICATION_ID`. A literal
 *    `accessToken.appId` is the regression this gate exists to catch: it silently
 *    re-issues a repository-owned identity for every installation;
 * 2. every committed profile of each declared surface carries a public
 *    application token whose `app_id` and `aud` are the anchor, including the
 *    PC standalone profiles owned by `scripts/dev/cloud-router-application-env.mjs`
 *    (which re-issues them from the same anchor at dev/build time).
 *
 * Committed profiles that still carry {@link CLOUD_ROUTER_PENDING_DEPLOY_APPLICATION_ID}
 * are reported as "needs materialization". They are not a failure by default
 * (the repository cannot know an installation's anchor), but
 * `--require-materialized` turns them into a failure for a release/packaging
 * preflight, where shipping a placeholder must be refused.
 *
 * When `SDKWORK_DEPLOY_APPLICATION_ID` is unavailable (no deployment
 * configuration on this machine) the gate prints a readable `skipped:` line and
 * exits 0: it cannot verify an anchor that does not exist here and never falls
 * back to the retired id. The declaration-shape check still runs, so a hardcoded
 * app id fails even without the anchor.
 *
 * Read-only: it never rewrites a token. Regenerate the profiles with
 * `pnpm workflow:materialize-client-env` (with the anchor set) after changing the
 * declaration.
 *
 * Usage:
 *   node scripts/check-deploy-application-anchor.mjs [--root <dir>] [--profile <id>]
 *     [--require-materialized]
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV,
  CLOUD_ROUTER_PENDING_DEPLOY_APPLICATION_ID,
  assertPublicApplicationAccessTokenAnchored,
} from './lib/cloud-router-browser-env-contract.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __filename = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_CONFIG_PATH = path.join('etc', 'client-env.materialization.json');
const PUBLIC_APP_ACCESS_TOKEN_KEY = 'SDKWORK_ACCESS_TOKEN';
const APP_ID_ENV_FIELD = 'appIdEnv';

const PROFILE_IDS = ['standalone', 'cloud'].flatMap((deploymentProfile) =>
  ['development', 'test', 'staging', 'demo', 'production'].map(
    (environment) => `${deploymentProfile}.${environment}`,
  ),
);

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8').replace(/^\uFEFF/u, ''));
}

function resolveProfilePath(rootDir, surface, profileId) {
  const appRoot = path.resolve(rootDir, surface.root);
  switch (surface.format) {
    case 'vite':
      return path.join(appRoot, `.env.${profileId}`);
    case 'flutter':
      return path.join(appRoot, 'env', `sdkwork.${profileId}.json`);
    case 'mini-program':
      return path.join(appRoot, 'config', 'mini-program', `runtime-env.${profileId}.json`);
    case 'harmony-native':
      return path.join(appRoot, 'config', 'app', `runtime-env.${profileId}.json`);
    default:
      return null;
  }
}

function readToken(filePath, format) {
  if (format === 'vite') {
    for (const rawLine of readFileSync(filePath, 'utf8').split(/\r?\n/u)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }
      const separatorIndex = line.indexOf('=');
      if (separatorIndex <= 0) {
        continue;
      }
      if (line.slice(0, separatorIndex).trim() === PUBLIC_APP_ACCESS_TOKEN_KEY) {
        return line.slice(separatorIndex + 1).trim();
      }
    }
    return '';
  }
  return String(readJson(filePath)[PUBLIC_APP_ACCESS_TOKEN_KEY] ?? '').trim();
}

function readTokenClaims(token) {
  try {
    const segment = String(token ?? '').split('.')[1];
    return segment ? JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) : null;
  } catch {
    return null;
  }
}

function isPendingToken(token) {
  const claims = readTokenClaims(token);
  return claims?.app_id === CLOUD_ROUTER_PENDING_DEPLOY_APPLICATION_ID
    && claims?.aud === CLOUD_ROUTER_PENDING_DEPLOY_APPLICATION_ID;
}

/**
 * Resolve how a surface declares its token app id.
 * @returns {{kind: 'env', envName: string}|{kind: 'literal', appId: string}}
 */
function resolveDeclaration(surface) {
  const spec = surface.accessToken;
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
    throw new Error(`${surface.id}: accessToken is required`);
  }
  const envName = String(spec[APP_ID_ENV_FIELD] ?? '').trim();
  const literal = String(spec.appId ?? '').trim();
  if (envName && literal) {
    throw new Error(
      `${surface.id}: accessToken must declare either ${APP_ID_ENV_FIELD} or appId, not both`,
    );
  }
  if (envName) {
    return { kind: 'env', envName };
  }
  if (literal) {
    return { kind: 'literal', appId: literal };
  }
  throw new Error(
    `${surface.id}: accessToken must declare ${APP_ID_ENV_FIELD}=`
      + `${CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV}`,
  );
}

function readAnchor(env) {
  const value = String(env?.[CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV] ?? '').trim();
  return value || '';
}

/**
 * Verify every client surface's public application token is anchored.
 * @param options - repository root, optional profile filter, env bag, strict mode.
 * @returns the anchor, checked files, and profiles pending materialization.
 */
export function checkDeployApplicationAnchor({
  root = DEFAULT_ROOT,
  profileId = '',
  env = process.env,
  requireMaterialized = false,
} = {}) {
  const rootDir = path.resolve(root);
  const anchor = readAnchor(env);
  const config = readJson(path.join(rootDir, DEFAULT_CONFIG_PATH));
  const surfaces = Array.isArray(config.surfaces) ? config.surfaces : [];
  if (surfaces.length === 0) {
    throw new Error(`${DEFAULT_CONFIG_PATH} must declare at least one client surface.`);
  }
  const profiles = profileId
    ? PROFILE_IDS.filter((entry) => entry === profileId)
    : PROFILE_IDS;
  if (profiles.length === 0) {
    throw new Error(`unsupported profile id ${profileId}; expected <deployment-profile>.<environment>`);
  }

  const failures = [];
  const checked = [];
  const pending = [];
  const anchoredSurfaces = [];
  for (const surface of surfaces) {
    if (surface.format === 'none') {
      continue;
    }
    let declaration;
    try {
      declaration = resolveDeclaration(surface);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
      continue;
    }
    if (declaration.kind === 'literal') {
      failures.push(
        `${surface.id}: ${DEFAULT_CONFIG_PATH} must declare accessToken.${APP_ID_ENV_FIELD}=`
        + `${CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV}; it hardcodes the repository-owned app id `
        + `${declaration.appId}, which every installation would present to IAM`,
      );
      continue;
    }
    if (declaration.envName !== CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV) {
      failures.push(
        `${surface.id}: accessToken.${APP_ID_ENV_FIELD} must be `
        + `${CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV}; it declares ${declaration.envName}`,
      );
      continue;
    }
    anchoredSurfaces.push(surface);
  }

  if (!anchor) {
    if (failures.length > 0) {
      throwAnchorFailure(failures);
    }
    if (requireMaterialized) {
      throwAnchorFailure([
        `${CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV} is required to verify packaging: it cannot `
        + 'prove that the committed public application tokens carry this installation\'s deploy '
        + 'application id',
      ]);
    }
    return {
      anchor: '',
      checked,
      pending,
      skipped: true,
      reason: `skipped: ${CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV} not set; set it to this `
        + "installation's deploy application id to verify the declaration and every committed "
        + 'public application token',
    };
  }

  for (const surface of anchoredSurfaces) {
    for (const profile of profiles) {
      // Every committed profile file is checked, including `excludeProfiles`
      // ones: the materializer owns the declared matrix, and
      // `scripts/dev/cloud-router-application-env.mjs` re-issues the PC
      // standalone profile tokens from the same anchor at dev/build time.
      const filePath = resolveProfilePath(rootDir, surface, profile);
      if (!filePath || !existsSync(filePath)) {
        continue;
      }
      const relativePath = path.relative(rootDir, filePath).replaceAll('\\', '/');
      const token = readToken(filePath, surface.format);
      if (!token) {
        failures.push(`${surface.id}: ${relativePath} has no ${PUBLIC_APP_ACCESS_TOKEN_KEY}`);
        continue;
      }
      try {
        assertPublicApplicationAccessTokenAnchored(token, anchor);
        checked.push(relativePath);
      } catch (error) {
        if (isPendingToken(token)) {
          pending.push(relativePath);
          continue;
        }
        failures.push(
          `${surface.id}: ${relativePath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  if (requireMaterialized && pending.length > 0) {
    failures.push(
      `needs materialization: ${pending.length} committed profile file(s) still carry the `
      + `${CLOUD_ROUTER_PENDING_DEPLOY_APPLICATION_ID} placeholder; run `
      + '`pnpm workflow:materialize-client-env` with '
      + `${CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV} set before packaging`,
    );
  }
  if (failures.length > 0) {
    throwAnchorFailure(failures);
  }
  return { anchor, checked, pending, skipped: false };
}

function throwAnchorFailure(failures) {
  const error = new Error(
    `Deploy application anchor check failed (${failures.length}):\n${failures.join('\n')}`,
  );
  error.failures = failures;
  throw error;
}

function parseArgs(argv = []) {
  const options = { root: DEFAULT_ROOT, profileId: '', requireMaterialized: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--require-materialized') {
      options.requireMaterialized = true;
      continue;
    }
    if (arg === '--root' || arg === '--profile') {
      const value = String(argv[index + 1] ?? '').trim();
      if (!value) {
        throw new Error(`${arg} requires a value`);
      }
      options[arg === '--profile' ? 'profileId' : 'root'] = value;
      index += 1;
      continue;
    }
    throw new Error(`unsupported option: ${arg}`);
  }
  return options;
}

function main() {
  let result;
  try {
    result = checkDeployApplicationAnchor(parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(`[check-deploy-application-anchor] ${error.message}`);
    process.exit(1);
  }
  if (result.skipped) {
    console.log(`[check-deploy-application-anchor] ${result.reason}`);
    return;
  }
  console.log(
    `[check-deploy-application-anchor] anchor ${result.anchor} verified for `
    + `${result.checked.length} profile files`,
  );
  if (result.pending.length > 0) {
    console.log(
      `[check-deploy-application-anchor] needs materialization: ${result.pending.length} committed `
      + `profile file(s) still carry the ${CLOUD_ROUTER_PENDING_DEPLOY_APPLICATION_ID} placeholder; `
      + 'run `pnpm workflow:materialize-client-env` with '
      + `${CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV} set before building or packaging`,
    );
    for (const file of result.pending.slice(0, 10)) {
      console.log(`[check-deploy-application-anchor]   pending ${file}`);
    }
    if (result.pending.length > 10) {
      console.log(
        `[check-deploy-application-anchor]   ... and ${result.pending.length - 10} more`,
      );
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
