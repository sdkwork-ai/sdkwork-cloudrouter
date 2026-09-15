#!/usr/bin/env node
// check-dev-bootstrap-coverage.mjs — every public entrypoint that invokes the
// `sdkwork-app` facade must bootstrap the root workspace install first.
//
// Why this guard exists: `pnpm exec sdkwork-app` resolves the `sdkwork-app` bin
// from the root `node_modules/.bin`, which only exists after a completed
// `pnpm install`. On a fresh clone (or after an interrupted install) the facade
// binary is missing, so the entrypoint dies with
// `'sdkwork-app' is not recognized` before any application code runs. The
// dependency check therefore has to sit in FRONT of the facade, never behind it.
//
// See PNPM_SCRIPT_SPEC.md section 3 (root command surface) and
// PNPM_WORKSPACE_DEPENDENCY_SPEC.md section 1 (sibling workspace layout).

import fs from 'node:fs';
import path from 'node:path';

const BOOTSTRAP_COMMAND = 'node scripts/lib/ensure-cloud-router-node-deps.mjs';
const BOOTSTRAP_PREFIX = `${BOOTSTRAP_COMMAND} && `;
const BOOTSTRAP_MODULE = 'scripts/lib/ensure-cloud-router-node-deps.mjs';
const FACADE_PATTERN = /pnpm exec sdkwork-app\b/u;
const DELEGATION_PATTERN = /^\s*pnpm(?:\.cmd)?(?:\s+run)?\s+([a-z0-9][a-z0-9-]*(?::[a-z0-9][a-z0-9-]*)*)\s*$/iu;

function parseArgs(argv) {
  const args = { root: process.cwd() };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--root') {
      args.root = path.resolve(argv[index + 1] ?? '');
      index += 1;
    }
  }
  return args;
}

/**
 * `dev` stays the transparent alias `pnpm dev:standalone`, so coverage is proven
 * transitively: a pure delegation is satisfied when the script it delegates to is
 * satisfied.
 */
function resolveCoverage(scriptName, scripts, seen = new Set()) {
  if (seen.has(scriptName)) return [];
  seen.add(scriptName);
  const command = scripts[scriptName];
  if (typeof command !== 'string') return [];

  if (FACADE_PATTERN.test(command)) {
    return command.trim().startsWith(BOOTSTRAP_PREFIX) ? [] : [scriptName];
  }

  const delegated = command.match(DELEGATION_PATTERN)?.[1];
  if (!delegated || !scripts[delegated]) return [];
  return resolveCoverage(delegated, scripts, seen);
}

function main() {
  const { root } = parseArgs(process.argv.slice(2));
  const failures = [];

  const manifestPath = path.join(root, 'package.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`check-dev-bootstrap-coverage: missing ${manifestPath}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const scripts = manifest.scripts ?? {};

  const uncovered = Object.keys(scripts)
    .filter((scriptName) => FACADE_PATTERN.test(String(scripts[scriptName])))
    .filter((scriptName) => !String(scripts[scriptName]).trim().startsWith(BOOTSTRAP_PREFIX))
    .concat(
      Object.keys(scripts)
        .filter((scriptName) => !FACADE_PATTERN.test(String(scripts[scriptName])))
        .flatMap((scriptName) => resolveCoverage(scriptName, scripts)),
    );

  for (const scriptName of [...new Set(uncovered)]) {
    failures.push(
      `${scriptName}: invokes the sdkwork-app facade without bootstrapping the workspace install; `
      + `prefix it with "${BOOTSTRAP_PREFIX}"`,
    );
  }

  const bootstrapPath = path.join(root, BOOTSTRAP_MODULE);
  if (!fs.existsSync(bootstrapPath)) {
    failures.push(`${BOOTSTRAP_MODULE} is missing`);
  } else {
    const source = fs.readFileSync(bootstrapPath, 'utf8');
    // A helper that only exports a function is a silent no-op when invoked as a
    // script, which is how the public entrypoints call it.
    if (!/process\.argv\[1\]/u.test(source) || !/ensureCloudRouterNodeDeps\(\)/u.test(source)) {
      failures.push(
        `${BOOTSTRAP_MODULE}: missing the CLI main guard `
        + '(`if (process.argv[1] && path.resolve(process.argv[1]) === __filename)`) '
        + 'so running it as a script does nothing',
      );
    }
    const installIndex = source.indexOf("'install'");
    const siblingCheckIndex = source.indexOf('Missing sibling repository');
    if (installIndex === -1) {
      failures.push(`${BOOTSTRAP_MODULE}: does not invoke a pnpm install`);
    }
    if (siblingCheckIndex === -1) {
      failures.push(`${BOOTSTRAP_MODULE}: does not fail fast on a missing sdkwork-app-topology sibling`);
    }
    // exFAT/FAT32 cannot create the directory links pnpm needs for workspace:*
    // dependencies, so a probe must reject those volumes before installing.
    if (!/directoryLinksSupported/u.test(source) || !/symlinkSync/u.test(source)) {
      failures.push(`${BOOTSTRAP_MODULE}: does not probe directory-link support, so a workspace install on exFAT/FAT32 can never succeed`);
    }
  }

  // `dev` must keep delegating to `dev:standalone`; the specs-side checker owns
  // the full grammar, this guard only proves the delegation stays bootstrapped.
  if (scripts.dev !== 'pnpm dev:standalone') {
    failures.push(`dev: must stay exactly "pnpm dev:standalone" (found "${scripts.dev}")`);
  }

  if (failures.length > 0) {
    console.error('check-dev-bootstrap-coverage: FAILED');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    `check-dev-bootstrap-coverage: OK (${Object.keys(scripts).length} scripts, `
    + 'every sdkwork-app facade invocation bootstraps the workspace install)',
  );
}

main();
