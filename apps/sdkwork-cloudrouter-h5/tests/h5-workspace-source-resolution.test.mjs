import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { WORKSPACE_SOURCE_RESOLVE_EXTENSIONS } from '../../../scripts/lib/workspace-source-resolution.mjs';

const h5Root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('workspace source resolution prefers authored TypeScript extensions', () => {
  const extensions = [...WORKSPACE_SOURCE_RESOLVE_EXTENSIONS];
  const tsIndex = extensions.indexOf('.ts');
  const tsxIndex = extensions.indexOf('.tsx');
  const jsIndex = extensions.indexOf('.js');
  assert.ok(tsIndex >= 0, 'the TypeScript extension must be resolvable');
  assert.ok(tsxIndex >= 0, 'the TSX extension must be resolvable');
  assert.ok(jsIndex >= 0, 'plain JavaScript modules must stay resolvable');
  assert.ok(
    tsIndex < jsIndex && tsxIndex < jsIndex,
    `authored .ts/.tsx must resolve before a stale compiled .js sibling: ${extensions.join(',')}`,
  );
  assert.equal(extensions.at(-1), '.json');
});

test('the H5 renderer applies the workspace source resolution order', () => {
  const configSource = readFileSync(path.join(h5Root, 'vite.config.ts'), 'utf8');
  assert.match(configSource, /WORKSPACE_SOURCE_RESOLVE_EXTENSIONS/u);
  assert.match(configSource, /resolve:\s*\{\s*extensions:\s*\[\.\.\.WORKSPACE_SOURCE_RESOLVE_EXTENSIONS\],?\s*\}/u);
});
