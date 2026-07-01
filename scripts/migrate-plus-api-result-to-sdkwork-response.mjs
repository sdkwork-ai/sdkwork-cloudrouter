#!/usr/bin/env node
/**
 * Remove forbidden PlusApiResult identifier from router-service handlers.
 * Wire format remains SdkWorkApiResponse + ProblemDetail per API_SPEC.md §15.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../services/sdkwork-clawrouter-router-service/src/api',
);

const replacements = [
  ['PlusApiResult::success', 'success_envelope'],
  ['PlusApiResult::error', 'problem_from_wire_code'],
  [
    'use crate::api::response::PlusApiResult;',
    'use crate::api::response::{problem_from_wire_code, success_envelope};',
  ],
];

function migrateFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  if (!original.includes('PlusApiResult')) {
    return false;
  }
  let next = original;
  for (const [from, to] of replacements) {
    next = next.replaceAll(from, to);
  }
  if (next !== original) {
    fs.writeFileSync(filePath, next);
    return true;
  }
  return false;
}

let changed = 0;
for (const entry of fs.readdirSync(apiDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.rs')) {
    continue;
  }
  if (migrateFile(path.join(apiDir, entry.name))) {
    changed += 1;
    console.log(`migrated ${entry.name}`);
  }
}

console.log(`done: ${changed} api files updated`);
