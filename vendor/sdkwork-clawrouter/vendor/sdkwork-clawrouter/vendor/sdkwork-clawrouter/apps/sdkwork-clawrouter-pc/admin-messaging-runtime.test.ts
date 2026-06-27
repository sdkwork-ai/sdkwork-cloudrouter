import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("messaging admin service uses backend SDK instead of raw HTTP", () => {
  const source = readFileSync(
    "./packages/sdkwork-clawrouter-pc-admin-messaging/src/messagingService.ts",
    "utf8",
  );

  assert.match(source, /getClawRouterBackendSdkClient\(\)/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\baxios\b/);
  assert.doesNotMatch(source, /\/backend\/v3\/api/);
});

test("messaging admin routes map URL sections through sectionId", () => {
  const appSource = readFileSync("./src/App.tsx", "utf8");
  const adminSource = readFileSync(
    "./packages/sdkwork-clawrouter-pc-admin-messaging/src/index.tsx",
    "utf8",
  );

  assert.match(appSource, /path="messaging\/providers" element=\{<MessagingAdmin sectionId="providers" \/>}/);
  assert.match(adminSource, /AdminResourceCenter/);
  assert.match(adminSource, /resolveMessagingSectionId/);
  assert.match(adminSource, /sectionId\?: string/);
});
