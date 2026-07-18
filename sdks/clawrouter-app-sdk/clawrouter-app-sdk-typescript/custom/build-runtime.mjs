#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import { rollup } from 'rollup';

const projectDir = process.cwd();
const srcDir = path.join(projectDir, 'src');
const distDir = path.join(projectDir, 'dist');
const tempDir = path.join(projectDir, '.sdkwork', 'build-runtime');
const tempEsmDir = path.join(tempDir, 'esm');
const domainTransportDir = path.join(projectDir, 'generated', 'domains', 'server-openapi');
const domainsEntry = path.join(srcDir, 'domains', 'index.ts');

async function main() {
  await removeDirectory(distDir);
  await removeDirectory(tempDir);
  await fs.mkdir(distDir, { recursive: true });

  if (await pathExists(domainsEntry)) {
    await stageDomainTransport();
  }
  emitDeclarations();
  emitRuntimeModules();
  await removeTypeOnlyRuntimeReExports(path.join(tempEsmDir, 'index.js'));
  await bundleRuntime(path.join(tempEsmDir, 'index.js'), 'es', path.join(distDir, 'index.js'));
  await bundleRuntime(path.join(tempEsmDir, 'index.js'), 'cjs', path.join(distDir, 'index.cjs'));
  if (await pathExists(domainsEntry)) {
    await bundleRuntime(path.join(tempEsmDir, 'domains', 'index.js'), 'es', path.join(distDir, 'domains', 'index.js'));
    await bundleRuntime(path.join(tempEsmDir, 'domains', 'index.js'), 'cjs', path.join(distDir, 'domains', 'index.cjs'));
  }

  await removeDirectory(tempDir);
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function stageDomainTransport() {
  const buildScript = path.join(domainTransportDir, 'custom', 'build-runtime.mjs');
  if (!(await pathExists(buildScript))) {
    throw new Error(`domain transport build script not found: ${buildScript}`);
  }

  const result = spawnSync(process.execPath, [buildScript], {
    cwd: domainTransportDir,
    stdio: 'inherit',
  });
  if (result.error) {
    throw result.error;
  }
  if ((result.status ?? 1) !== 0) {
    throw new Error(`domain transport build failed with status ${result.status ?? 1}`);
  }

  const generatedDist = path.join(domainTransportDir, 'dist');
  if (!(await pathExists(path.join(generatedDist, 'index.d.ts')))) {
    throw new Error(`domain transport build did not emit declarations: ${generatedDist}`);
  }
  await fs.cp(generatedDist, path.join(distDir, 'domains-generated'), { recursive: true });
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

async function bundleRuntime(input, format, file) {
  const bundle = await rollup({
    input,
    external: (source) => source.startsWith('@sdkwork/') || source.startsWith('#clawrouter-'),
    plugins: [relativeExtensionResolver()],
    onwarn(warning, warn) {
      if (warning.code === 'EMPTY_BUNDLE') {
        throw new Error(warning.message);
      }
      warn(warning);
    },
  });

  try {
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
