import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const ACTIVE_TABLES = [
  'ai_mcp_server_category',
  'ai_mcp_server',
  'ai_mcp_connector',
  'ai_mcp_tool',
  'ai_mcp_resource',
  'ai_mcp_prompt',
  'ai_mcp_invocation_log',
];

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath).replace(/^\uFEFF/, ''));
}

test('baseline DDL declares exactly seven active ai_mcp_ tables', () => {
  const ddl = readText('database/ddl/baseline/postgres/0001_mcp_baseline.sql');
  const matches = [...ddl.matchAll(/CREATE TABLE IF NOT EXISTS (ai_mcp_\w+)/g)].map((match) => match[1]);
  assert.deepEqual(matches.sort(), [...ACTIVE_TABLES].sort());
});

test('table registry active tables match baseline DDL', () => {
  const registry = readJson('database/contract/table-registry.json');
  const active = registry.tables
    .filter((entry) => entry.lifecycle_status === 'active')
    .map((entry) => entry.table_name)
    .sort();
  assert.deepEqual(active, [...ACTIVE_TABLES].sort());
});

test('mcp-database.schema.yaml matches active tables', () => {
  const schemaYaml = readText('specs/mcp-database.schema.yaml');
  for (const table of ACTIVE_TABLES) {
    assert.match(schemaYaml, new RegExp(`- ${table}\\b`));
  }
});

test('database contract schema.yaml lists active tables', () => {
  const contract = readText('database/contract/schema.yaml');
  for (const table of ACTIVE_TABLES) {
    assert.match(contract, new RegExp(`name:\\s*${table}\\b`));
  }
});

test('shared route crate is wired into workspace members', () => {
  const cargo = readText('Cargo.toml');
  assert.match(cargo, /"crates\/sdkwork-routes-mcp-shared"/);
  assert.match(cargo, /sdkwork-routes-mcp-shared = \{ path = "crates\/sdkwork-routes-mcp-shared" \}/);
});

test('app and backend route crates depend on shared handlers', () => {
  for (const crate of ['sdkwork-routes-mcp-app-api', 'sdkwork-routes-mcp-backend-api']) {
    const manifest = readText(`crates/${crate}/Cargo.toml`);
    assert.match(manifest, /sdkwork-routes-mcp-shared/);
    const handlers = readText(`crates/${crate}/src/handlers.rs`);
    assert.match(handlers, /sdkwork_routes_mcp_shared::handlers::/);
  }
});
