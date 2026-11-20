#!/usr/bin/env node
/**
 * Verifies that the iOS, Android and HarmonyOS hosts agree with the manifest.
 *
 *   node scripts/check-platform-host.mjs
 *   node scripts/check-platform-host.mjs --json
 *
 * Catches the class of drift a store submission cannot survive: a bundle id
 * renamed in one host, a version bumped only in the manifest, a HarmonyOS
 * resource reference with no resource, a missing App Store icon, or a missing
 * launcher shelf.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkPlatformHost } from './platform-host-lib.mjs';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const issues = checkPlatformHost(appRoot);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ valid: issues.length === 0, issues }, null, 2));
} else if (issues.length > 0) {
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  console.error(`platform host check failed: ${issues.length} issue(s)`);
} else {
  console.log('platform host check ok: ios, android and harmony agree with the manifest');
}
if (issues.length > 0) {
  process.exitCode = 1;
}
