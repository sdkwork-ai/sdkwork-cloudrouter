import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('mcp contract crate exists', () => {
  assert.ok(fs.existsSync(path.join(repoRoot, 'crates/sdkwork-mcp-contract/Cargo.toml')));
});

test('no sdkwork-discovery dependency', () => {
  const cargo = fs.readFileSync(path.join(repoRoot, 'Cargo.toml'), 'utf8');
  assert.equal(cargo.includes('sdkwork-discovery'), false);
});
