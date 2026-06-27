// @vitest-environment node

import { mkdtemp, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { readCacheRegistry, upsertCacheEntry } from "../src/cache-registry";
import { pruneCacheEntries } from "../src/retention-manager";

describe("retention-manager", () => {
  const cleanupPaths: string[] = [];

  afterEach(async () => {
    await Promise.all(
      cleanupPaths.splice(0).map((target) => rm(target, { recursive: true, force: true })),
    );
  });

  it("removes entries that exceed the configured ttl", async () => {
    const rootDir = await createTempRoot();
    const entry = await createEntry(rootDir, {
      requestFingerprint: "ttl-entry",
      schemaFingerprint: "schema-1",
      lastAccessedAt: "2026-04-10T00:00:00.000Z",
    });

    const result = await pruneCacheEntries(rootDir, {
      ttlMs: 24 * 60 * 60 * 1000,
      now: "2026-04-17T00:00:00.000Z",
    });

    expect(result.removedRequestFingerprints).toEqual(["ttl-entry"]);
    await expect(stat(entry.archivePath)).rejects.toThrow();
  });

  it("keeps only the newest entries up to the per-schema limit", async () => {
    const rootDir = await createTempRoot();
    await createEntry(rootDir, {
      requestFingerprint: "schema-old",
      schemaFingerprint: "schema-cap",
      lastAccessedAt: "2026-04-17T00:00:00.000Z",
    });
    await createEntry(rootDir, {
      requestFingerprint: "schema-mid",
      schemaFingerprint: "schema-cap",
      lastAccessedAt: "2026-04-17T01:00:00.000Z",
    });
    await createEntry(rootDir, {
      requestFingerprint: "schema-new",
      schemaFingerprint: "schema-cap",
      lastAccessedAt: "2026-04-17T02:00:00.000Z",
    });

    const result = await pruneCacheEntries(rootDir, {
      maxEntriesPerSchema: 2,
      now: "2026-04-17T03:00:00.000Z",
    });
    const snapshot = await readCacheRegistry(rootDir);

    expect(result.removedRequestFingerprints).toEqual(["schema-old"]);
    expect(Object.keys(snapshot.entriesByRequestFingerprint)).toEqual([
      "schema-mid",
      "schema-new",
    ]);
  });

  it("evicts the least recently used entries when total size exceeds the limit", async () => {
    const rootDir = await createTempRoot();
    await createEntry(rootDir, {
      requestFingerprint: "lru-old",
      schemaFingerprint: "schema-a",
      lastAccessedAt: "2026-04-17T00:00:00.000Z",
      workspaceSizeBytes: 100,
      archiveSizeBytes: 100,
    });
    await createEntry(rootDir, {
      requestFingerprint: "lru-mid",
      schemaFingerprint: "schema-b",
      lastAccessedAt: "2026-04-17T01:00:00.000Z",
      workspaceSizeBytes: 100,
      archiveSizeBytes: 100,
    });
    await createEntry(rootDir, {
      requestFingerprint: "lru-new",
      schemaFingerprint: "schema-c",
      lastAccessedAt: "2026-04-17T02:00:00.000Z",
      workspaceSizeBytes: 100,
      archiveSizeBytes: 100,
    });

    const result = await pruneCacheEntries(rootDir, {
      maxTotalSizeBytes: 450,
      now: "2026-04-17T03:00:00.000Z",
    });

    expect(result.removedRequestFingerprints).toEqual(["lru-old"]);
  });

  it("preserves locked entries during pruning", async () => {
    const rootDir = await createTempRoot();
    await createEntry(rootDir, {
      requestFingerprint: "locked-old",
      schemaFingerprint: "schema-lock",
      lastAccessedAt: "2026-04-17T00:00:00.000Z",
    });
    await createEntry(rootDir, {
      requestFingerprint: "locked-new",
      schemaFingerprint: "schema-lock",
      lastAccessedAt: "2026-04-17T01:00:00.000Z",
    });

    const result = await pruneCacheEntries(rootDir, {
      maxEntriesPerSchema: 1,
      lockedRequestFingerprints: ["locked-old"],
      now: "2026-04-17T03:00:00.000Z",
    });

    expect(result.removedRequestFingerprints).toEqual(["locked-new"]);
  });

  it("removes broken entries before healthy ones", async () => {
    const rootDir = await createTempRoot();
    const brokenEntry = await createEntry(rootDir, {
      requestFingerprint: "broken-entry",
      schemaFingerprint: "schema-broken",
      lastAccessedAt: "2026-04-17T00:00:00.000Z",
    });
    await rm(brokenEntry.archivePath, { force: true });
    await createEntry(rootDir, {
      requestFingerprint: "healthy-entry",
      schemaFingerprint: "schema-healthy",
      lastAccessedAt: "2026-04-17T01:00:00.000Z",
    });

    const result = await pruneCacheEntries(rootDir, {
      maxTotalSizeBytes: 10_000,
      now: "2026-04-17T03:00:00.000Z",
    });

    expect(result.removedRequestFingerprints).toEqual(["broken-entry"]);
  });

  async function createTempRoot() {
    const rootDir = await mkdtemp(join(tmpdir(), "sdk-downloader-retention-"));
    cleanupPaths.push(rootDir);
    return rootDir;
  }

  async function createEntry(
    rootDir: string,
    options: {
      requestFingerprint: string;
      schemaFingerprint: string;
      lastAccessedAt: string;
      workspaceSizeBytes?: number;
      archiveSizeBytes?: number;
    },
  ) {
    const workspacePath = join(
      rootDir,
      "data/artifacts/typescript/backend",
      options.schemaFingerprint,
      options.requestFingerprint,
      "workspace",
    );
    const archivePath = join(
      rootDir,
      "data/artifacts/typescript/backend",
      options.schemaFingerprint,
      options.requestFingerprint,
      "downloads",
      "sdk.zip",
    );

    await mkdir(workspacePath, { recursive: true });
    await mkdir(join(archivePath, ".."), { recursive: true });
    await writeFile(join(workspacePath, "sdk.ts"), "export const ok = true;\n", "utf-8");
    await writeFile(archivePath, "zip", "utf-8");

    await upsertCacheEntry(rootDir, {
      requestFingerprint: options.requestFingerprint,
      schemaFingerprint: options.schemaFingerprint,
      language: "typescript",
      sdkType: "backend",
      name: "DownloaderSdk",
      workspacePath,
      archivePath,
      workspaceSizeBytes: options.workspaceSizeBytes ?? 100,
      archiveSizeBytes: options.archiveSizeBytes ?? 50,
      createdAt: options.lastAccessedAt,
      lastAccessedAt: options.lastAccessedAt,
      generatorIdentity: "@sdkwork/sdk-generator",
      controlPlaneStatus: "healthy",
    });

    return {
      workspacePath,
      archivePath,
    };
  }
});
