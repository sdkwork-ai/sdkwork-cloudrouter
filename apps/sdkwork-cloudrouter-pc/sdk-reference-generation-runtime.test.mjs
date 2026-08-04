import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readPortalFile(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function readWorkspaceFile(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function readSiblingWorkspaceFile(relativePath) {
  return readFileSync(new URL(`../../../${relativePath}`, import.meta.url), "utf8");
}

test("sdk reference generation calls generated app SDK routes", () => {
  const pageSource = readSiblingWorkspaceFile(
    "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-sdk-reference/src/pages/SdkReference.tsx",
  );
  const serviceSource = readSiblingWorkspaceFile(
    "sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-sdk-reference/src/sdkReferenceGenerationService.ts",
  );
  const appSdkSource = readWorkspaceFile(
    "../sdkwork-documents/sdks/sdkwork-documents-app-sdk/sdkwork-documents-app-sdk-typescript/src/index.ts/api/sdk-reference.ts",
  );

  for (const source of [pageSource, serviceSource]) {
    assert.equal(source.includes("fetch('/api/sdk-readme'"), false);
    assert.equal(source.includes('fetch("/api/sdk-readme"'), false);
    assert.equal(source.includes("fetch('/api/generate-sdk'"), false);
    assert.equal(source.includes('fetch("/api/generate-sdk"'), false);
  }

  assert.match(serviceSource, /getDocumentsAppSdkClient/u);
  assert.match(serviceSource, /sdkReference\.documentation\.create/u);
  assert.match(serviceSource, /sdkReference\.archives\.create/u);
  assert.match(appSdkSource, /appApiPath\(`\/sdk_reference\/documentation`\)/u);
  assert.match(appSdkSource, /appApiPath\(`\/sdk_reference\/archives`\)/u);
});
