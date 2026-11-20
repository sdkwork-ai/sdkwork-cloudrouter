#!/usr/bin/env node
/**
 * Emits the per-market store submission plan.
 *
 *   node scripts/plan-store-submission.mjs --artifacts .sdkwork/tmp/app-publish
 *   node scripts/plan-store-submission.mjs --check --artifacts <dir>
 *
 * The plan is provider-ready: endpoint, method, body, credential references,
 * local artifacts and the external console steps. It is written to
 * `.sdkwork/tmp/store-submission-plan.json` by default.
 *
 * `--check` exits non-zero when a lane has no built artifact or still requires
 * an external console step, so release automation cannot claim a lane is
 * submittable before it is.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

import { buildStoreSubmissionPlans } from './store-submission-lib.mjs';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { values } = parseArgs({
  options: {
    artifacts: { type: 'string', default: '.sdkwork/tmp/app-publish' },
    out: { type: 'string', default: '.sdkwork/tmp/store-submission-plan.json' },
    check: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
  },
});

const manifest = JSON.parse(fs.readFileSync(path.join(appRoot, 'agent.app.config.json'), 'utf8'));
const artifactsDir = path.resolve(appRoot, values.artifacts);
const { plans, issues } = buildStoreSubmissionPlans({ appRoot, manifest, artifactsDir });

const output = {
  schemaVersion: 1,
  kind: 'sdkwork.app.store-submission-plan',
  appKey: manifest.app.key,
  version: manifest.release?.currentVersion,
  generatedAt: new Date().toISOString(),
  artifactsDir: path.relative(appRoot, artifactsDir).replaceAll('\\', '/'),
  plans,
  issues,
};
const outPath = path.resolve(appRoot, values.out);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);

if (values.json) {
  console.log(JSON.stringify(output, null, 2));
} else {
  for (const plan of plans) {
    console.log(`${plan.marketId}/${plan.targetId}: ${plan.provider} track=${plan.track} artifacts=${plan.artifacts.join(',') || '-'}`);
    for (const step of plan.externalSteps) {
      console.log(`  external: ${step}`);
    }
  }
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  console.log(`store submission plan written: ${path.relative(appRoot, outPath)}`);
}
if (values.check && issues.length > 0) {
  process.exitCode = 1;
}
