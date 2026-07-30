#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const repositoryRoot = process.cwd();
const checker = path.join(repositoryRoot, 'scripts', 'check-database-ownership.mjs');

function writeJson(root, relativePath, value) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(root, relativePath, value) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value, 'utf8');
}

function moduleManifest(moduleId, tablePrefix, materializedTables, modules = []) {
  return {
    moduleId,
    tablePrefix,
    materializedTables,
    modules,
  };
}

function tableRegistry(tableName) {
  return {
    tables: [{ table_name: tableName, owner: 'test-owner', system_of_record: true }],
  };
}

function prefixRegistry(prefix) {
  return { prefixes: [{ prefix, owner: 'test-owner' }] };
}

function createFixture({ modules = ['child'], baselineTables = ['ai_owned', 'child_owned'] } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clawrouter-db-ownership-'));
  writeJson(
    root,
    'database/database.manifest.json',
    moduleManifest('clawrouter', 'ai_', ['ai_owned'], modules),
  );
  writeJson(root, 'database/contract/prefix-registry.json', prefixRegistry('ai_'));
  writeJson(root, 'database/contract/table-registry.json', tableRegistry('ai_owned'));
  if (modules.includes('child')) {
    writeJson(
      root,
      'database/modules/child/database.manifest.json',
      moduleManifest('child', 'child_', ['child_owned']),
    );
    writeJson(
      root,
      'database/modules/child/contract/prefix-registry.json',
      prefixRegistry('child_'),
    );
    writeJson(
      root,
      'database/modules/child/contract/table-registry.json',
      tableRegistry('child_owned'),
    );
  }
  writeText(
    root,
    'database/ddl/baseline/postgres/0001_clawrouter_baseline.sql',
    baselineTables
      .map((tableName) => `CREATE TABLE IF NOT EXISTS ${tableName} (id BIGINT PRIMARY KEY);`)
      .join('\n'),
  );
  writeText(
    root,
    'services/sdkwork-clawrouter-router-service/src/infrastructure/sql/installer.rs',
    '// fixture\n',
  );
  return root;
}

function runChecker(root) {
  return spawnSync(process.execPath, [checker, '--root', root], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
}

function withFixture(options, assertion) {
  const root = createFixture(options);
  try {
    assertion(runChecker(root));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('accepts composite baseline tables owned by a declared database module', () => {
  withFixture({}, (result) => {
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /alignment check passed/u);
  });
});

test('rejects baseline tables whose owning module is not declared', () => {
  withFixture({ modules: [] }, (result) => {
    assert.equal(result.status, 1);
    assert.match(result.stderr, /child_owned without a root or declared-module registry owner/u);
  });
});

test('rejects unsafe module identifiers before resolving module paths', () => {
  withFixture({ modules: ['../outside'], baselineTables: ['ai_owned'] }, (result) => {
    assert.equal(result.status, 1);
    assert.match(result.stderr, /invalid module id/u);
  });
});

test('rejects a manifest table inventory that drifts from its registry', () => {
  const root = createFixture();
  try {
    writeJson(
      root,
      'database/modules/child/database.manifest.json',
      moduleManifest('child', 'child_', []),
    );
    const result = runChecker(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /materializedTables must exactly match its table registry/u);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
