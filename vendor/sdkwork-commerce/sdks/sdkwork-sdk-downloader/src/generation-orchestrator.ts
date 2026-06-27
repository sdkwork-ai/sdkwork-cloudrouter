import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  type PackageWorkspaceArtifactOptions,
  type PackagedWorkspaceArtifact,
  packageWorkspaceArtifact,
} from "./artifact-packager";
import { evaluateCacheEntryHealth, type CacheEntryHealth } from "./cache-health";
import { readCacheRegistry, upsertCacheEntry, type SdkCacheEntry } from "./cache-registry";
import {
  createSdkGeneratorClient,
  type GenerateControlPlaneSnapshotLike,
  type SdkGeneratorClient,
} from "./generator-client";
import { pruneCacheEntries, type PruneCacheOptions } from "./retention-manager";

export interface PrepareWorkspaceRequest {
  schema: Record<string, unknown>;
  schemaFingerprint: string;
  requestFingerprint: string;
  language: string;
  sdkType: string;
  name: string;
  packageName?: string;
  namespace?: string;
  commonPackage?: string;
  baseUrl?: string;
  apiPrefix?: string;
  sdkVersion?: string;
  fixedSdkVersion?: string;
  npmRegistry?: string;
  npmPackageName?: string;
  sdkRoot?: string;
  sdkName?: string;
  syncPublishedVersion?: boolean;
  retention?: PruneCacheOptions;
}

export interface PreparedWorkspaceResult {
  requestFingerprint: string;
  schemaFingerprint: string;
  workspacePath: string;
  archivePath: string;
  cacheStatus: "hit" | "miss";
  health: CacheEntryHealth;
  sdkVersion?: string;
}

export interface GenerationOrchestrator {
  prepareWorkspace(
    request: PrepareWorkspaceRequest,
  ): Promise<PreparedWorkspaceResult>;
  resolveCachedWorkspace(
    requestFingerprint: string,
  ): Promise<PreparedWorkspaceResult | null>;
}

export interface CreateGenerationOrchestratorOptions {
  rootDir: string;
  generatorClient?: SdkGeneratorClient;
  packageArtifact?: (
    options: PackageWorkspaceArtifactOptions,
  ) => Promise<PackagedWorkspaceArtifact>;
  defaultRetention?: PruneCacheOptions;
}

export function createGenerationOrchestrator(
  options: CreateGenerationOrchestratorOptions,
): GenerationOrchestrator {
  const rootDir = resolve(options.rootDir);
  const generatorClient = options.generatorClient ?? createSdkGeneratorClient();
  const packageArtifact = options.packageArtifact ?? packageWorkspaceArtifact;
  const inFlight = new Map<string, Promise<PreparedWorkspaceResult>>();

  return {
    async prepareWorkspace(request) {
      const existingPromise = inFlight.get(request.requestFingerprint);
      if (existingPromise) {
        return existingPromise;
      }

      const execution = prepareWorkspaceInternal(
        rootDir,
        generatorClient,
        packageArtifact,
        request,
        options.defaultRetention,
      ).finally(() => {
        inFlight.delete(request.requestFingerprint);
      });

      inFlight.set(request.requestFingerprint, execution);
      return execution;
    },

    async resolveCachedWorkspace(requestFingerprint) {
      return resolveCachedWorkspace(rootDir, generatorClient, requestFingerprint);
    },
  };
}

async function prepareWorkspaceInternal(
  rootDir: string,
  generatorClient: SdkGeneratorClient,
  packageArtifact: (
    options: PackageWorkspaceArtifactOptions,
  ) => Promise<PackagedWorkspaceArtifact>,
  request: PrepareWorkspaceRequest,
  defaultRetention?: PruneCacheOptions,
): Promise<PreparedWorkspaceResult> {
  const cached = await resolveCachedWorkspace(
    rootDir,
    generatorClient,
    request.requestFingerprint,
  );
  if (cached) {
    return cached;
  }

  const workspacePath = resolveArtifactWorkspacePath(
    rootDir,
    request.language,
    request.sdkType,
    request.schemaFingerprint,
    request.requestFingerprint,
  );
  const downloadsDir = resolveArtifactDownloadsPath(
    rootDir,
    request.language,
    request.sdkType,
    request.schemaFingerprint,
    request.requestFingerprint,
  );

  await rm(workspacePath, { recursive: true, force: true });
  await mkdir(workspacePath, { recursive: true });

  const generationResult = await generatorClient.generateSdkProject({
    outputPath: workspacePath,
    spec: request.schema,
    name: request.name,
    language: request.language,
    sdkType: request.sdkType,
    packageName: request.packageName,
    namespace: request.namespace,
    commonPackage: request.commonPackage,
    baseUrl: request.baseUrl,
    apiPrefix: request.apiPrefix,
    sdkVersion: request.sdkVersion,
    fixedSdkVersion: request.fixedSdkVersion,
    npmRegistry: request.npmRegistry,
    npmPackageName: request.npmPackageName,
    sdkRoot: request.sdkRoot,
    sdkName: request.sdkName,
    syncPublishedVersion: request.syncPublishedVersion,
  });

  const controlPlaneStatus = normalizeControlPlaneStatus(
    await generatorClient.readControlPlaneSnapshot(workspacePath),
  );
  if (controlPlaneStatus !== "healthy") {
    throw new Error(`Generated workspace control plane is not healthy: ${controlPlaneStatus}`);
  }

  if (await isWorkspaceEmpty(workspacePath)) {
    await writeFile(
      join(workspacePath, "sdkwork-placeholder.txt"),
      "placeholder\n",
      "utf-8",
    );
  }

  const packagedArtifact = await packageArtifact({
    workspacePath,
    downloadsDir,
    archiveBaseName: `${request.name}-${request.language}-${request.sdkType}`.toLowerCase(),
  });

  const createdAt = new Date().toISOString();
  await upsertCacheEntry(rootDir, {
    requestFingerprint: request.requestFingerprint,
    schemaFingerprint: request.schemaFingerprint,
    language: request.language,
    sdkType: request.sdkType,
    name: request.name,
    packageName: request.packageName,
    workspacePath,
    archivePath: packagedArtifact.archivePath,
    workspaceSizeBytes: await getDirectorySize(workspacePath),
    archiveSizeBytes: packagedArtifact.archiveSizeBytes,
    createdAt,
    lastAccessedAt: createdAt,
    generatorIdentity: "@sdkwork/sdk-generator",
    controlPlaneStatus,
  });

  const retentionPolicy = {
    ...defaultRetention,
    ...request.retention,
  };
  if (
    retentionPolicy.ttlMs !== undefined
    || retentionPolicy.maxEntriesPerSchema !== undefined
    || retentionPolicy.maxTotalSizeBytes !== undefined
  ) {
    await pruneCacheEntries(rootDir, retentionPolicy);
  }

  return {
    requestFingerprint: request.requestFingerprint,
    schemaFingerprint: request.schemaFingerprint,
    workspacePath,
    archivePath: packagedArtifact.archivePath,
    cacheStatus: "miss",
    health: {
      status: "healthy",
      isHealthy: true,
    },
    sdkVersion: generationResult.resolvedVersion?.version,
  };
}

export async function resolveCachedWorkspace(
  rootDir: string,
  generatorClient: Pick<SdkGeneratorClient, "readControlPlaneSnapshot">,
  requestFingerprint: string,
): Promise<PreparedWorkspaceResult | null> {
  const snapshot = await readCacheRegistry(rootDir);
  const entry = snapshot.entriesByRequestFingerprint[requestFingerprint];
  if (!entry) {
    return null;
  }

  const health = evaluateCacheEntryHealth({
    workspacePath: entry.workspacePath,
    archivePath: entry.archivePath,
    controlPlaneStatus: entry.controlPlaneStatus,
  });
  if (!health.isHealthy) {
    return null;
  }

  const controlPlaneStatus = normalizeControlPlaneStatus(
    await generatorClient.readControlPlaneSnapshot(entry.workspacePath),
  );
  if (controlPlaneStatus !== "healthy") {
    return null;
  }

  return {
    requestFingerprint: entry.requestFingerprint,
    schemaFingerprint: entry.schemaFingerprint,
    workspacePath: entry.workspacePath,
    archivePath: entry.archivePath,
    cacheStatus: "hit",
    health,
  };
}

function resolveArtifactWorkspacePath(
  rootDir: string,
  language: string,
  sdkType: string,
  schemaFingerprint: string,
  requestFingerprint: string,
): string {
  return resolve(
    rootDir,
    "data",
    "artifacts",
    language,
    sdkType,
    schemaFingerprint,
    requestFingerprint,
    "workspace",
  );
}

function resolveArtifactDownloadsPath(
  rootDir: string,
  language: string,
  sdkType: string,
  schemaFingerprint: string,
  requestFingerprint: string,
): string {
  return resolve(
    rootDir,
    "data",
    "artifacts",
    language,
    sdkType,
    schemaFingerprint,
    requestFingerprint,
    "downloads",
  );
}

function normalizeControlPlaneStatus(
  snapshot: GenerateControlPlaneSnapshotLike | null,
): "healthy" | "degraded" | "invalid" | "empty" {
  const status = snapshot?.evaluation?.status;
  if (
    status === "healthy"
    || status === "degraded"
    || status === "invalid"
    || status === "empty"
  ) {
    return status;
  }

  return "empty";
}

async function getDirectorySize(rootDir: string): Promise<number> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  let totalSize = 0;

  for (const entry of entries) {
    const entryPath = join(rootDir, entry.name);
    if (entry.isDirectory()) {
      totalSize += await getDirectorySize(entryPath);
      continue;
    }

    if (entry.isFile()) {
      totalSize += (await stat(entryPath)).size;
    }
  }

  return totalSize;
}

async function isWorkspaceEmpty(workspacePath: string): Promise<boolean> {
  return (await readdir(workspacePath)).length === 0;
}
