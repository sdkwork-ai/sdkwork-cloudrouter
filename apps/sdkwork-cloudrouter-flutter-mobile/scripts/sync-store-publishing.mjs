#!/usr/bin/env node
/**
 * Projects `etc/store-publishing/` into `agent.app.config.json`.
 *
 * The store documents are the authority for identity, listing copy, tracks,
 * rollout countries, credential references and media; this command derives:
 *
 * - `publish.stores[]` and `release.notes[].metadata.marketReleases[]`
 * - `media.icons.primary`, `media.icons.platform`, `media.screenshots`,
 *   `media.previews`, and the `sdkwork-app-assets.v1` marker
 * - `publish.platforms` / `installPlatforms` and `runtime.targetPlatforms`
 *
 * Read-only check:  node scripts/sync-store-publishing.mjs --check
 * Reviewed write:   node scripts/sync-store-publishing.mjs --write
 *
 * The write refuses to run while any lane is invalid, so a broken store config
 * can never reach the manifest.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildManifestProjection,
  CATALOG_STANDARD,
  loadStoreConfigs,
  loadStoreProfiles,
  resolveSpecsRoot,
  validateStoreConfigs,
} from './store-publishing-lib.mjs';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(appRoot, 'agent.app.config.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const specsRoot = resolveSpecsRoot(appRoot);
const configs = loadStoreConfigs(appRoot);
const profiles = loadStoreProfiles(specsRoot);

const issues = validateStoreConfigs({ appRoot, configs, profiles, manifest });
if (issues.length > 0) {
  console.error('store publishing configuration is not ready:');
  for (const issue of [...new Set(issues)]) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

const projection = buildManifestProjection({ appRoot, specsRoot, manifest });
if (projection.issues.length > 0) {
  console.error('store publishing projection is not ready:');
  for (const issue of [...new Set(projection.issues)]) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

const write = process.argv.includes('--write');
const next = structuredClone(manifest);
next.publish = {
  ...next.publish,
  platforms: mergePlatforms(next.publish?.platforms, ['APP', 'APP_IOS', 'APP_ANDROID', 'APP_HARMONY']),
  installPlatforms: mergePlatforms(next.publish?.installPlatforms, ['APP', 'APP_IOS', 'APP_ANDROID', 'APP_HARMONY']),
  stores: projection.stores,
};
next.runtime = {
  ...next.runtime,
  runtimes: mergePlatforms(next.runtime?.runtimes, ['APP', 'APP_IOS', 'APP_ANDROID', 'APP_HARMONY']),
  targetPlatforms: mergePlatforms(next.runtime?.targetPlatforms?.filter((platform) => platform !== 'ipados'), ['ios', 'android', 'harmony']),
};
const currentNoteIndex = (next.release?.notes ?? []).findIndex((note) => note?.current === true);
if (currentNoteIndex < 0) {
  console.error('agent.app.config.json: release.notes must contain one current entry');
  process.exit(1);
}
next.release.notes[currentNoteIndex] = {
  ...next.release.notes[currentNoteIndex],
  metadata: {
    ...(next.release.notes[currentNoteIndex].metadata ?? {}),
    marketReleases: projection.marketReleases,
  },
};

const currentMedia = next.media ?? {};
const currentPrimary = currentMedia.icons?.primary ?? {};
next.media = {
  ...currentMedia,
  icons: {
    ...currentMedia.icons,
    metadata: {
      assetVersion: manifest.release?.currentVersion ?? '0.1.0',
      defaultLocale: 'zh-CN',
    },
    primary: {
      ...currentPrimary,
      ...projection.media.primaryIcon,
      ...(currentPrimary.url ? { url: currentPrimary.url } : {}),
    },
    platform: projection.media.icons,
  },
  metadata: {
    ...(currentMedia.metadata ?? {}),
    standard: CATALOG_STANDARD,
    defaultLocale: 'zh-CN',
    assetVersion: manifest.release?.currentVersion ?? '0.1.0',
  },
  previews: projection.media.previews,
  screenshots: projection.media.screenshots,
};

const serialized = `${JSON.stringify(next, null, 2)}\n`;
if (serialized === `${JSON.stringify(manifest, null, 2)}\n`) {
  console.log('store publishing manifest is already current');
  process.exit(0);
}
if (!write) {
  console.error('agent.app.config.json is out of date; rerun with --write after reviewing the diff');
  process.exit(1);
}
fs.writeFileSync(manifestPath, serialized);
console.log(`store publishing manifest updated: ${projection.stores.length} market lane(s), ${projection.media.screenshots.length} screenshot(s)`);

function mergePlatforms(current, required) {
  const values = Array.isArray(current) ? [...current] : [];
  for (const value of required) {
    if (!values.includes(value)) {
      values.push(value);
    }
  }
  return values;
}
