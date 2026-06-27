import { rm } from "node:fs/promises";

import { evaluateCacheEntryHealth } from "./cache-health";
import {
  readCacheRegistry,
  replaceCacheEntries,
  type SdkCacheEntry,
} from "./cache-registry";

export interface PruneCacheOptions {
  ttlMs?: number;
  maxEntriesPerSchema?: number;
  maxTotalSizeBytes?: number;
  lockedRequestFingerprints?: readonly string[];
  now?: string;
}

export interface PruneCacheResult {
  removedRequestFingerprints: string[];
  keptEntries: SdkCacheEntry[];
}

export async function pruneCacheEntries(
  rootDir: string,
  options: PruneCacheOptions = {},
): Promise<PruneCacheResult> {
  const snapshot = await readCacheRegistry(rootDir);
  const locked = new Set(options.lockedRequestFingerprints ?? []);
  const removed = new Set<string>();
  const removalQueue = new Map<string, SdkCacheEntry>();

  const healthyEntries: SdkCacheEntry[] = [];
  for (const entry of snapshot.entries) {
    const health = evaluateCacheEntryHealth({
      workspacePath: entry.workspacePath,
      archivePath: entry.archivePath,
      controlPlaneStatus: entry.controlPlaneStatus,
    });
    if (!health.isHealthy && !locked.has(entry.requestFingerprint)) {
      removalQueue.set(entry.requestFingerprint, entry);
      removed.add(entry.requestFingerprint);
      continue;
    }
    healthyEntries.push(entry);
  }

  const activeEntries = healthyEntries.filter(
    (entry) => !removed.has(entry.requestFingerprint),
  );
  const nowMs = Date.parse(options.now ?? new Date().toISOString());

  if (typeof options.ttlMs === "number") {
    for (const entry of activeEntries) {
      if (locked.has(entry.requestFingerprint)) {
        continue;
      }

      const lastAccessedMs = Date.parse(entry.lastAccessedAt);
      if (Number.isFinite(lastAccessedMs) && nowMs - lastAccessedMs > options.ttlMs) {
        removalQueue.set(entry.requestFingerprint, entry);
        removed.add(entry.requestFingerprint);
      }
    }
  }

  if (typeof options.maxEntriesPerSchema === "number" && options.maxEntriesPerSchema >= 0) {
    const entriesBySchema = groupEntriesBySchema(
      activeEntries.filter((entry) => !removed.has(entry.requestFingerprint)),
    );

    for (const schemaEntries of entriesBySchema.values()) {
      const unlockedEntries = schemaEntries
        .filter((entry) => !locked.has(entry.requestFingerprint))
        .sort(compareByLastAccessedAscending);
      while (schemaEntries.length - countRemoved(schemaEntries, removed) > options.maxEntriesPerSchema) {
        const nextEntry = unlockedEntries.shift();
        if (!nextEntry) {
          break;
        }
        removalQueue.set(nextEntry.requestFingerprint, nextEntry);
        removed.add(nextEntry.requestFingerprint);
      }
    }
  }

  if (typeof options.maxTotalSizeBytes === "number" && options.maxTotalSizeBytes >= 0) {
    let retainedEntries = activeEntries.filter((entry) => !removed.has(entry.requestFingerprint));
    let totalSizeBytes = retainedEntries.reduce((sum, entry) => sum + getEntrySize(entry), 0);
    const evictionCandidates = retainedEntries
      .filter((entry) => !locked.has(entry.requestFingerprint))
      .sort(compareByLastAccessedAscending);

    while (totalSizeBytes > options.maxTotalSizeBytes) {
      const nextEntry = evictionCandidates.shift();
      if (!nextEntry) {
        break;
      }

      if (removed.has(nextEntry.requestFingerprint)) {
        continue;
      }

      removalQueue.set(nextEntry.requestFingerprint, nextEntry);
      removed.add(nextEntry.requestFingerprint);
      totalSizeBytes -= getEntrySize(nextEntry);
      retainedEntries = retainedEntries.filter(
        (entry) => entry.requestFingerprint !== nextEntry.requestFingerprint,
      );
    }
  }

  for (const entry of removalQueue.values()) {
    await rm(entry.workspacePath, { recursive: true, force: true });
    await rm(entry.archivePath, { recursive: true, force: true });
  }

  const keptEntries = snapshot.entries.filter(
    (entry) => !removed.has(entry.requestFingerprint),
  );
  await replaceCacheEntries(rootDir, keptEntries);

  return {
    removedRequestFingerprints: Array.from(removed).sort((left, right) =>
      left.localeCompare(right),
    ),
    keptEntries,
  };
}

function groupEntriesBySchema(
  entries: SdkCacheEntry[],
): Map<string, SdkCacheEntry[]> {
  const result = new Map<string, SdkCacheEntry[]>();
  for (const entry of entries) {
    const current = result.get(entry.schemaFingerprint) ?? [];
    current.push(entry);
    result.set(entry.schemaFingerprint, current);
  }

  for (const schemaEntries of result.values()) {
    schemaEntries.sort(compareByLastAccessedDescending);
  }

  return result;
}

function countRemoved(entries: SdkCacheEntry[], removed: Set<string>): number {
  return entries.filter((entry) => removed.has(entry.requestFingerprint)).length;
}

function compareByLastAccessedAscending(
  left: SdkCacheEntry,
  right: SdkCacheEntry,
): number {
  return Date.parse(left.lastAccessedAt) - Date.parse(right.lastAccessedAt);
}

function compareByLastAccessedDescending(
  left: SdkCacheEntry,
  right: SdkCacheEntry,
): number {
  return Date.parse(right.lastAccessedAt) - Date.parse(left.lastAccessedAt);
}

function getEntrySize(entry: SdkCacheEntry): number {
  return entry.workspaceSizeBytes + entry.archiveSizeBytes;
}
