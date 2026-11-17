#!/usr/bin/env node

/**
 * Fail-closed gate for the deploy application identity anchor of every client
 * surface's public application access token.
 *
 * IAM's hard cut (`b9...`, "make the deploy application the identity of every
 * access token") makes `app_id`/`aud` of a public application token the
 * installation's deploy application, so the build-time token generator must take
 * its `appId` from `SDKWORK_DEPLOY_APPLICATION_ID` instead of a compiled-in
 * value. This gate verifies both halves of that contract and names the variable
 * on every failure:
 *
 * 1. `etc/client-env.materialization.json` declares `accessToken.appId` equal to
 *    the configured anchor (the canonical materializer generates tokens from
 *    that declaration, so a stale declaration silently re-issues a retired
 *    identity);
 * 2. every materialized profile file carries a public application token whose
 *    `app_id` and `aud` are the anchor.
 *
 * Read-only: it never rewrites a token. Regenerate the profiles with
 * `pnpm workflow:materialize-client-env` after fixing the declaration.
 *
 * Usage:
 *   node scripts/check-deploy-application-anchor.mjs [--root <dir>] [--profile <id>]
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV,
  assertPublicApplicationAccessTokenAnchored,
  resolveDeployApplicationId,
} from './lib/cloud-router-browser-env-contract.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __filename = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_CONFIG_PATH = path.join('etc', 'client-env.materialization.json');
const PUBLIC_APP_ACCESS_TOKEN_KEY = 'SDKWORK_ACCESS_TOKEN';

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

/**
 * Verify every client surface's public application token is anchored.
 * @param options - repository root and optional profile filter.
 * @returns the checked files.
 */
export function checkDeployApplicationAnchor({ root = DEFAULT_ROOT, profileId = '' } = {}) {
  const rootDir = path.resolve(root);
  const anchor = resolveDeployApplicationId(process.env);
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
  for (const surface of surfaces) {
    if (surface.format === 'none') {
      continue;
    }
    const declaredAppId = String(surface.accessToken?.appId ?? '').trim();
    if (declaredAppId !== anchor) {
      failures.push(
        `${surface.id}: etc/client-env.materialization.json accessToken.appId must be the `
        + `${CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV} anchor (${anchor}); it declares `
        + `${declaredAppId || '(missing)'}`,
      );
    }
    for (const profile of profiles) {
      if (Array.isArray(surface.excludeProfiles) && surface.excludeProfiles.includes(profile)) {
        continue;
      }
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
        failures.push(
          `${surface.id}: ${relativePath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  if (failures.length > 0) {
    const error = new Error(
      `Deploy application anchor check failed (${failures.length}):\n${failures.join('\n')}`,
    );
    error.failures = failures;
    throw error;
  }
  return { anchor, checked };
}

function parseArgs(argv = []) {
  const options = { root: DEFAULT_ROOT, profileId: '' };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
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
  console.log(
    `[check-deploy-application-anchor] anchor ${result.anchor} verified for `
    + `${result.checked.length} profile files`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
