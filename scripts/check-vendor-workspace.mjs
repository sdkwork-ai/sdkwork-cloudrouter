#!/usr/bin/env node
/**
 * Ensures the retired vendor/ workspace layout is not tracked in git.
 *
 * Claw Router owns commerce platform crates and packages under this repository root.
 * The vendor/ directory must not appear in the git index.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

function listTrackedVendorPaths() {
  const output = execSync('git ls-files vendor', {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

const tracked = listTrackedVendorPaths();

console.log('SDKWork vendor workspace guard');
console.log(`Repository: ${repoRoot}`);
console.log(`Tracked vendor paths: ${tracked.length}`);
console.log('');

if (tracked.length === 0) {
  console.log('vendor/: no tracked paths (expected).');
  process.exit(0);
}

console.error('Disallowed vendor paths still tracked in git:');
for (const entry of tracked.slice(0, 50)) {
  console.error(`- ${entry}`);
}
if (tracked.length > 50) {
  console.error(`... and ${tracked.length - 50} more`);
}
console.error('');
console.error('Remove with `git rm -r vendor`. No vendor directory should remain after sdkwork-commerce dissolution.');
process.exit(1);
