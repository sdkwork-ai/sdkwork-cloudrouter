import { resolveBrowserDistOutDir } from '../../../sdkwork-specs/tools/browser-dist-layout.mjs';
function resolveViteEnvironment(mode: string | undefined, processEnv = process.env) {
  const profileMatch = /^(standalone|cloud)\.(development|test|staging|production)$/u.exec(mode ?? '');
  return profileMatch?.[2]
    ?? (['development', 'test', 'staging', 'production'].includes(processEnv.SDKWORK_ENVIRONMENT ?? '')
      ? (processEnv.SDKWORK_ENVIRONMENT ?? 'production')
      : 'production');
}
import tailwindcss from '@tailwindcss/vite';
import { readBootstrapAccessTokenEnvFile } from '../../../sdkwork-iam/apps/sdkwork-iam-common/packages/sdkwork-iam-credential-entry/src/node-bootstrap.mjs';
import { createSdkworkCredentialEntryBootstrapVitePlugin } from '../../../sdkwork-iam/apps/sdkwork-iam-common/packages/sdkwork-iam-credential-entry/src/vite.ts';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'path';
import ts from 'typescript';
import {defineConfig, loadEnv, type Plugin, type ProxyOptions} from 'vite';
import {
  readPackageImportEntry,
  readPackageJsonManifest,
  resolvePortalPackageModule,
  shouldResolvePortalPnpmWorkspaceSpecifier,
} from './scripts/lib/portal-workspace-package-resolver.mjs';
import { createPortalOptimizeDepsEsbuildPlugin } from './scripts/lib/portal-optimize-deps-esbuild-resolver.mjs';
import { readGenerationAssetConfigStubReplacement } from './scripts/lib/portal-generation-asset-config-stub.mjs';
import { alignStandaloneSameOriginBrowserSdkRuntimeEnv } from '../../scripts/lib/cloud-router-browser-env-contract.mjs';

const TYPESCRIPT_SOURCE_PATTERN = /\.(?:ts|tsx|mts|cts)$/;
const SOURCE_MAP_PATTERN = /\n?\/\/# sourceMappingURL=.*$/;
const ENABLE_TYPESCRIPT_TRANSFORM_SOURCE_MAPS = false;
const importMetaHotPattern = /\bimport\.meta\.hot\b/g;
const nodeEnvPattern = /\b(?:globalThis\.|global\.)?process\.env\.NODE_ENV\b/g;
const processEnvPattern = /\b(?:globalThis\.|global\.)?process\.env\b/g;
const HTML_MODULE_SCRIPT_PATTERN = /<script\b(?=[^>]*\btype=["']module["'])(?=[^>]*\bsrc=["'][^"']+["'])[^>]*><\/script>/i;
const RUNTIME_ENV_SCRIPT_PATH = '/runtime-env.js';
const DEFAULT_PORTAL_DEV_PORT = 3901;
const DEFAULT_BROWSER_DEV_PROXY_GATEWAY_TARGET = 'http://127.0.0.1:3900';
const LOCAL_ROUTE_PACKAGE_PATTERN =
  /\/packages\/(sdkwork-cloudrouter-pc-(?:(?:admin|console)-(?!core(?:\/|$)|shell(?:\/|$))[^/]+|downloads|home|models|playground|pricing|rankings))\//u;
const BROWSER_DEV_PROXY_ENV_KEYS = {
  openApi: 'SDKWORK_CLOUDROUTER_BROWSER_DEV_PROXY_OPEN_API_ORIGIN',
  backendApi: 'SDKWORK_CLOUDROUTER_BROWSER_DEV_PROXY_BACKEND_API_ORIGIN',
  appApi: 'SDKWORK_CLOUDROUTER_BROWSER_DEV_PROXY_APP_API_ORIGIN',
} as const;
const OPEN_API_PREFIX = '/v1';
const APP_API_PREFIX = '/app/v3/api';
const BACKEND_API_PREFIX = '/backend/v3/api';
const require = createRequire(import.meta.url);
const localPortalPackageModuleCache = new Map<string, string | null>();
const LOCAL_PORTAL_PACKAGE_PREFIXES = [
  'sdkwork-cloudrouter-pc-',
  'sdkwork-cloudrouter-',
  'sdkwork-cloudroutes-',
];
const LOCAL_PORTAL_SCOPED_PACKAGE_PREFIXES = [
  '@sdkwork/cloudrouter-pc-',
  '@sdkwork/cloudroutes-',
];
const PORTAL_MARKDOWN_OPTIMIZE_DEPS = [
  'hast-util-to-jsx-runtime',
  'hast-util-sanitize',
  'style-to-js',
  'style-to-object',
  'react-markdown',
  'remark-gfm',
  'rehype-sanitize',
  // CJS deps of the markdown chain (`unified` -> `extend`, remark-gfm ->
  // `escape-string-regexp`, react-syntax-highlighter -> `lowlight`, micromark
  // dev build -> `debug`): Vite 8 serves non-pre-bundled CJS without a
  // default export, breaking `import x from '...'` in dev.
  'debug',
  'escape-string-regexp',
  'extend',
  'lowlight',
] as const;

const PORTAL_MARKDOWN_NEEDS_INTEROP = [
  'style-to-js',
  'style-to-object',
  'debug',
  'escape-string-regexp',
  'extend',
  'lowlight',
] as const;

const PORTAL_OPTIMIZED_BARE_DEPENDENCIES = new Set([
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-dom',
  'react-dom/client',
  'react-router',
  'react-router/dom',
  'react-router-dom',
  'cookie',
  'set-cookie-parser',
  'motion/react',
  'react-i18next',
  'html-parse-stringify',
  'void-elements',
  'framer-motion',
  'i18next',
  'recharts',
  'react-remove-scroll-bar',
  ...PORTAL_MARKDOWN_OPTIMIZE_DEPS,
]);

const PORTAL_SOURCE_OPTIMIZE_EXCLUDE = [
  '@sdkwork/cloudrouter-app-sdk',
  '@sdkwork/cloudrouter-backend-sdk',
  '@sdkwork/cloudrouter-open-sdk',
  '@sdkwork/documents-app-sdk',
  '@sdkwork/documents-pc-api-reference',
  '@sdkwork/documents-pc-sdk-reference',
  '@sdkwork/iam-app-sdk',
  '@sdkwork/iam-backend-sdk',
  '@sdkwork/drive-app-sdk',
  '@sdkwork/drive-backend-sdk',
  '@sdkwork/memory-app-sdk',
  '@sdkwork/agents-app-sdk',
  '@sdkwork/agents-backend-sdk',
  '@sdkwork/prompts-backend-sdk',
  '@sdkwork/models-backend-sdk',
  '@sdkwork/models-app-sdk',
  '@sdkwork/order-app-sdk',
  '@sdkwork/account-app-sdk',
  '@sdkwork/account-backend-sdk',
  '@sdkwork/catalog-app-sdk',
  '@sdkwork/membership-app-sdk',
  '@sdkwork/payment-app-sdk',
  '@sdkwork/promotion-app-sdk',
  '@sdkwork/assets-core',
  '@sdkwork/utils',
  '@sdkwork/iam-contracts',
  '@sdkwork/iam-runtime',
  '@sdkwork/iam-service',
  '@sdkwork/iam-sdk-adapter',
  '@sdkwork/iam-sdk-ports',
  '@sdkwork/auth-runtime-pc-react',
  '@sdkwork/auth-pc-react',
  '@sdkwork/iam-core-pc-react',
  '@sdkwork/iam-react',
  '@sdkwork/iam-pc-admin-user',
  '@sdkwork/iam-pc-admin-tenant',
  '@sdkwork/iam-pc-admin-organization',
  '@sdkwork/iam-pc-admin-permission',
  '@sdkwork/iam-pc-admin-oauth',
  '@sdkwork/iam-pc-admin-account-binding',
  '@sdkwork/iam-pc-admin-audit',
  '@sdkwork/ui-pc-react',
  '@sdkwork/cloudrouter-app-sdk',
  '@sdkwork/cloudrouter-backend-sdk',
  '@sdkwork/generations-app-sdk',
  '@sdkwork/generations-pc-asset-config',
];

const PORTAL_RUNTIME_URL_ENV = [
  ['PORTAL_PUBLIC_APP_API_BASE_URL', 'VITE_CLOUDROUTER_APP_API_BASE_URL'],
  ['PORTAL_PUBLIC_BACKEND_API_BASE_URL', 'VITE_CLOUDROUTER_BACKEND_API_BASE_URL'],
  ['PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL', 'VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL'],
  ['PORTAL_PUBLIC_COMMERCE_APP_API_BASE_URL', 'VITE_SDKWORK_COMMERCE_APP_API_BASE_URL'],
  ['PORTAL_PUBLIC_COMMERCE_BACKEND_API_BASE_URL', 'VITE_SDKWORK_COMMERCE_BACKEND_API_BASE_URL'],
  ['PORTAL_PUBLIC_DOWNLOAD_BASE_URL', 'VITE_CLOUDROUTER_DOWNLOAD_BASE_URL'],
] as const;

const PORTAL_RUNTIME_BOOLEAN_ENV = [
  ['PORTAL_PUBLIC_TOOL_API_ENABLED', 'VITE_TOOL_API_ENABLED'],
] as const;

const PORTAL_RUNTIME_VITE_PASSTHROUGH_ENV = [
  'VITE_SDKWORK_ASSETS_APP_API_BASE_URL',
  'VITE_SDKWORK_FEEDS_OPEN_API_BASE_URL',
] as const;

function cloudrouterNodeEnvTransform() {
  return {
    name: 'cloudrouter-node-env-transform',
    enforce: 'pre' as const,
    apply: 'build' as const,
    transform(code: string) {
      nodeEnvPattern.lastIndex = 0;
      processEnvPattern.lastIndex = 0;
      if (!nodeEnvPattern.test(code) && !processEnvPattern.test(code)) {
        return null;
      }

      return {
        code: code
          .replace(nodeEnvPattern, JSON.stringify(process.env.NODE_ENV ?? 'production'))
          .replace(processEnvPattern, '{}'),
        map: null,
      };
    },
  };
}

export function findStaticChunkCycle(
  graph: ReadonlyMap<string, readonly string[]>,
): string[] | null {
  const visited = new Set<string>();
  const active = new Set<string>();
  const pathStack: string[] = [];

  function visit(chunkName: string): string[] | null {
    if (active.has(chunkName)) {
      const cycleStart = pathStack.indexOf(chunkName);
      return [...pathStack.slice(cycleStart), chunkName];
    }
    if (visited.has(chunkName)) {
      return null;
    }

    visited.add(chunkName);
    active.add(chunkName);
    pathStack.push(chunkName);
    for (const importedChunk of graph.get(chunkName) ?? []) {
      if (!graph.has(importedChunk)) {
        continue;
      }
      const cycle = visit(importedChunk);
      if (cycle) {
        return cycle;
      }
    }
    pathStack.pop();
    active.delete(chunkName);
    return null;
  }

  for (const chunkName of graph.keys()) {
    const cycle = visit(chunkName);
    if (cycle) {
      return cycle;
    }
  }
  return null;
}

function cloudrouterStaticChunkCycleGuard(): Plugin {
  return {
    name: 'cloudrouter-static-chunk-cycle-guard',
    apply: 'build',
    generateBundle(_options, bundle) {
      const chunkGraph = new Map<string, string[]>();
      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk') {
          chunkGraph.set(output.fileName, output.imports);
        }
      }

      const cycle = findStaticChunkCycle(chunkGraph);
      if (cycle) {
        this.error(`Production bundle contains a static chunk import cycle: ${cycle.join(' -> ')}`);
      }
    },
  };
}

function cloudrouterImportMetaHotTransform() {
  return {
    name: 'cloudrouter-import-meta-hot-transform',
    enforce: 'pre' as const,
    apply: 'build' as const,
    transform(code: string) {
      if (!importMetaHotPattern.test(code)) {
        return null;
      }

      return {
        code: code.replace(importMetaHotPattern, 'undefined'),
        map: null,
      };
    },
  };
}

/**
 * Fields of the deploy-time browser runtime document
 * (apps/<app>/public/runtime-env.json — ENVIRONMENT_SPEC.md §5.1.0.1) that
 * override the dotenv-derived values for a *built* bundle.
 *
 * The dotenv surface additionally carries the dev:cloud local gateway override
 * (SDKWORK_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL → 127.0.0.1:3900), which only
 * makes sense for `pnpm dev:cloud`: baking a loopback API base into a deployed
 * artifact would leave the browser calling its own origin. The runtime document
 * is materialized by the canonical build runner immediately before Vite runs,
 * so it is the deploy-time authority for the profile being built.
 *
 * driveAppApiBaseUrl is intentionally absent: drive is a separate service with
 * its own topology URL, not the platform gateway.
 */
const BROWSER_RUNTIME_ENV_DOCUMENT_FILE = 'runtime-env.json';
const BROWSER_RUNTIME_ENV_DOCUMENT_URL_FIELDS = {
  VITE_API_BASE_URL: 'openApiBaseUrl',
  VITE_CLOUDROUTER_OPEN_API_BASE_URL: 'openApiBaseUrl',
  VITE_CLOUDROUTER_APP_API_BASE_URL: 'appApiBaseUrl',
  VITE_CLOUDROUTER_BACKEND_API_BASE_URL: 'backendApiBaseUrl',
  VITE_SDKWORK_APPBASE_APP_API_BASE_URL: 'appbaseAppApiBaseUrl',
} as const;

/** Fold a ';'-joined multi-origin list to its registered primary origin. */
function primaryBrowserRuntimeOrigin(value: unknown): string | undefined {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) {
    return undefined;
  }
  return trimmed.split(';')[0]?.trim() || undefined;
}

export function readBrowserRuntimeEnvDocumentOverrides(configDir: string): Record<string, string> {
  const documentPath = path.join(configDir, 'public', BROWSER_RUNTIME_ENV_DOCUMENT_FILE);
  if (!fs.existsSync(documentPath)) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(documentPath, 'utf8'));
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== 'object') {
    return {};
  }

  const document = parsed as Record<string, unknown>;
  const overrides: Record<string, string> = {};
  for (const [targetKey, documentField] of Object.entries(BROWSER_RUNTIME_ENV_DOCUMENT_URL_FIELDS)) {
    const value = primaryBrowserRuntimeOrigin(document[documentField]);
    if (value) {
      overrides[targetKey] = value;
    }
  }
  return overrides;
}

function cloudrouterRuntimeEnvPlugin(
  resolveEnv: () => NodeJS.ProcessEnv = () => process.env,
  configDir: string = process.cwd(),
): Plugin {
  return {
    name: 'cloudrouter-runtime-env',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?', 1)[0] !== RUNTIME_ENV_SCRIPT_PATH) {
          next();
          return;
        }

        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        response.end(buildPortalRuntimeEnvScript(resolvePortalRuntimeEnv(resolveEnv())));
      });
    },
    // Static hosting has no dev middleware: emit the same script the dev server
    // serves so `window.__CLOUDROUTER_ENV__` is defined at runtime. Without this
    // the injected <script src="/runtime-env.js"> tag resolves to a missing
    // file, static hosts answer with the SPA fallback (index.html served as
    // text/html), the module script fails to parse, and every SDK base URL
    // falls back to its root-relative same-origin prefix — e.g. POST
    // /app/v3/api/oauth/device_authorizations hitting the static handler (405).
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: RUNTIME_ENV_SCRIPT_PATH.replace(/^\//u, ''),
        source: buildPortalRuntimeEnvScript({
          ...resolvePortalRuntimeEnv(resolveEnv()),
          ...readBrowserRuntimeEnvDocumentOverrides(configDir),
        }),
      });
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return injectPortalRuntimeEnvScript(html);
      },
    },
  };
}

function cloudrouterTypeScriptTransform() {
  return {
    name: 'cloudrouter-typescript-transform',
    enforce: 'pre' as const,
    apply: 'build' as const,
    transform(code: string, id: string) {
      const [filePath] = id.split('?');
      if (!TYPESCRIPT_SOURCE_PATTERN.test(filePath) || filePath.endsWith('.d.ts')) {
        return null;
      }

      const result = ts.transpileModule(code, {
        fileName: filePath,
        reportDiagnostics: true,
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          jsx: ts.JsxEmit.ReactJSX,
          jsxImportSource: 'react',
          experimentalDecorators: true,
          useDefineForClassFields: false,
          sourceMap: ENABLE_TYPESCRIPT_TRANSFORM_SOURCE_MAPS,
          inlineSources: ENABLE_TYPESCRIPT_TRANSFORM_SOURCE_MAPS,
        },
      });
      const error = result.diagnostics?.find(
        diagnostic => diagnostic.category === ts.DiagnosticCategory.Error,
      );
      if (error) {
        const message = ts.flattenDiagnosticMessageText(error.messageText, '\n');
        throw new Error(`TypeScript transform failed for ${filePath}: ${message}`);
      }

      return {
        code: result.outputText.replace(SOURCE_MAP_PATTERN, ''),
        map: ENABLE_TYPESCRIPT_TRANSFORM_SOURCE_MAPS && result.sourceMapText ? JSON.parse(result.sourceMapText) : null,
      };
    },
  };
}

function resolvePortalDependency(specifier: string, configDir: string): string {
  return require.resolve(specifier, {paths: [configDir]});
}

function cloudrouterGenerationAssetConfigStubInlining(configDir: string): Plugin {
  return {
    name: 'cloudrouter-generation-asset-config-stub-inlining',
    enforce: 'pre',
    load(id) {
      const filePath = id.split('?', 1)[0];
      const replacement = readGenerationAssetConfigStubReplacement(configDir, filePath, filePath);
      return replacement ?? null;
    },
  };
}

function buildCloudrouterMarkdownCjsDefaultExportShimSource(
  packageName: string,
  configDir: string,
): string {
  const entryPath = resolvePortalDependency(packageName, configDir).replace(/\\/g, '/');
  return [
    `import * as moduleNamespace from ${JSON.stringify(entryPath)};`,
    'const exported = moduleNamespace.default ?? moduleNamespace;',
    'export default exported;',
  ].join('\n');
}

function cloudrouterMarkdownCjsInteropShim(configDir: string): Plugin {
  const shimRoot = path.resolve(configDir, 'scripts/shims');

  return {
    name: 'cloudrouter-markdown-cjs-interop-shim',
    enforce: 'pre',
    resolveId(source, importer) {
      if (
        importer
        && importer.includes(`${path.sep}scripts${path.sep}shims${path.sep}`)
      ) {
        return null;
      }

      const shimPath = path.resolve(shimRoot, `${source}.ts`);
      if (!fs.existsSync(shimPath)) {
        return null;
      }

      return shimPath;
    },
  };
}

function cloudrouterPortalLocalPackageResolver(configDir: string): Plugin {
  return {
    name: 'cloudrouter-portal-local-package-resolver',
    enforce: 'pre',
    resolveId(source) {
      if (!shouldResolvePortalLocalPackage(source)) {
        return null;
      }

      return resolvePortalLocalPackageModule(source, configDir);
    },
  };
}

function cloudrouterPortalPnpmWorkspaceResolver(configDir: string): Plugin {
  return {
    name: 'cloudrouter-portal-pnpm-workspace-resolver',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!shouldResolvePortalPnpmWorkspaceSpecifier(source)) {
        return null;
      }

      return resolvePortalPackageModule(source, configDir, importer);
    },
  };
}

function cloudrouterPortalWorkspaceDependencyResolver(
  configDir: string,
  workspaceDependencyRoots: string[],
): Plugin {
  return {
    name: 'cloudrouter-portal-workspace-dependency-resolver',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!shouldResolvePortalWorkspaceDependency(source, importer, workspaceDependencyRoots)) {
        return null;
      }

      return resolvePortalPackageModule(source, configDir, importer);
    },
  };
}

function shouldResolvePortalLocalPackage(source: string): boolean {
  if (
    source.startsWith('.')
    || source.startsWith('/')
    || source.startsWith('\0')
    || source.includes('?')
  ) {
    return false;
  }

  const {packageName} = parsePackageSpecifier(source);
  if (LOCAL_PORTAL_SCOPED_PACKAGE_PREFIXES.some((prefix) => packageName.startsWith(prefix))) {
    return true;
  }
  return LOCAL_PORTAL_PACKAGE_PREFIXES.some((prefix) => packageName.startsWith(prefix));
}

function portalLocalPackageRoot(packageName: string, configDir: string): string | null {
  const scopedPrefix = LOCAL_PORTAL_SCOPED_PACKAGE_PREFIXES.find((prefix) => packageName.startsWith(prefix));
  if (scopedPrefix) {
    return path.join(
      configDir,
      'packages',
      `sdkwork-${packageName.slice('@sdkwork/'.length)}`,
    );
  }
  if (LOCAL_PORTAL_PACKAGE_PREFIXES.some((prefix) => packageName.startsWith(prefix))) {
    return path.join(configDir, 'packages', packageName);
  }
  return null;
}

function shouldResolvePortalWorkspaceDependency(
  source: string,
  importer: string | undefined,
  workspaceDependencyRoots: string[],
): boolean {
  if (
    source.startsWith('.')
    || source.startsWith('/')
    || source.startsWith('\0')
    || source.includes('?')
  ) {
    return false;
  }

  if (PORTAL_OPTIMIZED_BARE_DEPENDENCIES.has(source)) {
    return false;
  }

  if (isSdkworkWorkspaceDependency(source)) {
    return false;
  }

  if (isPortalOwnedBareDependency(source)) {
    return isPortalWorkspaceDependencyImporter(importer, workspaceDependencyRoots)
      && !isSdkworkWorkspaceDependency(source);
  }

  return isPortalWorkspaceDependencyImporter(importer, workspaceDependencyRoots);
}

function isPortalWorkspaceDependencyImporter(
  importer: string | undefined,
  workspaceDependencyRoots: string[],
): boolean {
  const normalizedImporter = normalizePath(importer?.split('?', 1)[0] ?? '');
  return Boolean(
    normalizedImporter
    && workspaceDependencyRoots.some((root) => normalizedImporter.startsWith(`${normalizePath(root)}/`)),
  );
}

function isSdkworkWorkspaceDependency(source: string): boolean {
  return (
    source.startsWith('@sdkwork/')
    || source.startsWith('sdkwork-')
    || (source.startsWith('cloudrouter-') && source.endsWith('-generated-typescript'))
  );
}

function resolvePortalLocalPackageModule(specifier: string, configDir: string): string | null {
  const cached = localPortalPackageModuleCache.get(specifier);
  if (cached !== undefined) {
    return cached;
  }

  const parsedSpecifier = parsePackageSpecifier(specifier);
  const packageRoot = portalLocalPackageRoot(parsedSpecifier.packageName, configDir);
  if (!packageRoot) {
    localPortalPackageModuleCache.set(specifier, null);
    return null;
  }
  const packageJsonPath = path.join(packageRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    localPortalPackageModuleCache.set(specifier, null);
    return null;
  }

  const packageJson = readPackageJsonManifest(packageJsonPath);
  const entry = parsedSpecifier.subpath
    ? readPackageImportEntry(packageJson.exports, `./${parsedSpecifier.subpath}`)
      ?? parsedSpecifier.subpath
    : readPackageImportEntry(packageJson.exports) ?? packageJson.module ?? packageJson.main ?? 'src/index.ts';
  const resolved = path.resolve(packageRoot, entry);
  localPortalPackageModuleCache.set(specifier, resolved);
  return resolved;
}

function isPortalOwnedBareDependency(source: string): boolean {
  return (
    source === 'qrcode'
    || source === 'i18next'
    || source.startsWith('i18next/')
    || source === 'react-i18next'
    || source.startsWith('react-i18next/')
    || source === 'html-parse-stringify'
    || source.startsWith('html-parse-stringify/')
    || source === 'void-elements'
    || source.startsWith('void-elements/')
    || source === 'react-hook-form'
    || source === 'react'
    || source.startsWith('react/')
    || source === 'react-dom'
    || source.startsWith('react-dom/')
    || source === 'react-router'
    || source.startsWith('react-router/')
    || source === 'react-router-dom'
    || source.startsWith('@sdkwork/')
    || source.startsWith('sdkwork-cloudrouter-')
  );
}

function normalizePath(value: string): string {
  return value.replaceAll('\\', '/').replace(/\/+$/, '');
}

function resolvePortalWorkspaceDependencyRoot(
  configDir: string,
  dependencyId: string,
): string {
  return path.resolve(configDir, '../../..', dependencyId);
}

function parsePackageSpecifier(specifier: string): { packageName: string; subpath: string } {
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

function resolvePortalMarkdownOptimizeEntries(
  configDir: string,
  sdkworkGenerationsRoot: string,
  sdkworkAgentsRoot: string,
): string[] {
  return [
    path.resolve(
      sdkworkGenerationsRoot,
      'apps/sdkwork-generations-pc/packages/sdkwork-generations-pc-playground/src/react.ts',
    ),
    path.resolve(configDir, 'packages/sdkwork-cloudrouter-pc-playground/src/pages/Playground.tsx'),
    path.resolve(
      sdkworkAgentsRoot,
      'apps/sdkwork-agents-pc/src/workbench/index.ts',
    ),
    path.resolve(
      sdkworkAgentsRoot,
      'apps/sdkwork-agents-pc/packages/sdkwork-agents-pc-commons/src/components/MarkdownRendererImpl.tsx',
    ),
  ];
}

export default defineConfig(({mode}) => {
  const configDir = import.meta.dirname;
  const workspaceRoot = path.resolve(configDir, '../..');
  const appbaseRoot = resolvePortalWorkspaceDependencyRoot(configDir, 'sdkwork-appbase');
  const iamRoot = resolvePortalWorkspaceDependencyRoot(configDir, 'sdkwork-iam');
  const sdkworkDriveRoot = resolvePortalWorkspaceDependencyRoot(configDir, 'sdkwork-drive');
  const sdkworkGenerationsRoot = resolvePortalWorkspaceDependencyRoot(configDir, 'sdkwork-generations');
  const sdkworkMemoryRoot = resolvePortalWorkspaceDependencyRoot(configDir, 'sdkwork-memory');
  const sdkworkAgentsRoot = resolvePortalWorkspaceDependencyRoot(configDir, 'sdkwork-agents');
  const sdkworkPromptsRoot = resolvePortalWorkspaceDependencyRoot(configDir, 'sdkwork-prompts');
  const sdkworkModelsRoot = resolvePortalWorkspaceDependencyRoot(configDir, 'sdkwork-models');
  const sdkworkImageRoot = resolvePortalWorkspaceDependencyRoot(configDir, 'sdkwork-image');
  const sdkworkAssetsRoot = resolvePortalWorkspaceDependencyRoot(configDir, 'sdkwork-assets');
  const sdkworkVideoRoot = resolvePortalWorkspaceDependencyRoot(configDir, 'sdkwork-video');
  const sdkworkMusicRoot = resolvePortalWorkspaceDependencyRoot(configDir, 'sdkwork-music');
  const sdkworkAudioRoot = resolvePortalWorkspaceDependencyRoot(configDir, 'sdkwork-audio');
  const sdkworkCoreRoot = resolvePortalWorkspaceDependencyRoot(configDir, 'sdkwork-core');
  const sdkworkUiRoot = resolvePortalWorkspaceDependencyRoot(configDir, 'sdkwork-ui');
  const sdkworkDocumentsRoot = resolvePortalWorkspaceDependencyRoot(configDir, 'sdkwork-documents');
  const sdkworkUtilsRoot = resolvePortalWorkspaceDependencyRoot(configDir, 'sdkwork-utils');
  const sdkworkAccountRoot = resolvePortalWorkspaceDependencyRoot(configDir, 'sdkwork-account');
  const sdkworkPromotionRoot = resolvePortalWorkspaceDependencyRoot(configDir, 'sdkwork-promotion');
  const sdkworkMembershipRoot = resolvePortalWorkspaceDependencyRoot(configDir, 'sdkwork-membership');
  const sdkworkPaymentRoot = resolvePortalWorkspaceDependencyRoot(configDir, 'sdkwork-payment');
  const sdkworkOrderRoot = resolvePortalWorkspaceDependencyRoot(configDir, 'sdkwork-order');
  const portalWorkspaceDependencyRoots = [
    appbaseRoot,
    iamRoot,
    sdkworkDriveRoot,
    sdkworkGenerationsRoot,
    sdkworkMemoryRoot,
    sdkworkAgentsRoot,
    sdkworkPromptsRoot,
    sdkworkModelsRoot,
    sdkworkImageRoot,
    sdkworkAssetsRoot,
    sdkworkVideoRoot,
    sdkworkMusicRoot,
    sdkworkAudioRoot,
    sdkworkCoreRoot,
    sdkworkUiRoot,
    sdkworkDocumentsRoot,
    sdkworkUtilsRoot,
    sdkworkAccountRoot,
    sdkworkPromotionRoot,
    sdkworkMembershipRoot,
    sdkworkPaymentRoot,
    sdkworkOrderRoot,
  ];
	const env = loadEnv(mode, configDir, '');
  const bootstrapAccessToken = process.env.SDKWORK_ACCESS_TOKEN
    ?? (mode === 'development'
      ? readBootstrapAccessTokenEnvFile(
          path.join(configDir, '.env.development.bootstrap.local'),
        )
      : undefined);
  return {
    cacheDir: path.resolve(configDir, 'node_modules/.vite-portal'),
    plugins: [
      createSdkworkCredentialEntryBootstrapVitePlugin({
        accessToken: bootstrapAccessToken,
        environment: mode,
      }),
      cloudrouterMarkdownCjsInteropShim(configDir),
      cloudrouterRuntimeEnvPlugin(() => ({ ...process.env, ...env }), configDir),
      react(),
      cloudrouterNodeEnvTransform(),
      cloudrouterImportMetaHotTransform(),
      cloudrouterTypeScriptTransform(),
      cloudrouterGenerationAssetConfigStubInlining(configDir),
      cloudrouterPortalLocalPackageResolver(configDir),
      cloudrouterPortalPnpmWorkspaceResolver(configDir),
      cloudrouterPortalWorkspaceDependencyResolver(configDir, portalWorkspaceDependencyRoots),
      tailwindcss(),
      cloudrouterStaticChunkCycleGuard(),
    ],
    esbuild: false,
    keepProcessEnv: false,
    environments: {
      client: {
        keepProcessEnv: false,
      },
    },
    resolve: {
      dedupe: [
        'react',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom',
        'react-dom/client',
        'react-router',
        'react-router/dom',
        'react-router-dom',
        'i18next',
        'i18next-browser-languagedetector',
        'react-i18next',
      ],
      alias: [
        { find: 'qrcode', replacement: resolvePortalDependency('qrcode/lib/browser.js', configDir) },
        { find: /^style-to-js$/, replacement: path.resolve(configDir, 'scripts/shims/style-to-js.ts') },
        { find: 'use-sync-external-store/shim/with-selector', replacement: path.resolve(configDir, 'src/auth/useSyncExternalStoreWithSelectorCompat.ts') },
        { find: 'use-sync-external-store/shim', replacement: path.resolve(configDir, 'src/auth/useSyncExternalStoreShimCompat.ts') },
        { find: '@', replacement: path.resolve(configDir, '.') },
      ],
    },
    server: {
      host: resolvePortalDevHost(process.env),
      port: resolvePortalDevPort(process.env),
      strictPort: true,
      fs: {
        allow: [
          configDir,
          workspaceRoot,
          appbaseRoot,
          iamRoot,
          sdkworkCoreRoot,
          sdkworkDriveRoot,
          sdkworkGenerationsRoot,
          sdkworkMemoryRoot,
        sdkworkAgentsRoot,
          sdkworkPromptsRoot,
	          sdkworkModelsRoot,
	          sdkworkImageRoot,
	          sdkworkAssetsRoot,
	          sdkworkVideoRoot,
	          sdkworkMusicRoot,
	          sdkworkAudioRoot,
	          sdkworkUiRoot,
          sdkworkDocumentsRoot,
          sdkworkUtilsRoot,
          sdkworkAccountRoot,
          sdkworkPromotionRoot,
          sdkworkMembershipRoot,
          sdkworkPaymentRoot,
          sdkworkOrderRoot,
        ],
      },
      proxy: resolvePortalDevProxy({ ...process.env, ...env }),
      // Disable HMR in automated product smoke runs when file watching is noisy.
      hmr: resolvePortalDevHmr({ ...process.env, ...env }),
    },
    build: {
      outDir: resolveBrowserDistOutDir(resolveViteEnvironment(mode, process.env)),
      target: 'esnext',
      minify: 'esbuild',
      cssMinify: true,
      commonjsOptions: {
        transformMixedEsModules: true,
        requireReturnsDefault: 'auto',
        defaultIsModuleExports: 'auto',
      },
      rollupOptions: {
        onwarn(warning, defaultHandler) {
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('use client')) {
            return;
          }
          defaultHandler(warning);
        },
        output: {
          manualChunks(id) {
            if (id.includes('commonjsHelpers')) {
              return 'vendor-react';
            }
            const normalizedId = id.replaceAll('\\', '/');
            const localRoutePackage = normalizedId.match(LOCAL_ROUTE_PACKAGE_PATTERN)?.[1];
            // Route packages are lazy-loaded by the router; leave their chunk
            // assignment to rollup's automatic splitting so the entry never
            // gains a static dependency on a lazy route chunk (statically
            // imported i18n/contribution modules inside route packages used to
            // pull route chunk top-level code ahead of startup configuration).
            if (localRoutePackage) {
              return undefined;
            }
            const normalizedAppbaseRoot = normalizePath(appbaseRoot);
            const normalizedIamRoot = normalizePath(iamRoot);
            const normalizedSdkworkCoreRoot = normalizePath(sdkworkCoreRoot);
            const normalizedSdkworkUiRoot = normalizePath(sdkworkUiRoot);
            const normalizedCloudRouterSdkRoot = normalizePath(path.resolve(configDir, '../../sdks'));
            if (
              normalizedId.startsWith(`${normalizedIamRoot}/apps/sdkwork-iam-pc/packages/`)
              || normalizedId.startsWith(`${normalizedIamRoot}/apps/sdkwork-iam-common/packages/`)
            ) {
              return 'vendor-auth';
            }
            if (
              normalizedId.startsWith(`${normalizedAppbaseRoot}/packages/pc-react/foundation/`)
              || normalizedId.startsWith(`${normalizedAppbaseRoot}/packages/common/foundation/`)
              || normalizedId.startsWith(`${normalizedAppbaseRoot}/packages/pc-react/notification/`)
              || normalizedId.startsWith(`${normalizedSdkworkCoreRoot}/`)
              || normalizedId.startsWith(`${normalizedSdkworkUiRoot}/`)
            ) {
              // vendor-ui and vendor-sdkwork-sdk have static imports in both
              // directions (UI components consume SDK clients; SDK packages
              // re-export UI types), which the static-chunk-cycle-guard
              // rejects as a chunk cycle. Keeping them in one chunk is the
              // rollup-recommended resolution for manual chunk cycles.
              return 'vendor-ui-sdk';
            }
            if (normalizedId.startsWith(`${normalizedAppbaseRoot}/packages/pc-react/content/`)) {
              return 'vendor-generation';
            }
            if (
              normalizedId.startsWith(`${normalizedAppbaseRoot}/packages/pc-react/device/`)
              || normalizedId.startsWith(`${normalizedAppbaseRoot}/packages/pc-react/host/`)
              || normalizedId.startsWith(`${normalizedAppbaseRoot}/packages/pc-react/integration/`)
              || normalizedId.startsWith(`${normalizedAppbaseRoot}/packages/common/integration/`)
            ) {
              return 'vendor-platform';
            }
            if (
              normalizedId.startsWith(`${normalizedCloudRouterSdkRoot}/`)
              || (
                normalizedId.includes('/sdks/')
                && /\/sdkwork-[^/]+-(?:app|backend|open)-sdk\//u.test(normalizedId)
              )
              || /\/node_modules\/@sdkwork\/[^/]+-(?:app|backend|open)-sdk\//u.test(normalizedId)
              || /\/node_modules\/sdkwork-[^/]+-(?:app|backend|open)-sdk-generated-typescript\//u.test(normalizedId)
              || normalizedId.includes('/sdkwork-sdk-commons/')
            ) {
              return 'vendor-ui-sdk';
            }
            if (
              normalizedId.includes('/node_modules/framer-motion/')
              || normalizedId.includes('/node_modules/motion/')
              || normalizedId.includes('/node_modules/motion-dom/')
              || normalizedId.includes('/node_modules/motion-utils/')
            ) {
              return 'vendor-motion';
            }
            if (
              normalizedId.includes('/node_modules/recharts/')
              || normalizedId.includes('/node_modules/victory-vendor/')
              || normalizedId.includes('/node_modules/d3-')
              || normalizedId.includes('/node_modules/internmap/')
            ) {
              return 'vendor-charts';
            }
            if (
              normalizedId.includes('/node_modules/i18next/')
              || normalizedId.includes('/node_modules/i18next-browser-languagedetector/')
              || normalizedId.includes('/node_modules/react-i18next/')
              || normalizedId.includes('/node_modules/html-parse-stringify/')
              || normalizedId.includes('/node_modules/void-elements/')
            ) {
              return 'vendor-i18n';
            }
            if (normalizedId.includes('/node_modules/react-hook-form/')) {
              return 'vendor-form';
            }
            if (normalizedId.includes('/node_modules/jspdf/')) {
              return 'vendor-pdf';
            }
            if (
              normalizedId.includes('/node_modules/@monaco-editor/')
              || normalizedId.includes('/node_modules/monaco-editor/')
              || normalizedId.includes('/node_modules/@uiw/react-md-editor/')
              || normalizedId.includes('/node_modules/html-to-image/')
              || normalizedId.includes('/node_modules/html2canvas/')
              || normalizedId.includes('/node_modules/rehype-sanitize/')
              || normalizedId.includes('/node_modules/hast-util-sanitize/')
              || normalizedId.includes('/node_modules/react-markdown/')
              || normalizedId.includes('/node_modules/remark-gfm/')
            ) {
              return 'vendor-rich-tools';
            }
            if (!id.includes('node_modules')) {
              return undefined;
            }
            if (
              id.includes('node_modules/react/')
              || id.includes('node_modules/react-dom/')
              || id.includes('node_modules/scheduler/')
              || id.includes('node_modules/react-is/')
              || id.includes('node_modules/use-sync-external-store/')
            ) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/react-router') || id.includes('node_modules/@remix-run/')) {
              return 'vendor-router';
            }
            if (id.includes('node_modules/lucide-react/')) {
              return 'vendor-icons';
            }
            return undefined;
          },
        },
      },
    },
    optimizeDeps: {
      exclude: PORTAL_SOURCE_OPTIMIZE_EXCLUDE,
      entries: resolvePortalMarkdownOptimizeEntries(configDir, sdkworkGenerationsRoot, sdkworkAgentsRoot),
      include: [
        'react',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom',
        'react-dom/client',
        'react-router',
        'react-router/dom',
        'react-router-dom',
        'cookie',
        'set-cookie-parser',
        'motion/react',
        'react-i18next',
        'html-parse-stringify',
        'void-elements',
        'framer-motion',
        'i18next',
        'recharts',
        'lucide-react',
        ...PORTAL_MARKDOWN_OPTIMIZE_DEPS,
      ],
      needsInterop: [
        'react',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom',
        'cookie',
        'set-cookie-parser',
        ...PORTAL_MARKDOWN_NEEDS_INTEROP,
      ],
      esbuildOptions: {
        target: 'esnext',
        jsx: 'automatic',
        jsxImportSource: 'react',
        plugins: [
          createPortalOptimizeDepsEsbuildPlugin(
            configDir,
            portalWorkspaceDependencyRoots,
            PORTAL_OPTIMIZED_BARE_DEPENDENCIES,
          ),
        ],
      },
    },
  };
});

function resolvePortalDevHost(env: NodeJS.ProcessEnv = process.env): string {
  const rawHost = env.HOST?.trim();
  if (rawHost === undefined || rawHost === '') {
    return '127.0.0.1';
  }
  if (
    rawHost.includes('/')
    || rawHost.includes('\\')
    || rawHost.includes('?')
    || rawHost.includes('#')
    || rawHost.includes('\r')
    || rawHost.includes('\n')
  ) {
    throw new Error(`HOST must be a hostname or IP address, received: ${rawHost}`);
  }
  return rawHost;
}

function resolvePortalDevPort(env: NodeJS.ProcessEnv = process.env): number {
  const rawPort = env.PORT?.trim();
  if (rawPort === undefined || rawPort === '') {
    return DEFAULT_PORTAL_DEV_PORT;
  }

  const port = Number.parseInt(rawPort, 10);
  if (!Number.isInteger(port) || String(port) !== rawPort || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535, received: ${rawPort}`);
  }
  return port;
}

function resolvePortalDevHmr(
  env: NodeJS.ProcessEnv = process.env,
): boolean | { clientPort: number; host: string } {
  if (env.CLOUDROUTER_HMR_DISABLED === 'true') {
    return false;
  }

  // When the portal is served through the Rust edge server (for example :3900),
  // the browser must connect HMR WebSocket traffic to the Vite dev port directly.
  return {
    clientPort: resolvePortalDevPort(env),
    host: resolvePortalDevHost(env),
  };
}

function resolvePortalDevProxy(env: NodeJS.ProcessEnv = process.env): Record<string, string | ProxyOptions> {
  const gatewayTarget = resolvePortalDevProxyTarget(
    env[BROWSER_DEV_PROXY_ENV_KEYS.openApi],
    BROWSER_DEV_PROXY_ENV_KEYS.openApi,
  );
  const backendApiTarget = resolvePortalDevProxyTarget(
    env[BROWSER_DEV_PROXY_ENV_KEYS.backendApi],
    BROWSER_DEV_PROXY_ENV_KEYS.backendApi,
  );
  const appApiTarget = resolvePortalDevProxyTarget(
    env[BROWSER_DEV_PROXY_ENV_KEYS.appApi],
    BROWSER_DEV_PROXY_ENV_KEYS.appApi,
  );

  return {
    '/openapi/schema-tabs.json': portalDevProxyOptions(gatewayTarget),
    '/openapi.json': portalDevProxyOptions(gatewayTarget),
    '/payments/v3/openapi.json': portalDevProxyOptions(gatewayTarget),
    '/paas/v3/openapi.json': portalDevProxyOptions(gatewayTarget),
    '/cloud/v3/openapi.json': portalDevProxyOptions(gatewayTarget),
    '/v1': portalDevProxyOptions(gatewayTarget),
    '/feeds/v3/api': portalDevProxyOptions(gatewayTarget),
    '/backend/v3/api': portalDevProxyOptions(backendApiTarget),
    '/app/v3/api': portalDevProxyOptions(appApiTarget),
  };
}

function portalDevProxyOptions(target: string): ProxyOptions {
  return {
    target,
    changeOrigin: true,
    secure: true,
    ws: false,
  };
}

function resolvePortalDevProxyTarget(
  value: string | undefined,
  name: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const applicationPublicHttpUrl = readConfiguredPortalPublicEnv(
    env.VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL
    ?? env.SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_HTTP_URL,
  );
  const applicationBackendHttpUrl = readConfiguredPortalPublicEnv(
    env.VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_BACKEND_HTTP_URL
    ?? env.SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_BACKEND_HTTP_URL,
  );
  const applicationOpenHttpUrl = readConfiguredPortalPublicEnv(
    env.VITE_SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_OPEN_HTTP_URL
    ?? env.SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_OPEN_HTTP_URL,
  );
  const platformHttpUrl = readConfiguredPortalPublicEnv(
    env.VITE_SDKWORK_CLOUDROUTER_ROUTER_PLATFORM_API_GATEWAY_HTTP_URL
    ?? env.SDKWORK_CLOUDROUTER_ROUTER_PLATFORM_API_GATEWAY_HTTP_URL,
  );
  const fallbackByName: Record<string, string | undefined> = {
    [BROWSER_DEV_PROXY_ENV_KEYS.openApi]: applicationOpenHttpUrl ?? applicationPublicHttpUrl ?? platformHttpUrl ?? DEFAULT_BROWSER_DEV_PROXY_GATEWAY_TARGET,
    [BROWSER_DEV_PROXY_ENV_KEYS.backendApi]: applicationBackendHttpUrl ?? applicationPublicHttpUrl ?? platformHttpUrl ?? DEFAULT_BROWSER_DEV_PROXY_GATEWAY_TARGET,
    [BROWSER_DEV_PROXY_ENV_KEYS.appApi]: applicationPublicHttpUrl ?? platformHttpUrl ?? DEFAULT_BROWSER_DEV_PROXY_GATEWAY_TARGET,
  };
  const target = value?.trim() || fallbackByName[name];
  if (!target) {
    throw new Error(`${name} is not configured`);
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    throw new Error(`${name} must be an HTTP/HTTPS origin`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${name} must be an HTTP/HTTPS origin`);
  }
  if ((parsed.pathname && parsed.pathname !== '/') || parsed.search || parsed.hash) {
    throw new Error(`${name} must be an origin without path, query, or hash`);
  }
  return parsed.origin;
}

function resolvePortalRuntimeEnv(env: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const runtimeEnv: Record<string, string> = {};
  const sdkBaseUrl = resolvePortalPublicUrl(
    env.PORTAL_PUBLIC_SDK_BASE_URL,
    'PORTAL_PUBLIC_SDK_BASE_URL',
  );
  const publicApiBaseUrlOverride = readConfiguredPortalPublicEnv(env.PORTAL_PUBLIC_API_BASE_URL);
  const publicApiBaseUrl = resolvePortalPublicUrl(
    publicApiBaseUrlOverride ?? appendPortalPublicSdkBaseUrl(sdkBaseUrl, OPEN_API_PREFIX),
    'PORTAL_PUBLIC_API_BASE_URL',
  );
  if (publicApiBaseUrl !== undefined) {
    runtimeEnv.VITE_API_BASE_URL = publicApiBaseUrl;
  }

  const openApiBaseUrl = resolvePortalPublicUrl(
    readConfiguredPortalPublicEnv(env.PORTAL_PUBLIC_OPEN_API_BASE_URL)
    ?? publicApiBaseUrlOverride
    ?? appendPortalPublicSdkBaseUrl(sdkBaseUrl, OPEN_API_PREFIX),
    'PORTAL_PUBLIC_OPEN_API_BASE_URL',
  );
  if (openApiBaseUrl !== undefined) {
    runtimeEnv.VITE_CLOUDROUTER_OPEN_API_BASE_URL = openApiBaseUrl;
  }

  for (const [sourceName, targetName] of PORTAL_RUNTIME_URL_ENV) {
    const value = resolvePortalPublicUrl(
      readConfiguredPortalPublicEnv(env[sourceName])
      ?? resolvePortalRuntimeUrlFromSdkBaseUrl(sourceName, sdkBaseUrl),
      sourceName,
    );
    if (value !== undefined) {
      runtimeEnv[targetName] = value;
    }
  }
  if (
    runtimeEnv.VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL === undefined
    && runtimeEnv.VITE_CLOUDROUTER_BACKEND_API_BASE_URL !== undefined
  ) {
    runtimeEnv.VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL =
      runtimeEnv.VITE_CLOUDROUTER_BACKEND_API_BASE_URL;
  }

  for (const [sourceName, targetName] of PORTAL_RUNTIME_BOOLEAN_ENV) {
    const value = resolveBooleanEnv(env[sourceName], sourceName);
    if (value !== undefined) {
      runtimeEnv[targetName] = String(value);
    }
  }

  for (const key of PORTAL_RUNTIME_VITE_PASSTHROUGH_ENV) {
    const value = readConfiguredPortalPublicEnv(env[key]);
    if (value !== undefined) {
      runtimeEnv[key] = value;
    }
  }

  mergeDirectBrowserViteEnv(runtimeEnv, env);
  return alignStandaloneSameOriginBrowserSdkRuntimeEnv(runtimeEnv);
}

function mergeDirectBrowserViteEnv(
  runtimeEnv: Record<string, string>,
  env: NodeJS.ProcessEnv,
): void {
  for (const [key, rawValue] of Object.entries(env)) {
    if (!key.startsWith('VITE_')) {
      continue;
    }
    const value = readConfiguredPortalPublicEnv(rawValue);
    // Browser development profiles publish authoritative VITE_* values in
    // .env.development. They must override release-style PORTAL_PUBLIC_*
    // derivations (for example http://127.0.0.1:3902/app/v3/api) so SDK
    // clients stay same-origin and flow through the Vite dev proxy.
    if (value !== undefined) {
      runtimeEnv[key] = value;
    }
  }
}

function readConfiguredPortalPublicEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function resolvePortalRuntimeUrlFromSdkBaseUrl(
  sourceName: (typeof PORTAL_RUNTIME_URL_ENV)[number][0],
  sdkBaseUrl: string | undefined,
): string | undefined {
  switch (sourceName) {
    case 'PORTAL_PUBLIC_APP_API_BASE_URL':
    case 'PORTAL_PUBLIC_COMMERCE_APP_API_BASE_URL':
      return appendPortalPublicSdkBaseUrl(sdkBaseUrl, APP_API_PREFIX);
    case 'PORTAL_PUBLIC_BACKEND_API_BASE_URL':
    case 'PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL':
    case 'PORTAL_PUBLIC_COMMERCE_BACKEND_API_BASE_URL':
      return appendPortalPublicSdkBaseUrl(sdkBaseUrl, BACKEND_API_PREFIX);
    default:
      return undefined;
  }
}

function appendPortalPublicSdkBaseUrl(
  sdkBaseUrl: string | undefined,
  apiPrefix: string,
): string | undefined {
  if (!sdkBaseUrl) {
    return undefined;
  }
  const normalizedPrefix = apiPrefix.startsWith('/') ? apiPrefix : `/${apiPrefix}`;
  const base = sdkBaseUrl.replace(/\/+$/u, '');
  return base ? `${base}${normalizedPrefix}` : normalizedPrefix;
}

function buildPortalRuntimeEnvScript(runtimeEnv = resolvePortalRuntimeEnv()): string {
  const browserSafeEnv = Object.fromEntries(
    Object.entries(runtimeEnv).filter(([key]) => key.startsWith('VITE_')),
  );
  const serializedEnv = JSON.stringify(browserSafeEnv)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  return `window.__CLOUDROUTER_ENV__ = Object.freeze(${serializedEnv});\n`;
}

function injectPortalRuntimeEnvScript(html: string): string {
  const scriptTag = `<script type="module" src="${RUNTIME_ENV_SCRIPT_PATH}"></script>`;
  if (html.includes(scriptTag)) {
    return html;
  }
  if (!HTML_MODULE_SCRIPT_PATTERN.test(html)) {
    throw new Error('Portal index.html must contain a module script');
  }
  return html.replace(HTML_MODULE_SCRIPT_PATTERN, `${scriptTag}\n    $&`);
}

function resolvePortalPublicUrl(value: string | undefined, name: string): string | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }

  const trimmed = value.trim();
  if (
    trimmed.includes('\r')
    || trimmed.includes('\n')
    || trimmed.includes('\\')
    || trimmed.includes('"')
    || trimmed.includes("'")
  ) {
    throw new Error(`${name} must be an HTTP/HTTPS URL or root-relative path`);
  }

  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//') || trimmed.includes('?') || trimmed.includes('#')) {
      throw new Error(`${name} must be an HTTP/HTTPS URL or root-relative path`);
    }
    return trimmed;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`${name} must be an HTTP/HTTPS URL or root-relative path`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${name} must be an HTTP/HTTPS URL or root-relative path`);
  }
  if (parsed.search || parsed.hash) {
    throw new Error(`${name} must be an HTTP/HTTPS URL or root-relative path`);
  }
  return trimmed.replace(/\/+$/, '');
}

function resolveBooleanEnv(value: string | undefined, name: string): boolean | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  throw new Error(`Invalid ${name} value`);
}

export {
  buildCloudrouterMarkdownCjsDefaultExportShimSource,
  buildPortalRuntimeEnvScript,
  injectPortalRuntimeEnvScript,
  PORTAL_RUNTIME_VITE_PASSTHROUGH_ENV,
  resolvePortalRuntimeEnv,
  resolvePortalWorkspaceDependencyRoot,
};
