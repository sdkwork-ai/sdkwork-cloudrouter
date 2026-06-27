import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("marketing admin service uses backend SDK instead of raw HTTP", () => {
  const source = readFileSync(
    "./packages/sdkwork-clawrouter-pc-admin-marketing/src/marketingService.ts",
    "utf8",
  );

  assert.match(source, /getClawRouterBackendSdkClient\(\)/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\baxios\b/);
  assert.doesNotMatch(source, /\/backend\/v3\/api/);
});

test("marketing admin shell avoids nested second-level sidebars", () => {
  const source = readFileSync(
    "./packages/sdkwork-clawrouter-pc-admin-marketing/src/index.tsx",
    "utf8",
  );

  assert.match(source, /sectionId/);
  assert.doesNotMatch(source, /<aside className=/);
});
