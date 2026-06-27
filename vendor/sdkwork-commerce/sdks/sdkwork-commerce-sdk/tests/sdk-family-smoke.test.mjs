import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const sdkRoot = path.resolve(testDir, "..");

test("sdkwork-commerce-sdk uses the commerce open custom profile", () => {
  const source = readFileSync(path.join(sdkRoot, "bin/generate-sdk.mjs"), "utf8");
  assert.match(source, /runCommerceSdkGenerator/);
  assert.match(source, /sdkType: "custom"/);
  assert.match(source, /\/open\/v3\/api/);
});

test("sdkwork-commerce-sdk declares owner-only open authority metadata", () => {
  const assembly = JSON.parse(readFileSync(path.join(sdkRoot, ".sdkwork-assembly.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(path.join(sdkRoot, "sdk-manifest.json"), "utf8"));
  assert.equal(assembly.sdkOwner, "sdkwork-commerce");
  assert.equal(assembly.apiAuthority, "sdkwork-commerce-open-api");
  assert.equal(assembly.generationInputSpec, "../../apis/open-api/commerce/commerce-open-api.openapi.json");
  assert.equal(manifest.sdkName, "sdkwork-commerce-sdk");
  assert.equal(manifest.apiPrefix, "/open/v3/api");
  assert.equal(manifest.standardProfile, "sdkwork-commerce-open-v3");
});

