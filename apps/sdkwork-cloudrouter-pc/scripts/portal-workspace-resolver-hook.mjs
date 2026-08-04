import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  parsePackageSpecifier,
  resolvePortalPackageModule,
  shouldResolvePortalPnpmWorkspaceSpecifier,
} from './lib/portal-workspace-package-resolver.mjs';

const portalRoot = path.resolve(import.meta.dirname, '..');

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

export async function resolve(specifier, context, nextResolve) {
  if (!shouldResolvePortalPnpmWorkspaceSpecifier(specifier)) {
    return nextResolve(specifier, context);
  }

  const resolved = resolvePortalPackageModule(specifier, portalRoot, context.parentURL);
  if (resolved && fs.existsSync(resolved)) {
    const parsedSpecifier = parsePackageSpecifier(specifier);
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
