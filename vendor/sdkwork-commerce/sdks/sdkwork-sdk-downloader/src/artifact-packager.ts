import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const ARTIFACT_METADATA_SUFFIX = ".metadata.json";
const EXCLUDED_DIRECTORY_NAMES = new Set(["tmp", "locks"]);
const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_HEADER_SIGNATURE = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const ZIP_STORE_COMPRESSION_METHOD = 0;
const ZIP_UTF8_GENERAL_PURPOSE_BIT_FLAG = 0x0800;
const ZIP_VERSION_NEEDED = 20;
const ZIP_VERSION_MADE_BY = 20;
const ZIP_CRC32_TABLE = createCrc32Table();

export interface PackageWorkspaceArtifactOptions {
  workspacePath: string;
  downloadsDir: string;
  archiveBaseName: string;
}

export interface PackagedWorkspaceArtifact {
  archivePath: string;
  archiveSizeBytes: number;
  workspaceFingerprint: string;
  reused: boolean;
}

export async function packageWorkspaceArtifact(
  options: PackageWorkspaceArtifactOptions,
): Promise<PackagedWorkspaceArtifact> {
  const workspacePath = resolve(options.workspacePath);
  const downloadsDir = resolve(options.downloadsDir);
  const archivePath = resolve(downloadsDir, `${options.archiveBaseName}.zip`);
  const metadataPath = `${archivePath}${ARTIFACT_METADATA_SUFFIX}`;
  const workspaceFingerprint = await createWorkspaceFingerprint(workspacePath);

  await mkdir(downloadsDir, { recursive: true });

  const existingMetadata = await readArtifactMetadata(metadataPath);
  if (existingMetadata?.workspaceFingerprint === workspaceFingerprint) {
    const archiveStats = await stat(archivePath);
    return {
      archivePath,
      archiveSizeBytes: archiveStats.size,
      workspaceFingerprint,
      reused: true,
    };
  }

  const stagingDir = resolve(downloadsDir, `.staging-${randomUUID()}`);
  await rm(stagingDir, { recursive: true, force: true });
  await mkdir(stagingDir, { recursive: true });

  try {
    await copyWorkspaceForPackaging(workspacePath, stagingDir, workspacePath);
    await compressDirectoryToZip(stagingDir, archivePath);
    await writeFile(
      metadataPath,
      `${JSON.stringify({ workspaceFingerprint }, null, 2)}\n`,
      "utf-8",
    );

    const archiveStats = await stat(archivePath);
    return {
      archivePath,
      archiveSizeBytes: archiveStats.size,
      workspaceFingerprint,
      reused: false,
    };
  } finally {
    await rm(stagingDir, { recursive: true, force: true });
  }
}

async function createWorkspaceFingerprint(workspacePath: string): Promise<string> {
  const files = await collectWorkspaceFiles(workspacePath, workspacePath);
  const hash = createHash("sha256");

  for (const filePath of files) {
    hash.update(relative(workspacePath, filePath).replace(/\\/g, "/"), "utf-8");
    hash.update("\n", "utf-8");
    hash.update((await readFile(filePath)).toString("utf-8"), "utf-8");
    hash.update("\n", "utf-8");
  }

  return hash.digest("hex");
}

async function collectWorkspaceFiles(
  rootPath: string,
  currentPath: string,
): Promise<string[]> {
  const entries = await readdir(currentPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (shouldExcludeRelativePath(relative(rootPath, join(currentPath, entry.name)))) {
      continue;
    }

    const entryPath = join(currentPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectWorkspaceFiles(rootPath, entryPath));
      continue;
    }

    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

async function copyWorkspaceForPackaging(
  workspacePath: string,
  stagingDir: string,
  currentPath: string,
): Promise<void> {
  const entries = await readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = join(currentPath, entry.name);
    const relativePath = relative(workspacePath, entryPath).replace(/\\/g, "/");
    if (shouldExcludeRelativePath(relativePath)) {
      continue;
    }

    const destinationPath = join(stagingDir, relativePath);
    if (entry.isDirectory()) {
      await mkdir(destinationPath, { recursive: true });
      await copyWorkspaceForPackaging(workspacePath, stagingDir, entryPath);
      continue;
    }

    if (entry.isFile()) {
      await mkdir(dirname(destinationPath), { recursive: true });
      await cp(entryPath, destinationPath);
    }
  }
}

function shouldExcludeRelativePath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  if (!normalized || normalized === ".") {
    return false;
  }

  const segments = normalized.split("/").filter(Boolean);
  if (segments.some((segment) => EXCLUDED_DIRECTORY_NAMES.has(segment))) {
    return true;
  }

  const fileName = segments[segments.length - 1] ?? "";
  return fileName.endsWith(".lock") || fileName.endsWith(".tmp");
}

async function compressDirectoryToZip(
  sourceDir: string,
  archivePath: string,
): Promise<void> {
  await rm(archivePath, { force: true });
  const archiveBuffer = await createZipArchiveBuffer(sourceDir);
  await writeFile(archivePath, archiveBuffer);
}

async function createZipArchiveBuffer(sourceDir: string): Promise<Buffer> {
  const entries = await collectZipEntries(sourceDir, sourceDir);
  const localFileRecords: Buffer[] = [];
  const centralDirectoryRecords: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const fileNameBuffer = Buffer.from(entry.relativePath, "utf-8");
    const crc32 = computeCrc32(entry.contents);
    const { date, time } = toZipDosDateTime(entry.modifiedAt);

    const localFileHeader = Buffer.alloc(30);
    localFileHeader.writeUInt32LE(ZIP_LOCAL_FILE_HEADER_SIGNATURE, 0);
    localFileHeader.writeUInt16LE(ZIP_VERSION_NEEDED, 4);
    localFileHeader.writeUInt16LE(ZIP_UTF8_GENERAL_PURPOSE_BIT_FLAG, 6);
    localFileHeader.writeUInt16LE(ZIP_STORE_COMPRESSION_METHOD, 8);
    localFileHeader.writeUInt16LE(time, 10);
    localFileHeader.writeUInt16LE(date, 12);
    localFileHeader.writeUInt32LE(crc32, 14);
    localFileHeader.writeUInt32LE(entry.contents.length, 18);
    localFileHeader.writeUInt32LE(entry.contents.length, 22);
    localFileHeader.writeUInt16LE(fileNameBuffer.length, 26);
    localFileHeader.writeUInt16LE(0, 28);

    const localFileRecord = Buffer.concat([
      localFileHeader,
      fileNameBuffer,
      entry.contents,
    ]);
    localFileRecords.push(localFileRecord);

    const centralDirectoryHeader = Buffer.alloc(46);
    centralDirectoryHeader.writeUInt32LE(ZIP_CENTRAL_DIRECTORY_HEADER_SIGNATURE, 0);
    centralDirectoryHeader.writeUInt16LE(ZIP_VERSION_MADE_BY, 4);
    centralDirectoryHeader.writeUInt16LE(ZIP_VERSION_NEEDED, 6);
    centralDirectoryHeader.writeUInt16LE(ZIP_UTF8_GENERAL_PURPOSE_BIT_FLAG, 8);
    centralDirectoryHeader.writeUInt16LE(ZIP_STORE_COMPRESSION_METHOD, 10);
    centralDirectoryHeader.writeUInt16LE(time, 12);
    centralDirectoryHeader.writeUInt16LE(date, 14);
    centralDirectoryHeader.writeUInt32LE(crc32, 16);
    centralDirectoryHeader.writeUInt32LE(entry.contents.length, 20);
    centralDirectoryHeader.writeUInt32LE(entry.contents.length, 24);
    centralDirectoryHeader.writeUInt16LE(fileNameBuffer.length, 28);
    centralDirectoryHeader.writeUInt16LE(0, 30);
    centralDirectoryHeader.writeUInt16LE(0, 32);
    centralDirectoryHeader.writeUInt16LE(0, 34);
    centralDirectoryHeader.writeUInt16LE(0, 36);
    centralDirectoryHeader.writeUInt32LE(0, 38);
    centralDirectoryHeader.writeUInt32LE(offset, 42);
    centralDirectoryRecords.push(Buffer.concat([centralDirectoryHeader, fileNameBuffer]));

    offset += localFileRecord.length;
  }

  const centralDirectoryOffset = offset;
  const centralDirectorySize = centralDirectoryRecords.reduce(
    (size, record) => size + record.length,
    0,
  );
  const endOfCentralDirectory = Buffer.alloc(22);
  endOfCentralDirectory.writeUInt32LE(ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE, 0);
  endOfCentralDirectory.writeUInt16LE(0, 4);
  endOfCentralDirectory.writeUInt16LE(0, 6);
  endOfCentralDirectory.writeUInt16LE(entries.length, 8);
  endOfCentralDirectory.writeUInt16LE(entries.length, 10);
  endOfCentralDirectory.writeUInt32LE(centralDirectorySize, 12);
  endOfCentralDirectory.writeUInt32LE(centralDirectoryOffset, 16);
  endOfCentralDirectory.writeUInt16LE(0, 20);

  return Buffer.concat([
    ...localFileRecords,
    ...centralDirectoryRecords,
    endOfCentralDirectory,
  ]);
}

async function collectZipEntries(
  rootPath: string,
  currentPath: string,
): Promise<Array<{
  contents: Buffer;
  modifiedAt: Date;
  relativePath: string;
}>> {
  const entries = await readdir(currentPath, { withFileTypes: true });
  const files: Array<{
    contents: Buffer;
    modifiedAt: Date;
    relativePath: string;
  }> = [];

  for (const entry of entries) {
    const entryPath = join(currentPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectZipEntries(rootPath, entryPath));
      continue;
    }

    if (entry.isFile()) {
      const relativePath = relative(rootPath, entryPath).replace(/\\/g, "/");
      const entryStats = await stat(entryPath);
      files.push({
        contents: await readFile(entryPath),
        modifiedAt: entryStats.mtime,
        relativePath,
      });
    }
  }

  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function createCrc32Table() {
  const table = new Uint32Array(256);

  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1
        ? (0xedb88320 ^ (value >>> 1))
        : (value >>> 1);
    }
    table[index] = value >>> 0;
  }

  return table;
}

function computeCrc32(buffer: Buffer) {
  let crc32 = 0xffffffff;

  for (const value of buffer) {
    crc32 = ZIP_CRC32_TABLE[(crc32 ^ value) & 0xff]! ^ (crc32 >>> 8);
  }

  return (crc32 ^ 0xffffffff) >>> 0;
}

function toZipDosDateTime(date: Date) {
  const normalizedYear = Math.max(date.getFullYear(), 1980);

  return {
    date:
      ((normalizedYear - 1980) << 9)
      | ((date.getMonth() + 1) << 5)
      | date.getDate(),
    time:
      (date.getHours() << 11)
      | (date.getMinutes() << 5)
      | Math.floor(date.getSeconds() / 2),
  };
}

async function readArtifactMetadata(
  metadataPath: string,
): Promise<{ workspaceFingerprint: string } | null> {
  try {
    return JSON.parse(await readFile(metadataPath, "utf-8")) as {
      workspaceFingerprint: string;
    };
  } catch {
    return null;
  }
}
