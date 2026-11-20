#!/usr/bin/env node
/**
 * One release preflight for the Flutter mobile application.
 *
 *   node scripts/release-preflight.mjs [--artifacts <dir>] [--json]
 *
 * Runs, in order:
 *   1. platform host consistency (iOS / Android / HarmonyOS vs the manifest)
 *   2. per-store publishing configuration + media + manifest projection
 *   3. per-market store submission plan (artifacts + external console steps)
 *
 * Exit codes: 0 when every repo-owned precondition holds (external console
 * steps are reported but do not fail the preflight); 1 otherwise. The JSON
 * mode is the machine-readable release evidence.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkPlatformHost } from './platform-host-lib.mjs';
import { buildStoreSubmissionPlans } from './store-submission-lib.mjs';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactsFlag = process.argv.indexOf('--artifacts');
const artifactsDir = path.resolve(
  appRoot,
  artifactsFlag >= 0 ? process.argv[artifactsFlag + 1] ?? '.sdkwork/tmp/app-publish' : '.sdkwork/tmp/app-publish',
);
const json = process.argv.includes('--json');

const steps = [];

const hostIssues = checkPlatformHost(appRoot);
steps.push({ step: 'platform-host', ok: hostIssues.length === 0, issues: hostIssues });

const storeCheck = spawnSync(process.execPath, [path.join(appRoot, 'scripts', 'check-store-publishing.mjs'), '--json'], {
  cwd: appRoot,
  encoding: 'utf8',
});
let storeReport;
try {
  storeReport = JSON.parse(storeCheck.stdout || '{}');
} catch {
  storeReport = { valid: false, issues: ['check-store-publishing.mjs produced no JSON'], stores: [] };
}
steps.push({ step: 'store-publishing', ok: storeVerify(storeCheck.status, storeReport), issues: storeReport.issues ?? [] });

const manifest = JSON.parse(fs.readFileSync(path.join(appRoot, 'agent.app.config.json'), 'utf8'));
const submission = buildStoreSubmissionPlans({ appRoot, manifest, artifactsDir });
steps.push({
  step: 'store-submission',
  ok: submission.issues.length === 0,
  issues: submission.issues,
  plans: submission.plans,
});

const ok = steps.every((step) => step.ok);
if (json) {
  console.log(JSON.stringify({ valid: ok, artifactsDir: path.relative(appRoot, artifactsDir), steps }, null, 2));
} else {
  for (const step of steps) {
    console.log(`${step.ok ? 'ok  ' : 'FAIL'} ${step.step}`);
    for (const issue of step.issues) {
      console.error(`     - ${issue}`);
    }
  }
  for (const plan of submission.plans) {
    console.log(
      `     ${plan.marketId}/${plan.targetId}: ${plan.artifacts.length > 0 ? plan.artifacts.join(',') : 'no artifact'}${
        plan.externalSteps.length > 0 ? ` — external: ${plan.externalSteps.join('; ')}` : ''
      }`,
    );
  }
  console.log(ok ? 'release preflight passed' : 'release preflight failed');
}
if (!ok) {
  process.exitCode = 1;
}

function storeVerify(status, report) {
  if (status === 0 && report.valid) return true;
  return false;
}
