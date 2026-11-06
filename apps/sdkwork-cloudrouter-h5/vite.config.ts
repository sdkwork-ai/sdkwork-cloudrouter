import { resolveViteEnvironment, resolveLucideReactEntry } from '../../../sdkwork-specs/tools/vite-runtime-profile.mjs';
import { createBrowserRuntimeEnvVitePlugin } from '../../../sdkwork-specs/tools/browser-runtime-env-vite.mjs';
import { buildBrowserDevRuntimeEnvDocument, resolveCredentialEntryLifecycleFromMode } from '../../scripts/lib/cloud-router-browser-env-contract.mjs';
import { WORKSPACE_SOURCE_RESOLVE_EXTENSIONS } from '../../scripts/lib/workspace-source-resolution.mjs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { createSdkworkCredentialEntryBootstrapVitePlugin, createSdkworkPublicApplicationAccessTokenVitePlugin } from '../../../sdkwork-iam/apps/sdkwork-iam-common/packages/sdkwork-iam-credential-entry/src/vite.ts';
import { loadEnvFile } from '../../scripts/lib/merge-env-file.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { resolveBrowserDistOutDir } from '../../../sdkwork-specs/tools/browser-dist-layout.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Adaptive Web renderer cache label (APP_RUNTIME_TOPOLOGY_SPEC.md §8.2).
 *
 * The framework-owned adaptive ingress attributes every `/node_modules/.vite/`
 * dependency URL to a renderer by the cache label segment, which MUST equal the
 * renderer application-root basename (`sdkwork-cloudrouter-h5`). An unlabeled
 * cache (Vite's default `node_modules/.vite`) is rejected with 410 "cache URL is
 * stale" before it reaches this server, which leaves the H5 page blank behind
 * `pnpm dev` / `pnpm dev:cloud`.
 */
const ADAPTIVE_RENDERER_CACHE_LABEL = path.basename(__dirname);

const RUNTIME_ENV_DOCUMENT_PATH = '/runtime-env.json';

/**
 * Serve-only runtime document (ENVIRONMENT_SPEC.md §5.1.0.1, shared contract in
 * `scripts/lib/cloud-router-browser-env-contract.mjs`).
 *
 * `public/runtime-env.json` is the deploy-time document materialized by the
 * canonical browser build runner immediately before `vite build`; a leftover
 * of a previous cloud-profile build would otherwise be served verbatim by the
 * dev server and point the browser at the deploy-time cloud edge
 * (`https://api-<suffix>.<base-domain>`), breaking the same-origin dev
 * contract. In dev the page origin IS the adaptive web ingress, so the
 * canonical API paths are always same-origin relative paths and the ingress
 * fans them out server-side — identically for the standalone and cloud
 * profiles.
 *
 * The middleware wiring is the shared Vite integration factory
 * (APP_RUNTIME_ENV_SPEC.md §6, sdkwork-specs/tools/browser-runtime-env-vite.mjs);
 * this app only authors its document VALUES.
 */
function cloudrouterRuntimeEnvDocumentPlugin(mode: string): Plugin {
  return createBrowserRuntimeEnvVitePlugin({
    name: 'cloudrouter-runtime-env-document',
    path: RUNTIME_ENV_DOCUMENT_PATH,
    resolveServeDocument: () => JSON.stringify(buildBrowserDevRuntimeEnvDocument({ profileId: mode })),
  });
}

/**
 * Read the committed public application access token of one Vite mode profile.
 *
 * The per-scope `.env.<profile-id>` file is the authority
 * (`APP_ACCESS_TOKEN_SPEC.md` section 2) and packaging must bake that exact
 * value (`IAM_APPLICATION_BOOTSTRAP_SPEC.md` section 5.4.5); reading it directly
 * keeps a private operator credential in `process.env` from winning.
 */
function readProfilePublicApplicationAccessToken(
  appDir: string,
  mode: string,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const profileToken = loadEnvFile(path.join(appDir, `.env.${mode}`)).SDKWORK_ACCESS_TOKEN?.trim();
  if (profileToken) {
    return profileToken;
  }
  const processToken = env.SDKWORK_ACCESS_TOKEN?.trim();
  return processToken || undefined;
}

/**
 * Credential-entry handoff for one Vite mode.
 *
 * The dev server keeps the private bootstrap handoff for `development`; every
 * other combination (including builds and `pnpm prod`) gets the committed public
 * application token as a same-origin external script, which
 * `IAM_CREDENTIAL_ENTRY_SPEC.md` section 4 requires and the production CSP
 * (`script-src 'self'`) allows. The canonical plugin fails closed when the token
 * is missing or not public, instead of surfacing
 * `access-token-only request requires Access-Token before request dispatch`.
 */
function createCredentialEntryPlugins(
  appDir: string,
  mode: string,
  environment: string,
  command: 'build' | 'serve',
): Plugin[] {
  const lifecycle = resolveCredentialEntryLifecycleFromMode(mode, environment);
  if (command === 'serve' && lifecycle === 'development') {
    const developmentPlugin = createSdkworkCredentialEntryBootstrapVitePlugin({
      accessToken: process.env.SDKWORK_ACCESS_TOKEN,
      environment: lifecycle,
    });
    return developmentPlugin ? [developmentPlugin] : [];
  }
  return [
    createSdkworkPublicApplicationAccessTokenVitePlugin({
      accessToken: readProfilePublicApplicationAccessToken(appDir, mode),
      environment: lifecycle,
      profileId: mode,
    }),
  ];
}

// Canonical Adaptive Web H5 production layout:
//   dist/<deploymentProfile>/<envAlias> — e.g. dist/cloud/dev, dist/cloud/prod
// (browser-dist-layout.mjs is the authority; FRONTEND_CODE_SPEC.md §7.)
export default defineConfig(({ mode, command }) => ({
  // Renderer-owned, label-carrying dependency cache (see
  // ADAPTIVE_RENDERER_CACHE_LABEL): the adaptive ingress routes
  // `/node_modules/.vite/<label>/...` back to this renderer.
  cacheDir: path.resolve(__dirname, 'node_modules/.vite', ADAPTIVE_RENDERER_CACHE_LABEL),
  // Authored TypeScript must win over gitignored `tsc` siblings inside the
  // source-linked workspace packages (see workspace-source-resolution.mjs):
  // a stale `.js` shadowing a fresh `.ts` produced the runtime
  // "Cannot read properties of undefined (reading 'demandClaims')" crash.
  resolve: {
    extensions: [...WORKSPACE_SOURCE_RESOLVE_EXTENSIONS],
  },
  plugins: [
    // The app-auth surface consumes IAM SDK routes, so the credential-entry
    // token must reach the module graph through the canonical credential-entry
    // plugins (IAM_CREDENTIAL_ENTRY_SPEC.md sections 4 and 6) — never through a
    // public VITE_* key or a Vite define. Development uses the private bootstrap
    // token; every other lifecycle carries the committed public application
    // token so a built/deployed renderer can start a login.
    ...createCredentialEntryPlugins(__dirname, mode, resolveViteEnvironment(mode, process.env), command),
    react(),
    tailwindcss(),
    cloudrouterRuntimeEnvDocumentPlugin(mode),
  ],
  build: {
    outDir: resolveBrowserDistOutDir(resolveViteEnvironment(mode), process.env.SDKWORK_DEPLOYMENT_PROFILE),
    emptyOutDir: true,
  },
}));
