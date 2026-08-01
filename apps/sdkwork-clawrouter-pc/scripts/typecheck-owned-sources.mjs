import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const scriptPath = fileURLToPath(import.meta.url);
const applicationRoot = path.resolve(path.dirname(scriptPath), '..');
const repositoryRoot = path.resolve(applicationRoot, '..', '..');

export function classifyTypeScriptDiagnostics(diagnostics, ownedRepositoryRoot) {
  const owned = [];
  const external = [];
  const externalOwners = new Map();

  for (const diagnostic of diagnostics) {
    if (!diagnostic.file || isOwnedSourcePath(diagnostic.file.fileName, ownedRepositoryRoot)) {
      owned.push(diagnostic);
      continue;
    }

    external.push(diagnostic);
    const owner = resolveExternalOwner(diagnostic.file.fileName, ownedRepositoryRoot);
    externalOwners.set(owner, (externalOwners.get(owner) ?? 0) + 1);
  }

  return { external, externalOwners, owned };
}

export function isOwnedSourcePath(fileName, ownedRepositoryRoot) {
  const root = normalizePath(resolveExistingPath(ownedRepositoryRoot));
  const candidate = normalizePath(resolveExistingPath(fileName));
  return candidate === root || candidate.startsWith(`${root}/`);
}

function resolveExternalOwner(fileName, ownedRepositoryRoot) {
  const workspaceRoot = path.dirname(path.resolve(ownedRepositoryRoot));
  const relativePath = path.relative(workspaceRoot, resolveExistingPath(fileName));
  if (!relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
    return relativePath.split(path.sep)[0] || 'external';
  }
  return 'external';
}

function resolveExistingPath(candidate) {
  const resolved = path.resolve(candidate);
  try {
    return fs.realpathSync.native(resolved);
  } catch {
    return resolved;
  }
}

function normalizePath(candidate) {
  const normalized = candidate.replaceAll('\\', '/').replace(/\/$/u, '');
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function formatDiagnostics(diagnostics) {
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => applicationRoot,
    getNewLine: () => ts.sys.newLine,
  });
}

function readTypeScriptConfig(configPath) {
  const configResult = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configResult.error) {
    throw new TypeScriptConfigError([configResult.error]);
  }

  const parsed = ts.parseJsonConfigFileContent(
    configResult.config,
    ts.sys,
    applicationRoot,
    undefined,
    configPath,
  );
  if (parsed.errors.length > 0) {
    throw new TypeScriptConfigError(parsed.errors);
  }
  return parsed;
}

class TypeScriptConfigError extends Error {
  constructor(diagnostics) {
    super('Unable to load the TypeScript configuration');
    this.diagnostics = diagnostics;
  }
}

export function runOwnedSourceTypecheck() {
  const configPath = path.join(applicationRoot, 'tsconfig.typecheck.json');
  let parsedConfig;
  try {
    parsedConfig = readTypeScriptConfig(configPath);
  } catch (error) {
    if (error instanceof TypeScriptConfigError) {
      console.error(formatDiagnostics(error.diagnostics));
      return 1;
    }
    throw error;
  }

  const program = ts.createProgram({
    options: parsedConfig.options,
    projectReferences: parsedConfig.projectReferences,
    rootNames: parsedConfig.fileNames,
  });
  const diagnostics = ts.sortAndDeduplicateDiagnostics(ts.getPreEmitDiagnostics(program));
  const result = classifyTypeScriptDiagnostics(diagnostics, repositoryRoot);

  if (result.external.length > 0) {
    const ownerSummary = [...result.externalOwners.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([owner, count]) => `${owner}=${count}`)
      .join(', ');
    console.warn(
      `[typecheck] ${result.external.length} diagnostics belong to source-linked sibling owners: ${ownerSummary}`,
    );
  }

  if (result.owned.length > 0) {
    console.error(formatDiagnostics(result.owned));
    console.error(`[typecheck] ${result.owned.length} Claw Router owned-source diagnostics found.`);
    return 1;
  }

  console.log(
    `[typecheck] Claw Router owned sources passed; ${result.external.length} external diagnostics were reported separately.`,
  );
  return 0;
}

if (process.argv[1] && resolveExistingPath(process.argv[1]) === resolveExistingPath(scriptPath)) {
  process.exitCode = runOwnedSourceTypecheck();
}
