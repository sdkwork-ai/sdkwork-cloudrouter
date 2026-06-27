// @vitest-environment node

import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import {
  readCacheRegistry,
  resolveHealthyCacheEntry,
  upsertCacheEntry,
} from "../src/cache-registry";

describe("cache-registry", () => {
  const cleanupPaths: string[] = [];

  afterEach(async () => {
    await Promise.all(
      cleanupPaths.splice(0).map((target) => rm(target, { force: true, recursive: true })),
    );
  });

  it("bootstraps an empty registry when no cache index exists", async () => {
    const rootDir = await createTempRoot();

    const snapshot = await readCacheRegistry(rootDir);

    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.entries).toEqual([]);
    expect(snapshot.entriesByRequestFingerprint).toEqual({});
  });

  it("persists and reads back cache entries from the registry index", async () => {
    const rootDir = await createTempRoot();
    const workspacePath = await createFile(rootDir, "data/artifacts/typescript/backend/schema-a/request-a/workspace/sdk.ts");
    const archivePath = await createFile(rootDir, "data/artifacts/typescript/backend/schema-a/request-a/downloads/sdk.zip");

    await upsertCacheEntry(rootDir, {
      requestFingerprint: "request-a",
      schemaFingerprint: "schema-a",
      language: "typescript",
      sdkType: "backend",
      name: "DownloaderSdk",
      packageName: "@sdkwork/downloader-sdk",
      workspacePath,
      archivePath,
      workspaceSizeBytes: 100,
      archiveSizeBytes: 50,
      createdAt: "2026-04-17T02:00:00.000Z",
      lastAccessedAt: "2026-04-17T02:00:00.000Z",
      generatorIdentity: "@sdkwork/sdk-generator",
      controlPlaneStatus: "healthy",
    });

    const rawRegistry = JSON.parse(
      await readFile(join(rootDir, "data/index/cache-registry.json"), "utf-8"),
    ) as { entries: Array<{ requestFingerprint: string }> };
    const snapshot = await readCacheRegistry(rootDir);

    expect(rawRegistry.entries[0]?.requestFingerprint).toBe("request-a");
    expect(snapshot.entriesByRequestFingerprint["request-a"]?.archivePath).toBe(archivePath);
  });

  it("resolves a healthy cache entry and updates the access timestamp", async () => {
    const rootDir = await createTempRoot();
    const workspacePath = await createFile(rootDir, "data/artifacts/typescript/backend/schema-b/request-b/workspace/sdk.ts");
    const archivePath = await createFile(rootDir, "data/artifacts/typescript/backend/schema-b/request-b/downloads/sdk.zip");

    await upsertCacheEntry(rootDir, {
      requestFingerprint: "request-b",
      schemaFingerprint: "schema-b",
      language: "typescript",
      sdkType: "backend",
      name: "DownloaderSdk",
      workspacePath,
      archivePath,
      workspaceSizeBytes: 120,
      archiveSizeBytes: 60,
      createdAt: "2026-04-17T02:00:00.000Z",
      lastAccessedAt: "2026-04-17T02:00:00.000Z",
      generatorIdentity: "@sdkwork/sdk-generator",
      controlPlaneStatus: "healthy",
    });

    const hit = await resolveHealthyCacheEntry(rootDir, "request-b", {
      accessedAt: "2026-04-17T03:00:00.000Z",
    });
    const snapshot = await readCacheRegistry(rootDir);

    expect(hit?.health.status).toBe("healthy");
    expect(snapshot.entriesByRequestFingerprint["request-b"]?.lastAccessedAt).toBe(
      "2026-04-17T03:00:00.000Z",
    );
  });

  it("rejects cache hits when the workspace or archive path is missing", async () => {
    const rootDir = await createTempRoot();
    const workspacePath = await createFile(rootDir, "data/artifacts/typescript/backend/schema-c/request-c/workspace/sdk.ts");
    const archivePath = await createFile(rootDir, "data/artifacts/typescript/backend/schema-c/request-c/downloads/sdk.zip");

    await upsertCacheEntry(rootDir, {
      requestFingerprint: "request-c",
      schemaFingerprint: "schema-c",
      language: "typescript",
      sdkType: "backend",
      name: "DownloaderSdk",
      workspacePath,
      archivePath,
      workspaceSizeBytes: 200,
      archiveSizeBytes: 80,
      createdAt: "2026-04-17T02:00:00.000Z",
      lastAccessedAt: "2026-04-17T02:00:00.000Z",
      generatorIdentity: "@sdkwork/sdk-generator",
      controlPlaneStatus: "healthy",
    });

    await rm(archivePath, { force: true });

    await expect(resolveHealthyCacheEntry(rootDir, "request-c")).resolves.toBeNull();
  });

  it("rejects cache hits when the control-plane status is degraded", async () => {
    const rootDir = await createTempRoot();
    const workspacePath = await createFile(rootDir, "data/artifacts/typescript/backend/schema-d/request-d/workspace/sdk.ts");
    const archivePath = await createFile(rootDir, "data/artifacts/typescript/backend/schema-d/request-d/downloads/sdk.zip");

    await upsertCacheEntry(rootDir, {
      requestFingerprint: "request-d",
      schemaFingerprint: "schema-d",
      language: "typescript",
      sdkType: "backend",
      name: "DownloaderSdk",
      workspacePath,
      archivePath,
      workspaceSizeBytes: 200,
      archiveSizeBytes: 80,
      createdAt: "2026-04-17T02:00:00.000Z",
      lastAccessedAt: "2026-04-17T02:00:00.000Z",
      generatorIdentity: "@sdkwork/sdk-generator",
      controlPlaneStatus: "degraded",
    });

    await expect(resolveHealthyCacheEntry(rootDir, "request-d")).resolves.toBeNull();
  });

  async function createTempRoot() {
    const rootDir = await mkdtemp(join(tmpdir(), "sdk-downloader-cache-"));
    cleanupPaths.push(rootDir);
    return rootDir;
  }

  async function createFile(rootDir: string, relativePath: string) {
    const targetPath = join(rootDir, relativePath);
    await mkdir(join(targetPath, ".."), { recursive: true });
    await writeFile(targetPath, "fixture", "utf-8");
    return targetPath;
  }
});
