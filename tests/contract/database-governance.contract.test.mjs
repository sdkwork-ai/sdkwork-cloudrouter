#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const factsPath = path.join(root, 'generated', 'audit', 'standard-alignment-facts.json');

function runScript(script, args = []) {
  return spawnSync(process.execPath, [path.join(root, script), ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

const ownership = runScript('scripts/check-database-ownership.mjs');
assert.equal(
  ownership.status,
  0,
  `database ownership check failed:\n${ownership.stderr || ownership.stdout}`,
);

const factsBeforeHelp = readFileSync(factsPath, 'utf8');
const help = runScript('scripts/refresh-standard-alignment-audit.mjs', ['--help']);
assert.equal(help.status, 0, help.stderr);
assert.match(help.stdout, /--check/);
assert.equal(readFileSync(factsPath, 'utf8'), factsBeforeHelp, '--help must not write audit facts');

const check = runScript('scripts/refresh-standard-alignment-audit.mjs', ['--check']);
assert.equal(check.status, 0, check.stderr || check.stdout);

const facts = JSON.parse(readFileSync(factsPath, 'utf8'));
assert.deepEqual(facts.facts.tableConsistency.counts, {
  ddl: 43,
  registry: 43,
  schemaYaml: 43,
});
assert.equal(facts.facts.tableConsistency.consistent, true);
assert.equal(facts.facts.tablePartition.allPartitioned, false);
assert.equal(facts.facts.tablePartition.strategyDocumented, true);
assert.equal(
  facts.facts.tablePartition.strategyPath,
  'docs/architecture/tech/TECH-35-high-volume-ledger-evolution.md',
);
assert.equal(facts.facts.tablePartition.reviewRequired, true);
assert.match(facts.facts.tablePartition.note, /intentionally blocked/u);

process.stdout.write('database-governance.contract.test.mjs passed\n');
