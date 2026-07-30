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
const BROWSER_DEV_PROXY_ENV_KEYS = {
  openApi: 'SDKWORK_CLAW_BROWSER_DEV_PROXY_OPEN_API_ORIGIN',
  backendApi: 'SDKWORK_CLAW_BROWSER_DEV_PROXY_BACKEND_API_ORIGIN',
  appApi: 'SDKWORK_CLAW_BROWSER_DEV_PROXY_APP_API_ORIGIN',
} as const;
const OPEN_API_PREFIX = '/v1';
const APP_API_PREFIX = '/app/v3/api';
const BACKEND_API_PREFIX = '/backend/v3/api';
const require = createRequire(import.meta.url);
const localPortalPackageModuleCache = new Map<string, string | null>();
const LOCAL_PORTAL_PACKAGE_PREFIXES = [
  'sdkwork-clawrouter-pc-',
  'sdkwork-clawrouter-',
  'sdkwork-clawroutes-',
];
const LOCAL_PORTAL_SCOPED_PACKAGE_PREFIXES = [
  '@sdkwork/clawrouter-pc-',
  '@sdkwork/clawroutes-',
];
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
]);

const PORTAL_MARKDOWN_OPTIMIZE_DEPS = [
  'hast-util-to-jsx-runtime',
  'hast-util-sanitize',
  'style-to-js',
] as const;

const PORTAL_MARKDOWN_NEEDS_INTEROP = [
  'style-to-js',
] as const;

const PORTAL_SOURCE_OPTIMIZE_EXCLUDE = [
  '@sdkwork/clawrouter-app-sdk',
  '@sdkwork/clawrouter-backend-sdk',
  '@sdkwork/clawrouter-open-sdk',
  '@sdkwork/documents-app-sdk',
  '@sdkwork/documents-pc-api-reference',
  '@sdkwork/documents-pc-sdk-reference',
  '@sdkwork/iam-app-sdk',
  '@sdkwork/iam-backend-sdk',
  '@sdkwork/drive-app-sdk',
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
  '@sdkwork/ui-pc-react',
  '@sdkwork/clawrouter-app-sdk',
  '@sdkwork/clawrouter-backend-sdk',
  '@sdkwork/generations-app-sdk',
  '@sdkwork/generations-pc-asset-config',
  '@sdkwork/drive-backend-sdk',
];

const PORTAL_RUNTIME_URL_ENV = [
  ['PORTAL_PUBLIC_APP_API_BASE_URL', 'VITE_CLAWROUTER_APP_API_BASE_URL'],
  ['PORTAL_PUBLIC_BACKEND_API_BASE_URL', 'VITE_CLAWROUTER_BACKEND_API_BASE_URL'],
  ['PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL', 'VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL'],
  ['PORTAL_PUBLIC_COMMERCE_APP_API_BASE_URL', 'VITE_SDKWORK_COMMERCE_APP_API_BASE_URL'],
  ['PORTAL_PUBLIC_COMMERCE_BACKEND_API_BASE_URL', 'VITE_SDKWORK_COMMERCE_BACKEND_API_BASE_URL'],
  ['PORTAL_PUBLIC_DOWNLOAD_BASE_URL', 'VITE_CLAWROUTER_DOWNLOAD_BASE_URL'],
] as const;

const PORTAL_RUNTIME_BOOLEAN_ENV = [
  ['PORTAL_PUBLIC_TOOL_API_ENABLED', 'VITE_TOOL_API_ENABLED'],
] as const;

function clawrouterNodeEnvTransform() {
  return {
    name: 'clawrouter-node-env-transform',
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

function clawrouterStaticChunkCycleGuard(): Plugin {
  return {
    name: 'clawrouter-static-chunk-cycle-guard',
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

function clawrouterImportMetaHotTransform() {
  return {
    name: 'clawrouter-import-meta-hot-transform',
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

function clawrouterRuntimeEnvPlugin(): Plugin {
  return {
    name: 'clawrouter-runtime-env',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?', 1)[0] !== RUNTIME_ENV_SCRIPT_PATH) {
          next();
          return;
        }

        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        response.end(buildPortalRuntimeEnvScript());
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

function clawrouterTypeScriptTransform() {
  return {
    name: 'clawrouter-typescript-transform',
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
        this.error(`TypeScript transform failed for ${filePath}: ${message}`);
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

function clawrouterGenerationAssetConfigStubInlining(configDir: string): Plugin {
  return {
    name: 'clawrouter-generation-asset-config-stub-inlining',
    enforce: 'pre',
    load(id) {
      const filePath = id.split('?', 1)[0];
      const replacement = readGenerationAssetConfigStubReplacement(configDir, filePath, filePath);
      return replacement ?? null;
    },
  };
}

function clawrouterPortalLocalPackageResolver(configDir: string): Plugin {
  return {
    name: 'clawrouter-portal-local-package-resolver',
    enforce: 'pre',
    resolveId(source) {
      if (!shouldResolvePortalLocalPackage(source)) {
        return null;
      }

      return resolvePortalLocalPackageModule(source, configDir);
    },
  };
}

function clawrouterPortalPnpmWorkspaceResolver(configDir: string): Plugin {
  return {
    name: 'clawrouter-portal-pnpm-workspace-resolver',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!shouldResolvePortalPnpmWorkspaceSpecifier(source)) {
        return null;
      }

      return resolvePortalPackageModule(source, configDir, importer);
    },
  };
}

function clawrouterPortalWorkspaceDependencyResolver(
  configDir: string,
  workspaceDependencyRoots: string[],
): Plugin {
  return {
    name: 'clawrouter-portal-workspace-dependency-resolver',
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
    || (source.startsWith('clawrouter-') && source.endsWith('-generated-typescript'))
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
    || source.startsWith('sdkwork-clawrouter-')
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
): string[] {
  return [
    path.resolve(
      sdkworkGenerationsRoot,
      'apps/sdkwork-generations-pc/packages/sdkwork-generations-pc-playground/src/react.ts',
    ),
    path.resolve(configDir, 'packages/sdkwork-clawrouter-pc-playground/src/pages/Playground.tsx'),
    path.resolve(
      configDir,
      'packages/sdkwork-clawrouter-pc-playground/src/components/chat/generationsMarkdown.ts',
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
    plugins: [
      createSdkworkCredentialEntryBootstrapVitePlugin({
        accessToken: bootstrapAccessToken,
        environment: mode,
      }),
      clawrouterRuntimeEnvPlugin(),
      react(),
      clawrouterNodeEnvTransform(),
      clawrouterImportMetaHotTransform(),
      clawrouterTypeScriptTransform(),
      clawrouterGenerationAssetConfigStubInlining(configDir),
      clawrouterPortalLocalPackageResolver(configDir),
      clawrouterPortalPnpmWorkspaceResolver(configDir),
      clawrouterPortalWorkspaceDependencyResolver(configDir, portalWorkspaceDependencyRoots),
      tailwindcss(),
      clawrouterStaticChunkCycleGuard(),
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
            const normalizedAppbaseRoot = normalizePath(appbaseRoot);
            const normalizedIamRoot = normalizePath(iamRoot);
            const normalizedSdkworkCoreRoot = normalizePath(sdkworkCoreRoot);
            const normalizedSdkworkUiRoot = normalizePath(sdkworkUiRoot);
            const normalizedClawRouterSdkRoot = normalizePath(path.resolve(configDir, '../../sdks'));
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
              return 'vendor-ui';
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
              normalizedId.startsWith(`${normalizedClawRouterSdkRoot}/`)
              || (
                normalizedId.includes('/sdks/')
                && /\/sdkwork-[^/]+-(?:app|backend|open)-sdk\//u.test(normalizedId)
              )
              || /\/node_modules\/@sdkwork\/[^/]+-(?:app|backend|open)-sdk\//u.test(normalizedId)
              || /\/node_modules\/sdkwork-[^/]+-(?:app|backend|open)-sdk-generated-typescript\//u.test(normalizedId)
              || normalizedId.includes('/sdkwork-sdk-commons/')
            ) {
              return 'vendor-sdkwork-sdk';
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
      entries: resolvePortalMarkdownOptimizeEntries(configDir, sdkworkGenerationsRoot),
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
  if (env.CLAWROUTER_HMR_DISABLED === 'true') {
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
    env.VITE_SDKWORK_CLAW_ROUTER_APPLICATION_PUBLIC_HTTP_URL
    ?? env.SDKWORK_CLAW_ROUTER_APPLICATION_PUBLIC_HTTP_URL,
  );
  const applicationBackendHttpUrl = readConfiguredPortalPublicEnv(
    env.VITE_SDKWORK_CLAW_ROUTER_APPLICATION_BACKEND_HTTP_URL
    ?? env.SDKWORK_CLAW_ROUTER_APPLICATION_BACKEND_HTTP_URL,
  );
  const applicationOpenHttpUrl = readConfiguredPortalPublicEnv(
    env.VITE_SDKWORK_CLAW_ROUTER_APPLICATION_OPEN_HTTP_URL
    ?? env.SDKWORK_CLAW_ROUTER_APPLICATION_OPEN_HTTP_URL,
  );
  const platformHttpUrl = readConfiguredPortalPublicEnv(
    env.VITE_SDKWORK_CLAW_ROUTER_PLATFORM_API_GATEWAY_HTTP_URL
    ?? env.SDKWORK_CLAW_ROUTER_PLATFORM_API_GATEWAY_HTTP_URL,
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
    runtimeEnv.VITE_CLAWROUTER_OPEN_API_BASE_URL = openApiBaseUrl;
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
    && runtimeEnv.VITE_CLAWROUTER_BACKEND_API_BASE_URL !== undefined
  ) {
    runtimeEnv.VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL =
      runtimeEnv.VITE_CLAWROUTER_BACKEND_API_BASE_URL;
  }

  for (const [sourceName, targetName] of PORTAL_RUNTIME_BOOLEAN_ENV) {
    const value = resolveBooleanEnv(env[sourceName], sourceName);
    if (value !== undefined) {
      runtimeEnv[targetName] = String(value);
    }
  }

  return runtimeEnv;
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

  return `window.__CLAWROUTER_ENV__ = Object.freeze(${serializedEnv});\n`;
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
  buildPortalRuntimeEnvScript,
  injectPortalRuntimeEnvScript,
  resolvePortalWorkspaceDependencyRoot,
  resolvePortalRuntimeEnv,
};
