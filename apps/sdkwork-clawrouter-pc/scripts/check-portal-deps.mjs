import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const portalRoot = path.resolve(import.meta.dirname, '..');
const requireFromPortal = createRequire(path.join(portalRoot, 'package.json'));

const directRuntimeDependencies = [
  'clsx',
  'cookie',
  'decimal.js-light',
  'es-toolkit',
  'framer-motion',
  'html-parse-stringify',
  'motion',
  'motion-dom',
  'motion-utils',
  'react-hook-form',
  'react-router',
  'react-router-dom',
  'recharts',
  'scheduler',
  'set-cookie-parser',
  'use-sync-external-store',
  'victory-vendor',
  'void-elements',
];

const forbiddenAliasTokens = [
  'clsx',
  'cookie',
  'decimal.js-light',
  'es-toolkit',
  'framer-motion',
  'html-parse-stringify',
  'motion',
  'motion-dom',
  'motion-utils',
  'react-hook-form',
  'react-router',
  'react-router-dom',
  'recharts',
  'scheduler',
  'set-cookie-parser',
  'victory-vendor',
  'void-elements',
];

const forbiddenRuntimeDependencies = [
  ['@sdkwork/', 'app-sdk'].join(''),
  ['@sdkwork/', 'backend-sdk'].join(''),
];

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(portalRoot, relativePath), 'utf8'));
}

function assertNoRetiredGenericSdkDependencies() {
  const packageJson = readJson('package.json');
  const dependencies = packageJson.dependencies ?? {};
  const offenders = forbiddenRuntimeDependencies.filter((dependency) => dependencies[dependency]);

  if (offenders.length > 0) {
    throw new Error(`Portal package.json must not declare retired generic SDK dependencies: ${offenders.join(', ')}`);
  }
}

function assertDirectDependencies() {
  const packageJson = readJson('package.json');
  const dependencies = packageJson.dependencies ?? {};
  const missing = directRuntimeDependencies.filter((dependency) => !dependencies[dependency]);

  if (missing.length > 0) {
    throw new Error(`Portal package.json must declare direct runtime dependencies: ${missing.join(', ')}`);
  }
}

function assertRuntimePackagesResolve() {
  const unresolved = [];
  for (const dependency of directRuntimeDependencies) {
    try {
      requireFromPortal.resolve(dependency);
    } catch (error) {
      if (error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
        try {
          requireFromPortal.resolve(`${dependency}/package.json`);
          continue;
        } catch {
          // Report the original dependency name below.
        }
      }
      unresolved.push(dependency);
    }
  }

  if (unresolved.length > 0) {
    throw new Error(`Portal runtime dependencies are not installed: ${unresolved.join(', ')}`);
  }
}

function assertPortalCommandShims() {
  const commandShims = [
    path.join(portalRoot, 'node_modules', '.bin', 'vite'),
    path.join(portalRoot, 'node_modules', '.bin', 'vite.cmd'),
    path.join(portalRoot, 'node_modules', '.bin', 'vite.ps1'),
  ];

  if (!commandShims.some((commandShim) => existsSync(commandShim))) {
    throw new Error(
      'Portal dependency command shims are not installed: vite. Run pnpm install in apps/sdkwork-clawrouter-pc or start with pnpm --dir apps/sdkwork-clawrouter-pc install.',
    );
  }
}

function assertTsconfigDoesNotAliasWorkspacePackages() {
  const tsconfig = readJson('tsconfig.json');
  const offenders = Object.keys(tsconfig.compilerOptions?.paths ?? {}).filter(
    (entry) => entry.startsWith('@sdkwork/') || entry.endsWith('-generated-typescript'),
  );

  if (offenders.length > 0) {
    throw new Error(`Portal tsconfig.json must not map workspace packages through paths: ${offenders.join(', ')}`);
  }
}

function assertViteConfigDoesNotAliasWorkspacePackages() {
  const viteConfig = readFileSync(path.join(portalRoot, 'vite.config.ts'), 'utf8');
  const workspaceAliasPattern = /find:\s*['"`](@sdkwork\/[^'"`]+|[^'"`]*-generated-typescript)['"`]/gu;
  const offenders = [...viteConfig.matchAll(workspaceAliasPattern)].map((match) => match[1]);

  if (offenders.length > 0) {
    throw new Error(`Portal Vite config must not alias workspace packages: ${offenders.join(', ')}`);
  }
}

function assertViteConfigDoesNotAliasRuntimeDependencies() {
  const viteConfig = readFileSync(path.join(portalRoot, 'vite.config.ts'), 'utf8');
  const forbidden = forbiddenAliasTokens.filter((dependency) => {
    const escaped = dependency.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`find:\\s*(?:['"\`]${escaped}['"\`]|/[^/]*${escaped.replace(/\\-/g, '-')}[^/]*/)` , 'u').test(viteConfig);
  });

  if (forbidden.length > 0) {
    throw new Error(`Portal Vite config must not alias third-party runtime dependencies: ${forbidden.join(', ')}`);
  }
}

async function assertMotionReactExports() {
  const motionReact = await import(pathToFileURL(requireFromPortal.resolve('motion/react')).href);
  if (typeof motionReact.motion !== 'function' || typeof motionReact.AnimatePresence !== 'function') {
    throw new Error('motion/react must expose both motion and AnimatePresence named exports');
  }
}

try {
  assertNoRetiredGenericSdkDependencies();
  assertDirectDependencies();
  assertRuntimePackagesResolve();
  assertPortalCommandShims();
  assertTsconfigDoesNotAliasWorkspacePackages();
  assertViteConfigDoesNotAliasWorkspacePackages();
  assertViteConfigDoesNotAliasRuntimeDependencies();
  await assertMotionReactExports();
  console.log('Portal dependency preflight passed.');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
