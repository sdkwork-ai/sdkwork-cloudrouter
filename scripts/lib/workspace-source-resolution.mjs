/**
 * Vite module-resolution extension order for the Adaptive Web renderers.
 *
 * Workspace packages are consumed as *source*: their `package.json#exports`
 * (or `main`/`module`) points at `src/index.ts`, and internal imports inside
 * those packages are extensionless (`export * from
 * '../generated/server-openapi/src/index'`). Vite's default extension list
 * tries `.js` before `.ts`, so an extensionless import silently binds to a
 * gitignored `tsc` artifact left next to the authored source
 * (`src/*.js`, `generated/server-openapi/src/*.js`).
 *
 * That makes a build depend on accidental build output. When the compiled
 * sibling is older than the TypeScript source it shadows, the entry (resolved
 * through `exports` → `src/index.ts`) and its internal modules (resolved
 * through the stale `.js`) come from different revisions. The production
 * bundle then mixes a generated SDK base class with a composed facade that
 * expects newer generated namespaces, and the very first construction throws —
 * observed on the cloud router portal as:
 *
 *   Uncaught TypeError: Cannot read properties of undefined (reading 'demandClaims')
 *     at new SdkworkAppClient (vendor-ui-sdk-*.js)
 *     at createSdkworkOrderAppSdkClient (sdk-clients-*.js)
 *     at configureCloudRouterDomainServiceProviders (domain-service-providers-*.js)
 *
 * Authored TypeScript is the authority for source-linked workspace packages
 * (SDK_SPEC / CODE_STYLE_SPEC §7: generated and compiled output is never the
 * source of truth), so the TypeScript extensions must be tried first. `.mjs` /
 * `.js` / `.jsx` remain available for real JavaScript modules, and `.json`
 * stays last as in the Vite default list.
 */
export const WORKSPACE_SOURCE_RESOLVE_EXTENSIONS = Object.freeze([
  '.mts',
  '.ts',
  '.tsx',
  '.mjs',
  '.js',
  '.jsx',
  '.json',
]);
