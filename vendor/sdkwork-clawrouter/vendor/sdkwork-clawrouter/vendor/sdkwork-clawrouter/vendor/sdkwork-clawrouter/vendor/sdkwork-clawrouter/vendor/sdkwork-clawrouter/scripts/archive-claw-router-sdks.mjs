#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');
const MANIFEST_FILE = 'sdk-archives-manifest.json';
const ZIP_DATE = new Date('2026-01-01T00:00:00Z');

const CRC32_TABLE = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  }
  CRC32_TABLE[index] = value >>> 0;
}

function defaultSdkArchiveRoot(root = workspaceRoot) {
  return path.join(root, 'apps', 'sdkwork-clawrouter-pc', 'dist', 'sdk-archives');
}

function defaultSdkArchiveSpecs(root = workspaceRoot) {
  return [
    sdkArchiveSpecFromDirectory(
      path.join(root, 'sdks', 'clawrouter-app-sdk', 'clawrouter-app-sdk-typescript'),
      root,
    ),
    sdkArchiveSpecFromDirectory(
      path.join(root, 'sdks', 'clawrouter-backend-sdk', 'clawrouter-backend-sdk-typescript'),
      root,
    ),
    sdkArchiveSpecFromDirectory(
      path.join(root, 'sdks', 'clawrouter-open-sdk', 'clawrouter-open-sdk-typescript'),
      root,
    ),
  ];
}

function sdkArchiveSpecFromDirectory(sourceDir, root = workspaceRoot) {
  const packageJson = JSON.parse(
    requireExistingFile(path.join(sourceDir, 'package.json'), 'SDK package.json'),
  );
  const sdkworkJson = JSON.parse(
    requireExistingFile(path.join(sourceDir, 'sdkwork-sdk.json'), 'SDK metadata'),
  );
  const language = String(sdkworkJson.language ?? 'typescript').toLowerCase();
  const packageSlug = archiveIdentitySlug(packageJson.name, 'packageJson.name');
  const versionSlug = archiveIdentitySlug(packageJson.version, 'packageJson.version');
  return {
    archiveName: `${packageSlug}-${language}-${versionSlug}.zip`,
    language,
    packageName: packageJson.name,
    version: packageJson.version,
    sdkType: sdkworkJson.sdkType,
    sourceDir: path.relative(root, sourceDir).replaceAll('\\', '/'),
  };
}

function requireExistingFile(filePath, label) {
  if (!existsSync(filePath)) {
    throw new Error(`${label} is missing: ${filePath}`);
  }
  return readFileSync(filePath, 'utf8');
}

function archiveIdentitySlug(value, fieldName) {
  const trimmed = String(value ?? '').trim().replace(/^@/u, '');
  if (!trimmed || trimmed.includes('..') || trimmed.includes('\\')) {
    throw new Error(`${fieldName} contains unsafe SDK archive identity characters`);
  }
  if (trimmed.split('/').some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error(`${fieldName} contains unsafe SDK archive identity characters`);
  }
  const slug = trimmed
    .toLowerCase()
    .replaceAll('/', '-')
    .replaceAll('_', '-')
    .replace(/[^a-z0-9.-]+/gu, '-')
    .replace(/-+/gu, '-')
    .replace(/^-|-$/gu, '');
  if (!slug || !/[a-z0-9]/u.test(slug) || slug.startsWith('.') || slug.endsWith('.')) {
    throw new Error(`${fieldName} contains unsafe SDK archive identity characters`);
  }
  return slug;
}

function parseSdkArchiveArgs(argv = process.argv.slice(2)) {
  const settings = {
    dryRun: false,
    help: false,
    outputDir: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') {
      continue;
    }
    switch (arg) {
      case '--dry-run':
        settings.dryRun = true;
        break;
      case '--help':
      case '-h':
        settings.help = true;
        break;
      case '--output-dir': {
        const value = argv[index + 1];
        if (!value || value.startsWith('--')) {
          throw new Error('--output-dir requires a value');
        }
        settings.outputDir = value;
        index += 1;
        break;
      }
      default:
        throw new Error(`Unsupported SDK archive option: ${arg}`);
    }
  }
  return settings;
}

function printHelp() {
  console.log(`Usage: node scripts/archive-claw-router-sdks.mjs [options]

Create prebuilt SDK ZIP archives for the Rust edge /api/generate-sdk endpoint.

Options:
  --output-dir <dir>  Archive output directory.
  --dry-run           Print the archive plan without writing files.
  -h, --help          Show this help.
`);
}

function buildSdkArchiveManifest(specs, archiveStats) {
  return {
    schemaVersion: 1,
    generatedAt: '2026-01-01T00:00:00.000Z',
    archives: specs.map((spec) => {
      const stats = archiveStats.get(spec.archiveName);
      return {
        file: spec.archiveName,
        packageName: spec.packageName,
        version: spec.version,
        language: spec.language,
        sdkType: spec.sdkType,
        sourceDir: spec.sourceDir,
        size: stats?.size ?? 0,
        sha256: stats?.sha256 ?? '',
      };
    }),
  };
}

async function archiveSdks({
  outputDir = defaultSdkArchiveRoot(workspaceRoot),
  root = workspaceRoot,
  dryRun = false,
} = {}) {
  const specs = defaultSdkArchiveSpecs(root);
  const absoluteOutputDir = path.isAbsolute(outputDir) ? outputDir : path.join(root, outputDir);
  if (dryRun) {
    return {
      outputDir: absoluteOutputDir,
      manifest: buildSdkArchiveManifest(specs, new Map()),
    };
  }

  await rm(absoluteOutputDir, { recursive: true, force: true });
  await mkdir(absoluteOutputDir, { recursive: true });

  const archiveStats = new Map();
  for (const spec of specs) {
    const sourceDir = path.join(root, spec.sourceDir);
    await assertSdkPackageReady(sourceDir, spec);
    const entries = await collectArchiveEntries(sourceDir, spec);
    const archiveBytes = createZip(entries);
    const archivePath = path.join(absoluteOutputDir, spec.archiveName);
    await writeFile(archivePath, archiveBytes);
    archiveStats.set(spec.archiveName, {
      size: archiveBytes.length,
      sha256: createHash('sha256').update(archiveBytes).digest('hex'),
    });
  }

  const manifest = buildSdkArchiveManifest(specs, archiveStats);
  await writeFile(
    path.join(absoluteOutputDir, MANIFEST_FILE),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

  return {
    outputDir: absoluteOutputDir,
    manifest,
  };
}

async function assertSdkPackageReady(sourceDir, spec) {
  for (const required of [
    'package.json',
    'sdkwork-sdk.json',
    'README.md',
    'src/index.ts',
    'dist/index.js',
    'dist/index.cjs',
    'dist/index.d.ts',
  ]) {
    const filePath = path.join(sourceDir, required);
    if (!existsSync(filePath)) {
      throw new Error(`${spec.packageName} archive requires ${required}. Run pnpm --dir ${spec.sourceDir} build first.`);
    }
  }
}

async function collectArchiveEntries(sourceDir, spec) {
  const packageRoot = archiveIdentitySlug(spec.packageName, 'packageName');
  const roots = [
    'package.json',
    'sdkwork-sdk.json',
    'README.md',
    'tsconfig.json',
    'vite.config.ts',
    'src',
    'dist',
    'custom',
    'bin',
  ];
  const entries = [];
  for (const relative of roots) {
    const absolute = path.join(sourceDir, relative);
    if (!existsSync(absolute)) {
      continue;
    }
    await collectEntriesRecursive(absolute, relative, entries);
  }
  return entries
    .filter((entry) => !entry.relativePath.includes('/.sdkwork/'))
    .map((entry) => ({
      ...entry,
      relativePath: `${packageRoot}/${entry.relativePath}`,
    }))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

async function collectEntriesRecursive(absolutePath, relativePath, entries) {
  const info = await stat(absolutePath);
  if (info.isDirectory()) {
    const children = await readdir(absolutePath);
    for (const child of children.sort()) {
      if (child === 'node_modules' || child === '.git' || child === '.sdkwork') {
        continue;
      }
      await collectEntriesRecursive(
        path.join(absolutePath, child),
        `${relativePath}/${child}`.replaceAll('\\', '/'),
        entries,
      );
    }
    return;
  }
  if (!info.isFile()) {
    return;
  }
  entries.push({
    relativePath: relativePath.replaceAll('\\', '/'),
    data: await readFile(absolutePath),
  });
}

function createZip(entries) {
  const fileRecords = [];
  const chunks = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.relativePath, 'utf8');
    const data = Buffer.from(entry.data);
    const crc = crc32(data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    writeDosDateTime(localHeader, 10, ZIP_DATE);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    chunks.push(localHeader, name, data);
    fileRecords.push({
      name,
      crc,
      size: data.length,
      offset,
    });
    offset += localHeader.length + name.length + data.length;
  }

  const centralDirectoryOffset = offset;
  for (const record of fileRecords) {
    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0x0800, 8);
    header.writeUInt16LE(0, 10);
    writeDosDateTime(header, 12, ZIP_DATE);
    header.writeUInt32LE(record.crc, 16);
    header.writeUInt32LE(record.size, 20);
    header.writeUInt32LE(record.size, 24);
    header.writeUInt16LE(record.name.length, 28);
    header.writeUInt16LE(0, 30);
    header.writeUInt16LE(0, 32);
    header.writeUInt16LE(0, 34);
    header.writeUInt16LE(0, 36);
    header.writeUInt32LE(0, 38);
    header.writeUInt32LE(record.offset, 42);
    chunks.push(header, record.name);
    offset += header.length + record.name.length;
  }

  const centralDirectorySize = offset - centralDirectoryOffset;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(fileRecords.length, 8);
  end.writeUInt16LE(fileRecords.length, 10);
  end.writeUInt32LE(centralDirectorySize, 12);
  end.writeUInt32LE(centralDirectoryOffset, 16);
  end.writeUInt16LE(0, 20);
  chunks.push(end);
  return Buffer.concat(chunks);
}

function writeDosDateTime(buffer, offset, date) {
  const dosTime = (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | Math.floor(date.getUTCSeconds() / 2);
  const dosDate = ((date.getUTCFullYear() - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();
  buffer.writeUInt16LE(dosTime, offset);
  buffer.writeUInt16LE(dosDate, offset + 2);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function main(argv = process.argv.slice(2)) {
  const settings = parseSdkArchiveArgs(argv);
  if (settings.help) {
    printHelp();
    return;
  }
  const outputDir = settings.outputDir ?? defaultSdkArchiveRoot(workspaceRoot);
  const result = await archiveSdks({
    outputDir,
    root: workspaceRoot,
    dryRun: settings.dryRun,
  });
  console.log(`[archive-sdks] SDK archive root: ${result.outputDir}`);
  for (const archive of result.manifest.archives) {
    console.log(`[archive-sdks]   ${archive.file}`);
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'))) {
  main().catch((error) => {
    console.error(`[archive-sdks] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}

export {
  archiveIdentitySlug,
  archiveSdks,
  buildSdkArchiveManifest,
  createZip,
  defaultSdkArchiveRoot,
  defaultSdkArchiveSpecs,
  parseSdkArchiveArgs,
};
