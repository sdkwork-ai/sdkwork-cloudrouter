// @vitest-environment node

import { inflateRawSync } from "node:zlib";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { packageWorkspaceArtifact } from "../src/artifact-packager";

describe("artifact-packager", () => {
  const cleanupPaths: string[] = [];

  afterEach(async () => {
    await Promise.all(
      cleanupPaths.splice(0).map((target) => rm(target, { recursive: true, force: true })),
    );
  });

  it("creates a zip archive for a generated workspace", async () => {
    const rootDir = await createTempRoot();
    const workspacePath = await createWorkspace(rootDir);
    const downloadsDir = join(rootDir, "downloads");

    const result = await packageWorkspaceArtifact({
      workspacePath,
      downloadsDir,
      archiveBaseName: "sdkwork-downloader",
    });

    expect(result.archivePath.endsWith(".zip")).toBe(true);
    expect(result.reused).toBe(false);
    expect(result.archiveSizeBytes).toBeGreaterThan(0);
  });

  it("reuses the existing archive when the workspace content is unchanged", async () => {
    const rootDir = await createTempRoot();
    const workspacePath = await createWorkspace(rootDir);
    const downloadsDir = join(rootDir, "downloads");

    const first = await packageWorkspaceArtifact({
      workspacePath,
      downloadsDir,
      archiveBaseName: "sdkwork-downloader",
    });
    const second = await packageWorkspaceArtifact({
      workspacePath,
      downloadsDir,
      archiveBaseName: "sdkwork-downloader",
    });

    expect(second.reused).toBe(true);
    expect(second.workspaceFingerprint).toBe(first.workspaceFingerprint);
  });

  it("rebuilds the archive when the workspace content changes", async () => {
    const rootDir = await createTempRoot();
    const workspacePath = await createWorkspace(rootDir);
    const downloadsDir = join(rootDir, "downloads");

    const first = await packageWorkspaceArtifact({
      workspacePath,
      downloadsDir,
      archiveBaseName: "sdkwork-downloader",
    });
    await writeFile(join(workspacePath, "src/sdk.ts"), "export const version = '2';\n", "utf-8");
    const second = await packageWorkspaceArtifact({
      workspacePath,
      downloadsDir,
      archiveBaseName: "sdkwork-downloader",
    });

    expect(second.reused).toBe(false);
    expect(second.workspaceFingerprint).not.toBe(first.workspaceFingerprint);
  }, 30_000);

  it("excludes temp and lock files from the archive", async () => {
    const rootDir = await createTempRoot();
    const workspacePath = await createWorkspace(rootDir, {
      includeExcludedFiles: true,
    });
    const downloadsDir = join(rootDir, "downloads");

    const result = await packageWorkspaceArtifact({
      workspacePath,
      downloadsDir,
      archiveBaseName: "sdkwork-downloader",
    });

    const entries = await readZipEntries(result.archivePath);

    expect(entries.get("src/sdk.ts")?.toString("utf-8")).toContain("version = '1'");
    expect(entries.has("tmp/ignored.tmp")).toBe(false);
    expect(entries.has("locks/current.lock")).toBe(false);
  }, 30_000);

  async function createTempRoot() {
    const rootDir = await mkdtemp(join(tmpdir(), "sdk-downloader-archive-"));
    cleanupPaths.push(rootDir);
    return rootDir;
  }

  async function createWorkspace(
    rootDir: string,
    options: {
      includeExcludedFiles?: boolean;
    } = {},
  ) {
    const workspacePath = join(rootDir, "workspace");
    await mkdir(join(workspacePath, "src"), { recursive: true });
    await writeFile(join(workspacePath, "src/sdk.ts"), "export const version = '1';\n", "utf-8");

    if (options.includeExcludedFiles) {
      await mkdir(join(workspacePath, "tmp"), { recursive: true });
      await mkdir(join(workspacePath, "locks"), { recursive: true });
      await writeFile(join(workspacePath, "tmp/ignored.tmp"), "tmp", "utf-8");
      await writeFile(join(workspacePath, "locks/current.lock"), "lock", "utf-8");
    }

    return workspacePath;
  }
});

async function readZipEntries(archivePath: string) {
  const archiveBuffer = await readFile(archivePath);
  const endOfCentralDirectoryOffset = findEndOfCentralDirectoryOffset(archiveBuffer);
  const entryCount = archiveBuffer.readUInt16LE(endOfCentralDirectoryOffset + 10);
  const centralDirectoryOffset = archiveBuffer.readUInt32LE(endOfCentralDirectoryOffset + 16);
  const entries = new Map<string, Buffer>();

  let offset = centralDirectoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    expect(archiveBuffer.readUInt32LE(offset)).toBe(0x02014b50);

    const compressionMethod = archiveBuffer.readUInt16LE(offset + 10);
    const compressedSize = archiveBuffer.readUInt32LE(offset + 20);
    const uncompressedSize = archiveBuffer.readUInt32LE(offset + 24);
    const fileNameLength = archiveBuffer.readUInt16LE(offset + 28);
    const extraFieldLength = archiveBuffer.readUInt16LE(offset + 30);
    const fileCommentLength = archiveBuffer.readUInt16LE(offset + 32);
    const localHeaderOffset = archiveBuffer.readUInt32LE(offset + 42);
    const fileName = archiveBuffer
      .subarray(offset + 46, offset + 46 + fileNameLength)
      .toString("utf-8");

    const localFileNameLength = archiveBuffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraFieldLength = archiveBuffer.readUInt16LE(localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localFileNameLength + localExtraFieldLength;
    const compressedData = archiveBuffer.subarray(dataOffset, dataOffset + compressedSize);
    const entryBuffer = readZipEntryPayload({
      compressedData,
      compressionMethod,
      uncompressedSize,
    });

    if (!fileName.endsWith("/")) {
      entries.set(fileName, entryBuffer);
    }

    offset += 46 + fileNameLength + extraFieldLength + fileCommentLength;
  }

  return entries;
}

function findEndOfCentralDirectoryOffset(archiveBuffer: Buffer) {
  for (let offset = archiveBuffer.length - 22; offset >= 0; offset -= 1) {
    if (archiveBuffer.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }

  throw new Error("Cannot locate end of central directory record.");
}

function readZipEntryPayload({
  compressedData,
  compressionMethod,
  uncompressedSize,
}: {
  compressedData: Buffer;
  compressionMethod: number;
  uncompressedSize: number;
}) {
  if (compressionMethod === 0) {
    return compressedData;
  }

  if (compressionMethod === 8) {
    const inflated = inflateRawSync(compressedData);
    expect(inflated.length).toBe(uncompressedSize);
    return inflated;
  }

  throw new Error(`Unsupported zip compression method: ${compressionMethod}`);
}
