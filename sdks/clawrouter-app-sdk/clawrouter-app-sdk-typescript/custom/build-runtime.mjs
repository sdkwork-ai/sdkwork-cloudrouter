#!/usr/bin/env node
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import { promisify } from 'node:util';
import path from 'node:path';
import ts from 'typescript';
import { rollup } from 'rollup';

const execFileAsync = promisify(execFile);
const projectDir = process.cwd();
const srcDir = path.join(projectDir, 'src');
const distDir = path.join(projectDir, 'dist');
const tempDir = path.join(projectDir, '.sdkwork', 'build-runtime');
const tempEsmDir = path.join(tempDir, 'esm');
const domainTransportDir = path.join(projectDir, 'generated', 'domains', 'server-openapi');
const stagedDomainTransportDir = path.join(tempDir, 'domains-transport');
const stagedDomainTransportDistDir = path.join(stagedDomainTransportDir, 'dist');
const packagedDomainTransportDir = path.join(distDir, 'domains-generated');
const buildCriticalSourceRoots = [
  'tsconfig.json',
  'src',
  'generated/domains/server-openapi/package.json',
  'generated/domains/server-openapi/tsconfig.json',
  'generated/domains/server-openapi/src',
  'generated/domains/server-openapi/custom/build-runtime.mjs',
];

async function main() {
  await ensureBuildCriticalSources();
  await removeDirectory(distDir);
  await removeDirectory(tempDir);
  await fs.mkdir(distDir, { recursive: true });

  try {
    await buildAndPackageDomainTransport();
    emitDeclarations();
    emitRuntimeModules();
    await removeTypeOnlyRuntimeReExports(path.join(tempEsmDir, 'index.js'));
    await bundleRuntime('es', path.join(tempEsmDir, 'index.js'), path.join(distDir, 'index.js'));
    await bundleRuntime('cjs', path.join(tempEsmDir, 'index.js'), path.join(distDir, 'index.cjs'));
    await bundleRuntime(
      'es',
      path.join(tempEsmDir, 'domains', 'index.js'),
      path.join(distDir, 'domains', 'index.js'),
    );
    await bundleRuntime(
      'cjs',
      path.join(tempEsmDir, 'domains', 'index.js'),
      path.join(distDir, 'domains', 'index.cjs'),
    );
  } finally {
    await removeDirectory(tempDir);
  }
}

async function ensureBuildCriticalSources() {
  const trackedSourcePaths = await listBuildCriticalSourcePaths();
  const missingPaths = [];

  for (const relativePath of trackedSourcePaths) {
    try {
      await fs.access(path.join(projectDir, relativePath));
    } catch {
      missingPaths.push(relativePath);
    }
  }

  if (missingPaths.length === 0) {
    return;
  }

  try {
    await execFileAsync('git', ['checkout', 'HEAD', '--', ...missingPaths], {
      cwd: projectDir,
      windowsHide: true,
    });
  } catch (error) {
    throw new Error(
      `Unable to restore missing build-critical source files (${missingPaths.join(', ')}). Run git checkout HEAD -- ${missingPaths.join(' ')} and retry. ${formatProcessError(error)}`,
    );
  }

  const unresolvedPaths = [];
  for (const relativePath of missingPaths) {
    try {
      await fs.access(path.join(projectDir, relativePath));
    } catch {
      unresolvedPaths.push(relativePath);
    }
  }

  if (unresolvedPaths.length > 0) {
    throw new Error(
      `Build-critical source files remain missing after self-healing: ${unresolvedPaths.join(', ')}. Run git checkout HEAD -- ${unresolvedPaths.join(' ')} and retry.`,
    );
  }
}

async function listBuildCriticalSourcePaths() {
  let stdout;
  try {
    ({ stdout } = await execFileAsync('git', ['ls-files', '--', ...buildCriticalSourceRoots], {
      cwd: projectDir,
      windowsHide: true,
    }));
  } catch (error) {
    throw new Error(`Unable to inspect build-critical source files. ${formatProcessError(error)}`);
  }

  const sourcePaths = stdout.split(/\r?\n/u).filter(Boolean);
  if (sourcePaths.length === 0) {
    throw new Error('No git-tracked build-critical source files were found for the composed SDK.');
  }
  return sourcePaths;
}

async function buildAndPackageDomainTransport() {
  await stageDomainTransportSource();
  const buildScript = path.join(stagedDomainTransportDir, 'custom', 'build-runtime.mjs');

  try {
    await execFileAsync(process.execPath, [buildScript], {
      cwd: stagedDomainTransportDir,
      windowsHide: true,
    });
  } catch (error) {
    throw new Error(`Failed to build the generated domains transport. ${formatProcessError(error)}`);
  }

  for (const fileName of ['index.js', 'index.cjs', 'index.d.ts']) {
    try {
      await fs.access(path.join(stagedDomainTransportDistDir, fileName));
    } catch {
      throw new Error(`Generated domains transport did not emit ${fileName}.`);
    }
  }

  await fs.cp(stagedDomainTransportDistDir, packagedDomainTransportDir, {
    recursive: true,
    force: true,
  });
}

async function stageDomainTransportSource() {
  await fs.mkdir(stagedDomainTransportDir, { recursive: true });
  await fs.cp(path.join(domainTransportDir, 'src'), path.join(stagedDomainTransportDir, 'src'), {
    recursive: true,
  });
  await fs.cp(path.join(domainTransportDir, 'custom'), path.join(stagedDomainTransportDir, 'custom'), {
    recursive: true,
  });
  await fs.copyFile(
    path.join(domainTransportDir, 'package.json'),
    path.join(stagedDomainTransportDir, 'package.json'),
  );
  await fs.copyFile(
    path.join(domainTransportDir, 'tsconfig.json'),
    path.join(stagedDomainTransportDir, 'tsconfig.json'),
  );
}

function formatProcessError(error) {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const stderr = typeof error.stderr === 'string' ? error.stderr.trim() : '';
  return stderr ? `${error.message}\n${stderr}` : error.message;
}

async function removeDirectory(target) {
  await fs.rm(target, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100,
  });
}

function loadConfig(overrides) {
  const configPath = ts.findConfigFile(projectDir, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) {
    throw new Error(`tsconfig.json not found under ${projectDir}`);
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(formatDiagnostics([configFile.error]));
  }

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, projectDir, overrides, configPath);
  if (parsed.errors.length > 0) {
    throw new Error(formatDiagnostics(parsed.errors));
  }

  return parsed;
}

function emitDeclarations() {
  const parsed = loadConfig({
    declaration: true,
    declarationMap: true,
    emitDeclarationOnly: true,
    noEmit: false,
    noEmitOnError: true,
    outDir: distDir,
    rootDir: srcDir,
    sourceMap: false,
  });
  emitProgram(parsed);
}

function emitRuntimeModules() {
  const parsed = loadConfig({
    declaration: false,
    declarationMap: false,
    emitDeclarationOnly: false,
    module: ts.ModuleKind.ESNext,
    noEmit: false,
    noEmitOnError: true,
    outDir: tempEsmDir,
    rootDir: srcDir,
    sourceMap: false,
  });
  emitProgram(parsed);
}

function emitProgram(parsed) {
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const emitResult = program.emit();
  const diagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
  if (diagnostics.length > 0) {
    throw new Error(formatDiagnostics(diagnostics));
  }
}

async function removeTypeOnlyRuntimeReExports(entryFile) {
  const source = await fs.readFile(entryFile, 'utf-8');
  const runtimeLines = source.split(/\r?\n/u).map((line) => {
    if (line.trim() === "export * from './types';") {
      return "export { DEFAULT_TIMEOUT, SUCCESS_CODES } from '@sdkwork/sdk-common';";
    }
    return line;
  });
  await fs.writeFile(entryFile, runtimeLines.join('\n'), 'utf-8');
}

async function bundleRuntime(format, input, file) {
  const bundle = await rollup({
    input,
    external: (source) => source.startsWith('@sdkwork/') || source.startsWith('#'),
    plugins: [relativeExtensionResolver()],
    onwarn(warning, warn) {
      if (warning.code === 'EMPTY_BUNDLE') {
        throw new Error(warning.message);
      }
      warn(warning);
    },
  });

  try {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await bundle.write({
      file,
      format,
      exports: 'named',
      interop: 'auto',
      sourcemap: false,
    });
  } finally {
    await bundle.close();
  }
}

function relativeExtensionResolver() {
  return {
    name: 'relative-extension-resolver',
    async resolveId(source, importer) {
      if (!importer || !source.startsWith('.')) {
        return null;
      }

      const base = path.resolve(path.dirname(importer), source);
      for (const candidate of [base, `${base}.js`, path.join(base, 'index.js')]) {
        try {
          const stat = await fs.stat(candidate);
          if (stat.isFile()) {
            return candidate;
          }
        } catch {
          // Try the next candidate.
        }
      }

      return null;
    },
  };
}

function formatDiagnostics(diagnostics) {
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => projectDir,
    getNewLine: () => '\n',
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
