import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("announcement admin service uses backend SDK instead of raw HTTP", () => {
  const source = readFileSync(
    "./packages/sdkwork-clawrouter-pc-admin-announcement/src/announcementService.ts",
    "utf8",
  );

  assert.match(source, /getClawRouterBackendSdkClient\(\)/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\baxios\b/);
  assert.doesNotMatch(source, /\/backend\/v3\/api/);
});

test("announcement admin page renders announcement contract fields", () => {
  const source = readFileSync(
    "./packages/sdkwork-clawrouter-pc-admin-announcement/src/index.tsx",
    "utf8",
  );

  for (const field of ["title", "target", "status", "showAsPopup", "content"]) {
    assert.match(source, new RegExp(field));
  }
});
