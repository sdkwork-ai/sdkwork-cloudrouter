import { evaluateCacheEntryHealth } from "./cache-health";
import { readCacheRegistry } from "./cache-registry";
import { createSdkGeneratorClient, type SdkGeneratorClient } from "./generator-client";
import {
  createGenerationOrchestrator,
  resolveCachedWorkspace,
  type CreateGenerationOrchestratorOptions,
  type PreparedWorkspaceResult,
  type PrepareWorkspaceRequest,
} from "./generation-orchestrator";
import { createRequestFingerprint } from "./request-fingerprint";
import {
  pruneCacheEntries,
  type PruneCacheOptions,
  type PruneCacheResult,
} from "./retention-manager";
import { createSchemaFingerprint } from "./schema-fingerprint";
import { loadSchemaSource } from "./schema-source";
import type { LoadSchemaSourceOptions } from "./types";

export interface PrepareSdkArtifactRequest extends LoadSchemaSourceOptions {
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

export interface ResolveCachedArtifactRequest extends LoadSchemaSourceOptions {
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
}

export interface PrepareSdkArtifactResult extends PreparedWorkspaceResult {}

export interface SdkDownloaderHealthReport {
  totalEntries: number;
  healthyEntries: number;
  unhealthyEntries: number;
}

export interface InspectedCacheEntry {
  entry: Awaited<ReturnType<typeof readCacheRegistry>>["entries"][number];
  health: ReturnType<typeof evaluateCacheEntryHealth>;
}

export interface SdkworkSdkDownloaderService {
  prepareSdkArtifact(
    request: PrepareSdkArtifactRequest,
  ): Promise<PrepareSdkArtifactResult>;
  resolveCachedArtifact(
    request: ResolveCachedArtifactRequest,
  ): Promise<PreparedWorkspaceResult | null>;
  inspectCacheEntry(identifier: string): Promise<InspectedCacheEntry | null>;
  listCacheEntries(): Promise<Awaited<ReturnType<typeof readCacheRegistry>>["entries"]>;
  pruneCache(policy?: PruneCacheOptions): Promise<PruneCacheResult>;
  getHealthReport(): Promise<SdkDownloaderHealthReport>;
}

export interface CreateSdkworkSdkDownloaderServiceOptions
  extends Pick<CreateGenerationOrchestratorOptions, "packageArtifact" | "defaultRetention"> {
  rootDir: string;
  generatorClient?: SdkGeneratorClient;
}

export function createSdkworkSdkDownloaderService(
  options: CreateSdkworkSdkDownloaderServiceOptions,
): SdkworkSdkDownloaderService {
  const generatorClient = options.generatorClient ?? createSdkGeneratorClient();
  const orchestrator = createGenerationOrchestrator({
    rootDir: options.rootDir,
    generatorClient,
    packageArtifact: options.packageArtifact,
    defaultRetention: options.defaultRetention,
  });

  return {
    async prepareSdkArtifact(request) {
      const preparedRequest = await prepareGenerationRequest(request);
      return orchestrator.prepareWorkspace(preparedRequest);
    },

    async resolveCachedArtifact(request) {
      const preparedRequest = await prepareGenerationRequest(request);
      return resolveCachedWorkspace(
        options.rootDir,
        generatorClient,
        preparedRequest.requestFingerprint,
      );
    },

    async inspectCacheEntry(identifier) {
      const snapshot = await readCacheRegistry(options.rootDir);
      const entry = snapshot.entries.find(
        (currentEntry) =>
          currentEntry.requestFingerprint === identifier
          || currentEntry.workspacePath === identifier
          || currentEntry.archivePath === identifier,
      );
      if (!entry) {
        return null;
      }

      return {
        entry,
        health: evaluateCacheEntryHealth({
          workspacePath: entry.workspacePath,
          archivePath: entry.archivePath,
          controlPlaneStatus: entry.controlPlaneStatus,
        }),
      };
    },

    async listCacheEntries() {
      const snapshot = await readCacheRegistry(options.rootDir);
      return snapshot.entries;
    },

    async pruneCache(policy = {}) {
      return pruneCacheEntries(options.rootDir, {
        ...options.defaultRetention,
        ...policy,
      });
    },

    async getHealthReport() {
      const snapshot = await readCacheRegistry(options.rootDir);
      let healthyEntries = 0;
      let unhealthyEntries = 0;

      for (const entry of snapshot.entries) {
        const health = evaluateCacheEntryHealth({
          workspacePath: entry.workspacePath,
          archivePath: entry.archivePath,
          controlPlaneStatus: entry.controlPlaneStatus,
        });
        if (health.isHealthy) {
          healthyEntries += 1;
        } else {
          unhealthyEntries += 1;
        }
      }

      return {
        totalEntries: snapshot.entries.length,
        healthyEntries,
        unhealthyEntries,
      };
    },
  };
}

async function prepareGenerationRequest(
  request: ResolveCachedArtifactRequest | PrepareSdkArtifactRequest,
): Promise<PrepareWorkspaceRequest> {
  const loadedSchema = await loadSchemaSource({
    schema: request.schema,
    fetchTimeoutMs: request.fetchTimeoutMs,
    maxBytes: request.maxBytes,
    maxRedirects: request.maxRedirects,
    remoteUrlPolicy: request.remoteUrlPolicy,
  });
  const schemaFingerprint = createSchemaFingerprint(loadedSchema.schema);
  const requestFingerprint = createRequestFingerprint({
    schemaFingerprint,
    language: request.language,
    sdkType: request.sdkType,
    name: request.name,
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
    ...("retention" in request ? { retention: request.retention } : {}),
  });

  return {
    schema: loadedSchema.schema,
    schemaFingerprint,
    requestFingerprint,
    language: request.language,
    sdkType: request.sdkType,
    name: request.name,
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
    ...("retention" in request ? { retention: request.retention } : {}),
  };
}
