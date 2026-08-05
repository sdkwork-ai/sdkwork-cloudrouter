import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, '..', '..');
export const REGION_SPEC_PATH = path.join(REPO_ROOT, 'specs/region.spec.json');
export const REGION_REGISTRY_PATH = path.join(REPO_ROOT, 'etc/region.registry.json');

export const REGION_CODE_ENV = 'SDKWORK_CLOUDROUTER_ROUTER_REGION_CODE';
export const DATABASE_SEED_LOCALE_ENV = 'SDKWORK_DATABASE_SEED_LOCALE';

const REGION_CODE_PATTERN = /^[a-z][a-z0-9_]*$/;

let registryCache = null;

/**
 * Loads the region registry (etc/region.registry.json) and validates it
 * against the local region spec (specs/region.spec.json).
 */
export function loadRegionRegistry() {
  if (registryCache) {
    return registryCache;
  }
  const spec = JSON.parse(fs.readFileSync(REGION_SPEC_PATH, 'utf8'));
  const registry = JSON.parse(fs.readFileSync(REGION_REGISTRY_PATH, 'utf8'));
  const pattern = new RegExp(spec.vocabulary.regionCodePattern);
  const statuses = new Set(spec.vocabulary.status);
  const mapping = spec.regionLocaleMapping ?? {};
  if (registry.schemaVersion !== spec.schemaVersion) {
    throw new Error(`region registry schemaVersion ${registry.schemaVersion} does not match spec ${spec.schemaVersion}`);
  }
  for (const region of registry.regions ?? []) {
    if (!pattern.test(region.regionCode)) {
      throw new Error(`invalid regionCode ${region.regionCode} (pattern ${spec.vocabulary.regionCodePattern})`);
    }
    if (region.regionCode.length > spec.vocabulary.maxRegionCodeLength) {
      throw new Error(`regionCode ${region.regionCode} exceeds max length ${spec.vocabulary.maxRegionCodeLength}`);
    }
    if (!statuses.has(region.status)) {
      throw new Error(`region ${region.regionCode} has unknown status ${region.status}`);
    }
    if (mapping[region.regionCode] !== undefined && mapping[region.regionCode] !== region.defaultLocale) {
      throw new Error(
        `region ${region.regionCode} defaultLocale ${region.defaultLocale} conflicts with spec mapping ${mapping[region.regionCode]}`,
      );
    }
  }
  registryCache = { spec, registry };
  return registryCache;
}

/**
 * Resolves the default database seed locale for a region code, falling back
 * to the registry defaultRegionCode when the region is unknown.
 */
export function resolveRegionDefaultLocale(regionCode) {
  const { spec, registry } = loadRegionRegistry();
  const code = String(regionCode ?? '').trim() || registry.defaultRegionCode;
  const region = (registry.regions ?? []).find((item) => item.regionCode === code);
  if (region) {
    return region.defaultLocale;
  }
  return spec.regionLocaleMapping?.[registry.defaultRegionCode] ?? 'zh-CN';
}

/**
 * Returns the active (deployable) region codes from the registry.
 */
export function listActiveRegions() {
  const { registry } = loadRegionRegistry();
  return (registry.regions ?? [])
    .filter((region) => region.status === 'active')
    .map((region) => region.regionCode);
}

/**
 * Resolves the region and its default seed locale from the process
 * environment: SDKWORK_CLOUDROUTER_ROUTER_REGION_CODE and
 * SDKWORK_DATABASE_SEED_LOCALE (explicit override wins).
 */
export function resolveRegionEnvironment(env = process.env) {
  const regionCode = String(env[REGION_CODE_ENV] ?? '').trim() || 'global';
  const seedLocale = String(env[DATABASE_SEED_LOCALE_ENV] ?? '').trim();
  return {
    regionCode,
    seedLocale: seedLocale || resolveRegionDefaultLocale(regionCode),
  };
}
