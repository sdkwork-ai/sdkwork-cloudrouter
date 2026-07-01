#!/usr/bin/env node
/**
 * One-shot migration helper: legacy PlusApiResult wire assertions -> SdkWork v3.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testsDir = path.join(
  root,
  'services/sdkwork-clawrouter-router-service/tests',
);

const legacyErrorCodes = {
  '4001': '40001',
  '4010': '40101',
  '4040': '40401',
  '4004': '40401',
  '4090': '40901',
  '4220': '42201',
  '5000': '50001',
  '5001': '50001',
  '5030': '50301',
};

function migrateContent(source) {
  let next = source;
  next = next.replaceAll('assert_eq!("2000", ', 'assert_eq!(0, ');
  next = next.replaceAll('["code"]);', '["code"].as_i64().unwrap());');
  for (const [legacy, platform] of Object.entries(legacyErrorCodes)) {
    next = next.replaceAll(`assert_eq!("${legacy}", `, `assert_eq!(${platform}, `);
  }
  next = next.replaceAll('payload["msg"]', 'payload["detail"]');
  next = next.replaceAll('create_payload["msg"]', 'create_payload["detail"]');
  next = next.replaceAll('update_payload["msg"]', 'update_payload["detail"]');
  next = next.replaceAll('transactions["msg"]', 'transactions["detail"]');
  next = next.replaceAll('assert_eq!("SUCCESS", payload["detail"]);', '');
  return next;
}

let changed = 0;
for (const entry of fs.readdirSync(testsDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.rs')) {
    continue;
  }
  const filePath = path.join(testsDir, entry.name);
  const original = fs.readFileSync(filePath, 'utf8');
  const migrated = migrateContent(original);
  if (migrated !== original) {
    fs.writeFileSync(filePath, migrated);
    changed += 1;
    console.log(`migrated ${entry.name}`);
  }
}

console.log(`done: ${changed} test files updated`);
