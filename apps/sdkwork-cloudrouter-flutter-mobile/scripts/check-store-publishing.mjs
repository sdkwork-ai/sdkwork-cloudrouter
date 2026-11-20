#!/usr/bin/env node
/**
 * Validates the per-store publishing configuration and its manifest projection.
 *
 * Read-only. Exits non-zero when a lane is not ready or when
 * `agent.app.config.json` has drifted from `etc/store-publishing/`. Run it in
 * the release preflight and in CI.
 *
 *   node scripts/check-store-publishing.mjs
 *   node scripts/check-store-publishing.mjs --json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildManifestProjection,
  loadStoreConfigs,
  loadStoreProfiles,
  resolveSpecsRoot,
  validateManifestAlignment,
  validateStoreConfigs,
} from './store-publishing-lib.mjs';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(appRoot, 'agent.app.config.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const specsRoot = resolveSpecsRoot(appRoot);
const profiles = loadStoreProfiles(specsRoot);
const configs = loadStoreConfigs(appRoot);

const issues = validateStoreConfigs({ appRoot, configs, profiles, manifest });
validateManifestAlignment(manifest, configs, issues);
const projection = buildManifestProjection({ appRoot, specsRoot, manifest });
issues.push(...projection.issues);

const currentNote = (manifest.release?.notes ?? []).find((note) => note?.current === true);
const manifestStores = JSON.stringify(manifest.publish?.stores ?? []);
const projectedStores = JSON.stringify(projection.stores);
if (manifestStores !== projectedStores) {
  issues.push('agent.app.config.json: publish.stores is out of date; run node scripts/sync-store-publishing.mjs --write');
}
for (const field of ['icons', 'screenshots', 'previews']) {
  const projected = field === 'icons' ? projection.media.icons : projection.media[field];
  const current = field === 'icons'
    ? manifest.media?.icons?.platform ?? []
    : manifest.media?.[field] ?? [];
  if (JSON.stringify(current) !== JSON.stringify(projected)) {
    issues.push(`agent.app.config.json: media.${field === 'icons' ? 'icons.platform' : field} is out of date; run node scripts/sync-store-publishing.mjs --write`);
  }
}
if (projection.media.primaryIcon) {
  const currentPrimary = manifest.media?.icons?.primary ?? {};
  for (const key of ['id', 'path', 'width', 'height', 'format', 'fileSizeBytes']) {
    if (currentPrimary[key] !== projection.media.primaryIcon[key]) {
      issues.push(`agent.app.config.json: media.icons.primary.${key} is out of date; run node scripts/sync-store-publishing.mjs --write`);
      break;
    }
  }
}
const currentReleases = JSON.stringify(currentNote?.metadata?.marketReleases ?? []);
if (currentReleases !== JSON.stringify(projection.marketReleases)) {
  issues.push('agent.app.config.json: release.notes[].metadata.marketReleases is out of date; run node scripts/sync-store-publishing.mjs --write');
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ valid: issues.length === 0, issues, stores: projection.stores }, null, 2));
} else if (issues.length > 0) {
  for (const issue of [...new Set(issues)]) {
    console.error(`- ${issue}`);
  }
  console.error(`store publishing check failed: ${new Set(issues).size} issue(s)`);
} else {
  console.log(`store publishing ok: ${projection.stores.length} market lane(s)`);
}
if (issues.length > 0) {
  process.exitCode = 1;
}
