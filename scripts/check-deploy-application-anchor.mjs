#!/usr/bin/env node

/**
 * Fail-closed gate for the deploy application identity anchor of every client
 * surface's public application access token.
 *
 * IAM's hard cut ("make the deploy application the identity of every access
 * token") makes `app_id`/`aud` of a public application token the installation's
 * deploy application, so the build-time token generator must take its `appId`
 * from a deployment anchor instead of a compiled-in value. This gate verifies
 * both halves of that contract and names the variable and the surface on every
 * failure:
 *
 * 1. `etc/client-env.materialization.json` must source each surface's app id from
 *    `accessToken.appIdEnv=SDKWORK_DEPLOY_APPLICATION_ID`. A literal
 *    `accessToken.appId` is the regression this gate exists to catch: it silently
 *    re-issues a repository-owned identity for every installation;
 * 2. every committed profile of each declared surface carries a public
 *    application token whose `app_id` and `aud` are the anchor, including the
 *    PC standalone profiles owned by `scripts/dev/cloud-router-application-env.mjs`
 *    (which re-issues them from the deploy anchor at dev/build time when one is
 *    available).
 *
 * Per-surface anchors. Every shipped surface registers as its own deploy
 * application (`APPLICATION_FACTORY_DEPLOYMENT_SPEC.md` §5), so one repository
 * may hold one anchor per surface. The expected anchor of one (surface, profile)
 * pair is resolved, highest precedence first:
 *
 * 1. `<BASE>_<SURFACE>` in the process environment, where `<BASE>` is the
 *    declared `accessToken.appIdEnv` (`SDKWORK_DEPLOY_APPLICATION_ID`) and
 *    `<SURFACE>` is the surface id uppercased with every run of non
 *    `[A-Z0-9]` characters folded to `_` — the canonical derivation of
 *    `sdkwork-specs/tools/app-access-token.mjs#surfaceApplicationTokenEnvName`,
 *    which the materializer uses, so the gate can never disagree with it;
 * 2. the same variable recorded in that profile's env layer, highest first:
 *    `etc/topology/<profile>.<environment>.env` (the resolved profile the
 *    materializer reads), `etc/topology/overrides/<profile>.<environment>.env`
 *    (the authored layer a per-surface registration writes), `.env.<environment>`
 *    and `.env` at the repository root;
 * 3. `<BASE>` in the process environment — the one-anchor-per-repository
 *    fallback every pre-surface registration relies on.
 *
 * `--surface <id>[,<id>]` limits the verification to the selected surfaces (an
 * unknown id is refused against the declaration). A declaration defect of any
 * declared surface is still reported, because it is a repository-level contract
 * defect rather than a property of the selected token carriers.
 *
 * Committed profiles that still carry {@link CLOUD_ROUTER_PENDING_DEPLOY_APPLICATION_ID}
 * are reported as "needs materialization". They are not a failure by default
 * (the repository cannot know an installation's anchor), but
 * `--require-materialized` turns them into a failure for a release/packaging
 * preflight, where shipping a placeholder must be refused; in that mode a surface
 * with no resolvable anchor is refused too, because packaging cannot prove its
 * tokens carry this installation's deploy application id.
 *
 * When no anchor at all is available for the checked surfaces (no process
 * variable and no recorded surface anchor) the gate prints a readable `skipped:`
 * line and exits 0: it cannot verify an anchor that does not exist here and never
 * falls back to the retired id. The declaration-shape check still runs, so a
 * hardcoded app id fails even without the anchor.
 *
 * Read-only: it never rewrites a token. Regenerate the profiles with
 * `pnpm workflow:materialize-client-env` (with the anchor set, `--surface <id>`
 * for a per-surface registration) after changing the declaration.
 *
 * Usage:
 *   node scripts/check-deploy-application-anchor.mjs [--root <dir>] [--profile <id>]
 *     [--surface <id>[,<id>]] [--require-materialized]
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { surfaceApplicationTokenEnvName } from '../../sdkwork-specs/tools/app-access-token.mjs';

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

/**
 * Repository-level anchor: the one-anchor-per-repository process variable.
 *
 * It is the last fallback of every surface. A repository cannot know an
 * installation's anchor, so an empty value is not a failure here — the caller
 * reports the skip.
 * @param env - environment bag.
 * @returns the trimmed repository-level anchor, or `''`.
 */
function readRepositoryAnchor(env) {
  const value = String(env?.[CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV] ?? '').trim();
  return value || '';
}

/**
 * Normalize the requested `--surface` selection against the declaration.
 *
 * Surface ids are matched exactly as declared (the anchor variable suffix is
 * derived from the declared id, so an unknown id can never be mapped onto a
 * declared surface's anchor). An unknown id is refused instead of silently
 * selecting nothing.
 * @param surfaceIds - requested ids (may be empty).
 * @param declaredSurfaces - declared client surfaces.
 * @returns the restriction flag and the selected id set.
 */
function normalizeRequestedSurfaceIds(surfaceIds, declaredSurfaces) {
  const requested = Array.isArray(surfaceIds) ? surfaceIds : [];
  const wanted = [
    ...new Set(requested.map((value) => String(value ?? '').trim()).filter(Boolean)),
  ];
  if (wanted.length === 0) {
    return { restricted: false, ids: new Set() };
  }
  const known = declaredSurfaces.map((surface) => String(surface?.id ?? '').trim());
  const unknown = wanted.filter((id) => !known.includes(id));
  if (unknown.length > 0) {
    throw new Error(
      `--surface ${unknown.join(', ')} is not declared in ${DEFAULT_CONFIG_PATH}; declared `
      + `surface(s): ${known.join(', ')}`,
    );
  }
  return { restricted: true, ids: new Set(wanted) };
}

/**
 * Env files that carry a profile's recorded anchor, highest precedence first.
 *
 * The resolved topology profile is first because it is the exact file the
 * materializer reads (`etc/sdkwork.deployment.config.json` → `profiles` →
 * `config`); the authored override layer is where a per-surface registration
 * writes the surface-scoped record; the repository-root dotenv files are the
 * single-file-per-lifecycle variant of the same sink.
 * @param rootDir - repository root.
 * @param profileId - `<deployment-profile>.<environment>`.
 * @returns candidate absolute file paths, highest precedence first.
 */
function resolveRecordedAnchorFiles(rootDir, profileId) {
  const environment = profileId.slice(profileId.indexOf('.') + 1);
  return [
    path.join(rootDir, 'etc', 'topology', `${profileId}.env`),
    path.join(rootDir, 'etc', 'topology', 'overrides', `${profileId}.env`),
    path.join(rootDir, `.env.${environment}`),
    path.join(rootDir, '.env'),
  ];
}

/**
 * Read one dotenv-style `KEY=value` from a file.
 *
 * Tolerates a BOM, comments, an optional `export` prefix, and quoted values; a
 * missing file or key yields `''`. Only the first declaration wins, matching the
 * materializer's dotenv reader.
 * @param filePath - candidate env file.
 * @param key - variable name.
 * @returns the trimmed value, or `''`.
 */
function readRecordedEnvValue(filePath, key) {
  if (!existsSync(filePath)) {
    return '';
  }
  for (const rawLine of readFileSync(filePath, 'utf8').replace(/^\uFEFF/u, '').split(/\r?\n/u)) {
    let line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    if (line.startsWith('export ')) {
      line = line.slice('export '.length).trim();
    }
    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    if (line.slice(0, separatorIndex).trim() !== key) {
      continue;
    }
    let value = line.slice(separatorIndex + 1).trim();
    if (
      value.length >= 2
      && ((value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1).trim();
    }
    return value;
  }
  return '';
}

/**
 * Read one anchor variable out of a profile's env layer.
 * @param rootDir - repository root.
 * @param profileId - profile whose layer is read.
 * @param key - anchor variable name.
 * @returns the recorded value and the repository-relative source file.
 */
function readRecordedAnchor(rootDir, profileId, key) {
  for (const filePath of resolveRecordedAnchorFiles(rootDir, profileId)) {
    const value = readRecordedEnvValue(filePath, key);
    if (value) {
      return {
        value,
        source: path.relative(rootDir, filePath).replaceAll('\\', '/'),
      };
    }
  }
  return { value: '', source: '' };
}

/**
 * Expected anchor of one (surface, profile) pair.
 *
 * Precedence mirrors the materializer's `surfaceAnchorEnvironment`: the
 * surface-scoped variable wins wherever it is set, then the repository-level
 * variable. The recorded layer is consulted between the two process sources, so
 * a registration that recorded the surface anchor in the profile env layer is
 * verified without the operator exporting it.
 * @param rootDir - repository root.
 * @param profileId - profile whose env layer may record the anchor.
 * @param surfaceEnvName - surface-scoped anchor variable.
 * @param env - process environment bag.
 * @returns anchor value, the variable it came from, and a readable source label.
 */
function resolveExpectedAnchor({ rootDir, profileId, surfaceEnvName, env }) {
  const explicit = String(env?.[surfaceEnvName] ?? '').trim();
  if (explicit) {
    return { anchor: explicit, variable: surfaceEnvName, source: 'environment' };
  }
  const recorded = readRecordedAnchor(rootDir, profileId, surfaceEnvName);
  if (recorded.value) {
    return { anchor: recorded.value, variable: surfaceEnvName, source: recorded.source };
  }
  const repository = readRepositoryAnchor(env);
  if (repository) {
    return {
      anchor: repository,
      variable: CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV,
      source: 'environment',
    };
  }
  return { anchor: '', variable: surfaceEnvName, source: '' };
}

/**
 * Verify every client surface's public application token is anchored.
 *
 * Each profile is checked against the anchor resolved for its own surface, so a
 * multi-surface repository whose surfaces are separate deploy applications no
 * longer fails because another surface's token carries another anchor.
 * @param options - repository root, optional profile/surface filters, env bag, strict mode.
 * @returns the anchor resolution per surface, checked files, and pending profiles.
 */
export function checkDeployApplicationAnchor({
  root = DEFAULT_ROOT,
  profileId = '',
  surfaceIds = [],
  env = process.env,
  requireMaterialized = false,
} = {}) {
  const rootDir = path.resolve(root);
  const repositoryAnchor = readRepositoryAnchor(env);
  const config = readJson(path.join(rootDir, DEFAULT_CONFIG_PATH));
  const declaredSurfaces = Array.isArray(config.surfaces) ? config.surfaces : [];
  if (declaredSurfaces.length === 0) {
    throw new Error(`${DEFAULT_CONFIG_PATH} must declare at least one client surface.`);
  }
  const profiles = profileId
    ? PROFILE_IDS.filter((entry) => entry === profileId)
    : PROFILE_IDS;
  if (profiles.length === 0) {
    throw new Error(`unsupported profile id ${profileId}; expected <deployment-profile>.<environment>`);
  }
  const selection = normalizeRequestedSurfaceIds(surfaceIds, declaredSurfaces);

  const failures = [];
  const groups = [];
  for (const surface of declaredSurfaces) {
    if (surface.format === 'none') {
      continue;
    }
    const surfaceId = String(surface?.id ?? '').trim();
    let declaration;
    try {
      declaration = resolveDeclaration(surface);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
      continue;
    }
    if (declaration.kind === 'literal') {
      failures.push(
        `${surfaceId}: ${DEFAULT_CONFIG_PATH} must declare accessToken.${APP_ID_ENV_FIELD}=`
        + `${CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV}; it hardcodes the repository-owned app id `
        + `${declaration.appId}, which every installation would present to IAM`,
      );
      continue;
    }
    if (declaration.envName !== CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV) {
      failures.push(
        `${surfaceId}: accessToken.${APP_ID_ENV_FIELD} must be `
        + `${CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV}; it declares ${declaration.envName}`,
      );
      continue;
    }
    const surfaceEnvName = surfaceApplicationTokenEnvName(
      CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV,
      surfaceId,
    );
    if (!surfaceEnvName) {
      failures.push(
        `${surfaceId || '(surface without id)'}: a surface id with at least one [A-Za-z0-9] `
        + `character is required to derive the per-surface anchor variable `
        + `${CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV}_<SURFACE>`,
      );
      continue;
    }
    if (selection.restricted && !selection.ids.has(surfaceId)) {
      continue;
    }
    const profileFiles = [];
    for (const profile of profiles) {
      // Every committed profile file is checked, including `excludeProfiles`
      // ones: the materializer owns the declared matrix, and
      // `scripts/dev/cloud-router-application-env.mjs` re-issues the PC
      // standalone profile tokens from the same anchor at dev/build time.
      const filePath = resolveProfilePath(rootDir, surface, profile);
      if (!filePath || !existsSync(filePath)) {
        continue;
      }
      profileFiles.push({
        profileId: profile,
        file: path.relative(rootDir, filePath).replaceAll('\\', '/'),
        filePath,
        anchor: '',
        anchorVariable: surfaceEnvName,
        anchorSource: '',
        status: 'unverified',
      });
    }
    groups.push({
      surfaceId,
      format: surface.format,
      baseAnchorEnvName: CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV,
      surfaceAnchorEnvName: surfaceEnvName,
      anchor: '',
      anchorVariable: surfaceEnvName,
      anchorSource: '',
      profiles: profileFiles,
      checked: [],
      pending: [],
      unverified: [],
    });
  }

  for (const group of groups) {
    for (const entry of group.profiles) {
      const expected = resolveExpectedAnchor({
        rootDir,
        profileId: entry.profileId,
        surfaceEnvName: group.surfaceAnchorEnvName,
        env,
      });
      entry.anchor = expected.anchor;
      entry.anchorVariable = expected.variable;
      entry.anchorSource = expected.source;
    }
    const distinct = [...new Set(group.profiles.map((entry) => entry.anchor).filter(Boolean))];
    group.anchor = distinct.length === 1 ? distinct[0] : '';
    const resolved = group.profiles.find((entry) => entry.anchor);
    group.anchorVariable = resolved?.anchorVariable ?? group.surfaceAnchorEnvName;
    group.anchorSource = resolved?.anchorSource ?? '';
  }

  const resolvable = groups.reduce(
    (total, group) => total + group.profiles.filter((entry) => entry.anchor).length,
    0,
  );
  const checked = [];
  const pending = [];

  if (resolvable === 0) {
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
      repositoryAnchor,
      surfaces: groups,
      surfaceAnchors: buildSurfaceSummaries(groups),
      checked,
      pending,
      skipped: true,
      reason: `skipped: ${CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV} not set; set it to this `
        + "installation's deploy application id (or a per-surface "
        + `${CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV}_<SURFACE> variable, or record that variable `
        + 'in the profile env layer) to verify the declaration and every committed public '
        + 'application token',
    };
  }

  for (const group of groups) {
    for (const entry of group.profiles) {
      if (!entry.anchor) {
        // The token is still read: a placeholder is reportable without an anchor,
        // while any other token stays unverified (packaging refuses it).
        if (isPendingToken(readToken(entry.filePath, group.format))) {
          entry.status = 'pending';
          group.pending.push(entry.file);
          pending.push(entry.file);
          continue;
        }
        group.unverified.push(entry.file);
        continue;
      }
      const token = readToken(entry.filePath, group.format);
      if (!token) {
        entry.status = 'failed';
        failures.push(
          `${group.surfaceId}: ${entry.file} has no ${PUBLIC_APP_ACCESS_TOKEN_KEY} `
          + `(expected anchor ${entry.anchorVariable}=${entry.anchor})`,
        );
        continue;
      }
      if (isPendingToken(token)) {
        entry.status = 'pending';
        group.pending.push(entry.file);
        pending.push(entry.file);
        continue;
      }
      try {
        assertPublicApplicationAccessTokenAnchored(token, entry.anchor);
        entry.status = 'verified';
        group.checked.push(entry.file);
        checked.push(entry.file);
      } catch (error) {
        entry.status = 'failed';
        const source = entry.anchorSource ? ` from ${entry.anchorSource}` : '';
        failures.push(
          `${group.surfaceId}: ${entry.file}: `
          + `${error instanceof Error ? error.message : String(error)} `
          + `(expected anchor ${entry.anchorVariable}=${entry.anchor}${source})`,
        );
      }
    }
  }

  if (requireMaterialized) {
    const unanchored = groups.filter(
      (group) => group.profiles.length > 0
        && group.profiles.every((entry) => !entry.anchor),
    );
    if (unanchored.length > 0) {
      failures.push(
        `needs anchor: ${unanchored
          .map((group) => `${group.surfaceId} (${group.surfaceAnchorEnvName})`)
          .join(', ')}; set ${CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV} or the surface-scoped `
        + "variable before packaging, otherwise the committed tokens cannot be proven to carry "
        + "this installation's deploy application id",
      );
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
  return {
    anchor: repositoryAnchor,
    repositoryAnchor,
    surfaces: groups,
    surfaceAnchors: buildSurfaceSummaries(groups),
    checked,
    pending,
    skipped: false,
  };
}

/**
 * Per-surface summary used by the CLI and by callers reporting the result.
 * @param groups - per-surface check groups.
 * @returns one summary per checked surface.
 */
function buildSurfaceSummaries(groups) {
  return groups.map((group) => ({
    surfaceId: group.surfaceId,
    surfaceAnchorEnvName: group.surfaceAnchorEnvName,
    anchor: group.anchor,
    anchorVariable: group.anchorVariable,
    anchorSource: group.anchorSource,
    // A surface whose profiles recorded different anchors carries no single
    // `anchor`; the report still names every distinct one.
    anchors: [
      ...new Set(
        group.profiles
          .filter((entry) => entry.anchor)
          .map((entry) => `${entry.anchorVariable}=${entry.anchor}`),
      ),
    ],
    verified: group.checked.length,
    pending: group.pending.length,
    unverified: group.unverified.length,
  }));
}

function throwAnchorFailure(failures) {
  const error = new Error(
    `Deploy application anchor check failed (${failures.length}):\n${failures.join('\n')}`,
  );
  error.failures = failures;
  throw error;
}

function parseArgs(argv = []) {
  const options = { root: DEFAULT_ROOT, profileId: '', surfaceIds: [], requireMaterialized: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--require-materialized') {
      options.requireMaterialized = true;
      continue;
    }
    if (arg === '--root' || arg === '--profile' || arg === '--surface') {
      const value = String(argv[index + 1] ?? '').trim();
      if (!value) {
        throw new Error(`${arg} requires a value`);
      }
      if (arg === '--surface') {
        options.surfaceIds.push(
          ...value.split(',').map((entry) => entry.trim()).filter(Boolean),
        );
      } else {
        options[arg === '--profile' ? 'profileId' : 'root'] = value;
      }
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
  const unverified = result.surfaceAnchors.reduce(
    (total, surface) => total + surface.unverified,
    0,
  );
  const verifiedSurfaces = result.surfaceAnchors.filter(
    (surface) => surface.verified > 0,
  ).length;
  console.log(
    `[check-deploy-application-anchor] verified ${result.checked.length} profile file(s) across `
    + `${verifiedSurfaces} surface(s); ${result.pending.length} pending, ${unverified} unverified`,
  );
  for (const surface of result.surfaceAnchors) {
    const anchorLabel = surface.anchor
      ? `${surface.anchorVariable}=${surface.anchor}`
      : (surface.anchors.length > 0
        ? `per-profile ${surface.anchors.join(', ')}`
        : `${surface.surfaceAnchorEnvName} not configured`);
    const sourceLabel = surface.anchorSource ? ` [${surface.anchorSource}]` : '';
    console.log(
      `[check-deploy-application-anchor]   ${surface.surfaceId}: ${anchorLabel}${sourceLabel}; `
      + `${surface.verified} verified, ${surface.pending} pending, ${surface.unverified} unverified`,
    );
  }
  const unverifiedFiles = result.surfaces.flatMap((group) => group.unverified);
  for (const file of unverifiedFiles.slice(0, 10)) {
    console.log(
      `[check-deploy-application-anchor]   needs anchor: ${file} `
      + `(set ${CLOUD_ROUTER_DEPLOY_APPLICATION_ID_ENV} or the surface-scoped variable)`,
    );
  }
  if (unverifiedFiles.length > 10) {
    console.log(
      `[check-deploy-application-anchor]   ... and ${unverifiedFiles.length - 10} more unverified`,
    );
  }
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
