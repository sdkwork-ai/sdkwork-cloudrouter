import { resolveViteEnvironment, resolveLucideReactEntry } from '../../../sdkwork-specs/tools/vite-runtime-profile.mjs';
import { createBrowserRuntimeEnvVitePlugin } from '../../../sdkwork-specs/tools/browser-runtime-env-vite.mjs';
import { buildBrowserDevRuntimeEnvDocument } from '../../scripts/lib/cloud-router-browser-env-contract.mjs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
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

// Canonical Adaptive Web H5 production layout:
//   dist/<deploymentProfile>/<envAlias> — e.g. dist/cloud/dev, dist/cloud/prod
// (browser-dist-layout.mjs is the authority; FRONTEND_CODE_SPEC.md §7.)
export default defineConfig(({ mode }) => ({
  // Renderer-owned, label-carrying dependency cache (see
  // ADAPTIVE_RENDERER_CACHE_LABEL): the adaptive ingress routes
  // `/node_modules/.vite/<label>/...` back to this renderer.
  cacheDir: path.resolve(__dirname, 'node_modules/.vite', ADAPTIVE_RENDERER_CACHE_LABEL),
  plugins: [react(), tailwindcss(), cloudrouterRuntimeEnvDocumentPlugin(mode)],
  build: {
    outDir: resolveBrowserDistOutDir(resolveViteEnvironment(mode), process.env.SDKWORK_DEPLOYMENT_PROFILE),
    emptyOutDir: true,
  },
}));
