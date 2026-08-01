import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  classifyTypeScriptDiagnostics,
  isOwnedSourcePath,
} from './typecheck-owned-sources.mjs';

const applicationRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(applicationRoot, '..', '..');

test('owned source classification includes every Claw Router repository surface', () => {
  assert.equal(
    isOwnedSourcePath(path.join(applicationRoot, 'src', 'App.tsx'), repositoryRoot),
    true,
  );
  assert.equal(
    isOwnedSourcePath(
      path.join(repositoryRoot, 'sdks', 'clawrouter-app-sdk', 'clawrouter-app-sdk-typescript', 'src', 'index.ts'),
      repositoryRoot,
    ),
    true,
  );
  assert.equal(
    isOwnedSourcePath(path.resolve(repositoryRoot, '..', 'sdkwork-iam', 'src', 'index.ts'), repositoryRoot),
    false,
  );
});

test('diagnostics without a file fail locally while sibling diagnostics remain owner-scoped', () => {
  const localFile = path.join(applicationRoot, 'src', 'App.tsx');
  const siblingFile = path.resolve(repositoryRoot, '..', 'sdkwork-iam', 'src', 'index.ts');
  const result = classifyTypeScriptDiagnostics([
    { file: { fileName: localFile } },
    { file: { fileName: siblingFile } },
    {},
  ], repositoryRoot);

  assert.equal(result.owned.length, 2);
  assert.equal(result.external.length, 1);
  assert.deepEqual([...result.externalOwners.entries()], [['sdkwork-iam', 1]]);
});
