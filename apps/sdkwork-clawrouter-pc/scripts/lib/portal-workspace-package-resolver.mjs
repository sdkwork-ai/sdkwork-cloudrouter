import fs from 'node:fs';
import path from 'node:path';

const portalPackageModuleCache = new Map();

export const PORTAL_PACKAGE_COMPAT_ALIASES = Object.freeze({
  '@sdkwork/clawrouter-pc-commons': '@sdkwork/clawroutes-pc-commons',
});

export function resolvePortalCompatSpecifier(specifier) {
  const parsedSpecifier = parsePackageSpecifier(specifier);
  const aliasPackageName = PORTAL_PACKAGE_COMPAT_ALIASES[parsedSpecifier.packageName];
  if (!aliasPackageName) {
    return specifier;
  }

  return parsedSpecifier.subpath
    ? `${aliasPackageName}/${parsedSpecifier.subpath}`
    : aliasPackageName;
}

export function shouldResolvePortalPnpmWorkspaceSpecifier(source) {
  if (
    source.startsWith('.')
    || source.startsWith('/')
    || source.startsWith('\0')
    || source.includes('?')
  ) {
    return false;
  }

  if (source.startsWith('@sdkwork/')) {
    return true;
  }

  return source.endsWith('-generated-typescript');
}

export function readPackageJsonManifest(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/u, ''));
}

export function parsePackageSpecifier(specifier) {
  const segments = specifier.split('/');
  if (specifier.startsWith('@')) {
    return {
      packageName: segments.slice(0, 2).join('/'),
      subpath: segments.slice(2).join('/'),
    };
  }
  return {
    packageName: segments[0],
    subpath: segments.slice(1).join('/'),
  };
}

export function resolvePortalPackageJson(packageName, configDir, parentUrl) {
  const searchRoots = collectPortalModuleSearchRoots(configDir, parentUrl);
  for (const searchRoot of searchRoots) {
    const directPath = path.join(searchRoot, 'node_modules', ...packageName.split('/'), 'package.json');
    if (fs.existsSync(directPath)) {
      return directPath;
    }
  }

  const pnpmRoot = path.join(configDir, 'node_modules', '.pnpm');
  if (fs.existsSync(pnpmRoot)) {
    const encodedPrefix = packageName.replace('/', '+');
    const candidates = fs.readdirSync(pnpmRoot)
      .filter((entry) => entry.startsWith(encodedPrefix.slice(0, Math.min(encodedPrefix.length, 24))))
      .sort();
    for (const candidate of candidates) {
      const packageJsonPath = path.join(pnpmRoot, candidate, 'node_modules', ...packageName.split('/'), 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        return packageJsonPath;
      }
    }
    for (const candidate of fs.readdirSync(pnpmRoot).sort()) {
      const packageJsonPath = path.join(pnpmRoot, candidate, 'node_modules', ...packageName.split('/'), 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        return packageJsonPath;
      }
    }
  }

  return resolvePortalPackageJsonFromWorkspaces(packageName, configDir);
}

function readPnpmWorkspacePackageGlobs(configDir) {
  const repoRoot = path.resolve(configDir, '../..');
  const workspaceFile = path.join(repoRoot, 'pnpm-workspace.yaml');
  if (!fs.existsSync(workspaceFile)) {
    return [];
  }

  const entries = [];
  for (const line of fs.readFileSync(workspaceFile, 'utf8').split(/\r?\n/u)) {
    const match = line.match(/^\s*-\s+"([^"]+)"\s*$/u) ?? line.match(/^\s*-\s+'([^']+)'\s*$/u);
    if (match) {
      entries.push(match[1]);
    }
  }
  return entries;
}

function appendExpandedWorkspaceGlob(basePathWithGlob, appendRoot) {
  const normalizedEntry = basePathWithGlob.replace(/\\/g, '/');
  if (!normalizedEntry.includes('*')) {
    appendRoot(normalizedEntry);
    return;
  }

  const starIndex = normalizedEntry.indexOf('*');
  const prefix = path.resolve(normalizedEntry.slice(0, starIndex));
  const suffix = normalizedEntry.slice(starIndex + 1).replace(/^\//u, '');
  if (!fs.existsSync(prefix)) {
    return;
  }

  for (const child of fs.readdirSync(prefix, { withFileTypes: true })) {
    if (!child.isDirectory()) {
      continue;
    }
    appendRoot(suffix ? path.join(prefix, child.name, suffix) : path.join(prefix, child.name));
  }
}

function expandPortalWorkspaceEntries(configDir) {
  const repoRoot = path.resolve(configDir, '../..');
  const workspaceSources = [];
  const portalPackageJsonPath = path.join(configDir, 'package.json');
  if (fs.existsSync(portalPackageJsonPath)) {
    const portalPackageJson = readPackageJsonManifest(portalPackageJsonPath);
    for (const entry of portalPackageJson.workspaces ?? []) {
      workspaceSources.push(path.resolve(configDir, entry));
    }
  }
  for (const entry of readPnpmWorkspacePackageGlobs(configDir)) {
    workspaceSources.push(path.resolve(repoRoot, entry));
  }

  const roots = [];
  const seen = new Set();

  function appendRoot(candidate) {
    const resolved = path.resolve(candidate);
    const normalized = normalizeFsPath(resolved);
    if (seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    roots.push(resolved);
  }

  for (const source of workspaceSources) {
    appendExpandedWorkspaceGlob(source, appendRoot);
  }

  return roots;
}

function resolvePortalPackageJsonFromWorkspaces(packageName, configDir) {
  for (const workspaceRoot of expandPortalWorkspaceEntries(configDir)) {
    const packageJsonPath = path.join(workspaceRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      continue;
    }
    const packageJson = readPackageJsonManifest(packageJsonPath);
    if (packageJson.name === packageName) {
      return packageJsonPath;
    }
  }
  return null;
}

function normalizeFsPath(value) {
  return path.resolve(value).replaceAll('\\', '/');
}

function collectPortalModuleSearchRoots(configDir, parentUrl) {
  const roots = [];
  const seen = new Set();

  function appendRoot(candidate) {
    const normalized = path.resolve(candidate);
    if (seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    roots.push(normalized);
  }

  appendRoot(configDir);

  if (parentUrl) {
    let currentDir = parentUrl.startsWith('file:')
      ? path.dirname(new URL(parentUrl).pathname)
      : path.dirname(parentUrl);
    if (process.platform === 'win32' && currentDir.startsWith('/')) {
      currentDir = currentDir.slice(1);
    }
    while (true) {
      appendRoot(currentDir);
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break;
      }
      currentDir = parentDir;
    }
  }

  return roots;
}

export function readPackageImportEntry(exportsField, subpath = '.') {
  if (!exportsField || typeof exportsField !== 'object') {
    return undefined;
  }

  const rootExport = Object.prototype.hasOwnProperty.call(exportsField, subpath)
    ? exportsField[subpath]
    : exportsField;
  if (typeof rootExport === 'string') {
    return rootExport;
  }
  if (!rootExport || typeof rootExport !== 'object') {
    return undefined;
  }

  const importExport = rootExport.import;
  if (typeof importExport === 'string') {
    return importExport;
  }
  if (importExport && typeof importExport === 'object') {
    const defaultExport = importExport.default;
    if (typeof defaultExport === 'string') {
      return defaultExport;
    }
  }
  const rootDefaultExport = rootExport.default;
  if (typeof rootDefaultExport === 'string') {
    return rootDefaultExport;
  }
  return undefined;
}

function firstExistingFile(candidates) {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function resolveSrcFallback(packageRoot, parsedSpecifier, entry) {
  if (parsedSpecifier.subpath) {
    const subpathRoot = path.resolve(packageRoot, 'src', parsedSpecifier.subpath);
    const directSrcFallback = firstExistingFile([
      `${subpathRoot}.tsx`,
      `${subpathRoot}.ts`,
      `${subpathRoot}.mts`,
      path.join(subpathRoot, 'index.tsx'),
      path.join(subpathRoot, 'index.ts'),
    ]);
    if (directSrcFallback) {
      return directSrcFallback;
    }
  } else {
    const indexFallback = firstExistingFile([
      path.resolve(packageRoot, 'src/index.ts'),
      path.resolve(packageRoot, 'src/index.tsx'),
    ]);
    if (indexFallback) {
      return indexFallback;
    }
  }

  if (entry && entry.includes('/dist/')) {
    const composedSrcBase = path.resolve(
      packageRoot,
      entry.replace(/^\.\//u, '').replace(/\/dist\//u, '/src/').replace(/\.(?:js|cjs)$/u, ''),
    );
    const composedSrc = firstExistingFile([
      `${composedSrcBase}.tsx`,
      `${composedSrcBase}.ts`,
    ]);
    if (composedSrc) {
      return composedSrc;
    }
  }

  if (parsedSpecifier.subpath && packageRoot.endsWith('-typescript')) {
    const facadeSubpathRoot = path.resolve(packageRoot, 'src', parsedSpecifier.subpath);
    const facadeSubpath = firstExistingFile([
      `${facadeSubpathRoot}.tsx`,
      `${facadeSubpathRoot}.ts`,
    ]);
    if (facadeSubpath) {
      return facadeSubpath;
    }
  }

  const composedFacadeIndex = path.resolve(packageRoot, 'src/index.ts');
  if (!parsedSpecifier.subpath && fs.existsSync(composedFacadeIndex)) {
    return composedFacadeIndex;
  }

  const composedIndex = path.resolve(packageRoot, 'generated/server-openapi/src/index.ts');
  if (!parsedSpecifier.subpath && fs.existsSync(composedIndex)) {
    return composedIndex;
  }

  if (parsedSpecifier.subpath) {
    const composedSubpathRoot = path.resolve(
      packageRoot,
      'generated/server-openapi/src',
      parsedSpecifier.subpath,
    );
    const composedSubpath = firstExistingFile([
      `${composedSubpathRoot}.tsx`,
      `${composedSubpathRoot}.ts`,
    ]);
    if (composedSubpath) {
      return composedSubpath;
    }
  }

  return null;
}

function normalizePackageRootPath(packageRoot) {
  return packageRoot.replaceAll('\\', '/');
}

function isTransportPackageManifest(packageJson) {
  return (
    packageJson.sdkworkRole === 'transport'
    || String(packageJson.name ?? '').endsWith('-generated-typescript')
  );
}

function resolveComposedFacadeRootFromTransportPackageRoot(packageRoot) {
  const normalized = normalizePackageRootPath(packageRoot);
  if (normalized.endsWith('/generated/domains/server-openapi')) {
    const composedRoot = path.resolve(packageRoot, '../../..');
    return fs.existsSync(path.join(composedRoot, 'package.json')) ? composedRoot : null;
  }
  if (normalized.endsWith('/generated/server-openapi')) {
    const composedRoot = path.resolve(packageRoot, '../..');
    return fs.existsSync(path.join(composedRoot, 'package.json')) ? composedRoot : null;
  }
  return null;
}

function resolvePortalPackageModuleFromRoot(parsedSpecifier, packageRoot) {
  const packageJsonPath = path.join(packageRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  const packageJson = readPackageJsonManifest(packageJsonPath);
  const entry = parsedSpecifier.subpath
    ? readPackageImportEntry(packageJson.exports, `./${parsedSpecifier.subpath}`)
      ?? parsedSpecifier.subpath
    : readPackageImportEntry(packageJson.exports) ?? packageJson.module ?? packageJson.main ?? 'index.js';
  let resolved = path.resolve(packageRoot, entry);
  if (!fs.existsSync(resolved)) {
    const srcFallback = resolveSrcFallback(packageRoot, parsedSpecifier, entry);
    if (srcFallback) {
      resolved = srcFallback;
    }
  }
  return fs.existsSync(resolved) ? resolved : null;
}

export function resolvePortalPackageModule(specifier, configDir, parentUrl) {
  const compatSpecifier = resolvePortalCompatSpecifier(specifier);
  const cacheKey = `${compatSpecifier}::${parentUrl ?? ''}`;
  const cached = portalPackageModuleCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const parsedSpecifier = parsePackageSpecifier(compatSpecifier);
  const packageJsonPath = resolvePortalPackageJson(parsedSpecifier.packageName, configDir, parentUrl);
  if (!packageJsonPath) {
    return null;
  }

  const packageRoot = path.dirname(packageJsonPath);
  const packageJson = readPackageJsonManifest(packageJsonPath);
  let resolved = resolvePortalPackageModuleFromRoot(parsedSpecifier, packageRoot);
  if (!resolved && isTransportPackageManifest(packageJson)) {
    const composedRoot = resolveComposedFacadeRootFromTransportPackageRoot(packageRoot);
    if (composedRoot) {
      resolved = resolvePortalPackageModuleFromRoot(parsedSpecifier, composedRoot);
    }
  }
  if (!resolved) {
    return null;
  }
  portalPackageModuleCache.set(cacheKey, resolved);
  return resolved;
}

export function clearPortalPackageModuleCache() {
  portalPackageModuleCache.clear();
}
