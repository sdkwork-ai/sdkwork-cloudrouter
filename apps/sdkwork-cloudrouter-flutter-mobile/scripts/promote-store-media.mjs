#!/usr/bin/env node
/**
 * Promotes reviewed capture bytes into tracked store media.
 *
 * The capture step writes only under `.sdkwork/tmp/assets-capture/`; this
 * command copies the five reviewed screens per canonical shelf into
 * `assets/media/store/screenshots/<shelf>/`. It is deliberately a separate
 * command so an unreviewed capture can never overwrite tracked media.
 *
 * Run `node scripts/capture-store-media.mjs` first, review the PNGs, then:
 *   node scripts/promote-store-media.mjs
 *   node scripts/generate-store-images.py   # icons/cover/feature graphic
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CAPTURE_SCREENS } from './store-publishing-lib.mjs';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawRoot = path.join(appRoot, '.sdkwork', 'tmp', 'assets-capture', 'screenshots');
const targetRoot = path.join(appRoot, 'assets', 'media', 'store', 'screenshots');
const shelves = ['ios', 'android', 'harmony', 'mobile'];

let promoted = 0;
const missing = [];
for (const shelf of shelves) {
  const sourceDir = path.join(rawRoot, shelf);
  for (const screen of CAPTURE_SCREENS) {
    const source = path.join(sourceDir, `${screen}.png`);
    if (!fs.existsSync(source)) {
      missing.push(path.relative(appRoot, source));
      continue;
    }
    const targetDir = path.join(targetRoot, shelf);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(source, path.join(targetDir, `${screen}.png`));
    promoted += 1;
  }
}
if (missing.length > 0) {
  console.error(`store media promotion incomplete; missing ${missing.length} capture(s):`);
  for (const entry of missing) {
    console.error(`- ${entry}`);
  }
  process.exit(1);
}
console.log(`promoted ${promoted} store screenshots into assets/media/store/screenshots`);
