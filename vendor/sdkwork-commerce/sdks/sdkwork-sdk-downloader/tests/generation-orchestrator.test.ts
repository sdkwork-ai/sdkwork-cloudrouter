// @vitest-environment node

import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it, vi } from "vitest";

import { upsertCacheEntry } from "../src/cache-registry";
import { createGenerationOrchestrator } from "../src/generation-orchestrator";

describe("generation-orchestrator", () => {
  const cleanupPaths: string[] = [];

  afterEach(async () => {
    await Promise.all(
      cleanupPaths.splice(0).map((target) => rm(target, { recursive: true, force: true })),
    );
  });

  it("calls the generator on a cache miss", async () => {
    const rootDir = await createTempRoot();
    const generateSdkProject = vi.fn(async ({ outputPath }: { outputPath: string }) => {
      await mkdir(outputPath, { recursive: true });
      await writeFile(join(outputPath, "sdk.ts"), "export const ok = true;\n", "utf-8");
      return {
        resolvedVersion: {
          version: "1.0.1",
        },
      };
    });
    const readControlPlaneSnapshot = vi.fn(async () => ({
      evaluation: {
        status: "healthy" as const,
      },
    }));
    const packageArtifact = vi.fn(async ({ downloadsDir }: { downloadsDir: string }) => {
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

    const orchestrator = createGenerationOrchestrator({
      rootDir,
      generatorClient: {
        generateSdkProject,
        readControlPlaneSnapshot,
      },
      packageArtifact,
    });

    const result = await orchestrator.prepareWorkspace({
      schema: {
        openapi: "3.0.3",
        info: {
          title: "Downloader",
          version: "1.0.0",
        },
        paths: {},
      },
      schemaFingerprint: "schema-a",
      requestFingerprint: "request-a",
      language: "typescript",
      sdkType: "backend",
      name: "DownloaderSdk",
    });

    expect(generateSdkProject).toHaveBeenCalledTimes(1);
    expect(result.cacheStatus).toBe("miss");
    expect(result.sdkVersion).toBe("1.0.1");
  });

  it("reuses a healthy cached artifact without calling the generator again", async () => {
    const rootDir = await createTempRoot();
    const workspacePath = join(rootDir, "data/artifacts/typescript/backend/schema-b/request-b/workspace");
    const archivePath = join(rootDir, "data/artifacts/typescript/backend/schema-b/request-b/downloads/sdk.zip");
    await mkdir(workspacePath, { recursive: true });
    await mkdir(join(archivePath, ".."), { recursive: true });
    await writeFile(join(workspacePath, "sdk.ts"), "export const ok = true;\n", "utf-8");
    await writeFile(archivePath, "zip", "utf-8");
    await upsertCacheEntry(rootDir, {
      requestFingerprint: "request-b",
      schemaFingerprint: "schema-b",
      language: "typescript",
      sdkType: "backend",
      name: "DownloaderSdk",
      workspacePath,
      archivePath,
      workspaceSizeBytes: 10,
      archiveSizeBytes: 3,
      createdAt: "2026-04-17T00:00:00.000Z",
      lastAccessedAt: "2026-04-17T00:00:00.000Z",
      generatorIdentity: "@sdkwork/sdk-generator",
      controlPlaneStatus: "healthy",
    });

    const generateSdkProject = vi.fn();
    const readControlPlaneSnapshot = vi.fn(async () => ({
      evaluation: {
        status: "healthy" as const,
      },
    }));
    const orchestrator = createGenerationOrchestrator({
      rootDir,
      generatorClient: {
        generateSdkProject,
        readControlPlaneSnapshot,
      },
      packageArtifact: vi.fn(),
    });

    const result = await orchestrator.prepareWorkspace({
      schema: {
        openapi: "3.0.3",
        info: {
          title: "Downloader",
          version: "1.0.0",
        },
        paths: {},
      },
      schemaFingerprint: "schema-b",
      requestFingerprint: "request-b",
      language: "typescript",
      sdkType: "backend",
      name: "DownloaderSdk",
    });

    expect(generateSdkProject).not.toHaveBeenCalled();
    expect(result.cacheStatus).toBe("hit");
    expect(result.archivePath).toBe(archivePath);
  });

  it("collapses duplicate concurrent requests into one in-flight generation", async () => {
    const rootDir = await createTempRoot();
    const generateSdkProject = vi.fn(async ({ outputPath }: { outputPath: string }) => {
      await new Promise((resolve) => setTimeout(resolve, 25));
      await mkdir(outputPath, { recursive: true });
      await writeFile(join(outputPath, "sdk.ts"), "export const ok = true;\n", "utf-8");
      return {
        resolvedVersion: {
          version: "1.0.2",
        },
      };
    });

    const orchestrator = createGenerationOrchestrator({
      rootDir,
      generatorClient: {
        generateSdkProject,
        readControlPlaneSnapshot: vi.fn(async () => ({
          evaluation: {
            status: "healthy" as const,
          },
        })),
      },
      packageArtifact: vi.fn(async ({ downloadsDir }: { downloadsDir: string }) => {
        const archivePath = join(downloadsDir, "sdk.zip");
        await mkdir(downloadsDir, { recursive: true });
        await writeFile(archivePath, "zip", "utf-8");
        return {
          archivePath,
          archiveSizeBytes: 3,
          workspaceFingerprint: "workspace-fingerprint",
          reused: false,
        };
      }),
    });

    const [first, second] = await Promise.all([
      orchestrator.prepareWorkspace({
        schema: {
          openapi: "3.0.3",
          info: { title: "Downloader", version: "1.0.0" },
          paths: {},
        },
        schemaFingerprint: "schema-c",
        requestFingerprint: "request-c",
        language: "typescript",
        sdkType: "backend",
        name: "DownloaderSdk",
      }),
      orchestrator.prepareWorkspace({
        schema: {
          openapi: "3.0.3",
          info: { title: "Downloader", version: "1.0.0" },
          paths: {},
        },
        schemaFingerprint: "schema-c",
        requestFingerprint: "request-c",
        language: "typescript",
        sdkType: "backend",
        name: "DownloaderSdk",
      }),
    ]);

    expect(generateSdkProject).toHaveBeenCalledTimes(1);
    expect(first.archivePath).toBe(second.archivePath);
  });

  it("regenerates when the cached control-plane state is degraded", async () => {
    const rootDir = await createTempRoot();
    const workspacePath = join(rootDir, "data/artifacts/typescript/backend/schema-d/request-d/workspace");
    const archivePath = join(rootDir, "data/artifacts/typescript/backend/schema-d/request-d/downloads/sdk.zip");
    await mkdir(workspacePath, { recursive: true });
    await mkdir(join(archivePath, ".."), { recursive: true });
    await writeFile(join(workspacePath, "sdk.ts"), "export const oldVersion = true;\n", "utf-8");
    await writeFile(archivePath, "zip", "utf-8");
    await upsertCacheEntry(rootDir, {
      requestFingerprint: "request-d",
      schemaFingerprint: "schema-d",
      language: "typescript",
      sdkType: "backend",
      name: "DownloaderSdk",
      workspacePath,
      archivePath,
      workspaceSizeBytes: 10,
      archiveSizeBytes: 3,
      createdAt: "2026-04-17T00:00:00.000Z",
      lastAccessedAt: "2026-04-17T00:00:00.000Z",
      generatorIdentity: "@sdkwork/sdk-generator",
      controlPlaneStatus: "healthy",
    });

    const generateSdkProject = vi.fn(async ({ outputPath }: { outputPath: string }) => {
      await mkdir(outputPath, { recursive: true });
      await writeFile(join(outputPath, "sdk.ts"), "export const newVersion = true;\n", "utf-8");
      return {
        resolvedVersion: {
          version: "1.0.3",
        },
      };
    });
    const readControlPlaneSnapshot = vi.fn()
      .mockResolvedValueOnce({
        evaluation: {
          status: "degraded" as const,
        },
      })
      .mockResolvedValueOnce({
        evaluation: {
          status: "healthy" as const,
        },
      });

    const orchestrator = createGenerationOrchestrator({
      rootDir,
      generatorClient: {
        generateSdkProject,
        readControlPlaneSnapshot,
      },
      packageArtifact: vi.fn(async ({ downloadsDir }: { downloadsDir: string }) => {
        const nextArchivePath = join(downloadsDir, "sdk.zip");
        await mkdir(downloadsDir, { recursive: true });
        await writeFile(nextArchivePath, "zip", "utf-8");
        return {
          archivePath: nextArchivePath,
          archiveSizeBytes: 3,
          workspaceFingerprint: "workspace-fingerprint",
          reused: false,
        };
      }),
    });

    const result = await orchestrator.prepareWorkspace({
      schema: {
        openapi: "3.0.3",
        info: { title: "Downloader", version: "1.0.0" },
        paths: {},
      },
      schemaFingerprint: "schema-d",
      requestFingerprint: "request-d",
      language: "typescript",
      sdkType: "backend",
      name: "DownloaderSdk",
    });

    expect(generateSdkProject).toHaveBeenCalledTimes(1);
    expect(result.cacheStatus).toBe("miss");
  });

  async function createTempRoot() {
    const rootDir = await mkdtemp(join(tmpdir(), "sdk-downloader-orchestrator-"));
    cleanupPaths.push(rootDir);
    return rootDir;
  }
});
