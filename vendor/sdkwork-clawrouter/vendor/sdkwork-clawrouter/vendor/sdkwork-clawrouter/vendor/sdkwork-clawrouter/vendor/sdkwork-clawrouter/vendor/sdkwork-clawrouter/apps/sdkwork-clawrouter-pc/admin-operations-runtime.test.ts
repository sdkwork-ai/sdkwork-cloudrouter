import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("admin operations record service uses backend SDK instead of raw HTTP", () => {
  const source = readFileSync(
    "./packages/sdkwork-clawrouter-pc-admin-record/src/recordService.ts",
    "utf8",
  );

  assert.match(source, /getClawRouterBackendSdkClient\(\)/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\baxios\b/);
  assert.doesNotMatch(source, /\/backend\/v3\/api/);
});

test("admin operations record service keeps bounded pagination defaults", () => {
  const source = readFileSync(
    "./packages/sdkwork-clawrouter-pc-admin-record/src/recordService.ts",
    "utf8",
  );

  assert.match(source, /MAX_RECORD_LOG_PAGE_SIZE/);
  assert.match(source, /MAX_RECORD_LOG_FILTER_LENGTH/);
});
