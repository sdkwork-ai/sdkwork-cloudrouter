#!/usr/bin/env node

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');

async function main(argv = process.argv.slice(2)) {
  const compileDir = compileFileSdkGenerationPackage();
  try {
    const sdkGeneration = loadCompiledFileSdkGenerationPackage(compileDir);
    const settings = sdkGeneration.parseFileSdkArtifactCliArgs(argv, workspaceRoot);

    if (settings.help) {
      process.stdout.write(sdkGeneration.createFileSdkArtifactCliHelp(workspaceRoot));
      return 0;
    }

    const result = sdkGeneration.materializeRepositoryFileSdkArtifacts({
      mode: settings.mode,
      workspaceRoot: path.resolve(settings.workspaceRoot),
    });

    if (settings.json) {
      process.stdout.write(`${JSON.stringify(toJsonResult(result), null, 2)}\n`);
    } else {
      process.stdout.write(sdkGeneration.summarizeFileSdkArtifactMaterialization(result));
    }

    return result.exitCode;
  } finally {
    removeCompileDir(compileDir);
  }
}

function compileFileSdkGenerationPackage() {
  const compileDir = mkdtempSync(path.join(tmpdir(), 'sdkwork-file-sdk-generation-'));
  const appNodeModules = path.join(workspaceRoot, 'apps', 'sdkwork-clawrouter-pc', 'node_modules');
  const tscPath = path.join(appNodeModules, 'typescript', 'bin', 'tsc');
  const entryPath = path.join(
    workspaceRoot,
    'packages',
    'common',
    'file',
    'sdkwork-file-sdk-generation',
    'src',
    'index.ts',
  );
  const typeRoots = path.join(appNodeModules, '@types');

  const result = spawnSync(
    process.execPath,
    [
      tscPath,
      entryPath,
      '--target',
      'ES2022',
      '--module',
      'commonjs',
      '--moduleResolution',
      'classic',
      '--types',
      'node',
      '--typeRoots',
      typeRoots,
      '--esModuleInterop',
      '--skipLibCheck',
      '--outDir',
      compileDir,
      '--rootDir',
      path.join(workspaceRoot, 'packages', 'common', 'file'),
      '--noEmit',
      'false',
      '--allowImportingTsExtensions',
      'false',
      '--ignoreDeprecations',
      '5.0',
    ],
    {
      cwd: workspaceRoot,
      encoding: 'utf8',
    },
  );

  if (result.status !== 0) {
    const stderr = result.stderr ? `\n${result.stderr.trim()}` : '';
    const stdout = result.stdout ? `\n${result.stdout.trim()}` : '';
    throw new Error(`Failed to compile file SDK generation package.${stderr}${stdout}`);
  }

  return compileDir;
}

function loadCompiledFileSdkGenerationPackage(compileDir) {
  const require = createRequire(import.meta.url);
  return require(path.join(compileDir, 'sdkwork-file-sdk-generation', 'src', 'index.js'));
}

function toJsonResult(result) {
  return {
    changes: result.changes,
    clean: result.clean,
    counts: result.counts,
    exitCode: result.exitCode,
    mode: result.mode,
  };
}

function removeCompileDir(compileDir) {
  const resolvedCompileDir = path.resolve(compileDir);
  const resolvedTempDir = path.resolve(tmpdir());
  const expectedPrefix = path.join(resolvedTempDir, 'sdkwork-file-sdk-generation-');

  if (!resolvedCompileDir.startsWith(expectedPrefix)) {
    throw new Error(`Refusing to remove unexpected compile directory: ${compileDir}`);
  }

  rmSync(resolvedCompileDir, { force: true, recursive: true });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
    (error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 2;
    },
  );
}

export { main };
