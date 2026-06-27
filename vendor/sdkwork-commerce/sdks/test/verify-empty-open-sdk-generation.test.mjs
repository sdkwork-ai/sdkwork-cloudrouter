import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const workspaceRoot = path.resolve(import.meta.dirname, "..", "..");

test("empty commerce open-api SDK generation syncs metadata without invoking empty transport generation", () => {
  const result = spawnSync(
    "node",
    [
      "sdks/sdkwork-commerce-sdk/bin/generate-sdk.mjs",
      "--input",
      "apis/open-api/commerce/commerce-open-api.openapi.json",
    ],
    {
      cwd: workspaceRoot,
      encoding: "utf8",
    },
  );

  assert.equal(
    result.status,
    0,
    `empty commerce open-api SDK generation should exit 0\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  assert.match(result.stdout, /no owner-only operations/i);

  const manifest = JSON.parse(
    readFileSync(path.join(workspaceRoot, "sdks/sdkwork-commerce-sdk/sdk-manifest.json"), "utf8"),
  );
  assert.equal(manifest.ownerOnlyOperationCount, 0);
  assert.deepEqual(manifest.generatedPackages, {});
});
