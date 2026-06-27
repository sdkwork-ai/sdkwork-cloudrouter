import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('backend append invocation route is wired consistently', () => {
  const backendLib = readText('crates/sdkwork-routes-mcp-backend-api/src/lib.rs');
  const manifest = readText('crates/sdkwork-routes-mcp-backend-api/src/http_route_manifest.rs');
  const openapi = readText('apis/backend-api/mcp/mcp-backend-api.openapi.json');
  const materializer = readText('tools/mcp_openapi_materialize.mjs');

  assert.match(backendLib, /append_invocation_handler/);
  assert.match(manifest, /mcpAdmin\.appendInvocation/);
  assert.match(openapi, /"operationId": "mcpAdmin\.appendInvocation"/);
  assert.match(materializer, /mcpAdmin\.appendInvocation/);
});

test('invocation record builder exists in shared crate', () => {
  const builders = readText('crates/sdkwork-routes-mcp-shared/src/record_builders.rs');
  assert.match(builders, /pub fn invocation_record/);
});

test('repository supports idempotent invocation append', () => {
  const postgres = readText('crates/sdkwork-intelligence-mcp-repository-sqlx/src/postgres.rs');
  assert.match(postgres, /get_invocation_by_idempotency/);
  assert.match(postgres, /append_invocation/);
});
