import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  readPackageImportEntry,
  readPackageJsonManifest,
  parsePackageSpecifier,
  resolvePortalPackageJson,
  resolvePortalPackageModule,
  shouldResolvePortalPnpmWorkspaceSpecifier,
} from './lib/portal-workspace-package-resolver.mjs';

const portalRoot = path.resolve(import.meta.dirname, '..');

const TYPESCRIPT_SOURCE_SHORT_CIRCUIT_PACKAGES = new Set([
  '@sdkwork/iam-contracts',
  '@sdkwork/i18n-pc-react',
]);

const TYPESCRIPT_SOURCE_EXCLUDED_PACKAGES = [
  /^@sdkwork\/clawrouter-pc-/u,
  /^@sdkwork\/clawroutes-/u,
  /^@sdkwork\/ui-pc-react$/u,
  /^@sdkwork\/appbase-pc-react$/u,
  /^@sdkwork\/auth-pc-react$/u,
];

function shortCircuitResolvedFile(resolved) {
  return {
    url: pathToFileURL(resolved).href,
    shortCircuit: true,
  };
}

function isSdkLikePackage(packageName) {
  return (
    packageName.endsWith('-sdk')
    || packageName.endsWith('-generated-typescript')
    || packageName === '@sdkwork/utils'
  );
}

function shouldShortCircuitTypescriptSource(packageName, entry) {
  if (TYPESCRIPT_SOURCE_SHORT_CIRCUIT_PACKAGES.has(packageName)) {
    return true;
  }

  const normalizedEntry = entry.replace(/^\.\//u, '');
  if (!normalizedEntry.startsWith('src/')) {
    return false;
  }

  if (TYPESCRIPT_SOURCE_EXCLUDED_PACKAGES.some((pattern) => pattern.test(packageName))) {
    return false;
  }

  return packageName.startsWith('@sdkwork/');
}

export async function resolve(specifier, context, nextResolve) {
  if (!shouldResolvePortalPnpmWorkspaceSpecifier(specifier)) {
    return nextResolve(specifier, context);
  }

  const parsedSpecifier = parsePackageSpecifier(specifier);
  const packageJsonPath = resolvePortalPackageJson(parsedSpecifier.packageName, portalRoot, context.parentURL);
  if (packageJsonPath) {
    const packageRoot = path.dirname(packageJsonPath);
    const packageJson = readPackageJsonManifest(packageJsonPath);
    const entry = parsedSpecifier.subpath
      ? readPackageImportEntry(packageJson.exports, `./${parsedSpecifier.subpath}`)
        ?? parsedSpecifier.subpath
      : readPackageImportEntry(packageJson.exports) ?? packageJson.module ?? packageJson.main ?? 'index.js';
    const exportResolved = path.resolve(packageRoot, entry);
    if (fs.existsSync(exportResolved) && /\.(?:m?js|cjs)$/i.test(exportResolved)) {
      return shortCircuitResolvedFile(exportResolved);
    }
    if (
      fs.existsSync(exportResolved)
      && /\.tsx?$/i.test(exportResolved)
      && shouldShortCircuitTypescriptSource(parsedSpecifier.packageName, entry)
    ) {
      return shortCircuitResolvedFile(exportResolved);
    }
  }

  const resolved = resolvePortalPackageModule(specifier, portalRoot, context.parentURL);
  if (resolved && fs.existsSync(resolved)) {
    if (/\.(?:m?js|cjs)$/i.test(resolved)) {
      return shortCircuitResolvedFile(resolved);
    }
    if (
      /\.tsx?$/i.test(resolved)
      && (
        isSdkLikePackage(parsedSpecifier.packageName)
        || (parsedSpecifier.packageName === '@sdkwork/ui-pc-react' && parsedSpecifier.subpath)
      )
    ) {
      return shortCircuitResolvedFile(resolved);
    }
  }

  return nextResolve(specifier, context);
}
