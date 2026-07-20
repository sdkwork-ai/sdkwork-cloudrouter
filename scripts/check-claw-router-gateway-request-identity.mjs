#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const GATEWAY_ROOT = path.join(WORKSPACE_ROOT, 'crates', 'sdkwork-clawrouter-edge-runtime');

const REQUIRED_SOURCE_MARKERS = Object.freeze([
  {
    label: 'invocation_http server request id',
    file: path.join(GATEWAY_ROOT, 'src', 'invocation_http.rs'),
    markers: ['generate_server_request_id()'],
    forbidden: ['header_text(&headers, "x-request-id")'],
  },
  {
    label: 'gateway request identity module',
    file: path.join(GATEWAY_ROOT, 'src', 'request_identity.rs'),
    markers: ['pub(crate) fn generate_server_request_id'],
  },
  {
    label: 'shared server request id test helper',
    file: path.join(WORKSPACE_ROOT, 'crates', 'sdkwork-claw-test-support', 'src', 'lib.rs'),
    markers: ['pub fn assert_server_generated_request_id'],
  },
  {
    label: 'invocation router request id tests',
    file: path.join(GATEWAY_ROOT, 'tests', 'invocation_router.rs'),
    markers: ['sdkwork_claw_test_support::assert_server_generated_request_id'],
    forbidden: ['fn assert_server_generated_request_id'],
  },
]);

function assertSourceMarkers() {
  for (const entry of REQUIRED_SOURCE_MARKERS) {
    if (!existsSync(entry.file)) {
      throw new Error(`missing gateway source file: ${entry.file}`);
    }
    const source = readFileSync(entry.file, 'utf8');
    for (const marker of entry.markers) {
      if (!source.includes(marker)) {
        throw new Error(`${entry.label} must include marker ${marker}`);
      }
    }
    for (const forbidden of entry.forbidden ?? []) {
      if (source.includes(forbidden)) {
        throw new Error(`${entry.label} must not read client x-request-id: found ${forbidden}`);
      }
    }
  }
}

function runGatewayRequestIdentityTests() {
  execSync(
    'cargo test -p sdkwork-clawrouter-edge-runtime request_identity',
    {
      cwd: WORKSPACE_ROOT,
      stdio: 'inherit',
      env: process.env,
    },
  );
  execSync(
    'cargo test -p sdkwork-clawrouter-edge-runtime --test invocation_router',
    {
      cwd: WORKSPACE_ROOT,
      stdio: 'inherit',
      env: process.env,
    },
  );
}

function main() {
  assertSourceMarkers();
  runGatewayRequestIdentityTests();
  console.log('[check-claw-router-gateway-request-identity] gateway request identity alignment ok');
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    main();
  } catch (error) {
    console.error(`[check-claw-router-gateway-request-identity] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

export {
  REQUIRED_SOURCE_MARKERS,
  assertSourceMarkers,
  main,
  runGatewayRequestIdentityTests,
};
