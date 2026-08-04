import path from 'node:path';

import { readGenerationAssetConfigStubReplacement } from './portal-generation-asset-config-stub.mjs';
import {
  resolvePortalPackageModule,
  shouldResolvePortalPnpmWorkspaceSpecifier,
} from './portal-workspace-package-resolver.mjs';

function normalizePath(value) {
  return path.resolve(value).replaceAll('\\', '/');
}

function isWorkspaceImporter(importer, workspaceDependencyRoots) {
  const normalizedImporter = normalizePath(importer?.split('?', 1)[0] ?? '');
  return Boolean(
    normalizedImporter
    && workspaceDependencyRoots.some((root) => normalizedImporter.startsWith(`${normalizePath(root)}/`)),
  );
}

export function shouldResolvePortalOptimizeDepsImport(
  source,
  importer,
  workspaceDependencyRoots,
  optimizedBareDependencies,
) {
  if (
    source.startsWith('.')
    || source.startsWith('/')
    || source.startsWith('\0')
    || source.includes('?')
    || path.isAbsolute(source)
  ) {
    return false;
  }

  if (shouldResolvePortalPnpmWorkspaceSpecifier(source)) {
    return true;
  }

  if (optimizedBareDependencies.has(source)) {
    return false;
  }

  return isWorkspaceImporter(importer, workspaceDependencyRoots);
}

export function createPortalOptimizeDepsEsbuildPlugin(
  configDir,
  workspaceDependencyRoots,
  optimizedBareDependencies,
) {
  return {
    name: 'portal-optimize-deps-resolver',
    setup(build) {
      build.onLoad({ filter: /generation-asset-config\.ts$/ }, (args) => {
        const replacement = readGenerationAssetConfigStubReplacement(configDir, args.path, args.path);
        if (!replacement) {
          return null;
        }

        return {
          contents: replacement,
          loader: 'ts',
        };
      });

      build.onResolve({ filter: /.*/ }, (args) => {
        if (!shouldResolvePortalOptimizeDepsImport(
          args.path,
          args.importer,
          workspaceDependencyRoots,
          optimizedBareDependencies,
        )) {
          return null;
        }

        const resolved = resolvePortalPackageModule(args.path, configDir, args.importer);
        if (!resolved) {
          return null;
        }

        return { path: resolved };
      });
    },
  };
}
