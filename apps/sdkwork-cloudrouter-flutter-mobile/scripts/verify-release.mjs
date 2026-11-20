#!/usr/bin/env node
/**
 * One release regression gate for the Flutter mobile app.
 *
 *   node scripts/verify-release.mjs
 *   node scripts/verify-release.mjs --artifacts .sdkwork/tmp/app-publish --json
 *
 * Gates (must pass):
 *   flutter analyze (error-level only), flutter test, the Node regression
 *   suites, platform-host, store-publishing, manifest standard, assets standard,
 *   source-config standard, and the shared publish-toolchain tests.
 *
 * Targets (reported, not gates): each store target's artifact readiness. A
 * target whose package can only be produced on another host (iOS IPA, HarmonyOS
 * HAP) is recorded as an environment gap instead of a false pass.
 *
 * Evidence: `.sdkwork/tmp/release-verification.json`.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveSpecsRoot } from './store-publishing-lib.mjs';
import { buildStoreSubmissionPlans } from './store-submission-lib.mjs';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(appRoot, '..', '..');
const specsRoot = resolveSpecsRoot(appRoot);
const artifactsFlag = process.argv.indexOf('--artifacts');
const artifactsDir = path.resolve(
  appRoot,
  artifactsFlag >= 0 ? process.argv[artifactsFlag + 1] ?? '.sdkwork/tmp/app-publish' : '.sdkwork/tmp/app-publish',
);
const json = process.argv.includes('--json');
const withSpecs = !process.argv.includes('--skip-specs');
const manifest = JSON.parse(fs.readFileSync(path.join(appRoot, 'agent.app.config.json'), 'utf8'));

const gates = [];
const startedAt = new Date().toISOString();

/**
 * Runs one command gate.
 * @param {string} id
 * @param {string[]} args
 * @param {{cwd?: string, timeout?: number, evaluate?: (result: object) => {ok: boolean, detail: string}}} [options]
 */
function runGate(id, args, options = {}) {
  const started = Date.now();
  const result = spawnSync(args[0], args.slice(1), {
    cwd: options.cwd ?? appRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32' && args[0].endsWith('.bat'),
    timeout: options.timeout ?? 20 * 60 * 1000,
    env: { ...process.env },
  });
  const durationMs = Date.now() - started;
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  let ok = result.status === 0;
  let detail = ok ? 'passed' : `exit ${result.status ?? 'null'}`;
  if (options.evaluate) {
    const evaluated = options.evaluate({ output, status: result.status, result });
    ok = evaluated.ok;
    detail = evaluated.detail;
  }
  gates.push({ id, ok, detail, durationMs });
  return { ok, output };
}

// 1. Flutter analyze: warning/info debt is reported, an error fails the gate.
runGate(
  'flutter-analyze',
  [process.platform === 'win32' ? 'flutter.bat' : 'flutter', 'analyze'],
  {
    evaluate: ({ output, status }) => {
      const errors = (output.match(/^\s*error - .*$/gmu) ?? []).length;
      const warnings = (output.match(/^\s*warning - .*$/gmu) ?? []).length;
      const infos = (output.match(/^\s*info - .*$/gmu) ?? []).length;
      return {
        ok: errors === 0,
        detail: errors === 0
          ? `0 error(s), ${warnings} warning(s), ${infos} info(s)`
          : `${errors} error(s), ${warnings} warning(s), ${infos} info(s) (exit ${status})`,
      };
    },
  },
);

// 2. Flutter tests.
runGate('flutter-test', [process.platform === 'win32' ? 'flutter.bat' : 'flutter', 'test']);

// 3. Application Node regression suites.
runGate('app-node-tests', [
  process.execPath,
  '--test',
  'tests/store-publishing.test.mjs',
  'tests/store-submission.test.mjs',
  'tests/platform-host.test.mjs',
  'tests/flutter-mobile-surface-contract.test.mjs',
]);

// 4. Host, store and standards checks.
runGate('platform-host', [process.execPath, 'scripts/check-platform-host.mjs']);
runGate('store-publishing', [process.execPath, 'scripts/check-store-publishing.mjs']);
runGate('manifest-standard', [
  process.execPath,
  path.join(specsRoot, 'tools/check-app-manifest-standard.mjs'),
  '--root',
  '.',
]);
runGate('assets-standard', [
  process.execPath,
  path.join(specsRoot, 'tools/check-app-assets-standard.mjs'),
  '--root',
  '.',
]);
runGate('source-config-standard', [
  process.execPath,
  path.join(specsRoot, 'tools/check-source-config-standard.mjs'),
  '--root',
  repoRoot,
]);

// 5. Shared publish-toolchain tests (the orchestrator and asset profile rules).
if (withSpecs) {
  runGate('specs-tests', [
    process.execPath,
    '--test',
    'tools/publish-app.test.mjs',
    'tools/check-app-assets-standard.test.mjs',
  ], { cwd: specsRoot });
}

// 6. Store target readiness (reported, never a gate).
const submission = buildStoreSubmissionPlans({ appRoot, manifest, artifactsDir });
const targets = submission.plans.map((plan) => ({
  marketId: plan.marketId,
  targetId: plan.targetId,
  platform: plan.platform,
  packageFormat: plan.packageFormat,
  provider: plan.provider,
  ready: plan.artifacts.length > 0,
  artifacts: plan.artifacts,
  externalSteps: plan.externalSteps,
}));
const environmentGaps = [
  ...submission.issues,
  ...(targets.some((target) => target.targetId === 'ios' && !target.ready)
    ? ['iOS IPA requires macOS + Xcode (host-bound)']
    : []),
  ...(targets.some((target) => target.targetId === 'harmony' && !target.ready)
    ? ['HarmonyOS HAP requires the OpenHarmony Flutter fork + DevEco (host-bound)']
    : []),
];

const finishedAt = new Date().toISOString();
const valid = gates.every((gate) => gate.ok);
const evidence = {
  schemaVersion: 1,
  kind: 'sdkwork.app.release-verification',
  appKey: manifest.app?.key,
  version: manifest.release?.currentVersion,
  startedAt,
  finishedAt,
  valid,
  gates,
  targets,
  environmentGaps,
};
const evidencePath = path.join(appRoot, '.sdkwork', 'tmp', 'release-verification.json');
fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

if (json) {
  console.log(JSON.stringify(evidence, null, 2));
} else {
  for (const gate of gates) {
    console.log(`${gate.ok ? 'ok  ' : 'FAIL'} ${gate.id.padEnd(24)} ${gate.detail}`);
  }
  console.log('');
  for (const target of targets) {
    console.log(
      `${target.ready ? 'ready' : 'blocked'} ${`${target.marketId}/${target.targetId}`.padEnd(34)} ${
        target.artifacts.join(',') || target.packageFormat
      }`,
    );
    for (const step of target.externalSteps) {
      console.log(`        external: ${step}`);
    }
  }
  if (environmentGaps.length > 0) {
    console.log('');
    console.log('environment gaps:');
    for (const gap of environmentGaps) {
      console.log(`  - ${gap}`);
    }
  }
  console.log('');
  console.log(`evidence: ${path.relative(appRoot, evidencePath)}`);
  console.log(valid ? 'release verification passed' : 'release verification failed');
}
if (!valid) {
  process.exitCode = 1;
}
