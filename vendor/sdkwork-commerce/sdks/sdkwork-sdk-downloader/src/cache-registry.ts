import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { evaluateCacheEntryHealth, type CacheEntryHealth } from "./cache-health";

export const CACHE_REGISTRY_SCHEMA_VERSION = 1;

export interface SdkCacheEntry {
  requestFingerprint: string;
  schemaFingerprint: string;
  language: string;
  sdkType: string;
  name: string;
  packageName?: string;
  workspacePath: string;
  archivePath: string;
  workspaceSizeBytes: number;
  archiveSizeBytes: number;
  createdAt: string;
  lastAccessedAt: string;
  generatorIdentity: string;
  controlPlaneStatus?: "healthy" | "degraded" | "invalid" | "empty";
}

export interface CacheRegistrySnapshot {
  schemaVersion: typeof CACHE_REGISTRY_SCHEMA_VERSION;
  indexPath: string;
  entries: SdkCacheEntry[];
  entriesByRequestFingerprint: Record<string, SdkCacheEntry>;
}

export interface HealthyCacheEntryResult {
  entry: SdkCacheEntry;
  health: CacheEntryHealth;
}

export async function readCacheRegistry(
  rootDir: string,
): Promise<CacheRegistrySnapshot> {
  const indexPath = resolveCacheRegistryPath(rootDir);

  try {
    const raw = JSON.parse(await readFile(indexPath, "utf-8")) as {
      schemaVersion?: number;
      entries?: SdkCacheEntry[];
    };
    const entries = Array.isArray(raw.entries) ? raw.entries : [];
    return buildSnapshot(indexPath, entries);
  } catch {
    return buildSnapshot(indexPath, []);
  }
}

export async function upsertCacheEntry(
  rootDir: string,
  entry: SdkCacheEntry,
): Promise<CacheRegistrySnapshot> {
  const snapshot = await readCacheRegistry(rootDir);
  const entries = snapshot.entries.filter(
    (currentEntry) => currentEntry.requestFingerprint !== entry.requestFingerprint,
  );
  entries.push(entry);

  await writeRegistry(snapshot.indexPath, entries);
  return buildSnapshot(snapshot.indexPath, entries);
}

export async function replaceCacheEntries(
  rootDir: string,
  entries: SdkCacheEntry[],
): Promise<CacheRegistrySnapshot> {
  const indexPath = resolveCacheRegistryPath(rootDir);
  await writeRegistry(indexPath, entries);
  return buildSnapshot(indexPath, entries);
}

export async function resolveHealthyCacheEntry(
  rootDir: string,
  requestFingerprint: string,
  options: {
    accessedAt?: string;
  } = {},
): Promise<HealthyCacheEntryResult | null> {
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

  const accessedAt = options.accessedAt ?? new Date().toISOString();
  const updatedEntry: SdkCacheEntry = {
    ...entry,
    lastAccessedAt: accessedAt,
  };

  await upsertCacheEntry(rootDir, updatedEntry);
  return {
    entry: updatedEntry,
    health,
  };
}

export function resolveCacheRegistryPath(rootDir: string): string {
  return resolve(rootDir, "data/index/cache-registry.json");
}

async function writeRegistry(
  indexPath: string,
  entries: SdkCacheEntry[],
): Promise<void> {
  await mkdir(dirname(indexPath), { recursive: true });

  const temporaryPath = `${indexPath}.tmp`;
  const payload = JSON.stringify(
    {
      schemaVersion: CACHE_REGISTRY_SCHEMA_VERSION,
      entries,
    },
    null,
    2,
  );

  await writeFile(temporaryPath, `${payload}\n`, "utf-8");
  await rm(indexPath, { force: true });
  await rename(temporaryPath, indexPath);
}

function buildSnapshot(
  indexPath: string,
  entries: SdkCacheEntry[],
): CacheRegistrySnapshot {
  const normalizedEntries = [...entries].sort((left, right) =>
    left.requestFingerprint.localeCompare(right.requestFingerprint),
  );

  return {
    schemaVersion: CACHE_REGISTRY_SCHEMA_VERSION,
    indexPath,
    entries: normalizedEntries,
    entriesByRequestFingerprint: normalizedEntries.reduce<Record<string, SdkCacheEntry>>(
      (result, entry) => {
        result[entry.requestFingerprint] = entry;
        return result;
      },
      {},
    ),
  };
}
