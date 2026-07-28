#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  validateDatabaseFramework,
  validateDatabaseModuleContract,
  validateDatabaseModuleLayout,
} from '../../../sdkwork-specs/tools/check-database-framework-standard.mjs';

const result = validateDatabaseFramework(process.cwd());
assert.equal(result.skipped, false, 'application must own database/');
assert.equal(result.ok, true, `database framework validation failed: ${result.failures.join('; ')}`);

for (const moduleId of ['gateway-iam', 'operations']) {
  const moduleRoot = path.join(process.cwd(), 'database', 'modules', moduleId);
  const layout = validateDatabaseModuleLayout(moduleRoot, 'authoritative-server');
  const contract = validateDatabaseModuleContract(moduleRoot);
  const failures = [...layout.failures, ...contract.failures];
  assert.equal(
    failures.length,
    0,
    `${moduleId} database module validation failed: ${failures.join('; ')}`,
  );
}

process.stdout.write('database-framework.contract.test.mjs passed\n');
