// @vitest-environment node

import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createSdkworkSdkDownloaderService } from "../src/sdk-downloader-service";

describe("sdk-downloader-service", () => {
  const cleanupPaths: string[] = [];

  afterEach(async () => {
    await Promise.all(
      cleanupPaths.splice(0).map((target) => rm(target, { recursive: true, force: true })),
    );
  });

  it("prepares an artifact on demand", async () => {
    const rootDir = await createTempRoot();
    const service = createSdkworkSdkDownloaderService({
      rootDir,
      generatorClient: createFakeGeneratorClient(),
      packageArtifact: createFakePackager(),
    });

    const result = await service.prepareSdkArtifact({
      schema: {
        kind: "object",
        value: {
          openapi: "3.0.3",
          info: {
            title: "Service Test",
            version: "1.0.0",
          },
          paths: {},
        },
      },
      language: "typescript",
      sdkType: "backend",
      name: "DownloaderSdk",
    });

    expect(result.cacheStatus).toBe("miss");
    expect(result.requestFingerprint).toHaveLength(64);
  });

  it("resolves a cached artifact without generating again", async () => {
    const rootDir = await createTempRoot();
    const generatorClient = createFakeGeneratorClient();
    const service = createSdkworkSdkDownloaderService({
      rootDir,
      generatorClient,
      packageArtifact: createFakePackager(),
    });

    const prepared = await service.prepareSdkArtifact({
      schema: {
        kind: "object",
        value: {
          openapi: "3.0.3",
          info: {
            title: "Service Cache",
            version: "1.0.0",
          },
          paths: {},
        },
      },
      language: "typescript",
      sdkType: "backend",
      name: "DownloaderSdk",
    });

    generatorClient.generateSdkProject.mockClear();

    const resolved = await service.resolveCachedArtifact({
      schema: {
        kind: "object",
        value: {
          openapi: "3.0.3",
          info: {
            title: "Service Cache",
            version: "1.0.0",
          },
          paths: {},
        },
      },
      language: "typescript",
      sdkType: "backend",
      name: "DownloaderSdk",
    });

    expect(generatorClient.generateSdkProject).not.toHaveBeenCalled();
    expect(resolved?.archivePath).toBe(prepared.archivePath);
  });

  it("inspects a cache entry by request fingerprint", async () => {
    const rootDir = await createTempRoot();
    const service = createSdkworkSdkDownloaderService({
      rootDir,
      generatorClient: createFakeGeneratorClient(),
      packageArtifact: createFakePackager(),
    });

    const prepared = await service.prepareSdkArtifact({
      schema: {
        kind: "object",
        value: {
          openapi: "3.0.3",
          info: {
            title: "Inspection",
            version: "1.0.0",
          },
          paths: {},
        },
      },
      language: "typescript",
      sdkType: "backend",
      name: "DownloaderSdk",
    });

    const inspection = await service.inspectCacheEntry(prepared.requestFingerprint);

    expect(inspection?.entry.requestFingerprint).toBe(prepared.requestFingerprint);
    expect(inspection?.health.status).toBe("healthy");
  });

  it("prunes cached entries with an explicit policy override", async () => {
    const rootDir = await createTempRoot();
    const service = createSdkworkSdkDownloaderService({
      rootDir,
      generatorClient: createFakeGeneratorClient(),
      packageArtifact: createFakePackager(),
    });

    await service.prepareSdkArtifact({
      schema: {
        kind: "object",
        value: {
          openapi: "3.0.3",
          info: {
            title: "Prune",
            version: "1.0.0",
          },
          paths: {},
        },
      },
      language: "typescript",
      sdkType: "backend",
      name: "DownloaderSdk",
    });
    const [entry] = await service.listCacheEntries();
    const prunedAt = new Date(Date.parse(entry?.lastAccessedAt ?? new Date().toISOString()) + 1).toISOString();

    const pruneResult = await service.pruneCache({
      ttlMs: 0,
      now: prunedAt,
    });

    expect(pruneResult.removedRequestFingerprints).toHaveLength(1);
  });

  it("reports cache health summary", async () => {
    const rootDir = await createTempRoot();
    const service = createSdkworkSdkDownloaderService({
      rootDir,
      generatorClient: createFakeGeneratorClient(),
      packageArtifact: createFakePackager(),
    });

    await service.prepareSdkArtifact({
      schema: {
        kind: "object",
        value: {
          openapi: "3.0.3",
          info: {
            title: "Health",
            version: "1.0.0",
          },
          paths: {},
        },
      },
      language: "typescript",
      sdkType: "backend",
      name: "DownloaderSdk",
    });

    const report = await service.getHealthReport();

    expect(report.totalEntries).toBe(1);
    expect(report.healthyEntries).toBe(1);
    expect(report.unhealthyEntries).toBe(0);
  });

  async function createTempRoot() {
    const rootDir = await mkdtemp(join(tmpdir(), "sdk-downloader-service-"));
    cleanupPaths.push(rootDir);
    return rootDir;
  }

  function createFakeGeneratorClient() {
    return {
      generateSdkProject: vi.fn(async ({ outputPath }: { outputPath: string }) => {
        await import("node:fs/promises").then(async ({ mkdir, writeFile }) => {
          await mkdir(outputPath, { recursive: true });
          await writeFile(join(outputPath, "sdk.ts"), "export const ok = true;\n", "utf-8");
        });
        return {
          resolvedVersion: {
            version: "1.0.0",
          },
        };
      }),
      readControlPlaneSnapshot: vi.fn(async () => ({
        evaluation: {
          status: "healthy" as const,
        },
      })),
    };
  }

  function createFakePackager() {
    return vi.fn(async ({ downloadsDir }: { downloadsDir: string }) => {
      const { mkdir, writeFile } = await import("node:fs/promises");
      const archivePath = join(downloadsDir, "sdk.zip");
      await mkdir(downloadsDir, { recursive: true });
      await writeFile(archivePath, "zip", "utf-8");
      return {
        archivePath,
        archiveSizeBytes: 3,
        workspaceFingerprint: "workspace-fingerprint",
        reused: false,
      };
    });
  }
});
