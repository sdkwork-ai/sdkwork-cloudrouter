#!/usr/bin/env node
/**
 * Rust dependency singularity guard.
 *
 * Cargo happily compiles several semver-incompatible versions of the same crate
 * side by side. That is occasionally unavoidable (an upstream crate pins an old
 * major), but it is never *free*: every extra copy of a TLS/HTTP/runtime stack is
 * extra build time, extra binary size, extra CVE surface, and - for crates like
 * `rustls` or `opentelemetry` - two independent runtime configurations living in
 * one process.
 *
 * This guard keeps the graph from silently regressing:
 *
 * 1. `MUST_STAY_SINGULAR` lists crates that are currently resolved to exactly one
 *    version and must remain that way. Any duplicate here fails immediately and
 *    cannot be silenced by the baseline.
 * 2. Every other duplicate must be recorded in the baseline file, together with
 *    the exact version set that was reviewed. A *new* duplicate name fails, and a
 *    *new version* added to an existing baseline entry fails. Removing a version
 *    is an improvement: it only warns and asks for `--update-baseline`.
 *
 * Usage:
 *   node scripts/check-rust-dependency-singularity.mjs
 *   node scripts/check-rust-dependency-singularity.mjs --lock ../sdkwork-drive/Cargo.lock
 *   node scripts/check-rust-dependency-singularity.mjs --update-baseline
 *   node scripts/check-rust-dependency-singularity.mjs --json
 *
 * Exit code 1 means the dependency graph regressed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

/**
 * Crates that must resolve to a single version. These are the load-bearing
 * transports, runtimes and SDKs: a second copy silently doubles the TLS
 * configuration, the tracing pipeline or the connection pool inside one process.
 * `tower-http` is deliberately absent: `reqwest` pins 0.6 internally while the
 * web framework layer is on 0.7, and neither side is ours to move.
 * `windows-sys` / `windows-targets` are absent for the same reason - the windows
 * crate family is version-fragmented by upstream and is not a runtime we own.
 */
const MUST_STAY_SINGULAR = [
  'rustls',
  'tokio-rustls',
  'hyper-rustls',
  'rustls-webpki',
  'hyper',
  'h2',
  'axum',
  'opentelemetry',
  'opentelemetry_sdk',
  'opentelemetry-otlp',
  'opentelemetry-proto',
  'opentelemetry-http',
  'tracing-opentelemetry',
  'tonic',
  'redis',
  'toml',
  'sqlx',
];

function parseArgs(argv) {
  const options = {
    lock: path.join(repoRoot, 'Cargo.lock'),
    baseline: path.join(scriptDir, 'rust-dependency-singularity.baseline.json'),
    updateBaseline: false,
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--update-baseline') {
      options.updateBaseline = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--lock') {
      index += 1;
      options.lock = path.resolve(process.cwd(), argv[index] ?? '');
    } else if (arg === '--baseline') {
      index += 1;
      options.baseline = path.resolve(process.cwd(), argv[index] ?? '');
    } else if (arg === '--help' || arg === '-h') {
      console.log(
        'Usage: node scripts/check-rust-dependency-singularity.mjs [--lock <Cargo.lock>] [--baseline <file>] [--update-baseline] [--json]',
      );
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  return options;
}

/** Parse `name -> [versions]` out of a Cargo.lock without a TOML dependency. */
function readLockVersions(lockPath) {
  const text = fs.readFileSync(lockPath, 'utf8');
  const versions = new Map();
  for (const block of text.split('\n[[package]]\n')) {
    const name = /name = "(.*?)"/.exec(block);
    const version = /version = "(.*?)"/.exec(block);
    if (!name || !version) {
      continue;
    }
    const list = versions.get(name[1]) ?? [];
    list.push(version[1]);
    versions.set(name[1], list);
  }
  return versions;
}

function collectDuplicates(versions) {
  const duplicates = {};
  for (const name of [...versions.keys()].sort()) {
    const list = [...new Set(versions.get(name))].sort();
    if (list.length > 1) {
      duplicates[name] = list;
    }
  }
  return duplicates;
}

function readBaseline(baselinePath) {
  if (!fs.existsSync(baselinePath)) {
    return {};
  }
  const parsed = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  return parsed.duplicates ?? {};
}

function sameVersionSet(left, right) {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

const options = parseArgs(process.argv.slice(2));

if (!fs.existsSync(options.lock)) {
  console.error(`Cargo.lock not found: ${options.lock}`);
  process.exit(2);
}

const versions = readLockVersions(options.lock);
const duplicates = collectDuplicates(versions);
const baseline = readBaseline(options.baseline);

const singularViolations = [];
const newDuplicates = [];
const grownDuplicates = [];
const shrunkBaseline = [];

for (const [name, current] of Object.entries(duplicates)) {
  if (MUST_STAY_SINGULAR.includes(name)) {
    singularViolations.push({ name, versions: current });
  }
}
for (const [name, current] of Object.entries(duplicates)) {
  const recorded = baseline[name];
  if (!recorded) {
    if (!MUST_STAY_SINGULAR.includes(name)) {
      newDuplicates.push({ name, versions: current });
    }
    continue;
  }
  const recordedList = [...recorded].sort();
  if (sameVersionSet(recordedList, current)) {
    continue;
  }
  const added = current.filter((version) => !recordedList.includes(version));
  if (added.length > 0) {
    grownDuplicates.push({ name, versions: current, added });
  } else {
    shrunkBaseline.push({ name, recorded: recordedList, versions: current });
  }
}
for (const [name, recorded] of Object.entries(baseline)) {
  if (!duplicates[name] && !MUST_STAY_SINGULAR.includes(name)) {
    shrunkBaseline.push({ name, recorded: [...recorded].sort(), versions: [] });
  }
}

const failed = newDuplicates.length > 0 || grownDuplicates.length > 0;
// Violations of MUST_STAY_SINGULAR are never expressible in the baseline, so the
// guard stays red on them even when the operator asked to refresh the baseline.
const hardFailed = singularViolations.length > 0;
const exitFailed = hardFailed || (failed && !options.updateBaseline);

if (options.json) {
  console.log(
    JSON.stringify(
      {
        lock: options.lock,
        totalPackages: versions.size,
        duplicateNames: Object.keys(duplicates).length,
        failed: exitFailed,
        mustStaySingularViolations: singularViolations,
        newDuplicates,
        grownDuplicates,
        shrunkBaseline,
      },
      null,
      2,
    ),
  );
  process.exit(exitFailed ? 1 : 0);
}

console.log('SDKWork rust dependency singularity guard');
console.log(`Lockfile: ${options.lock}`);
console.log(`Packages: ${versions.size}`);
console.log(`Duplicate crate names: ${Object.keys(duplicates).length}`);
console.log('');

if (singularViolations.length > 0) {
  console.error('Crates that must stay singular now resolve to multiple versions:');
  for (const entry of singularViolations) {
    console.error(`- ${entry.name}: ${entry.versions.join(', ')}`);
  }
  console.error('');
}

if (newDuplicates.length > 0) {
  console.error('New duplicate crate names not present in the baseline:');
  for (const entry of newDuplicates) {
    console.error(`- ${entry.name}: ${entry.versions.join(', ')}`);
  }
  console.error('');
}

if (grownDuplicates.length > 0) {
  console.error('Baseline duplicates that gained an extra version:');
  for (const entry of grownDuplicates) {
    console.error(`- ${entry.name}: ${entry.versions.join(', ')} (added ${entry.added.join(', ')})`);
  }
  console.error('');
}

if (shrunkBaseline.length > 0) {
  console.log('Improvements since the baseline was recorded (run --update-baseline to lock them in):');
  for (const entry of shrunkBaseline) {
    const now = entry.versions.length > 0 ? entry.versions.join(', ') : 'single version';
    console.log(`- ${entry.name}: was ${entry.recorded.join(', ')}, now ${now}`);
  }
  console.log('');
}

if (exitFailed) {
  console.error('Dependency singularity check FAILED.');
  console.error(
    'Align the offending declaration (prefer workspace-level `default-features = false` plus an explicit',
  );
  console.error(
    'feature list) instead of widening the baseline. Use --update-baseline only for upstream-pinned crates.',
  );
  process.exit(1);
}

console.log('Dependency singularity check passed.');
if (!fs.existsSync(options.baseline)) {
  console.log(`No baseline recorded yet; run --update-baseline to create ${options.baseline}.`);
}

if (options.updateBaseline) {
  // MUST_STAY_SINGULAR crates never belong in the baseline: they are governed by
  // the hard list above and must read as duplicates there.
  const recordable = Object.fromEntries(
    Object.entries(duplicates).filter(([name]) => !MUST_STAY_SINGULAR.includes(name)),
  );
  const payload = {
    $comment:
      'Duplicate crate names that are accepted because an upstream crate pins a different major. ' +
      'Regenerate with `node scripts/check-rust-dependency-singularity.mjs --update-baseline`. ' +
      'Adding an entry here is a deliberate review decision, never a way to silence a regression.',
    generatedBy: 'scripts/check-rust-dependency-singularity.mjs',
    lockfile: path.relative(repoRoot, options.lock).split(path.sep).join('/'),
    duplicates: recordable,
  };
  fs.mkdirSync(path.dirname(options.baseline), { recursive: true });
  fs.writeFileSync(options.baseline, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Baseline written: ${options.baseline} (${Object.keys(recordable).length} entries)`);
}
