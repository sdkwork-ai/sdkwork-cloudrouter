// @vitest-environment node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { createSchemaFingerprint } from "../src/schema-fingerprint";
import { createRequestFingerprint } from "../src/request-fingerprint";

const fixtureJsonPath = resolve(
  "sdks/sdkwork-sdk-downloader/tests/fixtures/openapi.sample.json",
);
const fixtureYamlPath = resolve(
  "sdks/sdkwork-sdk-downloader/tests/fixtures/openapi.sample.yaml",
);

describe("schema-fingerprint", () => {
  it("produces the same schema fingerprint for equivalent JSON and YAML content", async () => {
    const jsonContent = JSON.parse(await readFile(fixtureJsonPath, "utf-8")) as Record<string, unknown>;
    const yamlContent = await readFile(fixtureYamlPath, "utf-8");

    const jsonFingerprint = createSchemaFingerprint(jsonContent);
    const yamlFingerprint = createSchemaFingerprint(yamlContent);

    expect(jsonFingerprint).toBe(yamlFingerprint);
  });

  it("changes the request fingerprint when the target language changes", () => {
    const schemaFingerprint = createSchemaFingerprint({
      openapi: "3.0.3",
      info: {
        title: "Language Change",
        version: "1.0.0",
      },
      paths: {},
    });

    const typescriptFingerprint = createRequestFingerprint({
      schemaFingerprint,
      language: "typescript",
      sdkType: "backend",
      name: "DownloaderSdk",
    });
    const javaFingerprint = createRequestFingerprint({
      schemaFingerprint,
      language: "java",
      sdkType: "backend",
      name: "DownloaderSdk",
    });

    expect(typescriptFingerprint).not.toBe(javaFingerprint);
  });

  it("changes the request fingerprint when the package name changes", () => {
    const schemaFingerprint = createSchemaFingerprint({
      openapi: "3.0.3",
      info: {
        title: "Package Change",
        version: "1.0.0",
      },
      paths: {},
    });

    const firstFingerprint = createRequestFingerprint({
      schemaFingerprint,
      language: "typescript",
      sdkType: "backend",
      name: "DownloaderSdk",
      packageName: "@sdkwork/downloader-a",
    });
    const secondFingerprint = createRequestFingerprint({
      schemaFingerprint,
      language: "typescript",
      sdkType: "backend",
      name: "DownloaderSdk",
      packageName: "@sdkwork/downloader-b",
    });

    expect(firstFingerprint).not.toBe(secondFingerprint);
  });

  it("ignores retention policy options when building the request fingerprint", () => {
    const schemaFingerprint = createSchemaFingerprint({
      openapi: "3.0.3",
      info: {
        title: "Retention Policy",
        version: "1.0.0",
      },
      paths: {},
    });

    const firstFingerprint = createRequestFingerprint({
      schemaFingerprint,
      language: "typescript",
      sdkType: "backend",
      name: "DownloaderSdk",
      retention: {
        ttlMs: 60_000,
        maxEntriesPerSchema: 3,
      },
    });
    const secondFingerprint = createRequestFingerprint({
      schemaFingerprint,
      language: "typescript",
      sdkType: "backend",
      name: "DownloaderSdk",
      retention: {
        ttlMs: 120_000,
        maxEntriesPerSchema: 7,
      },
    });

    expect(firstFingerprint).toBe(secondFingerprint);
  });
});
