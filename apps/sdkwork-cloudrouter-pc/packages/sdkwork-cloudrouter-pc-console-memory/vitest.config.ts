import { defineConfig } from 'vitest/config';

/**
 * Package-local test configuration.
 *
 * This package renders a React component (`MemoryConsoleEmbed`) and asserts
 * against files on disk, so it needs `jsdom` — but it must not inherit the
 * application-root `vite.config.ts`. That config resolves the dev-server proxy
 * block whenever Vite runs in `serve` mode, which is what Vitest starts, so it
 * demands `SDKWORK_CLOUDROUTER_BROWSER_DEV_PROXY_*` values that a unit test has
 * no business needing (CONFIG_SPEC §3.1: proxy targets are dev-process
 * configuration). Keeping the config here makes `pnpm --filter <this package>
 * test` a self-consistent command that runs on a bare shell.
 *
 * Rendering a component that lives in a sibling checkout (`sdkwork-memory`) puts
 * two resolution bases into one module graph: this application's `node_modules`
 * and the sibling repository's own. Both catalogs declare `react: ^19.2.8`, so
 * each repository legitimately installs its own copy, and the graph would hold
 * two React instances — the renderer mounts one instance's shared internals
 * while the component reads the other's, so every hook throws
 * `Cannot read properties of null (reading 'useMemo' | 'useContext')`. Three
 * distinct resolution behaviours conspire, so three settings are required. Each
 * one was confirmed load-bearing by removing it and watching the suite go red:
 *
 * 1. `resolve.dedupe` — the same react family the application config already
 *    dedupes (see `apps/sdkwork-cloudrouter-pc/vite.config.ts`). This is what
 *    steers a bare `react` import of an inlined module to this application's
 *    copy instead of the sibling repository's.
 * 2. `resolve.mainFields` — Vitest resolves through Vite's node/`ssr` target,
 *    whose default is `['main']` (Vite's `DEFAULT_SERVER_MAIN_FIELDS`). For a
 *    dependency shipping `main` (CJS) plus `module` (ESM) and no `exports` map —
 *    `lucide-react` is one — that selects the CJS bundle, and a CJS bundle
 *    reaching React through `require('react')` is resolved by native Node from
 *    its own store, which no Vite-level setting can intercept. Preferring
 *    `module` selects the ESM build, whose React import is an ES import and
 *    therefore goes through the resolver. Packages that use an `exports` map
 *    (React itself does) are unaffected: `mainFields` is only consulted when no
 *    `exports` entry matches.
 * 3. `server.deps.inline` — anything under `node_modules` is externalized by
 *    default, and externalized modules are executed by native Node, bypassing
 *    the resolver entirely ("Externalized dependencies will not be applied
 *    Vite's transformers and resolvers" — vitest `ServerDepsOptions.external`).
 *    Inlining routes such a package back through Vite. Inlining a package only
 *    makes *its own* code transformed; it does not by itself make its bare
 *    imports resolvable by Vite, which is why `mainFields` is needed alongside
 *    it.
 *
 * `lucide-react` is the one package in this block that needs the last two
 * settings, because it is the one that resolves to CJS (no `exports` map, so
 * `mainFields` decides). `react-router-dom`, also imported by the block, needs
 * no entry: its `exports` map resolves to ESM under the node condition, so its
 * React import reaches the resolver on its own. The rule for a future addition:
 * a third-party React consumer that ships no `exports` map belongs in `inline`.
 *
 * `include` is scoped to this package on purpose: a single explicit spec, not a
 * workspace-wide glob.
 */
export default defineConfig({
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
    ],
    mainFields: ['module', 'main'],
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.tsx'],
    server: {
      deps: {
        inline: ['lucide-react'],
      },
    },
  },
});
