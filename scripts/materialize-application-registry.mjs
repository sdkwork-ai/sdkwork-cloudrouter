#!/usr/bin/env node

/**
 * Materialize the IAM application registry that a deployment initializes its
 * database from.
 *
 * Every manifest-bearing application surface under `<workspace>/<repo>/apps/*`
 * is grouped by IAM identity (tenant + runtime `app_id`); each identity gets one
 * generated manifest under `<out>/apps/<app_id>/agent.app.config.json` plus an
 * entry in `<out>/application-registry.json`. Point `SDKWORK_APP_ROOT` at
 * `<out>` and the canonical embedded bootstrap
 * (`ensure_tenant_application_from_app_root`) registers/provisions/enables every
 * application in the database on startup - idempotently, so redeploys converge.
 *
 * OEM deployments pass `--oem <overlay.json>`: tenant/organization/domain/name
 * overrides (and optional runtime app-id rewrites) are applied to the generated
 * manifests, and `<out>/tokens.json` carries the matching public application
 * tokens for the selected environment.
 *
 * Usage:
 *   node scripts/materialize-application-registry.mjs \
 *     --workspace D:/sdkwork-space --environment production \
 *     --out dist/application-registry
 *
 *   node scripts/materialize-application-registry.mjs ... --check
 *   node scripts/materialize-application-registry.mjs ... --oem deployments/oem/oem.profile.json
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { createApplicationAccessToken } from '../../sdkwork-specs/tools/app-access-token.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIFECYCLES = new Set(['development', 'test', 'staging', 'production']);
const DEPLOYMENT_PROFILES = new Set(['standalone', 'cloud']);

function parseArgs(argv) {
  const options = {
    workspace: path.resolve(repoRoot, '..'),
    environment: '',
    deploymentProfiles: ['standalone', 'cloud'],
    oem: '',
    domainSuffix: '',
    out: path.join(repoRoot, 'dist', 'application-registry'),
    check: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = () => {
      const next = argv[index + 1];
      if (!next || next.startsWith('--')) throw new Error(`${arg} requires a value`);
      index += 1;
      return next;
    };
    switch (arg) {
      case '--workspace':
        options.workspace = path.resolve(value());
        break;
      case '--environment':
        options.environment = value().trim().toLowerCase();
        break;
      case '--deployment-profile':
        options.deploymentProfiles = [value().trim().toLowerCase()];
        break;
      case '--oem':
        options.oem = path.resolve(value());
        break;
      case '--domain-suffix':
        options.domainSuffix = value().trim().toLowerCase();
        break;
      case '--out':
        options.out = path.resolve(value());
        break;
      case '--check':
        options.check = true;
        break;
      case '-h':
      case '--help':
        console.log('Usage: node scripts/materialize-application-registry.mjs --workspace <dir> --environment <development|test|staging|production> [--deployment-profile standalone|cloud] [--oem <overlay.json>] [--domain-suffix <domain>] [--out <dir>] [--check]');
        process.exit(0);
        break;
      default:
        throw new Error(`unknown option: ${arg}`);
    }
  }
  if (!LIFECYCLES.has(options.environment)) {
    throw new Error('--environment must be development, test, staging, or production');
  }
  for (const profile of options.deploymentProfiles) {
    if (!DEPLOYMENT_PROFILES.has(profile)) {
      throw new Error(`unsupported deployment profile: ${profile}`);
    }
  }
  return options;
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function safePathSegment(value) {
  return value.replace(/[^A-Za-z0-9._-]/gu, '_');
}

function readOverlay(filePath) {
  if (!filePath) return {};
  if (!existsSync(filePath)) throw new Error(`OEM overlay not found: ${filePath}`);
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function readWorkspaceSurfaces(workspace) {
  const surfaces = [];
  for (const repoEntry of readdirSync(workspace, { withFileTypes: true })) {
    if (!repoEntry.isDirectory() || !repoEntry.name.startsWith('sdkwork-')) continue;
    const appsDir = path.join(workspace, repoEntry.name, 'apps');
    if (!existsSync(appsDir)) continue;
    for (const appEntry of readdirSync(appsDir, { withFileTypes: true })) {
      if (!appEntry.isDirectory()) continue;
      const manifestPath = path.join(appsDir, appEntry.name, 'agent.app.config.json');
      if (!existsSync(manifestPath)) continue;
      let manifest;
      try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch { continue; }
      const appKey = text(manifest?.app?.key);
      if (!appKey) continue;
      const runtimeAppId = text(manifest?.backend?.appId) || appKey;
      const tenantId = text(manifest?.backend?.tenantId) || '100001';
      const organizationId = text(manifest?.backend?.organizationId) || '0';
      const permissions = Array.isArray(manifest?.backend?.accessTokenPermissionScope)
        && manifest.backend.accessTokenPermissionScope.length > 0
        ? manifest.backend.accessTokenPermissionScope.filter((entry) => typeof entry === 'string' && entry.trim())
        : (Array.isArray(manifest?.backend?.permissionScope)
          ? manifest.backend.permissionScope.filter((entry) => typeof entry === 'string' && entry.trim())
          : []);
      surfaces.push({
        repo: repoEntry.name,
        app: appEntry.name,
        manifestPath,
        manifest,
        appKey,
        appId: runtimeAppId,
        tenantId,
        organizationId,
        permissions,
      });
    }
  }
  return surfaces;
}

function groupIdentities(surfaces) {
  const groups = new Map();
  for (const surface of surfaces) {
    const key = `${surface.tenantId}\u0000${surface.appId}`;
    const group = groups.get(key) ?? [];
    group.push(surface);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => {
    group.sort((a, b) => {
      const aPc = a.app.endsWith('-pc') ? 0 : 1;
      const bPc = b.app.endsWith('-pc') ? 0 : 1;
      if (aPc !== bPc) return aPc - bPc;
      return `${a.repo}/${a.app}`.localeCompare(`${b.repo}/${b.app}`);
    });
    return group;
  }).sort((a, b) => a[0].appId.localeCompare(b[0].appId));
}

function applyOem(manifest, surface, overlay, domainSuffix, usedDomains) {
  const appOverride = overlay.applications?.[surface.appId]
    ?? overlay.applications?.[surface.manifest?.app?.key]
    ?? {};
  const tenantId = text(appOverride.tenantId ?? overlay.tenantId) || surface.tenantId;
  const organizationId = text(appOverride.organizationId ?? overlay.organizationId) || surface.organizationId;
  const appId = text(appOverride.appId) || (overlay.appIdPrefix ? `${overlay.appIdPrefix}${surface.appId}` : surface.appId);
  const name = text(appOverride.name) || surface.manifest?.app?.name;
  const displayName = text(appOverride.displayName) || surface.manifest?.app?.displayName || name;
  const suffix = text(overlay.domainSuffix) || domainSuffix || 'localhost';
  const declaredDomain = text(surface.manifest?.backend?.primaryDomain)
    || text(surface.manifest?.backend?.domain);
  let primaryDomain = text(appOverride.primaryDomain) || declaredDomain;
  if (!primaryDomain) {
    primaryDomain = `${appId.toLowerCase()}.${suffix}`;
  }
  // `iam_tenant_application` has a unique (tenant_id, primary_domain) index, so
  // every identity in a tenant needs its own domain; a shared/blank manifest
  // domain would make the second registration fail.
  const tenantDomains = usedDomains.get(tenantId) ?? new Set();
  if (tenantDomains.has(primaryDomain)) {
    primaryDomain = `${appId.toLowerCase()}.${suffix}`;
  }
  let candidate = primaryDomain;
  for (let index = 2; tenantDomains.has(candidate); index += 1) {
    candidate = `${primaryDomain.replace(/\./gu, `-${index}.`)}`;
  }
  primaryDomain = candidate;
  tenantDomains.add(primaryDomain);
  usedDomains.set(tenantId, tenantDomains);
  const permissions = Array.isArray(appOverride.permissions) && appOverride.permissions.length > 0
    ? appOverride.permissions.filter((entry) => typeof entry === 'string' && entry.trim())
    : surface.permissions;

  const generated = structuredClone(manifest);
  generated.app = generated.app ?? {};
  generated.backend = generated.backend ?? {};
  generated.app.name = name;
  generated.app.displayName = displayName;
  if (!generated.app.key) generated.app.key = surface.appKey;
  generated.backend.appId = appId;
  generated.backend.tenantId = tenantId;
  generated.backend.organizationId = organizationId;
  generated.backend.accessTokenPermissionScope = permissions;
  generated.backend.primaryDomain = primaryDomain;
  return { manifest: generated, appId, tenantId, organizationId, name, displayName, primaryDomain, permissions };
}

function tokenFor({ appId, tenantId, organizationId, environment, deploymentProfile, runtimeTarget }) {
  return createApplicationAccessToken({
    appId,
    tenantId,
    organizationId,
    environment,
    deploymentProfile,
    runtimeTarget,
    permissionScope: ['iam:self'],
  });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const overlay = readOverlay(options.oem);
  const surfaces = readWorkspaceSurfaces(options.workspace);
  if (surfaces.length === 0) throw new Error(`no application manifests under ${options.workspace}`);

  const groups = groupIdentities(surfaces);
  const applications = [];
  const tokens = {};
  const manifests = new Map();
  const domainSuffix = options.domainSuffix || text(process.env.SDKWORK_BASE_DOMAIN) || 'localhost';
  const usedDomains = new Map();
  const usedTemplateNames = new Set();

  for (const group of groups) {
    const representative = group[0];
    const oem = applyOem(representative.manifest, representative, overlay, domainSuffix, usedDomains);
    // `iam_application_template` has a unique name constraint. Manifest display
    // names are often shared across products/surfaces; make the registration
    // template name unique while keeping displayName as the branded label.
    let templateName = oem.name;
    let nameSuffix = 2;
    while (usedTemplateNames.has(templateName)) {
      templateName = `${oem.name} (${oem.appId}${nameSuffix > 2 ? ` ${nameSuffix}` : ''})`;
      nameSuffix += 1;
    }
    usedTemplateNames.add(templateName);
    oem.manifest.app.name = templateName;
    oem.name = templateName;
    const runtimeTarget = text(representative.manifest?.backend?.runtimeTarget)
      || (text(representative.manifest?.runtime?.framework).includes('flutter') ? 'flutter-android' : 'browser');
    const identity = {
      appId: oem.appId,
      appKey: representative.appKey,
      name: oem.name,
      displayName: oem.displayName,
      appType: text(representative.manifest?.app?.appType),
      tenantId: oem.tenantId,
      organizationId: oem.organizationId,
      instanceKey: text(representative.manifest?.backend?.instanceKey) || oem.appKey,
      primaryDomain: oem.primaryDomain || undefined,
      permissions: oem.permissions,
      surfaces: group.map((entry) => `${entry.repo}/${entry.app}`),
    };
    applications.push(identity);
    tokens[oem.appId] = {
      tenantId: oem.tenantId,
      organizationId: oem.organizationId,
      environment: options.environment,
      tokens: Object.fromEntries(options.deploymentProfiles.map((deploymentProfile) => [
        deploymentProfile,
        tokenFor({
          appId: oem.appId,
          tenantId: oem.tenantId,
          organizationId: oem.organizationId,
          environment: options.environment,
          deploymentProfile,
          runtimeTarget,
        }),
      ])),
    };
    manifests.set(oem.appId, oem.manifest);
  }

  if (options.check) {
    const registryPath = path.join(options.out, 'application-registry.json');
    if (!existsSync(registryPath)) throw new Error(`registry not materialized: ${registryPath}`);
    const current = JSON.parse(readFileSync(registryPath, 'utf8'));
    const expected = { applications, tokens };
    const same = JSON.stringify(current.applications) === JSON.stringify(expected.applications)
      && JSON.stringify(current.tokens) === JSON.stringify(expected.tokens);
    if (!same) throw new Error(`application registry drift under ${options.out}; rerun without --check`);
    for (const [appId, manifest] of manifests) {
      const manifestPath = path.join(options.out, 'apps', safePathSegment(appId), 'agent.app.config.json');
      if (!existsSync(manifestPath)) throw new Error(`missing generated manifest: ${manifestPath}`);
      if (readFileSync(manifestPath, 'utf8') !== `${JSON.stringify(manifest, null, 2)}\n`) {
        throw new Error(`generated manifest drift: ${manifestPath}`);
      }
    }
    console.log(JSON.stringify({ check: 'ok', applications: applications.length }, null, 1));
    return;
  }

  rmSync(path.join(options.out, 'apps'), { recursive: true, force: true });
  mkdirSync(options.out, { recursive: true });
  for (const [appId, manifest] of manifests) {
    const dir = path.join(options.out, 'apps', safePathSegment(appId));
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'agent.app.config.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }
  writeFileSync(path.join(options.out, 'application-registry.json'), `${JSON.stringify({
    schemaVersion: 1,
    kind: 'sdkwork.iam.application-registry',
    generatedBy: 'scripts/materialize-application-registry.mjs',
    workspace: options.workspace,
    environment: options.environment,
    deploymentProfiles: options.deploymentProfiles,
    oem: options.oem ? path.relative(options.workspace, options.oem) : undefined,
    applications,
    tokens,
  }, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    registry: path.join(options.out, 'application-registry.json'),
    manifests: manifests.size,
    applications: applications.length,
    environment: options.environment,
  }, null, 1));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
