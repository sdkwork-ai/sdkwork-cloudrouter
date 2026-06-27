# sdkwork-clawrouter Check Result

> **2026-06-20:** Course module removed from claw-router. Entries below that reference `/courses`, `sdkwork-clawrouter-pc-courses`, `content_course*`, or `[courses]` TOML are historical only. References to retired local documents packages such as `sdkwork-clawrouter-pc-api-reference` and legacy local app-center typecheck commands are also historical only after the shared documents capability migration. See `docs/31-product-composition-model.md`.

Last verified: 2026-05-03 Asia/Shanghai
Workspace: `<workspace-root>\sdkwork-clawrouter`

## Summary

The current product gate passes after the latest verification run. The standard
pipeline confirms Rust formatting, Rust warnings-as-errors compilation, portal
typechecking, production build, bundle budget, production edge smoke,
production browser DOM smoke, SDK guards, architecture guards, OpenAPI audits,
schema guards, Flyway contract audit, Java legacy audit, generated frontend
static source manifest freshness, Rust tests, Python tests, and schema quality
gate.

The main improvements made in this pass are:

- cross-platform verification and delivery commands are extensionless:
  `pnpm verify`, `pnpm test:postgres`, `pnpm test:postgres:required`,
  `pnpm test:postgres:docker`, `pnpm release:env:write`,
  `pnpm install:packages:plan`, `pnpm install:packages:check`,
  `pnpm install:package:build`, `pnpm install:package:check`, and
  `pnpm install:init:smoke`
- install package planning is now executable: `pnpm.cmd install:packages:plan`
  and `pnpm.cmd install:packages:check` are backed by
  `scripts/plan-claw-router-install-packages.mjs`
- install package building is now executable: `pnpm.cmd
  install:package:check` validates the full 24-package builder matrix in
  dry-run mode and
  `pnpm.cmd install:package:build` writes manifest-backed install archives
- fast install initialization smoke is now executable:
  `pnpm.cmd install:init:smoke` validates the init contract in dry-run mode
  without starting services or requiring built binaries
- the install package matrix now covers Windows, Linux, macOS, x64, arm64,
  archive, service, container, and desktop delivery, including contracts such
  as `windows-x64-service`, `linux-arm64-container`, and
  `macos-arm64-desktop`
- server release packages (`archive`, `service`, and `container`) now default
  to PostgreSQL through `config/clawrouter.toml.example`, while
  desktop packages default to a local SQLite database in the OS user data
  directory
- runtime database configuration is now shared by the gateway, installer,
  admin API, and app API through `sdkwork-claw-config`; it reads
  `SDKWORK_CLAW_CONFIG_FILE` or the OS-standard config file path, with
  `SDKWORK_CLAW_DATABASE_URL` and
  `SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS` kept as explicit overrides
- fast initialization is now a delivery contract instead of tribal knowledge:
  release env validation/write, `sdkwork-claw-installer ensure`,
  `sdkwork-claw-installer refresh-catalog --force`, and `/healthz` plus
  `/readyz` checks are declared for every package mode
- package security defaults are explicit: no secrets in package artifacts,
  `.env.release` excluded, `.env.release.example` reference-only, local
  env generated on the install host, and trusted forwarded headers disabled by
  default
- route delivery classification is now executable: every actual portal route is
  declared in `docs/schema-registry/frontend-route-classification.yaml` as
  `sdk_backed_business_runtime`, `schema_provenanced_content`, or
  `local_developer_tool_api`
- `tools.frontend_contract_guardian` now validates route classification against
  `App.tsx`, schema manifest route scope, frontend operation contracts,
  generated SDK client usage, provenance tables, and local tool API env gates
- route classification has stronger anti-bypass checks: evidence paths must be
  real repo-relative files, classified packages must match the `App.tsx`
  lazy-loaded route package, and schema-provenanced content cannot contain
  browser runtime network client calls unless reclassified as SDK-backed or a
  gated local tool route
- local developer tool routes now inventory every raw browser `fetch` source in
  `browser_network_sources`, including `/openapi.json`, gated `/api/*` tool
  calls, and explicit API playground external runtime requests
- `browser_network_sources` now validates endpoint intent with fixed purposes:
  `/openapi.json` must be `local_openapi_snapshot`, local `/api/*` tool calls
  must be `local_tool_api`, and dynamic external requests must be isolated in
  `ApiPlayground` as `explicit_api_playground_request`
- schema-provenanced content routes now declare `static_delivery`, including the
  static source mode, refresh policy, maximum staleness, and upgrade triggers
  that require migration to SDK-backed runtime APIs
- every schema-provenanced static delivery route now uses `source_manifest_ref`
  instead of inline `source_metadata`; source references are declared once in
  `docs/schema-registry/frontend-static-source-snapshots.yaml`, and
  `tools.frontend_static_source_manifest` generates the `sha256` hashes in
  `generated/schema/frontend/frontend-static-source-manifest.json`
- stricter delivery-document standards: root `README.md` and
  `CHECK_RESULT.md` are readable UTF-8 without mojibake, replacement
  characters, private-use code points, or control characters, and include the
  commands and environment variables needed for repeatable delivery
  verification
- stricter frontend source hygiene: production portal source cannot ship
  mock/fake business naming, known mojibake text, or browser runtime console
  logging outside copyable documentation examples
- frontend source hygiene now runs as an explicit product verification step
  before portal typecheck and production build, so user-visible copy quality
  fails early instead of after expensive frontend verification
- browser runtime errors in SDK/API reference and rankings export paths now use
  fallback UI state instead of leaking error objects to the console
- `/models` catalog group filtering is now data-backed instead of a no-op:
  static model rows declare stable `ModelGroupKey` values, the page delegates
  filtering and sorting to a pure `modelCatalog` module, i18n includes explicit
  group labels, and the frontend field contract/audit records the new `groups`
  field
- `/models` category filtering is now a centralized business taxonomy instead
  of page-local labels: `Recommended` maps to the default group, `New` maps to
  beta access, `Free` requires explicit zero pricing, and unsupported category
  labels match nothing instead of silently returning the full catalog
- `/models` public seed catalog copy is now ASCII-only by executable standard;
  the GPT-4o capability introduction no longer contains a Unicode dash that
  rendered as mojibake in Windows terminal output
- `/models` is now an app-SDK-backed runtime model catalog instead of a purely
  static published catalog snapshot: `modelService.ts` calls
  `getClawRouterAppSdkClient().router.fetchModels()` and contains no raw
  `fetch`, axios, manual `/app/v3/api` URL, or manual authorization header
- production browser DOM smoke now exercises `/models` with route-scoped
  `/app/v3/api/router/models` CDP fixtures, covering successful runtime catalog
  rendering, group filtering, search no-result state, empty-runtime fallback,
  encoded runtime detail resolution, public reference/unavailable price status,
  performance source labeling, `Try in Playground`, and DOM-level rejection of
  private pricing tokens
- the public model list and both model detail routes now share the same runtime
  catalog service, keep the static catalog as a safe fallback, and can resolve
  runtime-only models without redirecting users back to `/models`
- model catalog pricing now carries an explicit `customer`, `reference`, or
  `unavailable` status; unavailable runtime prices render as unavailable instead
  of `$0.00`, and price sorting/free filtering no longer treats unknown pricing
  as a free commercial offer
- model runtime catalog mapping now lives in a pure `runtimeModelCatalog.ts`
  module, with executable Node tests for reference-price rendering,
  unavailable-price rendering, empty/malformed runtime response fallback,
  malformed item skipping, malformed price normalization, encoded detail route
  resolution, runtime public string hygiene, blank reason normalization, and
  public sensitive-field exclusion; the product verification plan runs these
  tests before broad Rust/Python suites
- `/models` empty-state clear action now uses a named handler that resets every
  filter surface, including keyword search, provider search, provider,
  modality, capability, category, and access group filters
- `/models` filter state now has a pure catalog model with isolated default
  values and reset semantics in `modelCatalog.ts`; the page consumes one
  `ModelCatalogFilters` state object instead of scattering each filter across
  independent `useState` calls
- `/models` filter fields now have a single registry in
  `MODEL_CATALOG_FILTER_FIELDS`; default/reset objects are checked against that
  registry while `ModelCatalogFilterValueByField` preserves precise field
  types such as `selectedGroups: ModelGroupKey[]`
- `/models` provider search is now a pure catalog helper instead of page-inline
  filtering: `filterProvidersForCatalog` trims search input, matches
  case-insensitively, returns fresh arrays, preserves provider order, and is
  covered by Node runtime tests plus source-standard guards
- `/models` provider display-window rules are now pure catalog logic:
  `resolveDisplayedProvidersForCatalog` owns the default five-provider limit,
  search-expanded view, show-all view, empty-list behavior, and fresh result
  arrays instead of leaving that business rule in JSX
- `/models` provider show-more controls are now derived by
  `resolveProviderShowMoreStateForCatalog`, so button visibility, expanded
  state, hidden-count math, translation key selection, and fallback labels are
  tested catalog behavior instead of JSX length arithmetic; the page now passes
  the hidden count into i18n so collapsed provider lists render the actual
  number of additional providers
- `/models` sidebar filter options are now derived by
  `deriveModelCatalogFilterOptions`, keeping provider, modality, and capability
  option de-duplication and sorting in the pure catalog module instead of page
  `Set` expressions
- `/models` category and capability translation keys are now generated by pure
  catalog helpers, `modelCatalogCategoryLabelKey` and
  `modelCatalogCapabilityLabelKey`, removing repeated
  `toLowerCase().replace(...)` key construction from JSX and making label-key
  normalization executable
- `/models` catalog cards now use a pure `deriveModelCatalogCardView` helper
  for detail navigation paths, translated description keys, capability label
  keys, and display metrics, so encoded model ids and card copy stay aligned
  between list, grid, SSR, and runtime tests instead of being rebuilt inside
  JSX
- `/models` pricing cards now use a pure `deriveModelCatalogPricingView`
  helper for badge labels, token-price cells, cached-input placeholders, flat
  non-text pricing cells, and unavailable states, so JSX no longer owns
  modality-specific price branching or price-formatting decisions
- `/models/:id` details now use a pure `deriveModelCatalogDetailView` helper
  for provider docs URLs, modality tone, translated intro/use-case/limitation
  keys, pricing rows, specification rows, parameters, supported languages, and
  copyable SDK examples, so detail-page business display rules are executable
  catalog behavior instead of JSX-local derivation
- `/models/:id` visible SDK example and copy button now consume the same
  `detail.apiExample` string, removing the previous dual source where copied
  code and rendered code could drift; the example returns the completion text
  instead of embedding runtime `console.log` source, preserving frontend source
  hygiene standards
- `/models/:id` copyable SDK examples now serialize the selected model id with
  `JSON.stringify(modelId)` before placing it into TypeScript sample code, so
  runtime catalog ids containing quotes, backslashes, or line breaks cannot
  produce malformed copied snippets
- `/models/:id` no longer renders hard-coded performance time-series charts or
  imports `recharts`; the detail page now displays a catalog-backed
  `detail.performanceSummary` with explicit source copy and `Unavailable`
  fallbacks, so public model pages do not present synthetic operational metrics
  as if they were live measurements
- `/models/:id` performance summary derivation is now pure catalog behavior:
  `deriveModelCatalogDetailView` owns latency, throughput, and time-to-first-
  token summary rows, while source-standard tests reject `performanceData`,
  `recharts`, `<AreaChart>`, and `<LineChart>` from the detail page
- `/models/:id` details no longer render hard-coded visible English labels for
  provider docs, specifications, or metric/spec row names; `modelCatalog.ts`
  now derives `labelKey` plus fallback copy for these rows, `ModelDetails.tsx`
  consumes them through i18n, and source-standard tests reject bare `row.label`
  or literal `Provider Docs` / `Specifications` JSX text
- public `/app/v3/api/router/models` no longer exposes internal upstream cost,
  customer unit price, pricing plan, group code, or gross margin fields; the
  public app contract now returns only model metadata, public reference price,
  and safe availability status/reason while admin/internal catalog paths retain
  cost and margin data
- public model catalog price availability is now public-safe by construction:
  `/app/v3/api/router/models` exposes only `reference` or `unavailable`, never
  public `available`; `reference` means a public official reference price is
  configured, while customer-specific availability remains an authenticated
  admin/internal concern
- the generated app SDK contract now types public model catalog availability as
  `status: 'reference' | 'unavailable'`, and both the OpenAPI schema and field
  contract reject customer-specific price fields on the public app surface
- `tools.clawrouter_openapi_precision_audit` now has an app-only public model
  catalog schema guard that rejects public `available` and private pricing
  fields in `AppModelCatalogItem` or `AppModelCatalogPriceAvailability`
- `tools.clawrouter_sdk_guardian` now has an app SDK source guard that rejects
  regenerated TypeScript SDK regressions exposing public `available`,
  `lowestUpstreamCostUnitPrice`, `customerUnitPrice`, `grossMarginPerUnit`,
  `pricingPlanCode`, or `groupCode` from public model catalog types
- production edge smoke now covers `/models`,
  `/models/openai/gpt-4o-mini`, and `/models/openai%2Fgpt-4o-mini` SPA fallback
  routes, then verifies the built `models-*.js` route chunk still calls the
  generated app SDK and keeps public `reference`/`unavailable` pricing
  semantics without private pricing tokens
- production edge smoke now also validates the built `models-*.js` route
  chunk for real catalog user-path semantics: runtime SDK loading, filter/reset
  derivation, access-group filtering, provider show-more state, detail
  performance-source labels, i18n detail label keys, and safe `JSON.stringify`
  SDK example generation must survive production bundling
- `/models` now has a no-subprocess SSR smoke guard that renders the real
  `Models.tsx` and `ModelDetails.tsx` route components through React server
  rendering, proving the public catalog and detail page are not blank, include
  price-status copy, and do not expose private pricing tokens
- `/models/:id` encoded catalog-card navigation is now covered by SSR smoke and
  Node route-resolution tests, so `/models/openai%2Fgpt-4o-mini` resolves to
  the same model detail page as `/models/openai/gpt-4o-mini`
- runtime model catalog input from the app SDK now rejects unsafe model/vendor
  identifiers with control characters or whitespace, normalizes provider text,
  caps public display names, capabilities, and price reasons before rendering,
  and omits blank upstream price reasons
- `/models`, `/models/:id`, and `/models/:provider/:model` are classified as
  `sdk_backed_business_runtime` routes backed by the `/app/v3/api/router/models`
  operation, and the generated frontend field, operation, and static source
  audit artifacts are current
- `/rankings` no longer builds its chart history from the current browser date
  inside the React component. The route now imports deterministic snapshot data
  and pure derivation helpers from `rankingCatalog.ts`, anchored to the
  published snapshot date `2026-05-03`, so the same release renders the same
  ranking history in SSR, production, and tests.
- `/rankings` public copy now labels the chart as `Snapshot Volume` and
  `Published catalog snapshot` instead of `Live Volume`, so the static
  published-catalog route does not imply realtime monitoring data before a real
  authenticated ranking API exists.
- `/rankings` filtering, vendor counts, modality counts, chart keys, display
  ranks, panel totals, top mover, weighted latency, open-source share, and
  volume formatting are now pure `rankingCatalog.ts` behavior covered by Node
  tests instead of component-local `useMemo` calculations.
- production edge smoke now covers `/rankings` and verifies the built
  `rankings-*.js` route chunk keeps deterministic snapshot derivation and
  public snapshot labels while rejecting old realtime copy such as `Live Volume`
  or `Weekly API calls Tracker`.
- `/courses` and `/courses/:id` now use a pure schema-provenanced
  `courseCatalog.ts` content snapshot module instead of component-local catalog
  filtering, detail lookup, playlist construction, related-card derivation, or
  reaction/comment generation.
- `/courses/:id` no longer depends on browser runtime drift such as
  `Math.random()`, `new Date()`, or `toLocaleDateString()`. Course publish
  labels, playlist rows, related cards, engagement metrics, and discussion
  comments are deterministic release-bound view data anchored to `2026-05-03`.
- course detail copy has been normalized to ASCII production copy, removing the
  corrupt text fragments that previously appeared in detail-side components.
- Bilibili embeds are now built through `buildBilibiliEmbedUrl()` with a strict
  BVID allowlist and `URL` query serialization, rejecting script-like or
  query-injection values before they can reach an iframe `src`.
- production CSP now permits the intentionally external course assets and
  embedded player with `img-src 'self' data: blob: https:` and
  `frame-src 'self' https://player.bilibili.com`, while production smoke checks
  `/courses`, `/courses/c1`, and the built `courses-*.js` chunk for the same
  route semantics.
- production browser DOM smoke now covers `/courses` catalog category
  filtering, level filtering, search filtering, card navigation,
  `/courses/c1` detail rendering, Bilibili iframe URL/referrer policy,
  lesson-grid interaction, related-course navigation, missing-detail fallback,
  deterministic snapshot labels, and discussion copy. Course catalog cards are
  real keyboard-accessible navigation buttons instead of click-only `div`
  cards with nested decorative buttons.
- frontend field auditing now supports explicitly declared contract source files
  that live outside the default service/data scan set. The course field contract
  points at the real `courseCatalog.ts#Course` declaration, expands referenced
  same-file value objects such as `CourseInstructor`, and avoids using
  compatibility re-export files as schema evidence.
- `/forum` and `/forum/:id` now use a pure schema-provenanced
  `forumCatalog.ts` content snapshot module instead of component-local forum
  seed posts, category arrays, inline filtering, or hard-coded detail content.
- `/forum/:id` now resolves the actual route id, returns a deterministic
  not-found view for missing ids, and derives author handles, counts, labels,
  and related discussions through `deriveForumPostDetailView`.
- forum list and detail views no longer depend on browser runtime drift or
  navigation side effects such as `toLocaleString()`, `window.location.href`,
  `new Date()`, or `Math.random()`, and corrupt copy fragments from the old
  page source have been removed by executable source-standard tests.
- route classification and static source manifest entries for `/forum` and
  `/forum/:id` now point at the same `forumCatalog.ts` source snapshot, with
  schema provenance over forum posts, comments, and reactions.
- production edge smoke now requests `/forum` and `/forum/1`, then verifies
  the built `forum-*.js` route chunk keeps snapshot metadata, pure catalog
  derivation, related-discussion copy, and release date tokens while rejecting
  old inline seed and browser-runtime drift tokens.
- production browser DOM smoke now covers `/forum` catalog category filtering,
  search filtering, empty-result fallback, top-sort ordering, post-card
  navigation, `/forum/1` detail rendering, related-discussion navigation,
  missing-detail fallback, accessible search controls, deterministic snapshot
  labels, and comment copy while forbidding `Math.random` and
  `toLocaleDateString` drift tokens.
- the product verification plan now runs `portal forum runtime tests` before
  broad Rust and Python suites, so forum behavior is part of the commercial
  delivery gate instead of an optional local check.
- `/skills-hub` and `/skills-hub/:id` are SDK-backed app runtime routes:
  `skillService.ts` calls the generated app SDK skill client, the old static
  seed source is removed, `skillRuntime.ts` owns normalization, filtering,
  install command derivation, and date formatting, and route/i18n scripts no
  longer depend on `skills.data.*` translation overrides.
- `/apps` and `/apps/:id` are SDK-backed app runtime routes instead of static
  App Center seed pages. `appService.ts` calls
  `getClawRouterAppSdkClient().app.getApps`,
  `getClawRouterAppSdkClient().app.getAppById`, and
  `getClawRouterAppSdkClient().app.getCategories`; pure `appRuntime.ts` owns
  SDK record normalization, filters, sorting, count/date formatting, detail
  derivation, and release download URL semantics.
- App Center UI components no longer import `src/data/apps.ts`, no longer
  render dynamic `apps.data.*` i18n sample overrides, and no longer use fake
  download progress. Release downloads now render only real non-empty artifact
  URLs with `target="_blank"` and `rel="noreferrer"`; unavailable releases are
  explicit UI state.
- SDK-backed `/apps`, `/apps/:id`, `/skills-hub`, and `/skills-hub/:id` public
  routes now have recoverable commercial failure states. App Center and Skills
  Hub list, detail, and homepage preview loaders use guarded async request
  flows with `catch` handling, loading-state `finally` cleanup where needed,
  active-component checks before state updates, `BusinessStatePanel` error UI,
  and retry actions instead of unhandled Promise rejections or infinite
  skeleton loading when the app SDK/API is unavailable.
- `sdkwork-clawroutes-pc-commons` now exports `getLoadErrorMessage()` so SDK
  business pages share a single public-safe error-message adapter. It accepts
  real `Error.message` values and falls back for empty, non-Error, or raw object
  throws, preventing accidental rendering of low-quality exception objects.
- production edge smoke now requests `/apps` and `/apps/app-1`, then checks
  the real `app-center-*.js` route chunk for generated app SDK calls,
  deterministic runtime normalization, catalog/detail view derivation, date
  formatting, and absence of the old static seed source path.
- API Reference Playground parameter rows now use deterministic pure row
  derivation in `apiPlaygroundRows.ts` instead of `Math.random()` or clock-based
  row ids. Schema rows derive from OpenAPI parameter location/name/index,
  custom rows use caller-owned local sequence ids, bulk edit rows use stable
  line indexes, and `playgroundRequest.ts` imports the row type from the pure
  module instead of importing React component types.
- API Reference Playground initial state now has a pure
  `createApiPlaygroundInitialState` contract plus a stable
  `createApiPlaygroundInitialStateKey`, so equivalent endpoint object re-renders
  do not clear user-edited parameters or body text while real method/path/OpenAPI
  contract changes still reset the playground safely.
- API Reference Playground now derives path-variable rows from the endpoint path
  template as well as OpenAPI `parameters`, so paths such as
  `/v1/models/{model}/responses/{response_id}` remain editable even when the
  OpenAPI operation omits one template variable.
- API Reference Playground request construction now fails closed when a URL
  still contains an unresolved `{path_variable}` after parameter substitution,
  returning `Unresolved Path Variable` on the Params tab instead of sending a
  malformed API request.
- API Reference static code snippets now scan the final request URL for
  remaining path-template variables and backfill stable example values before
  emitting `curl`, `fetch`, `axios`, Python, or generic HTTP snippets. Imperfect
  OpenAPI parameter metadata no longer produces copyable examples containing
  unresolved tokens such as `{response_id}`.
- API Reference Playground response downloads now use a dedicated
  `playgroundResponseDownload.ts` helper instead of component-local Blob,
  object URL, anchor, and clock filename code. `Send and Download` downloads
  the `handleSend()` return value directly instead of reading stale React state,
  while `Save Response` uses the same serialization and deterministic filename
  contract.
- API Reference Playground response body serialization now has a single pure
  `serializeApiPlaygroundResponseData` contract shared by Copy Response, raw
  rendering, line-count calculation, and response download. Primitive JSON
  bodies such as `false`, `0`, and `null` are preserved instead of being treated
  as empty UI state.
- API Reference Playground request validation now routes missing required
  header fields to the Headers tab instead of the Params tab, so users land on
  the editable control that actually needs correction.
- API Reference Playground now treats `Content-Type` as a managed header. Custom
  header rows cannot override the JSON content type chosen by
  `buildPlaygroundRequest`, matching the hidden managed-header UI contract and
  preventing misleading request previews.
- production browser DOM smoke now covers `/api-reference` API Playground
  interaction routes instead of only checking static page text. The CDP route
  matrix opens `Try it out`, selects stable OpenAPI endpoints, verifies missing
  path-variable validation, exercises query/header bulk edit conversion,
  rejects managed `Authorization` headers, sends a real browser `fetch` POST
  through a route-scoped `https://tenant-api.example.com/api/*` fixture with
  CORS preflight handling, and verifies `200 OK` response body/header tabs.
- API Playground browser smoke now probes response actions without depending
  on host state: Save Response is intercepted through an anchor-click download
  probe and must produce `playground-response-200-ok.json`, while Copy Response
  is checked through an in-browser clipboard probe that must receive the
  serialized response text.
- API Playground production browser smoke now also covers JSON `null` response
  rendering and response actions. A route-scoped primitive fixture verifies raw
  body text, exact clipboard text `null`, exact downloaded blob text `null`,
  deterministic filename `playground-response-200-ok.json`, and response
  headers in the deployed DOM.
- API Playground production browser smoke now covers `Send and Download`
  directly. The route clicks the dropdown action and verifies the captured blob
  text comes from the current successful browser `fetch` response instead of
  stale React state.
- API Playground production browser smoke now covers the drawer shell contract:
  the deployed DOM must expose the `max-w-[100vw]` width constraint before
  close, and clicking `Close Drawer` must remove the drawer text and close
  button from the DOM.
- API Playground action buttons now use explicit `type="button"`, the
  send-options button has an accessible label, and the `Send and Download`
  menu is available through `focus-within` as well as hover.
- production edge smoke now requests `/api-reference` and inspects the built
  `api-reference-*.js` route chunk, proving deterministic initial-state,
  parameter-row, path-template recovery, request-building, managed-header,
  response serialization, and response-download helper tokens survive the
  production bundle.
- the same production chunk smoke rejects old unstable playground tokens such
  as `Math.random`, `bulk-query-${Date.now()}`,
  `bulk-header-${Date.now()}`, and `response-${Date.now()}`, so clock/random
  regressions fail in the deployable artifact instead of only in source tests.
- `/api-reference` now has dependency-free SSR smoke coverage for the default
  playground DOM, header parameter table DOM, and request-body initial-state
  contract. This gives browser-like rendered-control coverage without adding a
  Playwright, Puppeteer, or jsdom dependency to the restricted workspace.
- shared request and idempotency tokens now fail closed when browser or Node
  secure randomness is unavailable. `createRequestToken` uses
  `crypto.randomUUID()` when available, falls back only to
  `crypto.getRandomValues()` 128-bit hex output, rejects all-zero random seeds,
  and no longer uses `Date.now()`, `Math.random()`, or base36 clock/random
  fallback material for `X-Request-Id` or `Idempotency-Key` values.
- console routing strategy mapping-rule creation no longer depends on
  `Date.now()` for client-side ids. `StrategyTab.tsx` delegates rule draft
  creation, model-name validation, and duplicate detection to the pure
  `strategyRules.ts` module, which derives deterministic sequence ids from the
  current rule set and advances past existing backend-provided `rule-N` ids.
- admin group creation no longer fabricates a client persistence id just to
  satisfy the returned view-model shape. `GroupCreateInput` now represents the
  create payload separately from `GroupData`, and `groupForm.ts` converts
  `FormData` into a backend SDK create input without `id`, `accountCount`, or
  `usage` fields.
- the admin group create-input contract is now registered in
  `docs/schema-registry/frontend-field-contracts.yaml` and regenerated into
  `generated/schema/frontend/frontend-field-audit.json`, so exported frontend
  create-command models cannot drift outside schema provenance.
- admin user write flows now use dedicated command inputs. `UserCreateInput`,
  `UserUpdateInput`, and `ApiKeyCreateInput` are separate from returned
  `UserListItem` and `ApiKeyItem` view models, `userForm.ts` normalizes form
  values without fabricating view fields, and API key creation no longer uses
  current time to invent default names.
- console API key creation now has a dedicated pure command adapter:
  `apiKeyForm.ts` owns name/group/quota/modalities/IP/expiration normalization,
  batch-count clamping, deterministic batch names, and view-field exclusion
  before `ApiKeyService.createKey` calls the generated app SDK.
- the console API key package is now an explicit ESM package with a package
  `typecheck` script and strict `tsconfig.json`, so `/console/api-keys`
  participates in both package-local and portal-wide commercial type gates.
- admin user transaction-record panels no longer render synthetic recharge or
  exchange rows with current timestamps, hard-coded amounts, or sample gift
  codes; unavailable financial history is explicit until a persisted ledger API
  is connected.
- the product verification plan now runs `portal api reference playground
  runtime tests` and `portal api reference SSR smoke tests` after public SDK
  route runtime tests, runs `portal commons runtime tests` before route runtime
  tests, and also runs `portal console API key runtime tests`, `portal console
  routing runtime tests`, `portal admin group runtime tests`, and `portal admin
  user runtime tests` before broad Rust/Python suites, so shared token security,
  local developer tool determinism, rendered playground controls, console API
  key command normalization, console routing rule-id determinism, and admin
  create-payload correctness stay regression-guarded as part of the commercial
  verification sequence.
- the product verification plan now runs `portal production browser DOM smoke`
  immediately after production HTTP smoke and before portal server tests. The
  smoke executes the built portal server through Chrome DevTools Protocol when
  a Chromium-family browser is available, verifies `/runtime-env.js` ordering,
  `window.__CLAWROUTER_ENV__` public/app/backend/tool API values, rendered DOM
  content for `/models`, encoded model detail, `/rankings`, `/courses`,
  `/courses/c1`, `/forum`, `/forum/1`, `/apps`, `/apps/app-1`, `/skills-hub`,
  `/skills-hub/skill-1`, and `/api-reference`, and fails on browser runtime
  exceptions, console warnings/errors, or private pricing tokens.
- the browser DOM smoke now waits for route-specific DOM text tokens before
  final route assertions. This prevents asynchronous SDK-backed routes from
  being checked while still in their loading state and makes the App Center and
  Skills Hub recoverable SDK/API failure states part of the production release
  gate.
- the browser DOM smoke now uses route-scoped Chrome DevTools Protocol
  `Fetch` fixtures for SDK-backed App Center and Skills Hub success paths.
  The fixtures fulfill only `/app/v3/api` app/skill catalog, category, and
  detail requests during the browser smoke, so the production portal server
  remains mock-free while the real generated app SDK request path proves it can
  render successful catalog cards, detail pages, artifact links, and skill
  install commands.
- the browser DOM smoke now also covers SDK-backed App Center and Skills Hub
  edge states with route-scoped `/app/v3/api` CDP fixtures: empty catalog
  responses, search/filter no-result states, detail missing-record fallback
  rendering, category-load business failures, and retry-click recovery after a
  transient generated SDK list failure. The retry routes intentionally fail the
  first SDK list request, click the visible `Retry` button in the browser, then
  require the successful catalog DOM and absence of the prior error text.
- the browser DOM smoke now covers API Reference Playground interaction states:
  path-variable validation, query bulk edit conversion, managed-header
  rejection, external API request CORS preflight, successful `200 OK` response
  rendering, response header tab rendering, deterministic Save Response
  filename probing, Copy Response clipboard probing, primitive/null response
  handling, `Send and Download`, drawer close behavior, Bearer Token request
  authentication, and deterministic network-error response rendering.
- the browser DOM smoke now also guards the API Reference local tool API
  boundary. With `VITE_TOOL_API_ENABLED=false`, the production browser route
  verifies static code snippets containing `CLAWROUTER_API_KEY` and uses a CDP
  `Network.requestWillBeSent` collector to fail if `/api/code-snippet` is
  requested.
- the browser DOM smoke now covers the API Reference static code snippet
  tab workflow. The route switches TypeScript snippets from `axios` to `fetch`,
  verifies the rendered snippet changes to `await fetch`, clicks `Copy code`,
  and asserts the clipboard probe receives the currently rendered snippet with
  `CLAWROUTER_API_KEY`, still without requesting `/api/code-snippet`.
- the browser DOM smoke now fixes the browser language to `en-US` with both
  Chrome launch flags and Chrome DevTools Protocol locale/user-agent overrides,
  so English DOM assertions do not depend on the CI or release host OS
  language.
- the browser DOM smoke has a release hard-gate mode:
  `CLAWROUTER_BROWSER_SMOKE_REQUIRED=1` turns a missing browser or unavailable
  CDP target from a local skip into a failed verification step. It also supports
  `CLAWROUTER_BROWSER_EXECUTABLE` for explicit Chrome/Edge/Chromium paths and
  `CLAWROUTER_BROWSER_DEBUG_PORT` for externally launched CDP sessions.

## Verification Evidence

2026-05-03 API Reference static code snippet tab/copy production browser DOM hardening pass:

Commands:

```powershell
node scripts\run-claw-router-application.test.mjs
python -B -m unittest tests.test_api_reference_playground_standard
node --check apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs
node --experimental-strip-types apps\sdkwork-clawrouter-pc\api-reference-playground-runtime.test.ts
node apps\sdkwork-clawrouter-pc\api-reference-ssr-smoke.test.cjs
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-api-reference typecheck
pnpm.cmd verify
```

Results:

- Issue found: `/api-reference` production browser DOM smoke proved static
  fallback visibility and no `/api/code-snippet` request, but it did not prove
  the high-frequency code example workflow. A deployed regression could have
  broken TypeScript library tab switching or copied stale code while the static
  fallback route still passed.
- TDD evidence: after adding product/source standards, `node
  scripts\run-claw-router-application.test.mjs` failed on the missing
  `/api-reference?__browser-smoke-code-snippet-tabs=1` route, and
  `python -B -m unittest tests.test_api_reference_playground_standard` failed
  on the same missing route/helper contract. After implementation, both
  commands passed.
- Solution applied: `smoke-production-browser.mjs` now has
  `/api-reference?__browser-smoke-code-snippet-tabs=1` with
  `forbiddenToolApiPaths: ["/api/code-snippet"]`. The route selects
  `Create Chat Completion`, checks the default TypeScript/axios snippet,
  switches the library button to `fetch`, verifies `await fetch` and
  `CLAWROUTER_API_KEY` in the rendered code, clicks `Copy code`, and asserts
  the clipboard probe receives the current fetch snippet.
- Solution applied: `clickRouteCodeLanguageButtonByExactText()` and
  `clickRouteCodeLibraryButtonByExactText()` keep code example navigation in
  reusable smoke helpers instead of adding ad hoc route-local DOM selectors.
- Fresh verification evidence: `node scripts\run-claw-router-application.test.mjs`
  passed 36 checks.
- Fresh verification evidence: `python -B -m unittest
  tests.test_api_reference_playground_standard` ran 7 tests, OK.
- Fresh syntax check evidence: `node --check
  apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs`
  exited successfully.
- Fresh runtime/SSR/typecheck evidence: `api-reference-playground-runtime.test.ts`
  ran 12 tests, all passed; `api-reference-ssr-smoke.test.cjs` ran 3 tests, all
  passed; `sdkwork-clawrouter-pc-api-reference` package `tsc --noEmit` passed.
- Fresh full gate evidence: `pnpm.cmd verify` exited successfully. The gate
  included Rust format, Rust warnings-as-errors compile, generated SDK guard,
  project skill guard, architecture guards, OpenAPI and payload SDK audits,
  frontend static source manifest check, frontend contract/schema/Flyway/java
  legacy audits, frontend source hygiene, forced portal typecheck, production
  build, bundle budget audit, production edge smoke, production browser DOM
  smoke with the local explicit `[browser-smoke] skipped: Unable to spawn
  Chrome or Edge for browser DOM smoke: spawn EPERM`, portal runtime/SSR
  suites, Rust workspace tests, Python standard tests (`Ran 476 tests, OK`),
  and schema quality gate.

2026-05-03 API Reference local tool API disabled production browser DOM hardening pass:

Commands:

```powershell
node scripts\run-claw-router-application.test.mjs
python -B -m unittest tests.test_api_reference_playground_standard
node --check apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs
node --experimental-strip-types apps\sdkwork-clawrouter-pc\api-reference-playground-runtime.test.ts
node apps\sdkwork-clawrouter-pc\api-reference-ssr-smoke.test.cjs
pnpm.cmd verify
```

Results:

- Issue found: `/api-reference` already gated dynamic code-snippet generation
  behind `VITE_TOOL_API_ENABLED=false` and used `buildStaticCodeSnippet` as a
  fallback, but production browser DOM smoke did not prove that a disabled
  local tool API stays out of the runtime request graph. A regression could
  have called `/api/code-snippet` in production while source-level tests still
  looked correct.
- TDD evidence: after adding product/source standards, `node
  scripts\run-claw-router-application.test.mjs` failed on the missing
  `/api-reference?__browser-smoke-tool-api-disabled=1` route, and
  `python -B -m unittest tests.test_api_reference_playground_standard` failed
  on the same missing route/probe contract. After implementation, both
  commands passed.
- Solution applied: `smoke-production-browser.mjs` now has
  `/api-reference?__browser-smoke-tool-api-disabled=1` with
  `forbiddenToolApiPaths: ["/api/code-snippet"]`. The route selects
  `Create Chat Completion`, verifies `VITE_TOOL_API_ENABLED` is `false`,
  requires a visible static snippet containing `CLAWROUTER_API_KEY`, and rejects
  `Code snippet generation failed` text.
- Solution applied: `createToolApiRequestCollector()` registers a CDP
  `Network.requestWillBeSent` listener before route navigation, records only
  active forbidden tool API paths, fails the route if any matching URL is
  requested, and fails fast if a route declares `forbiddenToolApiPaths` without
  a registered collector.
- Fresh verification evidence: `node scripts\run-claw-router-application.test.mjs`
  passed 36 checks.
- Fresh verification evidence: `python -B -m unittest
  tests.test_api_reference_playground_standard` ran 6 tests, OK.
- Fresh syntax check evidence: `node --check
  apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs`
  exited successfully.
- Fresh runtime/SSR evidence: `api-reference-playground-runtime.test.ts` ran
  12 tests, all passed; `api-reference-ssr-smoke.test.cjs` ran 3 tests, all
  passed.
- Fresh full gate evidence: `pnpm.cmd verify` exited successfully. The gate
  included Rust format, Rust warnings-as-errors compile, generated SDK guard,
  project skill guard, architecture guards, OpenAPI and payload SDK audits,
  frontend static source manifest check, frontend contract/schema/Flyway/java
  legacy audits, frontend source hygiene, forced portal typecheck, production
  build, bundle budget audit, production edge smoke, production browser DOM
  smoke with the local explicit `[browser-smoke] skipped: Unable to spawn
  Chrome or Edge for browser DOM smoke: spawn EPERM`, portal runtime/SSR
  suites, Rust workspace tests, Python standard tests (`Ran 475 tests, OK`),
  and schema quality gate.

2026-05-03 SDK-backed App Center and Skills Hub browser edge-state hardening pass:

Commands:

```powershell
node scripts\run-claw-router-application.test.mjs
node --check apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs
pnpm.cmd verify
```

Results:

- Issue found: SDK-backed App Center and Skills Hub browser smoke covered
  failure and success fixture routes, but did not yet release-gate empty SDK
  responses, catalog filter no-results, detail missing-record fallback,
  partial category-load failure, or retry-click recovery after a transient SDK
  list failure.
- Solution applied: `smoke-production-browser.mjs` now has dedicated
  `APP_SDK_EMPTY_FIXTURE_MODE`, `APP_SDK_CATEGORY_FAILURE_FIXTURE_MODE`,
  `APP_SDK_MISSING_FIXTURE_MODE`, and `APP_SDK_RETRY_FIXTURE_MODE` fixtures.
  These still intercept only `/app/v3/api` through Chrome DevTools Protocol
  `Fetch`, leaving the production portal server mock-free and keeping remote
  business calls inside the generated app SDK path.
- The browser route matrix now exercises `/apps?__browser-smoke-empty=1`,
  `/apps?__browser-smoke-filter=1`, `/apps?__browser-smoke-categories=1`,
  `/apps/__browser-smoke-missing`, `/apps?__browser-smoke-retry=1`,
  `/skills-hub?__browser-smoke-empty=1`,
  `/skills-hub?__browser-smoke-filter=1`,
  `/skills-hub?__browser-smoke-categories=1`,
  `/skills-hub/__browser-smoke-missing`, and
  `/skills-hub?__browser-smoke-retry=1`.
- The retry routes fail the first generated SDK list response with
  `Browser smoke apps transient failure` or
  `Browser smoke skills transient failure`, click the real visible `Retry`
  button through CDP, then assert the successful catalog content is rendered
  and the previous error text is absent.
- TDD evidence: after adding the product tooling guard, `node
  scripts\run-claw-router-application.test.mjs` failed on missing
  `/apps?__browser-smoke-empty`; after implementing the fixtures, interaction
  helpers, forbidden-text assertions, and retry resolver, the same command
  passed 36 checks.
- Fresh syntax check evidence: `node --check
  apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs`
  exited successfully.
- Fresh full gate evidence: `pnpm.cmd verify` exited successfully. The gate
  included Rust format, Rust warnings-as-errors compile, generated SDK guard,
  project skill guard, architecture guards, OpenAPI and payload SDK audits,
  frontend static source manifest check, frontend contract/schema/Flyway/java
  legacy audits, frontend source hygiene tests, forced portal typecheck,
  production build, bundle budget audit, production HTTP smoke, production
  browser DOM smoke with the local explicit `[browser-smoke] skipped: Unable to
  spawn Chrome or Edge for browser DOM smoke: spawn EPERM`, portal runtime/SSR
  suites, Rust workspace tests, 470 Python standard tests, and schema quality
  gate.

2026-05-03 API Reference Playground browser interaction hardening pass:

Commands:

```powershell
node scripts\run-claw-router-application.test.mjs
node --check apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs
node --experimental-strip-types apps\sdkwork-clawrouter-pc\api-reference-playground-runtime.test.ts
node apps\sdkwork-clawrouter-pc\api-reference-ssr-smoke.test.cjs
python -B -m unittest tests.test_frontend_source_hygiene_standard
pnpm.cmd --dir apps\sdkwork-clawrouter-pc build
cargo test -p sdkwork-clawrouter-cloud-gateway --test edge_server edge_server_can_serve_portal_dist_without_node_server
node apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs
$env:CLAWROUTER_BROWSER_SMOKE_REQUIRED='1'; node apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs
node --experimental-strip-types apps\sdkwork-clawrouter-pc\server.test.ts
pnpm.cmd verify
```

Results:

- Issue found: `/api-reference` production browser DOM smoke only proved the
  route rendered static documentation shell text. It did not exercise the real
  API Playground drawer, parameter-table editing, validation focus, managed
  header rejection, external browser `fetch` path, response tab rendering,
  Save Response, or Copy Response.
- Solution applied: `smoke-production-browser.mjs` now adds three
  `/api-reference` browser routes:
  `?__browser-smoke-playground-validation=1`,
  `?__browser-smoke-playground-managed-header=1`, and
  `?__browser-smoke-playground-send=1`. These routes select stable OpenAPI
  endpoints by visible name, open `Try it out`, drive table bulk edit and
  textarea controls through React-compatible DOM events, reject managed
  `Authorization` headers, and send a POST to
  `https://tenant-api.example.com/api/v1/chat/completions` through a
  route-scoped CDP fixture.
- Solution applied: the API Playground CDP fixture handles CORS preflight
  `OPTIONS` plus the successful POST response and exposes `content-type` and
  `x-browser-smoke` response headers. It does not intercept `/openapi.json`,
  runtime env scripts, static assets, `/app/v3/api`, or `/backend/v3/api`.
- Solution applied: browser-only probes verify Save Response and Copy Response
  without relying on host filesystem downloads or the OS clipboard. The smoke
  requires `playground-response-200-ok.json` and copied response text
  containing `Browser smoke playground response`.
- TDD evidence: after adding the product tooling guard, `node
  scripts\run-claw-router-application.test.mjs` failed on the missing
  `/api-reference?__browser-smoke-playground-validation=1` route contract.
  After implementing the fixture, DOM helpers, and route assertions, the same
  command passed 36 checks.
- `node --check smoke-production-browser.mjs`: passed.
- `api-reference-playground-runtime.test.ts`: 12 tests passed.
- `api-reference-ssr-smoke.test.cjs`: 3 tests passed.
- `test_frontend_source_hygiene_standard`: Ran 3 tests, OK.
- `pnpm.cmd --dir apps\sdkwork-clawrouter-pc build`: passed and rebuilt
  `dist\server.mjs`.
- `edge_server_can_serve_portal_dist_without_node_server`: passed.
- local non-required `smoke-production-browser.mjs`: explicit skip with
  `Unable to spawn Chrome or Edge for browser DOM smoke: spawn EPERM`.
- required browser smoke mode: exited 1 with
  `Unable to spawn Chrome or Edge for browser DOM smoke: spawn EPERM.
  CLAWROUTER_BROWSER_SMOKE_REQUIRED is enabled.`
- `server.test.ts`: 50 tests passed.
- `pnpm.cmd verify`: exit code 0. The full gate passed with Rust
  format/check/tests, commercial SDK/architecture/OpenAPI/schema guards,
  frontend source hygiene, portal forced typecheck, production build, bundle
  budget, production edge smoke, local browser-smoke explicit skip, portal
  runtime/SSR suites, Python standard tests (`Ran 470 tests, OK`), and schema
  quality gate.

2026-05-03 API Reference Playground production browser DOM primitive/download/drawer hardening pass:

Commands:

```powershell
node scripts\run-claw-router-application.test.mjs
python -B -m unittest tests.test_api_reference_playground_standard
node --check apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs
node --experimental-strip-types apps\sdkwork-clawrouter-pc\api-reference-playground-runtime.test.ts
node apps\sdkwork-clawrouter-pc\api-reference-ssr-smoke.test.cjs
python -B -m unittest tests.test_api_reference_playground_standard tests.test_frontend_source_hygiene_standard
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-api-reference typecheck
pnpm.cmd --dir apps\sdkwork-clawrouter-pc build
cargo test -p sdkwork-clawrouter-cloud-gateway --test edge_server edge_server_can_serve_portal_dist_without_node_server
node apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs
$env:CLAWROUTER_BROWSER_SMOKE_REQUIRED='1'; node apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs
pnpm.cmd verify
```

Results:

- Issue found: the previous production browser DOM coverage proved validation,
  managed-header rejection, object-response send, Save Response, and Copy
  Response, but it did not prove primitive or JSON `null` responses in the
  deployed browser path. A regression could have rendered `null` as empty UI
  state or produced an empty copied/downloaded response while pure serializer
  tests still passed.
- Issue found: `Send and Download` was covered by helper-level tests but not by
  a production browser interaction route. A stale-state or hidden-dropdown
  regression could have broken the high-frequency developer workflow without
  failing the release smoke matrix.
- Issue found: the API Playground drawer had responsive max-width and close UI
  in source, but the production browser DOM matrix did not assert the drawer
  constraint before close or verify that close removes the drawer. The
  `Send and Download` dropdown also relied on hover-only visibility, which is
  not a commercial-grade keyboard path.
- TDD evidence: after adding product/source standards,
  `node scripts\run-claw-router-application.test.mjs` failed on the missing
  `/api-reference?__browser-smoke-playground-primitive-response=1` route, and
  `python -B -m unittest tests.test_api_reference_playground_standard` failed
  on the missing production browser smoke routes/accessibility tokens. After
  implementation, both commands passed.
- Solution applied: `smoke-production-browser.mjs` now includes
  `/api-reference?__browser-smoke-playground-primitive-response=1`,
  `/api-reference?__browser-smoke-playground-send-download=1`, and
  `/api-reference?__browser-smoke-playground-drawer=1`.
- Solution applied: the API Playground CDP fixture now has
  `API_PLAYGROUND_PRIMITIVE_FIXTURE_MODE`, returning a real JSON `null`
  response with `application/json; charset=utf-8` and an
  `x-browser-smoke: Browser smoke primitive response` header. The browser route
  verifies raw body visibility, exact clipboard text `null`, exact downloaded
  text `null`, deterministic filename `playground-response-200-ok.json`, and
  response headers.
- Solution applied: `installRouteDownloadProbe()` now hooks
  `URL.createObjectURL`, `URL.revokeObjectURL`, and anchor clicks to capture
  in-browser blob text without writing to the host download directory. This
  makes download assertions check actual response bytes, not only a `blob:`
  URL.
- Solution applied: the `Send and Download` browser route clicks the dropdown
  action directly and asserts the downloaded blob text contains
  `Browser smoke playground response`, proving the UI action uses the current
  `handleSend()` result.
- Solution applied: the drawer browser route opens `Try it out`, asserts the
  production DOM has the `max-w-[100vw]` drawer constraint, clicks
  `Close Drawer`, and asserts both `API Playground` and the close button are
  removed.
- Solution applied: `ApiPlayground.tsx` buttons now use `type="button"` to
  avoid accidental form-submit semantics, the send-options button has an
  accessible label, and the `Send and Download` menu opens on
  `group-focus-within` as well as hover.
- `node --check smoke-production-browser.mjs`: passed.
- `api-reference-playground-runtime.test.ts`: 12 tests passed.
- `api-reference-ssr-smoke.test.cjs`: 3 tests passed.
- `test_api_reference_playground_standard`: Ran 4 tests, OK.
- `test_api_reference_playground_standard + test_frontend_source_hygiene_standard`:
  Ran 7 tests, OK.
- `sdkwork-clawrouter-pc-api-reference typecheck`: `tsc --noEmit` passed.
- `pnpm.cmd --dir apps\sdkwork-clawrouter-pc build`: passed and generated
  `assets/api-reference-Bhqncum6.js` plus `dist\server.mjs`.
- `edge_server_can_serve_portal_dist_without_node_server`: passed.
- local non-required `smoke-production-browser.mjs`: explicit skip with
  `Unable to spawn Chrome or Edge for browser DOM smoke: spawn EPERM`.
- required browser smoke mode: exited 1 with
  `Unable to spawn Chrome or Edge for browser DOM smoke: spawn EPERM.
  CLAWROUTER_BROWSER_SMOKE_REQUIRED is enabled.`
- `pnpm.cmd verify`: exit code 0. The full gate passed with Rust
  format/check/tests, commercial SDK/architecture/OpenAPI/schema guards,
  frontend source hygiene, portal forced typecheck, production build, bundle
  budget, production edge smoke, local browser-smoke explicit skip, portal
  runtime/SSR suites, Python standard tests (`Ran 473 tests, OK`), and schema
  quality gate.

2026-05-03 API Reference Playground auth/network production browser DOM hardening pass:

Commands:

```powershell
node scripts\run-claw-router-application.test.mjs
python -B -m unittest tests.test_api_reference_playground_standard
node --check apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs
pnpm.cmd verify
```

Results:

- Issue found: the production browser DOM matrix proved successful
  object/primitive playground responses, managed-header rejection, Save
  Response, Copy Response, `Send and Download`, and drawer close behavior, but
  it still did not prove that the visible Authorization tab could switch to
  Bearer Token mode and produce the correct outgoing `Authorization` header.
  That was a security boundary because the request builder intentionally uses
  `credentials: include` for current-session auth and `credentials: omit` for
  API-key auth.
- Issue found: playground network failure handling existed in component source,
  but the production browser smoke did not force a deterministic failed fetch.
  A deployed regression could have left developers without a clear `Network
  Error` response state when CORS or upstream connectivity fails.
- TDD evidence: after adding product/source standards,
  `node scripts\run-claw-router-application.test.mjs` failed on the missing
  `/api-reference?__browser-smoke-playground-api-key-auth=1` route contract,
  and `python -B -m unittest tests.test_api_reference_playground_standard`
  failed on the same missing auth/network smoke coverage. After implementing
  the fixture modes, DOM helpers, and route assertions, both commands passed.
- Solution applied: `smoke-production-browser.mjs` now adds
  `/api-reference?__browser-smoke-playground-api-key-auth=1` with
  `API_PLAYGROUND_AUTH_FIXTURE_MODE`. The route opens `Try it out`, switches
  Authorization to `Bearer Token`, enters `browser-smoke-api-key` through a
  password input, sends the real browser `fetch`, and requires the CDP fixture
  to observe `Authorization: Bearer browser-smoke-api-key` before returning
  `Browser smoke API key auth response`.
- Solution applied: the same auth route asserts the API key is not present in
  `document.body.innerText`, so a future regression cannot render the secret
  into visible response/body text and still pass the smoke contract.
- Solution applied: `smoke-production-browser.mjs` now adds
  `/api-reference?__browser-smoke-playground-network-error=1` with
  `API_PLAYGROUND_NETWORK_FAILURE_FIXTURE_MODE`. The CDP fixture returns
  `networkErrorReason: "ConnectionFailed"`, and the Fetch interceptor calls
  `Fetch.failRequest` with `errorReason: fixture.networkErrorReason`, forcing
  the component's catch path. The route requires `0 Network Error` and the
  CORS/unreachable-server hint.
- Fresh verification evidence: `node scripts\run-claw-router-application.test.mjs`
  passed 36 checks.
- Fresh verification evidence: `python -B -m unittest
  tests.test_api_reference_playground_standard` ran 5 tests, OK.
- Fresh syntax check evidence: `node --check
  apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs`
  exited successfully.
- Fresh full gate evidence: `pnpm.cmd verify` exited successfully. The gate
  included Rust format, Rust warnings-as-errors compile, generated SDK guard,
  project skill guard, architecture guards, OpenAPI and payload SDK audits,
  frontend static source manifest check, frontend contract/schema/Flyway/java
  legacy audits, frontend source hygiene, forced portal typecheck, production
  build, bundle budget audit, production edge smoke, production browser DOM
  smoke with the local explicit `[browser-smoke] skipped: Unable to spawn
  Chrome or Edge for browser DOM smoke: spawn EPERM`, portal runtime/SSR
  suites, Rust workspace tests, Python standard tests (`Ran 474 tests, OK`),
  and schema quality gate.

2026-05-03 Models production browser DOM hardening pass:

Commands:

```powershell
node scripts\run-claw-router-application.test.mjs
node --check apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs
node --experimental-strip-types apps\sdkwork-clawrouter-pc\models-runtime.test.ts
node apps\sdkwork-clawrouter-pc\models-ssr-smoke.test.cjs
python -B -m unittest tests.test_models_catalog_runtime_standard tests.test_frontend_source_hygiene_standard
pnpm.cmd --dir apps\sdkwork-clawrouter-pc build
cargo test -p sdkwork-clawrouter-cloud-gateway --test edge_server edge_server_can_serve_portal_dist_without_node_server
node apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs
$env:CLAWROUTER_BROWSER_SMOKE_REQUIRED='1'; node apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs
node --experimental-strip-types apps\sdkwork-clawrouter-pc\server.test.ts
python -B -m unittest tests.test_frontend_source_hygiene_standard tests.test_models_catalog_runtime_standard tests.test_workspace_delivery_standard
pnpm.cmd verify
```

Results:

- Issue found: `/models` was already SDK-backed and covered by Node runtime,
  SSR, and production HTTP smoke tests, but production browser DOM smoke still
  only checked static route text for `/models` and one encoded seed detail
  page. It did not prove runtime SDK model responses, access-group filtering,
  search no-result state, static fallback after an empty runtime response,
  encoded runtime-only detail navigation, public price-state rendering,
  performance source labeling, `Try in Playground`, or private pricing token
  exclusion in the real browser DOM.
- Solution applied: `smoke-production-browser.mjs` now defines model-specific
  `/app/v3/api/router/models` CDP fixtures with `APP_SDK_MODEL_FIXTURE_MODE`
  and `APP_SDK_MODEL_EMPTY_FIXTURE_MODE`. The success fixture includes
  reference-priced, seed-merged, and unavailable runtime models; the payload
  intentionally carries private pricing field names so the DOM gate proves the
  runtime catalog mapper does not leak them.
- Solution applied: the browser route matrix now includes
  `/models?__browser-smoke-runtime=1`,
  `/models?__browser-smoke-groups=1`,
  `/models?__browser-smoke-filter=1`,
  `/models?__browser-smoke-empty-runtime=1`,
  `/models?__browser-smoke-detail-click=1`,
  `/models/newvendor%2Fruntime-good?__browser-smoke-detail=1`, and
  `/models/unpricedvendor%2Fruntime-unpriced?__browser-smoke-unavailable-detail=1`.
  These routes verify runtime list rendering, precise filter-label clicks,
  React-compatible search input updates, static fallback, catalog-card
  navigation, encoded route resolution, public price status copy, performance
  source labels, and detail actions.
- TDD evidence: after adding the product tooling guard, `node
  scripts\run-claw-router-application.test.mjs` first failed on the missing
  `/models?__browser-smoke-runtime=1` route contract. A second RED pass then
  required the more precise `clickRouteFilterLabelByText("Enterprise exclusive")`
  helper before replacing the less-specific button click. After implementation,
  the same command passed 36 checks.
- `node --check smoke-production-browser.mjs`: passed.
- `models-runtime.test.ts`: 22 tests passed.
- `models-ssr-smoke.test.cjs`: 3 tests passed.
- `test_models_catalog_runtime_standard` plus
  `test_frontend_source_hygiene_standard`: Ran 15 tests, OK.
- `pnpm.cmd --dir apps\sdkwork-clawrouter-pc build`: passed and rebuilt
  `dist\server.mjs`; the production `models-*.js` route chunk remained about
  93.87 kB.
- `edge_server_can_serve_portal_dist_without_node_server`: passed.
- local non-required `smoke-production-browser.mjs`: explicit skip with
  `Unable to spawn Chrome or Edge for browser DOM smoke: spawn EPERM`.
- required browser smoke mode: exited 1 with
  `Unable to spawn Chrome or Edge for browser DOM smoke: spawn EPERM.
  CLAWROUTER_BROWSER_SMOKE_REQUIRED is enabled.`
- `server.test.ts`: 50 tests passed.
- `test_frontend_source_hygiene_standard`,
  `test_models_catalog_runtime_standard`, and
  `test_workspace_delivery_standard`: Ran 20 tests, OK.
- `pnpm.cmd verify`: exit code 0. The full gate passed with Rust
  format/check/tests, generated SDK and architecture guards, OpenAPI/schema
  audits, frontend source hygiene, portal forced typecheck, production build,
  bundle budget, production edge smoke, local browser-smoke explicit skip,
  portal runtime/SSR suites, Python standard tests (`Ran 470 tests, OK`), and
  schema quality gate.

2026-05-03 Courses production browser DOM hardening pass:

Commands:

```powershell
node scripts\run-claw-router-application.test.mjs
node --check apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs
node --experimental-strip-types apps\sdkwork-clawrouter-pc\courses-runtime.test.ts
python -B -m unittest tests.test_courses_runtime_standard
python -B -m unittest tests.test_frontend_source_hygiene_standard
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-courses typecheck
pnpm.cmd --dir apps\sdkwork-clawrouter-pc build
cargo test -p sdkwork-clawrouter-cloud-gateway --test edge_server edge_server_can_serve_portal_dist_without_node_server
node apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs
$env:CLAWROUTER_BROWSER_SMOKE_REQUIRED='1'; node apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs
```

Results:

- Issue found: `/courses` was schema-provenanced and covered by pure runtime
  tests plus production HTTP smoke, but production browser DOM smoke only
  checked static page text for `/courses` and `/courses/c1`. It did not prove
  real category/level/search filtering, catalog-card navigation, detail iframe
  safety, lesson-grid interaction, related-course navigation, deterministic
  discussion copy, or missing-detail fallback in the deployed browser DOM.
- Issue found: the course catalog cards used a click-only `motion.div` with a
  nested visual play `button`, which was weaker for keyboard users and shipped
  avoidable interactive-element ambiguity.
- Solution applied: `CoursesView.tsx` now wires `searchQuery` into
  `deriveCourseCatalogViewModel`, exposes an accessible `Search courses...`
  input, and renders course cards as `motion.button` navigation controls with
  explicit `aria-label` text and non-interactive decorative play overlays.
- Solution applied: `smoke-production-browser.mjs` now has course-specific DOM
  helpers for sidebar filter clicks, course-card navigation, and related-course
  navigation. The route matrix covers category filter, level filter, search
  filter, card-click navigation, detail iframe/referrer-policy safety,
  lesson-grid interaction, related-course navigation, and missing-detail
  fallback while forbidding `javascript:alert(1)`, `Math.random`, and
  `toLocaleDateString` drift tokens.
- TDD evidence: after adding the product tooling guard, `node
  scripts\run-claw-router-application.test.mjs` first failed on the missing
  `/courses?__browser-smoke-category=1` route contract. A second RED pass added
  `test_courses_catalog_cards_are_keyboard_accessible_navigation_controls`,
  which failed because `<motion.button` was absent. After implementation, the
  product guard and courses standard tests passed.
- Fresh verification evidence: product guard passed 36 checks; browser-smoke
  script syntax check passed; `courses-runtime.test.ts` passed 5 tests;
  `test_courses_runtime_standard` passed 5 tests; frontend source hygiene
  passed 3 tests; course package `tsc --noEmit` passed; portal production build
  passed and rebuilt `dist\server.mjs`; production edge smoke passed.
- Local non-required browser smoke could not launch Chrome/Edge in this
  sandbox and recorded the designed skip:
  `Unable to spawn Chrome or Edge for browser DOM smoke: spawn EPERM`.
- Required browser smoke mode exited with code 1 on this machine and reported
  `Unable to spawn Chrome or Edge for browser DOM smoke: spawn EPERM.
  CLAWROUTER_BROWSER_SMOKE_REQUIRED is enabled.`

2026-05-03 Forum production browser DOM hardening pass:

Commands:

```powershell
node scripts\run-claw-router-application.test.mjs
node --check apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs
node --experimental-strip-types apps\sdkwork-clawrouter-pc\forum-runtime.test.ts
python -B -m unittest tests.test_forum_runtime_standard
python -B -m unittest tests.test_frontend_source_hygiene_standard tests.test_forum_runtime_standard
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-forum typecheck
pnpm.cmd --dir apps\sdkwork-clawrouter-pc build
cargo test -p sdkwork-clawrouter-cloud-gateway --test edge_server edge_server_can_serve_portal_dist_without_node_server
node apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs
$env:CLAWROUTER_BROWSER_SMOKE_REQUIRED='1'; node apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs
```

Results:

- Issue found: `/forum` was schema-provenanced and covered by pure runtime
  tests plus production HTTP smoke, but production browser DOM smoke only
  checked static page text for `/forum` and `/forum/1`. It did not prove
  category filtering, search filtering, top-sort ordering, post-card
  navigation, detail rendering, related-discussion navigation, missing-detail
  fallback, deterministic comment copy, or empty-result behavior in the
  deployed browser DOM.
- Issue found: the forum catalog search control lacked an explicit accessible
  label, filter/sort buttons lacked explicit `type="button"`, and search with
  zero matches rendered an empty content area instead of a clear commercial
  empty state.
- Solution applied: `ForumView.tsx` now exposes an accessible search input,
  explicit button types for New Discussion/category/sort controls, and a
  `No discussions found` empty state with deterministic guidance copy.
- Solution applied: `smoke-production-browser.mjs` now has forum-specific DOM
  helpers for category clicks, sort clicks, post-card navigation, and
  related-discussion navigation. The route matrix covers
  `/forum?__browser-smoke-category=1`,
  `/forum?__browser-smoke-search=1`,
  `/forum?__browser-smoke-empty=1`,
  `/forum?__browser-smoke-sort=1`,
  `/forum?__browser-smoke-card-click=1`,
  `/forum/1?__browser-smoke-detail=1`,
  `/forum/1?__browser-smoke-related=1`, and
  `/forum/__browser-smoke-missing`.
- TDD evidence: after adding the product tooling guard, `node
  scripts\run-claw-router-application.test.mjs` first failed on the missing
  `/forum?__browser-smoke-category=1` route contract. A second RED pass added
  the forum empty-state/accessibility standard and the
  `/forum?__browser-smoke-empty=1` browser route; both failed before
  implementation and passed after the page and smoke changes.
- Fresh verification evidence: product guard passed 36 checks; browser-smoke
  script syntax check passed; `forum-runtime.test.ts` passed 5 tests;
  `test_forum_runtime_standard` passed 5 tests; frontend source hygiene plus
  forum standards passed 8 tests; forum package `tsc --noEmit` passed; portal
  production build passed and rebuilt `dist\server.mjs`; production server
  smoke passed.
- Local non-required browser smoke could not launch Chrome/Edge in this
  sandbox and recorded the designed skip:
  `Unable to spawn Chrome or Edge for browser DOM smoke: spawn EPERM`.
- Required browser smoke mode exited with code 1 on this machine and reported
  `Unable to spawn Chrome or Edge for browser DOM smoke: spawn EPERM.
  CLAWROUTER_BROWSER_SMOKE_REQUIRED is enabled.`

2026-05-03 SDK-backed App Center and Skills Hub browser success-state hardening pass:

```powershell
node scripts\run-claw-router-application.test.mjs
pnpm.cmd --dir apps\sdkwork-clawrouter-pc build
node --experimental-strip-types apps\sdkwork-clawrouter-pc\app-runtime.test.ts
node --experimental-strip-types apps\sdkwork-clawrouter-pc\skills-runtime.test.ts
python -B -m unittest tests.test_app_center_runtime_standard tests.test_skills_runtime_standard
cargo test -p sdkwork-clawrouter-cloud-gateway --test edge_server edge_server_can_serve_portal_dist_without_node_server
node apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs
$env:CLAWROUTER_BROWSER_SMOKE_REQUIRED="1"; node apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs; $exit=$LASTEXITCODE; Remove-Item Env:\CLAWROUTER_BROWSER_SMOKE_REQUIRED; exit $exit
node --experimental-strip-types apps\sdkwork-clawrouter-pc\server.test.ts
pnpm.cmd verify
```

Results:

- Issue found: the browser DOM smoke had SDK-backed App Center and Skills Hub
  failure-state coverage, but successful SDK/API responses were still not
  exercised in a real browser release gate. Because the portal production
  server intentionally does not provide `/app/v3/api`, a naive local success
  test would either keep failing or require adding mock API routes to the
  production server.
- Solution applied: `smoke-production-browser.mjs` now defines
  `APP_SDK_BROWSER_FIXTURES` and installs a route-scoped CDP `Fetch`
  interceptor. The interceptor fulfills only `/app/v3/api/app/store`,
  `/app/v3/api/app/store/categories`,
  `/app/v3/api/app/store/__browser-smoke-success`, `/app/v3/api/skills`,
  `/app/v3/api/skills/categories`, and
  `/app/v3/api/skills/__browser-smoke-success` while a success-fixture route is
  active. Other browser routes continue to use the real network behavior.
- The success routes now cover `/apps`, `/apps/__browser-smoke-success`,
  `/skills-hub`, and `/skills-hub/__browser-smoke-success` with successful
  fixture tokens such as `Browser Smoke App`, `Smoke Systems`, `PC Web`,
  `https://apps.example.test/browser-smoke-app`, `Browser Smoke Skill`,
  `https://registry.clawhub.io`, and
  `npx clawhub@latest install browser-smoke-skill`.
- The implementation keeps UI and SDK service code unchanged, avoids raw
  frontend HTTP additions, avoids production mock endpoints, and keeps the
  `/app/v3/api` request path inside the generated `@sdkwork/clawrouter-app-sdk`
  client.
- TDD evidence: after adding the product tooling guard, `node
  scripts\run-claw-router-application.test.mjs` failed on missing
  `/apps/__browser-smoke-success`; after implementing the CDP fixture
  interceptor and success routes, the same command passed with 36 checks.
- `pnpm.cmd --dir apps\sdkwork-clawrouter-pc build`: production build
  passed and emitted `dist\server.mjs`.
- `node --experimental-strip-types apps\sdkwork-clawrouter-pc\app-runtime.test.ts`:
  5 passed, 0 failed.
- `node --experimental-strip-types apps\sdkwork-clawrouter-pc\skills-runtime.test.ts`:
  5 passed, 0 failed.
- `python -B -m unittest tests.test_app_center_runtime_standard tests.test_skills_runtime_standard`:
  15 tests passed, 0 failed.
- `cargo test -p sdkwork-clawrouter-cloud-gateway --test edge_server edge_server_can_serve_portal_dist_without_node_server`:
  production HTTP smoke passed at `http://127.0.0.1:3200`.
- `node apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs`:
  local non-required run started the production server and then emitted
  `[browser-smoke] skipped: Unable to spawn Chrome or Edge for browser DOM
  smoke: spawn EPERM`, which is the current machine limitation.
- required browser smoke mode: exited with code 1 on this machine and reported
  `CLAWROUTER_BROWSER_SMOKE_REQUIRED is enabled`, so CI/release still fails
  when real-browser evidence is missing.
- `node --experimental-strip-types apps\sdkwork-clawrouter-pc\server.test.ts`:
  50 passed, 0 failed.
- `pnpm.cmd verify`: passed with exit code 0. The run included Rust format,
  Rust warnings-as-errors compile, product tooling tests, generated SDK guards,
  architecture guards, OpenAPI/payload/schema/Flyway/frontend audits, forced
  portal typecheck, production build, bundle budget, production HTTP smoke,
  production browser DOM smoke with the local explicit skip, portal runtime
  suites, Rust workspace tests, 470 Python standard tests, and schema quality
  gate.

2026-05-03 SDK-backed browser DOM route coverage hardening pass:

```powershell
node scripts\run-claw-router-application.test.mjs
node apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs
$env:CLAWROUTER_BROWSER_SMOKE_REQUIRED="1"; node apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs; $exit=$LASTEXITCODE; Remove-Item Env:\CLAWROUTER_BROWSER_SMOKE_REQUIRED; exit $exit
pnpm.cmd --dir apps\sdkwork-clawrouter-pc build
cargo test -p sdkwork-clawrouter-cloud-gateway --test edge_server edge_server_can_serve_portal_dist_without_node_server
node --experimental-strip-types apps\sdkwork-clawrouter-pc\server.test.ts
python -B -m unittest tests.test_app_center_runtime_standard tests.test_skills_runtime_standard
pnpm.cmd verify
```

Results:

- Issue found: the production browser DOM smoke release gate covered static and
  model routes but did not cover SDK-backed App Center or Skills Hub routes.
  It also read route text immediately after React root detection, which could
  assert too early for async SDK-backed failure states.
- Solution applied: `smoke-production-browser.mjs` now includes `/apps`,
  `/apps/app-1`, `/skills-hub`, and `/skills-hub/skill-1` in
  `BROWSER_SMOKE_ROUTES`, requiring the retryable failure UI tokens
  `Apps could not be loaded`, `App details could not be loaded`,
  `Skills could not be loaded`, and `Skill details could not be loaded`.
  `waitForRouteTextTokens` now waits on `document.body.innerText` until each
  route's required tokens are present before final assertions.
- `node scripts\run-claw-router-application.test.mjs`: 36 product tooling tests
  passed, including the guard that requires the new SDK-backed browser route
  coverage and async token-wait helper.
- `node apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs`:
  local non-required run started the production server and then emitted
  `[browser-smoke] skipped: Unable to spawn Chrome or Edge for browser DOM
  smoke: spawn EPERM`, which is the expected local sandbox limitation.
- required browser smoke mode: exited with code 1 on this machine and reported
  `CLAWROUTER_BROWSER_SMOKE_REQUIRED is enabled`, proving CI/release can fail
  missing browser evidence instead of silently skipping it.
- `pnpm.cmd --dir apps\sdkwork-clawrouter-pc build`: production build
  passed and emitted `dist\server.mjs`.
- `cargo test -p sdkwork-clawrouter-cloud-gateway --test edge_server edge_server_can_serve_portal_dist_without_node_server`:
  production HTTP smoke passed at `http://127.0.0.1:3200`.
- `node --experimental-strip-types apps\sdkwork-clawrouter-pc\server.test.ts`:
  50 passed, 0 failed.
- `python -B -m unittest tests.test_app_center_runtime_standard tests.test_skills_runtime_standard`:
  15 tests passed, 0 failed.
- `pnpm.cmd verify`: passed with exit code 0. The run included Rust format,
  Rust warnings-as-errors compile, product tooling tests, generated SDK guards,
  architecture guards, OpenAPI/payload/schema/Flyway/frontend audits, forced
  portal typecheck, production build, bundle budget, production HTTP smoke,
  production browser DOM smoke with the local explicit skip, portal runtime
  suites, Rust workspace tests, 470 Python standard tests, and schema quality
  gate.

2026-05-03 production browser DOM smoke route-matrix and locale hardening pass:

```powershell
node scripts\run-claw-router-application.test.mjs
python -B -m unittest tests.test_courses_runtime_standard
node --experimental-strip-types apps\sdkwork-clawrouter-pc\courses-runtime.test.ts
node apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs
$env:CLAWROUTER_BROWSER_SMOKE_REQUIRED="1"; node apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs; $exit=$LASTEXITCODE; Remove-Item Env:\CLAWROUTER_BROWSER_SMOKE_REQUIRED; exit $exit
cargo test -p sdkwork-clawrouter-cloud-gateway --test edge_server edge_server_can_serve_portal_dist_without_node_server
node --experimental-strip-types apps\sdkwork-clawrouter-pc\server.test.ts
pnpm.cmd --dir apps\sdkwork-clawrouter-pc typecheck --force
pnpm.cmd --dir apps\sdkwork-clawrouter-pc build
pnpm.cmd verify
pnpm.cmd test:postgres
pnpm.cmd test:postgres:docker
```

Results:

- `node scripts\run-claw-router-application.test.mjs`: 36 product tooling tests
  passed. The verification plan now has an executable guard requiring
  `portal production browser DOM smoke` to run after `portal production server
  smoke` and before `portal server tool API tests`; the guard also requires the
  browser smoke to use a centralized `BROWSER_SMOKE_ROUTES` matrix, cover
  `/rankings`, `/courses`, `/courses/c1`, `/forum`, and `/forum/1`, and fix
  browser locale to `en-US`.
- `python -B -m unittest tests.test_courses_runtime_standard`: 4 tests passed.
  The course detail page now uses the shared `courses.aboutThisCourse` i18n
  copy instead of a separate hard-coded `Course overview` label.
- `node --experimental-strip-types apps\sdkwork-clawrouter-pc\courses-runtime.test.ts`:
  5 tests passed, confirming course catalog/detail runtime derivation remains
  deterministic after the UI copy standardization.
- `smoke-production-browser.mjs`: passed the local non-required path by
  starting the built production server and then emitting the explicit skip
  `[browser-smoke] skipped: Unable to spawn Chrome or Edge for browser DOM
  smoke: spawn EPERM`. This is an environment limitation in this sandbox, not
  an application failure.
- required browser smoke mode: exited with code 1 on this machine and reported
  `CLAWROUTER_BROWSER_SMOKE_REQUIRED is enabled`, proving CI/release can make
  missing browser evidence fail the gate instead of silently skipping.
- production edge smoke: passed at `http://127.0.0.1:3200`.
- `server.test.ts`: 50 passed, 0 failed.
- portal forced typecheck: 27 tasks passed.
- portal production build: passed and emitted `dist\server.mjs`.
- `pnpm.cmd verify`: passed on the updated code and documentation. The sequence
  included Rust format, Rust warnings-as-errors compile, product tooling tests,
  commercial contract guardians, frontend source hygiene, forced portal
  typecheck, production build, bundle budget audit, production HTTP smoke,
  production browser DOM smoke, portal runtime suites, Rust workspace tests,
  468 Python standard tests, and schema quality gate.
- `pnpm.cmd test:postgres`: passed the env-gated local path. The Rust Postgres
  suites compiled and ran 11 SQL contract tests through the configured skip
  contract path because `SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL` is not set.
- `pnpm.cmd test:postgres:docker`: blocked by local environment. Docker
  preflight failed with `spawn EPERM`, so real Docker-backed Postgres evidence
  still requires Docker Desktop or a compatible Docker engine.

2026-05-03 runtime deployment hardening pass:

```powershell
node --experimental-strip-types apps\sdkwork-clawrouter-pc\server.test.ts
pnpm.cmd --dir apps\sdkwork-clawrouter-pc build
pnpm.cmd --dir apps\sdkwork-clawrouter-pc typecheck --force
cargo test -p sdkwork-clawrouter-cloud-gateway --test edge_server edge_server_can_serve_portal_dist_without_node_server
pnpm.cmd verify
pnpm.cmd test:postgres
pnpm.cmd test:postgres:docker
```

Results:

- `server.test.ts`: 50 passed, 0 failed. Runtime env tests covered
  `PORTAL_PUBLIC_*` mapping, URL/boolean validation, safe JavaScript
  serialization, HTML script order, CSP runtime origin inclusion, and static
  middleware `index: false` boundaries.
- portal production build: passed and emitted `dist\server.mjs`.
- portal forced typecheck: 27 tasks passed when run sequentially. A previous
  parallel local run overlapped `typecheck` with `build` and produced transient
  missing `dist/assets/*.js` reads; the standard ordered `pnpm.cmd verify`
  sequence avoids that race.
- production edge smoke: passed at `http://127.0.0.1:3200`, including
  `/runtime-env.js`, no-store cache policy, strict security headers, SPA
  fallback, production bundle asset cache policy, route chunk semantics, and
  local tool API default-disable/opt-in validation.
- `pnpm.cmd verify`: passed. It covered Rust format, Rust warnings-as-errors
  compilation, product tooling tests, SDK/skill/architecture guards,
  OpenAPI/payload/schema/Flyway/frontend audits, portal typecheck, production
  build, bundle budget audit, production edge smoke, portal runtime suites,
  Rust workspace tests, 468 Python standard tests, and schema quality gate.
- `pnpm.cmd test:postgres`: passed the env-gated local path; 11 Postgres SQL
  contract tests compiled/executed through the configured skip contract path.
- `pnpm.cmd test:postgres:docker`: blocked by local environment. Docker
  preflight failed with `spawn EPERM`, so real Docker-backed Postgres evidence
  still requires Docker Desktop or a compatible Docker engine.

Latest commands executed in this pass:

```powershell
python -B -m tools.api_contract_manifest
python -B -m tools.clawrouter_openapi_generator
apps\sdkwork-clawrouter-pc\node_modules\.bin\sdkgen.cmd generate -i generated\openapi\clawrouter-app-openapi.json -o sdks\clawrouter-app-sdk -n clawrouter-app-sdk -t app -l typescript --base-url http://localhost:18082 --api-prefix /app/v3/api --package-name @sdkwork/clawrouter-app-sdk --description "SDKWork Claw Router app API SDK" --fixed-sdk-version 0.1.3 --no-sync-published-version
python -B -m tools.frontend_field_audit
python -B -m tools.clawrouter_sdk_runtime_standardizer
node scripts\verify-claw-router-application.mjs
python -B -m unittest discover tests
python -B -m unittest tests.test_frontend_source_hygiene_standard tests.test_models_catalog_runtime_standard tests.test_workspace_delivery_standard
pnpm.cmd --dir apps\sdkwork-clawrouter-pc run check
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-models typecheck
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-i18n typecheck
node --experimental-strip-types apps\sdkwork-clawrouter-pc\models-runtime.test.ts
node --experimental-strip-types apps\sdkwork-clawrouter-pc\rankings-runtime.test.ts
node --experimental-strip-types apps\sdkwork-clawrouter-pc\courses-runtime.test.ts
node --experimental-strip-types apps\sdkwork-clawrouter-pc\forum-runtime.test.ts
node --experimental-strip-types apps\sdkwork-clawrouter-pc\commons-runtime.test.ts
node --experimental-strip-types apps\sdkwork-clawrouter-pc\skills-runtime.test.ts
node --experimental-strip-types apps\sdkwork-clawrouter-pc\app-runtime.test.ts
node --experimental-strip-types apps\sdkwork-clawrouter-pc\api-reference-playground-runtime.test.ts
node apps\sdkwork-clawrouter-pc\api-reference-ssr-smoke.test.cjs
node --experimental-strip-types apps\sdkwork-clawrouter-pc\console-routing-runtime.test.ts
node --experimental-strip-types apps\sdkwork-clawrouter-pc\admin-group-runtime.test.ts
node --experimental-strip-types apps\sdkwork-clawrouter-pc\admin-user-runtime.test.ts
node apps\sdkwork-clawrouter-pc\models-ssr-smoke.test.cjs
node --experimental-strip-types apps\sdkwork-clawrouter-pc\server.test.ts
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-api-reference typecheck
pnpm.cmd --dir apps\sdkwork-clawrouter-pc typecheck --force
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawroutes-pc-commons typecheck
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-console-routing typecheck
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-admin-group typecheck
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-app-center typecheck
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-courses typecheck
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-forum typecheck
python -B -m unittest tests.test_courses_runtime_standard
python -B -m unittest tests.test_forum_runtime_standard
python -B -m unittest tests.test_skills_runtime_standard
python -B -m unittest tests.test_app_center_runtime_standard
python -B -m unittest tests.test_api_reference_playground_standard
python -B -m unittest tests.test_frontend_request_token_standard
python -B -m unittest tests.test_console_routing_runtime_standard tests.test_frontend_request_token_standard
python -B -m unittest tests.test_admin_group_runtime_standard
python -B -m unittest tests.test_admin_user_runtime_standard
python -B -m unittest tests.test_frontend_field_audit tests.test_admin_user_runtime_standard tests.test_admin_group_runtime_standard
python -B -m unittest tests.test_frontend_field_audit tests.test_admin_group_runtime_standard
python -B -m unittest tests.test_workspace_delivery_standard tests.test_admin_group_runtime_standard tests.test_console_routing_runtime_standard tests.test_frontend_request_token_standard
python -B -m unittest tests.test_courses_runtime_standard tests.test_frontend_route_classification_standard tests.test_frontend_static_source_manifest
python -B -m unittest tests.test_frontend_route_classification_standard tests.test_frontend_static_source_manifest tests.test_forum_runtime_standard
python -B -m tools.frontend_static_source_manifest --check
node apps\sdkwork-clawrouter-pc\scripts\audit-bundle-budget.mjs
python -B -m unittest tests.test_frontend_field_audit
python -B -m tools.frontend_field_audit
python -B -m tools.frontend_field_audit --check
git diff --check -- CHECK_RESULT.md apps/sdkwork-clawrouter-pc/models-runtime.test.ts apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/modelCatalog.ts apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/pages/ModelDetails.tsx apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/pages/Models.tsx apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-i18n/src/index.ts tests/test_models_catalog_runtime_standard.py
node scripts\run-claw-router-application.test.mjs
node .\bin\publish-core.mjs --language typescript --project-dir . --action check
node .\bin\publish-core.mjs --language typescript --project-dir . --action build
python -B -m unittest tests.test_frontend_route_classification_standard tests.test_models_catalog_runtime_standard tests.test_rankings_runtime_standard
python -B -m unittest tests.test_courses_runtime_standard tests.test_rankings_runtime_standard tests.test_models_catalog_runtime_standard tests.test_frontend_route_classification_standard tests.test_frontend_source_hygiene_standard tests.test_frontend_static_source_manifest tests.test_workspace_delivery_standard
python -B -m unittest tests.test_clawrouter_openapi_precision_audit
python -B -m unittest tests.test_clawrouter_sdk_guardian
python -B -m tools.clawrouter_openapi_precision_audit
python -B -m tools.frontend_field_audit --check
python -B -m tools.frontend_operation_audit --check
python -B -m tools.frontend_static_source_manifest --check
python -B -m tools.schema_quality_gate
python -B -m tools.clawrouter_sdk_guardian
python -B -m tools.clawrouter_openapi_generator --check
python -B -m tools.api_contract_manifest --check
cargo test -p sdkwork-clawrouter-router-service app_model_catalog_route --test app_model_catalog_api
cargo test -p sdkwork-clawrouter-standalone-gateway injected_product_catalog_serves_app_model_catalog_without_secret_material --test api_key_route
```

Observed result:

```text
node scripts\verify-claw-router-application.mjs
Full standard verification sequence completed with exit code 0:
rust format, rust warnings-as-errors compile, tooling contract tests,
commercial contract guardians, forced portal typecheck, production build,
bundle budget audit, production edge smoke, portal server tests, models
runtime tests, rankings runtime tests, courses runtime tests, forum runtime
tests, commons runtime tests, skills runtime tests, app center runtime tests,
api reference playground runtime tests, console routing runtime tests, admin
group runtime tests, api reference SSR smoke tests, models SSR smoke tests,
Rust workspace tests, Python standard tests, schema quality gate;
frontend source hygiene is an explicit fast-fail step before portal typecheck

python -B -m unittest discover tests
Ran 468 tests
OK

python -B -m unittest tests.test_frontend_source_hygiene_standard tests.test_models_catalog_runtime_standard tests.test_workspace_delivery_standard
Ran 20 tests
OK

pnpm.cmd --dir apps\sdkwork-clawrouter-pc run check
turbo run typecheck: 17 successful, 17 total
vite production build completed and built dist\server.mjs

pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-models typecheck
tsc --noEmit passed

pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-i18n typecheck
tsc --noEmit passed

node --experimental-strip-types apps\sdkwork-clawrouter-pc\models-runtime.test.ts
22 passed

node --experimental-strip-types apps\sdkwork-clawrouter-pc\rankings-runtime.test.ts
5 passed

node --experimental-strip-types apps\sdkwork-clawrouter-pc\courses-runtime.test.ts
5 passed

node --experimental-strip-types apps\sdkwork-clawrouter-pc\forum-runtime.test.ts
5 passed

node --experimental-strip-types apps\sdkwork-clawrouter-pc\commons-runtime.test.ts
4 passed

node --experimental-strip-types apps\sdkwork-clawrouter-pc\skills-runtime.test.ts
5 passed

node --experimental-strip-types apps\sdkwork-clawrouter-pc\app-runtime.test.ts
5 passed

node --experimental-strip-types apps\sdkwork-clawrouter-pc\api-reference-playground-runtime.test.ts
6 passed

node apps\sdkwork-clawrouter-pc\api-reference-ssr-smoke.test.cjs
3 passed

node --experimental-strip-types apps\sdkwork-clawrouter-pc\console-routing-runtime.test.ts
3 passed

node --experimental-strip-types apps\sdkwork-clawrouter-pc\admin-group-runtime.test.ts
3 passed

node --experimental-strip-types apps\sdkwork-clawrouter-pc\admin-user-runtime.test.ts
3 passed

node apps\sdkwork-clawrouter-pc\models-ssr-smoke.test.cjs
3 passed

node --experimental-strip-types apps\sdkwork-clawrouter-pc\server.test.ts
43 passed

pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-api-reference typecheck
tsc --noEmit passed

pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawroutes-pc-commons typecheck
tsc --noEmit passed

pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-console-routing typecheck
tsc --noEmit passed

pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-admin-group typecheck
tsc --noEmit passed

pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-admin-user typecheck
tsc --noEmit passed

pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-app-center typecheck
tsc --noEmit passed

pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-courses typecheck
tsc --noEmit passed

pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-forum typecheck
tsc --noEmit passed

python -B -m unittest tests.test_courses_runtime_standard
Ran 4 tests
OK

python -B -m unittest tests.test_forum_runtime_standard
Ran 4 tests
OK

python -B -m unittest tests.test_skills_runtime_standard
Ran 6 tests
OK

python -B -m unittest tests.test_app_center_runtime_standard
Ran 7 tests
OK

python -B -m unittest tests.test_api_reference_playground_standard
Ran 2 tests
OK

python -B -m unittest tests.test_frontend_request_token_standard
Ran 2 tests
OK

python -B -m unittest tests.test_courses_runtime_standard tests.test_frontend_route_classification_standard tests.test_frontend_static_source_manifest
Ran 11 tests
OK

python -B -m unittest tests.test_frontend_route_classification_standard tests.test_frontend_static_source_manifest tests.test_forum_runtime_standard
Ran 11 tests
OK

python -B -m unittest tests.test_frontend_field_audit
Ran 10 tests
OK

python -B -m tools.frontend_field_audit
Wrote frontend field audit to generated\schema\frontend\frontend-field-audit.json

python -B -m tools.frontend_field_audit --check
Frontend field audit is current

git diff --check -- CHECK_RESULT.md apps/sdkwork-clawrouter-pc/models-runtime.test.ts apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/modelCatalog.ts apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/pages/ModelDetails.tsx apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-models/src/pages/Models.tsx apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-i18n/src/index.ts tests/test_models_catalog_runtime_standard.py
passed

cargo test -p sdkwork-clawrouter-cloud-gateway --test edge_server edge_server_can_serve_portal_dist_without_node_server
passed; production `models-*.js` chunk includes runtime SDK loading,
filter/reset/group/show-more catalog semantics, detail source labels, safe SDK
example serialization, and excludes private pricing tokens; production
`rankings-*.js` keeps deterministic snapshot derivation and published-snapshot
copy while excluding old realtime copy; production `courses-*.js` keeps the
release-bound course snapshot, deterministic detail derivation, safe Bilibili
URL builder, course lessons copy, related-course copy, and snapshot date
`2026-05-03` while excluding `Math.random`, `new Date()`,
`toLocaleDateString`, and protocol-relative iframe construction; production
`forum-*.js` keeps forum snapshot metadata, catalog/detail derivation, related
discussion copy, and snapshot date `2026-05-03` while excluding
`window.location.href`, `toLocaleString`, component-local seed posts, and
component-local detail seed content; production `app-center-*.js` keeps
generated app SDK loading, runtime normalization, catalog/detail derivation,
release date formatting, and real release download semantics while excluding
the removed App Center static seed source

portal production build
models route chunk is approximately 93.87 kB in the latest production build;
it remains below the earlier chart-backed route chunk of approximately 94.56 kB
after removing detail-page chart rendering and the `recharts` dependency path
courses route chunk is approximately 52.58 kB in the latest production build
forum route chunk is approximately 36.33 kB in the latest production build
app center route chunk is approximately 46.99 kB in the latest production
build, with gzip approximately 9.22 kB

python -B -m tools.frontend_static_source_manifest --check
Frontend static source manifest is current

node apps\sdkwork-clawrouter-pc\scripts\audit-bundle-budget.mjs
Portal bundle budget passed

node scripts\run-claw-router-application.test.mjs
26 passed

node .\bin\publish-core.mjs --language typescript --project-dir . --action check
npm pack --dry-run completed for @sdkwork/clawrouter-app-sdk@0.1.3

node .\bin\publish-core.mjs --language typescript --project-dir . --action build
npm install, npm run build completed for @sdkwork/clawrouter-app-sdk@0.1.3

python -B -m unittest tests.test_frontend_route_classification_standard tests.test_models_catalog_runtime_standard
Ran 16 tests
OK

python -B -m unittest tests.test_frontend_route_classification_standard tests.test_models_catalog_runtime_standard tests.test_rankings_runtime_standard
Ran 19 tests
OK

python -B -m unittest tests.test_courses_runtime_standard tests.test_rankings_runtime_standard tests.test_models_catalog_runtime_standard tests.test_frontend_route_classification_standard tests.test_frontend_source_hygiene_standard tests.test_frontend_static_source_manifest tests.test_workspace_delivery_standard
Ran 34 tests
OK

python -B -m unittest tests.test_clawrouter_openapi_precision_audit
Ran 5 tests
OK

python -B -m unittest tests.test_clawrouter_sdk_guardian
Ran 7 tests
OK

Frontend field audit is current
Frontend operation audit is current
Frontend static source manifest is current
Schema quality gate passed
ClawRouter generated SDKs passed
ClawRouter project skills passed
Architecture standard guardian passed
Rust backend architecture guardian passed
ClawRouter OpenAPI precision audit passed
ClawRouter payload SDK audit passed
Frontend contract guardian passed
Schema guardian passed
Flyway schema contract audit passed
ClawRouter OpenAPI specs are current
API contract manifest is current

cargo test -p sdkwork-clawrouter-router-service app_model_catalog_route --test app_model_catalog_api
2 passed

cargo test -p sdkwork-clawrouter-standalone-gateway injected_product_catalog_serves_app_model_catalog_without_secret_material --test api_key_route
1 passed
```

## Frontend Route Classification Standard

Command:

```powershell
python -B -m unittest tests.test_frontend_route_classification_standard
```

Observed result:

```text
Ran 4 tests
OK
```

The standard covers:

- every route in `apps/sdkwork-clawrouter-pc/src/App.tsx` has exactly one
  entry in `docs/schema-registry/frontend-route-classification.yaml`
- `sdk_backed_business_runtime` routes match their required API surface and use
  the expected generated SDK client
- `schema_provenanced_content` routes name tables already present in the schema
  manifest, cite real evidence files, match their `App.tsx` package binding,
  and do not hide runtime operations or browser network clients
- schema-provenanced content routes declare approved `static_delivery` metadata
  so static seed/catalog/reference pages have explicit freshness and upgrade
  criteria
- every static seed, generated reference, and published catalog route uses
  `source_manifest_ref`, and the generated static source manifest hash must
  match the referenced file before the route can pass delivery
- `local_developer_tool_api` routes bind browser tool endpoints to source files
  and require `VITE_TOOL_API_ENABLED` plus `TOOL_API_ENABLED`
- every local tool raw browser `fetch` source is declared in
  `browser_network_sources`; generated code snippet strings are ignored so only
  browser runtime calls are inventoried
- each `browser_network_sources` entry uses the standard endpoint purpose, and
  `external_runtime_request` is isolated to an `ApiPlayground` component
- the CLI contract guard requires the classification registry during
  `pnpm.cmd verify`

## Frontend Contract Guardian Hardening

Command:

```powershell
python -B -m unittest tests.test_frontend_static_source_manifest tests.test_frontend_contract_guardian tests.test_frontend_route_classification_standard tests.test_workspace_delivery_standard
```

Observed result after this pass:

```text
Ran 59 tests
OK
```

Additional regression coverage added in this pass:

- missing route classification evidence files are rejected
- classification packages that drift from `App.tsx` lazy route imports are
  rejected
- schema-provenanced content packages or evidence files that contain browser
  runtime network client calls are rejected
- schema-provenanced content routes without `static_delivery`, or with invalid
  static delivery mode, refresh policy, staleness, or upgrade triggers, are
  rejected
- static seed, generated reference, and published catalog routes without
  `source_manifest_ref`, with inline `source_metadata`, stale generated source
  hash, non-ISO observation time, empty table set, or schema tables outside
  `provenance_tables` are rejected
- `tools.frontend_static_source_manifest --check` rejects missing or stale
  generated static source manifests before `tools.frontend_contract_guardian`
  reads them
- local tool routes with missing or stale `browser_network_sources` entries are
  rejected
- local tool routes with wrong `browser_network_sources` purposes, unsupported
  endpoints, undeclared `/api/*` tool endpoints, or external runtime requests
  outside `ApiPlayground` are rejected
- comments that merely mention network terms do not trigger false positives

## Targeted Delivery Standard

Command:

```powershell
python -B -m unittest tests.test_workspace_delivery_standard
```

Observed result after this pass:

```text
Ran 5 tests
OK
```

The standard covers:

- root package verification scripts
- optional, required, and Docker-backed Postgres integration modes
- ephemeral and health-checked Docker Postgres configuration
- dependency and build artifact ignore rules
- readable and actionable root delivery documents

## Frontend Source Hygiene Standard

Command:

```powershell
python -B -m unittest tests.test_frontend_source_hygiene_standard
```

Observed result:

```text
Ran 3 tests
OK
```

The standard covers:

- no mock/fake business naming in production portal source
- no known mojibake UI text markers in portal source
- no browser runtime console logging outside copyable documentation examples
- product verification runs this suite before portal typecheck and production
  build

## Models Catalog Runtime Standard

Command:

```powershell
python -B -m unittest tests.test_models_catalog_runtime_standard
```

Observed result:

```text
Ran 12 tests
OK
```

The standard covers:

- `/models` group filtering must live in a testable pure module instead of
  inline page logic
- the filter implementation must use model-owned group metadata rather than a
  passthrough expression
- every static catalog model must declare `groups` metadata
- the static catalog must cover the full commercial group taxonomy:
  `default`, `vip`, `enterprise`, and `beta`
- the public static model catalog seed copy must stay ASCII-only, preventing
  user-visible catalog text from producing mojibake in terminal, SSR, log, or
  delivery-report contexts
- model category labels must come from the pure catalog module, not a page-local
  constant, and every visible category must have an explicit business rule
- `/models` must have a focused app SDK service boundary backed by
  `getClawRouterAppSdkClient().router.fetchModels`
- runtime model DTO mapping must live in a pure Node-testable
  `runtimeModelCatalog.ts` module, separate from the app SDK service boundary
- `Models.tsx` must load runtime catalog models and keep `ALL_MODELS` as a
  failure fallback
- `Models.tsx` clear-filter behavior must reset search, provider search,
  provider, modality, capability, category, and group state through one named
  handler instead of a partial inline JSX state update
- `ModelCatalogFilters` defaults and reset behavior must be Node-testable pure
  functions, with fresh array instances for every default/reset call so filter
  state cannot be shared across renders or tests
- `MODEL_CATALOG_FILTER_FIELDS` must be the single registry for filter state
  keys; defaults and reset output must have exactly that key order, and the
  TypeScript mapped type must preserve precise field types instead of widening
  every filter to a broad union
- provider search must be delegated to `filterProvidersForCatalog` in the pure
  catalog module rather than implemented inline in `Models.tsx`; the behavior is
  tested for whitespace tolerance, case-insensitive matching, fresh result
  arrays, order preservation, and no mutation of the source provider list
- provider display-window behavior must be delegated to
  `resolveDisplayedProvidersForCatalog` rather than page-local ternaries or
  `slice(0, 5)` calls; the behavior is tested for the default five-provider
  limit, search-expanded display, show-all display, empty result handling, and
  source-list immutability
- provider show-more button state must be delegated to
  `resolveProviderShowMoreStateForCatalog` rather than page-local provider-count
  comparisons; the behavior is tested for search suppression, short-list
  suppression, collapsed hidden-count labels, expanded show-less labels, and
  source-list immutability; `Models.tsx` must pass `count` and `defaultValue`
  into i18n and the English catalog copy must use `Show {{count}} More`
- provider, modality, and capability sidebar filter options must be delegated to
  `deriveModelCatalogFilterOptions` rather than page-local `Set` expressions;
  the behavior is tested for unique sorted values and no mutation of model
  capabilities
- category and capability i18n label keys must be delegated to
  `modelCatalogCategoryLabelKey` and `modelCatalogCapabilityLabelKey` rather
  than page-local `toLowerCase().replace(...)` expressions; key normalization is
  tested for whitespace trimming, multi-space collapsing, and lowercase suffixes
- catalog card view derivation must be delegated to
  `deriveModelCatalogCardView` rather than page-local `encodeURIComponent`,
  description-key template strings, capability mapping, or capability label-key
  calls; the behavior is tested for encoded slash route ids, stable translated
  description keys, display metrics, capability label keys, and source model
  immutability
- catalog pricing view derivation must be delegated to
  `deriveModelCatalogPricingView` rather than page-local modality checks,
  cached-input checks, price formatting, or badge derivation; the behavior is
  tested for token input/output/cached cells, unavailable cached placeholders,
  flat non-text prices, badge labels, and reuse of the central price formatter
- `ModelDetails.tsx` must resolve details from the runtime catalog service and
  render the actual `model.id` in copyable code examples
- runtime model pricing must expose explicit status and reason metadata, unknown
  prices must not render as free, the Free category must only match explicit
  zero-priced models, Recommended/New must map to group metadata, unsupported
  category labels must not pass through, and both price sort directions keep
  unavailable pricing out of the lead positions
- public model catalog contracts and generated app SDK types must not expose
  `lowestUpstreamCostUnitPrice`, `customerUnitPrice`, `grossMarginPerUnit`,
  `pricingPlanCode`, or `groupCode`
- public app model catalog availability must expose only `reference` and
  `unavailable`; public `available` is rejected because it implies
  customer-specific price context
- `models-runtime.test.ts` must execute the public runtime mapping path and
  prove reference prices render as reference, unknown prices render as
  unavailable, empty or malformed SDK payloads cannot blank or crash the
  catalog, valid runtime rows survive mixed malformed responses, malformed
  price payloads normalize to unavailable, encoded route ids resolve without
  crashing on malformed percent escapes, unsafe runtime identifiers are
  rejected, public runtime strings are capped before rendering, blank upstream
  price reasons are normalized away, detail API examples serialize model ids as
  safe TypeScript string literals, and sensitive private pricing fields do not
  appear in serialized runtime model objects
- production edge smoke must request `/models`,
  `/models/openai/gpt-4o-mini`, and `/models/openai%2Fgpt-4o-mini`, then verify
  the built `models-*.js` route chunk contains the generated app SDK call and
  public price-status copy while excluding private pricing field tokens
- `models-ssr-smoke.test.cjs` must render `/models`,
  `/models/openai/gpt-4o-mini`, and `/models/openai%2Fgpt-4o-mini` without
  `tsx` or esbuild, proving the visible public catalog, detail route model id,
  API example, encoded catalog-card navigation path, and pricing-status copy
  are present while private pricing field tokens remain absent

## Models Runtime Node Tests

Command:

```powershell
node --experimental-strip-types apps\sdkwork-clawrouter-pc\models-runtime.test.ts
node --experimental-strip-types apps\sdkwork-clawrouter-pc\rankings-runtime.test.ts
node apps\sdkwork-clawrouter-pc\models-ssr-smoke.test.cjs
node --experimental-strip-types apps\sdkwork-clawrouter-pc\server.test.ts
node --experimental-strip-types apps\sdkwork-clawrouter-pc\courses-runtime.test.ts
node --experimental-strip-types apps\sdkwork-clawrouter-pc\forum-runtime.test.ts
node --experimental-strip-types apps\sdkwork-clawrouter-pc\skills-runtime.test.ts
node --experimental-strip-types apps\sdkwork-clawrouter-pc\app-runtime.test.ts
node --experimental-strip-types apps\sdkwork-clawrouter-pc\api-reference-playground-runtime.test.ts
node --experimental-strip-types apps\sdkwork-clawrouter-pc\console-routing-runtime.test.ts
node --experimental-strip-types apps\sdkwork-clawrouter-pc\admin-group-runtime.test.ts
cargo test -p sdkwork-clawrouter-cloud-gateway --test edge_server edge_server_can_serve_portal_dist_without_node_server
node scripts\run-claw-router-application.test.mjs
```

Observed result:

```text
models-runtime.test.ts: 22 passed
rankings-runtime.test.ts: 5 passed
models-ssr-smoke.test.cjs: 3 passed
server.test.ts: 43 passed
courses-runtime.test.ts: 5 passed
forum-runtime.test.ts: 5 passed
skills-runtime.test.ts: 5 passed
app-runtime.test.ts: 5 passed
api-reference-playground-runtime.test.ts: 3 passed
console-routing-runtime.test.ts: 3 passed
admin-group-runtime.test.ts: 3 passed
edge_server_can_serve_portal_dist_without_node_server: passed
run-claw-router-application.test.mjs: 26 passed
```

The runtime tests cover:

- public reference price mapping from `officialReferenceUnitPrice` and public
  `priceAvailability.status: "reference"`
- public model category filtering uses explicit business rules for
  `Recommended`, `Open Source`, `Proprietary`, `Free`, and `New`; unsupported
  labels do not silently match the full catalog
- filter state keys are verified against `MODEL_CATALOG_FILTER_FIELDS`, so
  future filter additions cannot skip default/reset coverage silently
- provider, modality, and capability sidebar options delegate to the pure
  `deriveModelCatalogFilterOptions` helper and are verified for unique sorted
  values without mutating source models
- category and capability label-key generation delegates to pure catalog
  helpers, covering trimmed, lowercased, multi-word i18n suffix normalization
  outside page rendering
- catalog card view derivation delegates to `deriveModelCatalogCardView`,
  covering encoded detail navigation paths, translated description keys,
  provider/name/modality/context/latency/throughput display fields, capability
  label keys, and immutable source capability arrays
- catalog pricing view derivation delegates to `deriveModelCatalogPricingView`,
  covering reference badge labels, token input/output/cached cells, unavailable
  cached-input placeholders, flat non-text price cells, and central
  `formatModelPrice` output such as `$0.050` for sub-10-cent prices
- provider search delegates to the pure `filterProvidersForCatalog` helper and
  is verified for case-insensitive, whitespace-tolerant matching without
  mutating or reusing the input provider list
- provider display-window behavior delegates to
  `resolveDisplayedProvidersForCatalog`, covering the default five-provider
  limit, search-expanded list, show-all list, empty list, fresh arrays, and
  immutable source provider lists
- provider show-more button state delegates to
  `resolveProviderShowMoreStateForCatalog`, covering search suppression,
  short-list suppression, collapsed hidden-count labels, expanded show-less
  labels, immutable source provider lists, and i18n count interpolation for the
  visible hidden-provider count
- unknown public price rendering as `-` and `unavailable`, not `$0.00` or free
- empty, null, or fully invalid runtime catalog payloads fall back to copied
  static seed models so `/models` does not render a blank marketplace
- mixed runtime catalog payloads skip malformed rows while preserving usable
  runtime-only models
- encoded catalog-card route ids such as `openai%2Fgpt-4o-mini` resolve to the
  correct model, runtime-only encoded ids resolve, and malformed percent escapes
  cannot crash route resolution
- runtime catalog rows with unsafe model/vendor identifiers are rejected, and
  public display names, capabilities, and price reasons are normalized and
  capped before rendering
- blank upstream price reasons are omitted so pricing falls back to the safe
  public unavailable reason
- malformed public price payloads and non-string price reasons normalize to
  `unavailable` with the safe public unavailable reason instead of crashing
- no `lowestUpstreamCostUnitPrice`, `customerUnitPrice`, `grossMarginPerUnit`,
  `pricingPlanCode`, or `groupCode` in serialized runtime model objects
- production `/models`, `/models/openai/gpt-4o-mini`, and
  `/models/openai%2Fgpt-4o-mini` SPA fallback routes return the built app shell
  with security/cache headers
- production `models-*.js` route chunk keeps the generated app SDK runtime call,
  public reference/unavailable price semantics, and no private pricing tokens
- production `models-*.js` route chunk keeps the user-path catalog semantics
  needed by `/models`: pure filtering, full reset, access-group filtering,
  provider show-more state, detail performance-source labels, detail i18n label
  keys, and safe SDK example string serialization
- SSR output for `/models` includes the non-empty public catalog, `Categories`,
  `Groups`, `reference / 1M tokens`, and `$0.15` without exposing private
  pricing tokens or showing the empty-state copy
- SSR output for `/models/openai/gpt-4o-mini` includes the detail route model id,
  capability introduction, API example, and playground CTA without exposing
  private pricing tokens
- SSR output for `/models/openai%2Fgpt-4o-mini` covers the encoded route used by
  catalog-card navigation and renders the same public detail content without
  exposing private pricing tokens
- product verification plan includes `portal models runtime tests` before broad
  Rust and Python suites, followed immediately by `portal rankings runtime
  tests`, `portal courses runtime tests`, public SDK route runtime tests, API
  Reference Playground runtime tests, and then `portal models SSR smoke tests`
  before those broad suites

## Rankings Runtime Standard

Command:

```powershell
node --experimental-strip-types apps\sdkwork-clawrouter-pc\rankings-runtime.test.ts
python -B -m unittest tests.test_rankings_runtime_standard
cargo test -p sdkwork-clawrouter-cloud-gateway --test edge_server edge_server_can_serve_portal_dist_without_node_server
```

Observed result:

```text
rankings-runtime.test.ts: 5 passed
test_rankings_runtime_standard: Ran 3 tests, OK
edge_server_can_serve_portal_dist_without_node_server: passed
```

The rankings hardening covers:

- `RANKING_SNAPSHOT_SOURCE` makes `/rankings` explicit as a published catalog
  snapshot observed on `2026-05-03`, while route classification keeps the
  internal provenance tables `ai_model_rank_snapshot` and `ai_usage_fact`.
- `createRankingHistory` generates 40 deterministic weekly points anchored to
  `2026-05-03`; it no longer depends on the current browser/server date.
- `filterRankingsForCatalog` trims vendor/search input, handles modality and
  license filters, returns fresh arrays, and leaves source catalog rows
  immutable.
- `deriveRankingViewModel` owns vendor counts, modality counts, chart data,
  chart keys, display ranking, panel stats, weighted latency, open-source share,
  and top-mover copy as pure Node-testable behavior.
- `Rankings.tsx` consumes `RANKING_CATALOG`, `RANKING_HISTORY`, and
  `deriveRankingViewModel`; source-standard tests reject component-local
  `rankingCatalog`, `RAW_HISTORY`, `new Date()`, `Live Volume`, and
  `Weekly API calls Tracker`.
- production smoke requests `/rankings` and checks the real `rankings-*.js`
  route chunk for snapshot labels and pure derivation tokens while rejecting the
  old realtime wording.

## Courses Runtime Standard

Command:

```powershell
node --experimental-strip-types apps\sdkwork-clawrouter-pc\courses-runtime.test.ts
python -B -m unittest tests.test_courses_runtime_standard
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-courses typecheck
python -B -m unittest tests.test_courses_runtime_standard tests.test_frontend_route_classification_standard tests.test_frontend_static_source_manifest
python -B -m tools.frontend_static_source_manifest --check
node apps\sdkwork-clawrouter-pc\scripts\audit-bundle-budget.mjs
cargo test -p sdkwork-clawrouter-cloud-gateway --test edge_server edge_server_can_serve_portal_dist_without_node_server
```

Observed result:

```text
courses-runtime.test.ts: 5 passed
test_courses_runtime_standard: Ran 5 tests, OK
sdkwork-clawrouter-pc-courses typecheck: tsc --noEmit passed
courses plus route/static manifest tests: Ran 11 tests, OK
Frontend static source manifest is current
Portal bundle budget passed
edge_server_can_serve_portal_dist_without_node_server: passed
```

The courses hardening covers:

- `COURSE_CONTENT_SNAPSHOT_SOURCE` makes `/courses` and `/courses/:id`
  explicit as a curated course content snapshot observed on `2026-05-03`, with
  provenance tables for course rows, sections, lessons, relations, and
  reactions.
- `COURSE_CATALOG`, `filterCoursesForCatalog`,
  `deriveCourseCatalogViewModel`, `deriveCourseDetailView`,
  `deriveCoursePlaylist`, `deriveCourseEngagementMetrics`,
  `formatCourseCount`, and `buildBilibiliEmbedUrl` live in
  `courseCatalog.ts`, so route behavior is Node-testable instead of embedded in
  React components.
- `CoursesView.tsx` delegates category, level, search, heading, and result
  count derivation to the pure catalog view model instead of building `Set`
  values and filtering `courseCatalog` inline.
- `CoursesView.tsx` renders course cards as keyboard-accessible
  `motion.button` navigation controls with explicit `aria-label` text, focus
  rings, and non-interactive decorative play overlays.
- `CourseDetailView.tsx` delegates course lookup, detail info, player URL,
  playlist, related cards, comments, and publisher data to
  `deriveCourseDetailView`, so missing course ids return a single predictable
  null view path.
- course detail components reject runtime drift and corrupt copy by source
  standard: no `Math.random`, `new Date()`, `toLocaleDateString`,
  `{ course: any }`, `any[]` related-course props, protocol-relative iframe
  sources, or hand-built Bilibili query strings.
- `buildBilibiliEmbedUrl` accepts only strict `BV...` identifiers and returns a
  serialized `https://player.bilibili.com/player.html` URL with fixed
  `page=1`, `high_quality=1`, and `danmaku=0` parameters.
- production smoke requests `/courses` and `/courses/c1`, then checks the real
  `courses-*.js` route chunk for snapshot metadata, catalog/detail derivation,
  playlist derivation, safe Bilibili URL construction, course lesson copy,
  related-course copy, and the release date while rejecting the old
  nondeterministic and unsafe iframe tokens.
- production browser DOM smoke now has route contracts for
  `/courses?__browser-smoke-category=1`,
  `/courses?__browser-smoke-level=1`,
  `/courses?__browser-smoke-search=1`,
  `/courses?__browser-smoke-card-click=1`,
  `/courses/c1?__browser-smoke-detail=1`,
  `/courses/c1?__browser-smoke-lesson-grid=1`,
  `/courses/c1?__browser-smoke-related=1`, and
  `/courses/__browser-smoke-missing`. These routes validate real sidebar
  filter clicks, React-compatible search input updates, catalog-card
  navigation, Bilibili iframe safety, lesson-grid controls, related-course
  navigation, deterministic snapshot labels, and missing-detail fallback while
  forbidding unsafe tokens such as `javascript:alert(1)`, `Math.random`, and
  `toLocaleDateString`.
- production server security headers now allow the intended external image and
  Bilibili frame sources through explicit CSP directives rather than relying on
  permissive defaults or silently breaking course media in production.
- the frontend field contract for `/courses` now references
  `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-courses/src/courseCatalog.ts#Course`
  directly and records `instructor.title`, `instructor.bio`, and deterministic
  engagement seed fields instead of depending on the old `data.ts` re-export
  compatibility layer.
- `tools.frontend_field_audit` now reads contract-declared sources outside the
  default scan set and expands referenced same-file object types only for those
  explicit contract sources, preserving existing audit behavior while allowing
  schema-provenanced snapshot modules to be first-class contract evidence.

## Forum Runtime Standard

Command:

```powershell
node --experimental-strip-types apps\sdkwork-clawrouter-pc\forum-runtime.test.ts
python -B -m unittest tests.test_forum_runtime_standard
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-forum typecheck
python -B -m unittest tests.test_frontend_route_classification_standard tests.test_frontend_static_source_manifest tests.test_forum_runtime_standard
python -B -m tools.frontend_static_source_manifest --check
node apps\sdkwork-clawrouter-pc\scripts\audit-bundle-budget.mjs
cargo test -p sdkwork-clawrouter-cloud-gateway --test edge_server edge_server_can_serve_portal_dist_without_node_server
node scripts\verify-claw-router-application.mjs
```

Observed result:

```text
forum-runtime.test.ts: 5 passed
test_forum_runtime_standard: Ran 4 tests, OK
sdkwork-clawrouter-pc-forum typecheck: tsc --noEmit passed
forum plus route/static manifest tests: Ran 11 tests, OK
Frontend static source manifest is current
Portal bundle budget passed
edge_server_can_serve_portal_dist_without_node_server: passed
verify-claw-router-application.mjs: exit code 0
```

The forum hardening covers:

- `FORUM_CONTENT_SNAPSHOT_SOURCE` makes `/forum` and `/forum/:id` explicit as a
  curated forum content snapshot observed on `2026-05-03`, with provenance
  tables for forum posts, comments, and reactions.
- `FORUM_POSTS`, `filterForumPostsForCatalog`,
  `deriveForumCatalogViewModel`, `deriveForumPostDetailView`,
  `countForumComments`, and `formatForumCount` live in `forumCatalog.ts`, so
  category filtering, search, sort tabs, stats, labels, count formatting,
  detail lookup, related discussions, and missing-id behavior are executable
  pure module behavior instead of JSX-local derivation.
- `ForumView.tsx` delegates category/search/sort/result-count/community-link
  derivation to the pure catalog view model, uses React Router `Link`, and
  displays the published snapshot date instead of inventing browser-time state.
- `ForumPostView.tsx` reads the actual route `id`, renders a predictable
  not-found state when no matching post exists, and derives author handles,
  view/like labels, comment totals, comments, and related discussions through
  `deriveForumPostDetailView`.
- forum source standards reject component-local `forumSeedPosts`,
  `forumSeedPostDetail`, `Math.random`, `new Date()`, `toLocaleString`,
  `toLocaleDateString`, `window.location.href`, and known mojibake fragments.
- route classification and static source manifest entries for `/forum` and
  `/forum/:id` point at
  `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-forum/src/forumCatalog.ts`,
  keeping schema provenance and hash-backed source evidence aligned.
- production smoke requests `/forum` and `/forum/1`, then checks the real
  `forum-*.js` route chunk for snapshot metadata, catalog/detail derivation,
  related-discussion copy, snapshot date, and absence of the old runtime-drift
  and component-local seed tokens.
- `scripts/verify-claw-router-application.mjs` includes `portal forum runtime
  tests`, making forum behavior part of the main commercial verification
  sequence before broad Rust and Python suites.

## App Center Runtime Standard

Command:

```powershell
node --experimental-strip-types apps\sdkwork-clawrouter-pc\app-runtime.test.ts
python -B -m unittest tests.test_app_center_runtime_standard
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-app-center typecheck
python -B -m tools.frontend_field_audit --check
python -B -m tools.frontend_operation_audit --check
python -B -m tools.frontend_static_source_manifest --check
python -B -m tools.frontend_contract_guardian
node apps\sdkwork-clawrouter-pc\scripts\audit-bundle-budget.mjs
cargo test -p sdkwork-clawrouter-cloud-gateway --test edge_server edge_server_can_serve_portal_dist_without_node_server
node scripts\verify-claw-router-application.mjs
```

Observed result:

```text
app-runtime.test.ts: 5 passed
test_app_center_runtime_standard: Ran 7 tests, OK
sdkwork-clawrouter-pc-app-center typecheck: tsc --noEmit passed
Frontend field audit is current
Frontend operation audit is current
Frontend static source manifest is current
Frontend contract guardian passed
Portal bundle budget passed
edge_server_can_serve_portal_dist_without_node_server: passed
verify-claw-router-application.mjs: exit code 0
```

The App Center hardening covers:

- `/apps` and `/apps/:id` are classified as `sdk_backed_business_runtime`
  routes backed by app-surface operations for `/app/v3/api/app/store`,
  `/app/v3/api/app/store/{appId}`, and
  `/app/v3/api/app/store/categories`.
- `appService.ts` calls the generated app SDK methods
  `getClawRouterAppSdkClient().app.getApps`,
  `getClawRouterAppSdkClient().app.getAppById`, and
  `getClawRouterAppSdkClient().app.getCategories`; the service source contains
  no raw `fetch`, axios, manual `/app/v3/api` URL, or manual authorization
  header for this route.
- `appRuntime.ts` normalizes camelCase and snake_case SDK payloads, maps assets
  and artifacts into public app/release view data, formats counts/dates without
  locale drift, filters and sorts catalog rows, derives catalog/detail views,
  and centralizes release download availability.
- the removed `packages/sdkwork-clawrouter-pc-app-center/src/data/apps.ts` static
  seed source is absent from runtime imports, field audit output, extraction
  scripts, translation application scripts, and i18n bundles.
- App Details uses real release URLs from the SDK-backed artifact shape and
  renders explicit unavailable state instead of fake progress, timers, spinners,
  or simulated download behavior.
- production smoke requests `/apps` and `/apps/app-1`, then checks the built
  `app-center-*.js` chunk for SDK loading, normalization, catalog/detail
  derivation, date formatting, and absence of the old static seed path.
- `scripts/verify-claw-router-application.mjs` includes `portal app center runtime
  tests` before broad Rust and Python suites, so this public SDK route is part
  of the main delivery gate.

## API Reference Playground Runtime Standard

Command:

```powershell
node --experimental-strip-types apps\sdkwork-clawrouter-pc\api-reference-playground-runtime.test.ts
node apps\sdkwork-clawrouter-pc\api-reference-ssr-smoke.test.cjs
python -B -m unittest tests.test_api_reference_playground_standard
node --experimental-strip-types apps\sdkwork-clawrouter-pc\server.test.ts
cargo test -p sdkwork-clawrouter-cloud-gateway --test edge_server edge_server_can_serve_portal_dist_without_node_server
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-api-reference typecheck
pnpm.cmd --dir apps\sdkwork-clawrouter-pc typecheck --force
python -B -m unittest tests.test_frontend_route_classification_standard tests.test_frontend_clipboard_standard tests.test_app_session_exchange_standard
node scripts\run-claw-router-application.test.mjs
node scripts\verify-claw-router-application.mjs
```

Observed result:

```text
api-reference-playground-runtime.test.ts: 12 passed
api-reference-ssr-smoke.test.cjs: 3 passed
test_api_reference_playground_standard: Ran 3 tests, OK
server.test.ts: 45 passed
edge_server_can_serve_portal_dist_without_node_server: Rust edge portal smoke passed at http://127.0.0.1:3900
sdkwork-clawrouter-pc-api-reference typecheck: tsc --noEmit passed
portal typecheck --force: 27 successful, 27 total
route classification plus clipboard/session tests: Ran 15 tests, OK
run-claw-router-application.test.mjs: 35 passed
verify-claw-router-application.mjs: exit 0; Rust format/check/tests, commercial
contract guardians, forced portal typecheck, production build, bundle budget,
production edge smoke, portal runtime/SSR tests, Python standard tests
(`Ran 468 tests, OK`), and schema quality gate passed
```

The API Reference Playground hardening covers:

- `apiPlaygroundRows.ts` is the pure row model for playground parameter rows,
  exporting `ParamRow`, `makeApiPlaygroundSchemaRows`,
  `makeApiPlaygroundEmptyRow`, and `parseApiPlaygroundBulkRows`.
- OpenAPI schema rows derive stable ids from parameter location, index, and
  normalized parameter name, so SSR and repeated renders do not depend on
  browser randomness.
- custom query/header rows use caller-owned local sequence ids; bulk edit rows
  use stable line indexes and a stable final empty-row id, avoiding both
  `Math.random()` and clock-based row ids for table keys.
- `createApiPlaygroundInitialState` derives deterministic query/path/header
  rows and JSON request-body defaults from the OpenAPI operation without React
  state or browser APIs.
- `extractApiPlaygroundPathTemplateVariables` parses endpoint path templates
  and `appendMissingPathTemplateRows` backfills missing path rows as required
  schema rows. This prevents an imperfect OpenAPI operation from hiding a
  required path-variable input in the Playground UI.
- `createApiPlaygroundInitialStateKey` stable-serializes method, path, and
  OpenAPI operation data so equivalent endpoint object identities do not reset
  edited playground input, while real operation changes still reset the form.
- `api-reference-ssr-smoke.test.cjs` renders the real `ApiPlayground` through
  `react-dom/server`, renders `ApiPlaygroundParamsTable` for header rows, and
  checks request-body initial state without requiring browser automation
  dependencies.
- `playgroundRequest.ts` imports `ParamRow` from the pure module instead of
  importing a React component file for types, keeping request-building logic
  independent from component runtime.
- `playgroundRequest.ts` now resolves required-field error focus by error
  location: path/query errors open Params, header errors open Headers, and
  body-only errors open Body. Missing required OpenAPI header parameters no
  longer send the user to the wrong tab.
- `playgroundRequest.ts` rejects unresolved endpoint template variables with an
  `Unresolved Path Variable` validation response on the Params tab. This keeps
  malformed `{variable}` URLs from reaching the network layer if schema
  backfilling is bypassed or stale user state remains.
- `codeSnippetClient.ts` exports
  `extractCodeSnippetPathTemplateVariables` and uses it inside
  `withRequestParameters` after OpenAPI-declared path/query substitution. Any
  remaining endpoint template variable is replaced with a stable, URL-encoded
  example value such as `gpt-4.1-mini` for model variables or `response_id` for
  response variables, so static code snippets remain directly executable even
  when the OpenAPI operation omits one path parameter.
- `FORBIDDEN_HEADER_NAMES` includes `content-type`, so custom playground header
  rows cannot replace the managed JSON `Content-Type` value. The rejection uses
  the existing `Managed Header` validation response and highlights the offending
  header row.
- `playgroundResponseDownload.ts` owns response serialization, MIME/extension
  inference, deterministic filenames such as
  `playground-response-200-ok.json`, and the browser download side effect. The
  component has only two calls to `downloadApiPlaygroundResponse()`: one for
  `Send and Download` and one for `Save Response`.
- `serializeApiPlaygroundResponseData` is the single response-body text
  contract for Copy Response, raw body rendering, response line numbers, and
  response downloads. Booleans, numbers, strings, arrays, objects, and JSON
  `null` serialize predictably, while `undefined` remains the only no-body
  value.
- `Send and Download` no longer races React state updates. `handleSend()` now
  returns the exact `PlaygroundResponse` it stored, so the download uses the
  current validation, success, or network-error response instead of a previous
  closure value.
- undefined or 204-style empty payloads do not create empty files, while JSON
  `null`, strings, objects, arrays, booleans, and numeric payloads serialize
  predictably for download.
- `edge_server_can_serve_portal_dist_without_node_server` now requests `/api-reference`, finds the
  production `api-reference-*.js` route chunk, verifies deterministic helper
  tokens including `createApiPlaygroundInitialState`,
  `createApiPlaygroundInitialStateKey`,
  `extractApiPlaygroundPathTemplateVariables`,
  `extractCodeSnippetPathTemplateVariables`, `parseApiPlaygroundBulkRows`,
  `buildPlaygroundRequest`, `FORBIDDEN_HEADER_NAMES`,
  `Unresolved Path Variable`, `resolveRequiredErrorTab`, managed `content-type`,
  `Managed Header`,
  header-tab focus tokens, `downloadApiPlaygroundResponse`, and
  `createApiPlaygroundResponseDownload`,
  `serializeApiPlaygroundResponseData`, and rejects the old clock/random row and
  download filename tokens in the built artifact.
- the local developer tool route remains correctly classified as
  `local_developer_tool_api`: `/openapi.json` is a local OpenAPI snapshot,
  `/api/code-snippet` is a gated local tool API, and external browser requests
  remain isolated in `ApiPlayground`.
- `scripts/verify-claw-router-application.mjs` includes `portal api reference
  playground runtime tests` and `portal api reference SSR smoke tests` before
  broad Rust and Python suites, preserving deterministic local tool behavior
  and rendered-control coverage in the commercial gate.

## Frontend Request Token Security Standard

Command:

```powershell
node --experimental-strip-types apps\sdkwork-clawrouter-pc\commons-runtime.test.ts
python -B -m unittest tests.test_frontend_request_token_standard
python -B -m unittest tests.test_app_session_exchange_standard tests.test_app_api_key_runtime_standard
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawroutes-pc-commons typecheck
node scripts\run-claw-router-application.test.mjs
```

Observed result:

```text
commons-runtime.test.ts: 4 passed
test_frontend_request_token_standard: Ran 2 tests, OK
app session plus api key standards: Ran 19 tests, OK
sdkwork-clawroutes-pc-commons typecheck: tsc --noEmit passed
run-claw-router-application.test.mjs: 26 passed
```

The request token hardening covers:

- `createRequestToken` remains the shared generator for app session
  `X-Request-Id`, console API key `X-Request-Id`, and idempotency keys used by
  SDK-backed app/backend mutations.
- token generation uses `crypto.randomUUID()` when available and falls back only
  to `crypto.getRandomValues()` over a 16-byte seed.
- all-zero random byte output is rejected as an invalid token seed, so broken
  or stubbed crypto providers cannot silently emit weak request tokens.
- environments without secure randomness now fail closed with a clear error
  instead of producing clock/random fallback material.
- the implementation contains no `Math.random`, `Date.now`, or base36 fallback
  token construction.
- `scripts/verify-claw-router-application.mjs` includes `portal commons runtime
  tests` before route runtime tests, so shared token security is verified before
  SDK-backed feature suites that depend on these headers.

## Console Routing Strategy Determinism Standard

Command:

```powershell
node --experimental-strip-types apps\sdkwork-clawrouter-pc\console-routing-runtime.test.ts
python -B -m unittest tests.test_console_routing_runtime_standard tests.test_frontend_request_token_standard
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-console-routing typecheck
pnpm.cmd --dir apps\sdkwork-clawrouter-pc typecheck --force
node scripts\run-claw-router-application.test.mjs
```

Observed result:

```text
console-routing-runtime.test.ts: 3 passed
console routing plus request-token standards: Ran 10 tests, OK
sdkwork-clawrouter-pc-console-routing typecheck: tsc --noEmit passed
portal typecheck --force: 15 successful, 15 total
run-claw-router-application.test.mjs: 26 passed
```

The routing strategy hardening covers:

- `StrategyTab.tsx` no longer creates mapping-rule ids with `Date.now()` or
  any random source.
- `strategyRules.ts` is the pure rule model for mapping-rule drafts,
  model-name validation, and case-insensitive duplicate source detection.
- client-created rule ids derive from existing `rule-N` ids, so consecutive UI
  additions remain deterministic even when multiple rules are added in the same
  millisecond.
- the id generator advances past existing backend-provided `rule-N` values and
  ignores non-generated backend ids, preserving safe merge behavior between
  persisted records and client-created drafts.
- the console routing package is explicitly ESM and exposes a `typecheck`
  script, so the package participates in forced portal typechecking and can be
  validated independently.
- `scripts/verify-claw-router-application.mjs` includes `portal console routing
  runtime tests` before broad Rust and Python suites, so rule-id determinism is
  part of the main commercial gate.

## Console Routing Channel Command Input Standard

Commands:

```powershell
node --experimental-strip-types apps\sdkwork-clawrouter-pc\console-routing-runtime.test.ts
python -B -m unittest tests.test_console_routing_runtime_standard
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-console-routing typecheck
python -B -m tools.frontend_field_audit --check
node scripts\run-claw-router-application.test.mjs
pnpm.cmd --dir apps\sdkwork-clawrouter-pc typecheck --force
node scripts\verify-claw-router-application.mjs
```

Observed result:

```text
console-routing-runtime.test.ts: 5 passed
test_console_routing_runtime_standard: Ran 9 tests, OK
sdkwork-clawrouter-pc-console-routing typecheck: tsc --noEmit passed
frontend_field_audit --check: Frontend field audit is current
run-claw-router-application.test.mjs: 32 passed
portal typecheck --force: 26 successful, 26 total
verify-claw-router-application.mjs: exit code 0; Python standards Ran 466 tests, OK; schema quality gate passed
```

The console routing channel command hardening covers:

- `RoutingChannelUpdateInput` is now an explicit command type instead of
  `Partial<Omit<RoutingChannelMutationInput, 'secretRef'>>`, so update payloads
  cannot inherit future create-only fields by accident.
- `channelForm.ts` is the pure create/update command adapter for channel forms.
  It trims scalar fields, de-duplicates model ids, filters capabilities to the
  supported set, defaults blank model lists to `default-model`, normalizes
  invalid statuses to `active`, and normalizes invalid weights to a positive
  integer without clock or random drift.
- `ChannelsTab.tsx` no longer casts a union form payload into create/update
  service DTOs. The modal emits `RoutingChannelFormValues`; the parent converts
  with `createRoutingChannelInputFromForm` or
  `createRoutingChannelUpdateInputFromForm` immediately before the SDK-backed
  service call.
- Edit submissions no longer backfill the displayed `apiKey` or masked channel
  value into `secretRef`. A secret reference is updated only when the user
  enters a new value in the auth field.
- Runtime tests prove view-only fields such as `id`, `provider`,
  `providerCode`, `apiKey`, `isMultimodal`, `latency`, `rpm`, `balance`, and
  `errors` are excluded from create/update command payloads even if a wider UI
  record reaches the form adapter.
- `RoutingChannelUpdateInput` is declared in the frontend field registry and
  generated field audit, so console routing channel create and update command
  payloads are tracked alongside returned channel view models.

## Console API Key Create Command Input Standard

Commands:

```powershell
node --experimental-strip-types apps\sdkwork-clawrouter-pc\api-key-runtime.test.ts
python -B -m unittest tests.test_app_api_key_runtime_standard
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-console-api-keys typecheck
python -B -m tools.frontend_field_audit --check
node scripts\run-claw-router-application.test.mjs
pnpm.cmd --dir apps\sdkwork-clawrouter-pc typecheck --force
node scripts\verify-claw-router-application.mjs
```

Observed result:

```text
api-key-runtime.test.ts: 3 passed
test_app_api_key_runtime_standard: Ran 12 tests, OK
sdkwork-clawrouter-pc-console-api-keys typecheck: tsc --noEmit passed
frontend_field_audit --check: Frontend field audit is current
run-claw-router-application.test.mjs: 33 passed
portal typecheck --force: 27 successful, 27 total
verify-claw-router-application.mjs: exit code 0; Python standards Ran 467 tests, OK; schema quality gate passed
```

The console API key create-command hardening covers:

- `apiKeyForm.ts` is the pure form-to-command adapter for `/console/api-keys`.
  It emits `CreateApiKeyInput` only, so view fields such as `id`, `maskedKey`,
  `usedQuota`, and `status` cannot leak into create payloads even when wider UI
  records reach the boundary.
- Names, groups, quota text, modalities, IP allowlists, and expiration fields
  are normalized in one deterministic function before the SDK-backed service
  call. Blank names default to `API key`, blank groups default to `default`,
  blank IP allowlists default to `unrestricted`, and blank expirations default
  to `never`.
- Quota commands fail closed to `0.000000` for unlimited, invalid, negative, or
  non-finite input; valid nonnegative decimal text is preserved without hidden
  rounding.
- Modalities are trimmed, lowercased, filtered to the supported app contract
  set, de-duplicated in user order, and default to
  `text`, `image`, `video`, `audio`, and `music` when no valid modality remains.
- Batch creation is capped to 1..100 and produces deterministic names such as
  `Key 1` through `Key 100`; the single-command helper does not append hidden
  suffixes, keeping the API explicit and testable.
- `ApiKeysView.tsx` no longer assembles create payloads inline. It iterates
  `createApiKeyInputsFromForm(data)` and passes each normalized command directly
  to `ApiKeyService.createKey(input)`.
- `CreateKeyDrawer.tsx` exports `ApiKeyFormValues` from the form contract
  instead of owning a separate `CreateKeyFormData` interface, preventing future
  drift between drawer state and service command input.
- `sdkwork-clawrouter-pc-console-api-keys` now has `"type": "module"`,
  `"typecheck": "tsc --noEmit"`, a strict package `tsconfig.json`, direct
  generated app SDK dependency declaration, and lockfile entries synchronized by
  `pnpm.cmd --dir apps\sdkwork-clawrouter-pc install --lockfile-only --offline`.
- `scripts/verify-claw-router-application.mjs` runs `portal api key runtime tests`
  before console routing and before broad Rust/Python suites, so API key command
  safety fails fast in the commercial gate.

## Admin Group Command Input Standard

Command:

```powershell
node --experimental-strip-types apps\sdkwork-clawrouter-pc\admin-group-runtime.test.ts
python -B -m unittest tests.test_admin_group_runtime_standard
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-admin-group typecheck
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-admin-user typecheck
pnpm.cmd --dir apps\sdkwork-clawrouter-pc typecheck --force
node scripts\run-claw-router-application.test.mjs
```

Observed result:

```text
admin-group-runtime.test.ts: 4 passed
test_admin_group_runtime_standard: Ran 4 tests, OK
frontend_field_audit --check: Frontend field audit is current
test_frontend_field_audit + test_admin_group_runtime_standard: Ran 14 tests, OK
sdkwork-clawrouter-pc-admin-group typecheck: tsc --noEmit passed
sdkwork-clawrouter-pc-admin-user typecheck: tsc --noEmit passed
portal typecheck --force: 17 successful, 17 total
run-claw-router-application.test.mjs: 27 passed
```

The admin group create-input hardening covers:

- `GroupService.addGroup` now accepts `GroupCreateInput`, not a full
  server-returned `GroupData` view model.
- `GroupService.updateGroup` now accepts `GroupUpdateInput`, not
  `Partial<GroupData>`, so returned fields such as `id`, `accountCount`,
  `capacity.used`, or `usage` cannot leak into update command type space.
- `GroupCreateInput` contains only create-command fields: `name`, `platform`,
  `billingType`, `rateMultiplier`, `type`, `capacity.total`, and `status`.
- `GroupUpdateInput` contains only update-command fields: `name`, `platform`,
  `billingType`, `rateMultiplier`, `type`, `capacity.total`, and `status`.
- `GroupCreateInput` and `GroupUpdateInput` are explicitly declared in the
  frontend field registry and generated field audit, so command contracts are
  checked alongside the returned `GroupData` view model.
- `GroupAdmin` no longer constructs a local `GroupData` with fake `id`,
  `accountCount`, `capacity.used`, or `usage` values before the backend SDK
  create call.
- `groupForm.ts` is the pure form adapter for trimming text, normalizing the
  group type checkbox, defaulting invalid rate multipliers, and keeping create
  and update defaults deterministic.
- the admin group package is explicitly ESM and exposes a `typecheck` script,
  so it participates in forced portal typechecking and can be validated
  independently.
- `scripts/verify-claw-router-application.mjs` includes `portal admin group
  runtime tests` before broad Rust and Python suites, so create-payload
  correctness is part of the main commercial gate.

## Admin Channel Command Input Standard

Commands:

```powershell
node --experimental-strip-types apps\sdkwork-clawrouter-pc\admin-channel-runtime.test.ts
python -B -m unittest tests.test_admin_channel_runtime_standard
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-admin-channel typecheck
python -B -m tools.frontend_field_audit --check
node scripts\run-claw-router-application.test.mjs
```

Observed result:

```text
admin-channel-runtime.test.ts: 7 passed
test_admin_channel_runtime_standard: Ran 6 tests, OK
sdkwork-clawrouter-pc-admin-channel typecheck: tsc --noEmit passed
frontend_field_audit --check: Frontend field audit is current
run-claw-router-application.test.mjs: 32 passed
```

The admin channel command-input hardening covers:

- `ChannelService.addChannel` accepts `ChannelCreateInput`, not a full
  server-returned `ChannelItem` view model.
- `ChannelService.updateChannel` accepts `ChannelUpdateInput` that is explicitly
  declared from command fields, not from `Partial<Omit<ChannelItem, ...>>`.
- `ChannelCreateInput` and `ChannelUpdateInput` exclude returned or derived
  fields such as `id`, `isMultimodal`, `balance`, and `errors`.
- `channelForm.ts` is the pure adapter for create, edit, and status-toggle
  channel commands. It trims text, de-duplicates model and capability lists,
  filters unsupported capabilities, normalizes invalid weights to `100`, and
  emits status toggles as minimal `{ status }` commands without clock or random
  drift.
- `ChannelCreateInput` and `ChannelUpdateInput` are declared in the frontend
  field registry and generated field audit, so channel command payloads are
  checked alongside the returned `ChannelItem` view model.
- `ProviderSecretService.updateProviderSecret` accepts
  `ProviderSecretUpdateInput`, not `Partial<ProviderSecretInput>`, so credential
  reference updates are explicit command payloads instead of broad partials.
- `channelForm.ts` now also owns provider-secret create, edit, and status-toggle
  command adapters. Returned fields such as `id`, `accountCode`,
  `maskedLabel`, `createdAt`, and `updatedAt` cannot enter provider-secret
  mutation payloads from the UI.
- `ProviderSecretUpdateInput` is declared in the frontend field registry and
  generated field audit alongside `ProviderSecretInput`.
- `scripts/verify-claw-router-application.mjs` includes `portal admin channel
  runtime tests` before broad Rust and Python suites, so channel
  create/update/status and provider-secret mutation correctness are part of the
  main commercial gate.

## Admin User Mutation Input Standard

Commands:

```powershell
node --experimental-strip-types apps\sdkwork-clawrouter-pc\admin-user-runtime.test.ts
python -B -m unittest tests.test_admin_user_runtime_standard
python -B -m tools.frontend_field_audit --check
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-admin-user typecheck
node scripts\run-claw-router-application.test.mjs
```

Observed result:

```text
admin-user-runtime.test.ts: 6 passed
test_admin_user_runtime_standard: Ran 4 tests, OK
frontend_field_audit --check: Frontend field audit is current
sdkwork-clawrouter-pc-admin-user typecheck: tsc --noEmit passed
run-claw-router-application.test.mjs: 32 passed
```

The admin user hardening covers:

- `UserService.addUser` accepts `UserCreateInput`, not `Partial<UserListItem>`.
- `UserService.updateUser` accepts `UserUpdateInput`, not a partial returned
  user view model.
- `UserService.updateBalance` accepts `UserBalanceAdjustmentInput`, so
  recharge and refund commands are typed command objects rather than
  page-local `(amount, type)` parameter pairs.
- `UserService.createApiKey` accepts `ApiKeyCreateInput`, so the owning user id
  and key name are a single typed command object.
- `userForm.ts` is the pure form adapter for trimming email/username, producing
  fixed two-decimal balance strings, and defaulting blank API key names to the
  stable label `Default API Key` without clock drift.
- `userForm.ts` now also owns balance adjustment parsing, profile update
  parsing, and group update parsing. The page no longer parses `amount`,
  reads `username`, or reads `group` directly before write calls.
- admin user transaction history no longer shows fake recharge/exchange rows,
  hard-coded amounts, hard-coded gift codes, or `new Date()` output before a
  real persisted ledger endpoint is connected.
- `UserCreateInput`, `UserUpdateInput`, `UserBalanceAdjustmentInput`, and
  `ApiKeyCreateInput` are declared in the frontend field registry and generated
  field audit.
- the admin user package is explicitly ESM and exposes a `typecheck` script, so
  it participates in forced portal typechecking and can be validated
  independently.
- `scripts/verify-claw-router-application.mjs` includes `portal admin user runtime
  tests` before broad Rust and Python suites, so user, balance, group, profile,
  and API-key payload correctness is part of the main commercial gate.

## Admin Model Create Input Standard

Commands:

```powershell
node --experimental-strip-types apps\sdkwork-clawrouter-pc\admin-model-runtime.test.ts
python -B -m unittest tests.test_admin_model_runtime_standard
python -B -m tools.frontend_field_audit --check
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-admin-model typecheck
pnpm.cmd --dir apps\sdkwork-clawrouter-pc typecheck --force
node scripts\run-claw-router-application.test.mjs
node scripts\verify-claw-router-application.mjs
```

Observed result:

```text
admin-model-runtime.test.ts: 3 passed
test_admin_model_runtime_standard: Ran 3 tests, OK
frontend_field_audit --check: Frontend field audit is current
sdkwork-clawrouter-pc-admin-model typecheck: tsc --noEmit passed
portal typecheck --force: 18 successful, 18 total
run-claw-router-application.test.mjs: 28 passed
verify-claw-router-application: Ran 458 Python tests, OK; schema quality gate passed
```

The admin model hardening covers:

- `ModelService.addVendor` accepts `VendorCreateInput`, not a trimmed
  server-returned `Vendor` view model.
- `ModelService.addModel` accepts `ModelCreateInput`, not a trimmed
  server-returned `Model` view model.
- `VendorCreateInput` contains only create-command fields: `name`, `status`,
  `color`, and `description`.
- `ModelCreateInput` contains only create-command fields: `vendorId`, `name`,
  `type`, `priceIn`, `priceOut`, and `contextWindow`.
- `modelForm.ts` is the pure form adapter for trimming vendor/model form
  values, resolving known provider selections, normalizing decimal text, and
  defaulting blank context windows to `8k` without clock or random drift.
- `VendorCreateInput` and `ModelCreateInput` are declared in the frontend field
  registry and generated field audit, so command payloads are checked alongside
  returned `Vendor` and `Model` view models.
- the admin model package is explicitly ESM and exposes a `typecheck` script,
  so it participates in forced portal typechecking and can be validated
  independently.
- `scripts/verify-claw-router-application.mjs` includes `portal admin model
  runtime tests` before broad Rust and Python suites, so vendor/model
  create-payload correctness is part of the main commercial gate.

## Admin Package Typecheck Standard

Commands:

```powershell
python -B -m unittest tests.test_admin_package_typecheck_standard
pnpm.cmd --dir apps\sdkwork-clawrouter-pc typecheck --force
python -B -m unittest tests.test_admin_package_typecheck_standard tests.test_admin_model_runtime_standard tests.test_admin_user_runtime_standard tests.test_admin_group_runtime_standard tests.test_admin_destructive_action_standard tests.test_frontend_field_audit
node scripts\verify-claw-router-application.mjs
```

Observed result:

```text
test_admin_package_typecheck_standard: Ran 1 test, OK
admin package focused standards: Ran 22 tests, OK
portal typecheck --force: 26 successful, 26 total
verify-claw-router-application: Ran 459 Python tests, OK; schema quality gate passed
```

The admin package standard hardening covers:

- every `sdkwork-clawrouter-pc-admin-*` package now declares `"type": "module"`.
- every `sdkwork-clawrouter-pc-admin-*` package now exposes
  `"typecheck": "tsc --noEmit"`, so Turbo includes admin surfaces in forced
  portal typechecking instead of silently skipping packages without scripts.
- the forced portal typecheck expanded from 18 package tasks to 26 package
  tasks, adding `admin-announcement`, `admin-channel`, `admin-dashboard`,
  `admin-finance`, `admin-marketing`, `admin-monitor`, `admin-ratelimit`, and
  `admin-record` to the compile gate.
- the new package standard test prevents future admin modules from landing
  outside the ESM/typecheck baseline.
- newly exposed dashboard type issues were fixed by removing unused imports and
  unloaded traffic state, and by making Recharts tooltip formatters tolerant of
  `undefined` values.
- newly exposed marketing type issues were fixed by removing an unused
  `promoCodes` prop from the coupon tab.

## Admin Rate Limit Create Input Standard

Commands:

```powershell
node --experimental-strip-types apps\sdkwork-clawrouter-pc\admin-ratelimit-runtime.test.ts
python -B -m unittest tests.test_admin_ratelimit_runtime_standard
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-admin-ratelimit typecheck
python -B -m tools.frontend_field_audit --check
node scripts\run-claw-router-application.test.mjs
pnpm.cmd --dir apps\sdkwork-clawrouter-pc typecheck --force
node scripts\verify-claw-router-application.mjs
```

Observed result:

```text
admin-ratelimit-runtime.test.ts: 4 passed
test_admin_ratelimit_runtime_standard: Ran 3 tests, OK
sdkwork-clawrouter-pc-admin-ratelimit typecheck: tsc --noEmit passed
frontend_field_audit --check: Frontend field audit is current
run-claw-router-application.test.mjs: 29 passed
portal typecheck --force: 26 successful, 26 total
verify-claw-router-application: Ran 460 Python tests, OK; schema quality gate passed
```

The admin rate-limit hardening covers:

- `RateLimitService.addIpLimit` accepts `IpLimitCreateInput`, not a trimmed
  server-returned `IpLimitRule` view model.
- `RateLimitService.addTokenLimit` accepts `TokenLimitCreateInput`, not a
  trimmed server-returned `TokenLimitRule` view model.
- `RateLimitService.addModelLimit` accepts `ModelLimitCreateInput`, not a
  trimmed server-returned `ModelLimitRule` view model.
- `RateLimitService.addFirewall` accepts `FirewallCreateInput`, not a trimmed
  server-returned `FirewallRule` view model.
- `ratelimitForm.ts` is the pure form adapter for trimming IP, token, model,
  and firewall creation forms, normalizing invalid/nonpositive numeric values
  to safe positive integers, defaulting blank token prefixes to `sk-proj-...`,
  and defaulting blank block durations to `10m` without clock or random drift.
- `FirewallCreateInput`, `IpLimitCreateInput`, `ModelLimitCreateInput`, and
  `TokenLimitCreateInput` are declared in the frontend field registry and
  generated field audit, so command payloads are checked alongside returned
  rate-limit and firewall view models.
- `scripts/verify-claw-router-application.mjs` includes `portal admin ratelimit
  runtime tests` before broad Rust and Python suites, so security-sensitive
  rate-limit create-payload correctness is part of the main commercial gate.

## Admin Marketing Create Input Standard

Commands:

```powershell
node --experimental-strip-types apps\sdkwork-clawrouter-pc\admin-marketing-runtime.test.ts
python -B -m unittest tests.test_admin_marketing_runtime_standard
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-admin-marketing typecheck
python -B -m tools.frontend_field_audit --check
node scripts\run-claw-router-application.test.mjs
```

Observed result:

```text
admin-marketing-runtime.test.ts: 4 passed
test_admin_marketing_runtime_standard: Ran 3 tests, OK
sdkwork-clawrouter-pc-admin-marketing typecheck: tsc --noEmit passed
frontend_field_audit --check: Frontend field audit is current
run-claw-router-application.test.mjs: 30 passed
```

The admin marketing hardening covers:

- Promotion offer commands use `CreatePromotionOfferRequest`, keeping the
  command shape separate from the returned `PromotionOfferRecord` read model.
- Promotion coupon stock commands use `GeneratePromotionCouponStockRequest`,
  making stock issuance explicit instead of page-local shape assembly.
- The admin marketing view exposes standardized read models:
  `PromotionOfferRecord`, `PromotionCouponStockRecord`,
  `PromotionCodeRecord`, and `PromotionCodeRedemptionRecord`.
- Marketing command payloads are checked alongside `promotion_offer`,
  `promotion_coupon_stock`, `promotion_code`, and `promotion_code_redemption`
  read/write contracts.
- `scripts/verify-claw-router-application.mjs` includes `portal admin marketing
  runtime tests` before broad Rust and Python suites, so promotion offer and
  coupon stock payload correctness is part of the main commercial gate.

## Admin Announcement Create Input Standard

Commands:

```powershell
node --experimental-strip-types apps\sdkwork-clawrouter-pc\admin-announcement-runtime.test.ts
python -B -m unittest tests.test_admin_announcement_runtime_standard
pnpm.cmd --dir apps\sdkwork-clawrouter-pc --filter sdkwork-clawrouter-pc-admin-announcement typecheck
python -B -m tools.frontend_field_audit --check
node scripts\run-claw-router-application.test.mjs
```

Observed result:

```text
admin-announcement-runtime.test.ts: 4 passed
test_admin_announcement_runtime_standard: Ran 3 tests, OK
sdkwork-clawrouter-pc-admin-announcement typecheck: tsc --noEmit passed
frontend_field_audit --check: Frontend field audit is current
run-claw-router-application.test.mjs: 31 passed
```

The admin announcement hardening covers:

- `AnnouncementService.addAnnouncement` accepts `AnnouncementCreateInput`, not
  a trimmed server-returned `Announcement` view model.
- `AnnouncementService.updateAnnouncement` accepts `AnnouncementUpdateInput`,
  not `Partial<Announcement>`, so update commands cannot inherit returned
  fields such as `id` or `date`.
- `announcementForm.ts` is the pure command adapter for create, edit, and
  publish actions. It trims text fields, normalizes unsupported audience values
  to `all`, normalizes unsupported statuses to `published`, and emits the
  publish command as the minimal `{ status: 'published' }` payload without
  clock or random drift.
- `AnnouncementCreateInput` and `AnnouncementUpdateInput` are declared in the
  frontend field registry and generated field audit, so announcement command
  payloads are checked alongside the returned announcement view model.
- `scripts/verify-claw-router-application.mjs` includes `portal admin announcement
  runtime tests` before broad Rust and Python suites, so announcement
  create/update/publish payload correctness is part of the main commercial
  gate.

## Model Catalog Contract Guards

Commands:

```powershell
python -B -m unittest tests.test_clawrouter_openapi_precision_audit
python -B -m unittest tests.test_clawrouter_sdk_guardian
python -B -m tools.clawrouter_openapi_precision_audit
python -B -m tools.clawrouter_sdk_guardian
python -B -m tools.schema_quality_gate
```

Observed result:

```text
test_clawrouter_openapi_precision_audit: Ran 5 tests, OK
test_clawrouter_sdk_guardian: Ran 7 tests, OK
ClawRouter OpenAPI precision audit passed
ClawRouter generated SDKs passed
Schema quality gate passed
```

The contract guards now cover:

- public app OpenAPI `AppModelCatalogPriceAvailability.status` must be exactly
  `reference` or `unavailable`
- public app OpenAPI must not expose `lowestUpstreamCostUnitPrice`,
  `customerUnitPrice`, `grossMarginPerUnit`, `pricingPlanCode`, or `groupCode`
  from model catalog schemas
- generated app SDK source must type
  `AppModelCatalogPriceAvailability.status` as
  `'reference' | 'unavailable'`
- generated app SDK source must not expose public `available` or private
  pricing fields from `AppModelCatalogItem` or
  `AppModelCatalogPriceAvailability`

## Public Model Catalog Security

Command:

```powershell
cargo test -p sdkwork-clawrouter-router-service app_model_catalog_route --test app_model_catalog_api
cargo test -p sdkwork-clawrouter-standalone-gateway injected_product_catalog_serves_app_model_catalog_without_secret_material --test api_key_route
```

Observed result:

```text
sdkwork-clawrouter-router-service app_model_catalog_api: 2 passed
sdkwork-clawrouter-standalone-gateway api_key_route: 1 passed
```

The public app model catalog now enforces:

- no `lowestUpstreamCostUnitPrice` field in `/app/v3/api/router/models`
- no raw upstream cost value such as `0.110000` in the public response body
- no customer price, pricing plan, API-key group, or gross margin fields in
  public `priceAvailability`
- no secret key material, key hash field, or raw key text in the app response
- priced public models return `priceAvailability.status = "reference"` with a
  safe public reason instead of leaking or implying customer-specific
  `available` state
- unpriced models remain explicitly unavailable instead of being serialized as
  a nullable internal-cost field, and their reason is public-safe:
  `Public reference price is not configured for the selected billing meter.`

## Postgres Integration

Optional mode:

```powershell
pnpm.cmd test:postgres
```

Required mode with an existing database:

```powershell
$env:SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL="postgres://user:password@127.0.0.1:5432/dbname"
pnpm.cmd test:postgres:required
```

Docker mode:

```powershell
pnpm.cmd test:postgres:docker
```

Docker mode requires Docker Desktop and uses `docker-compose.postgres-test.yml`.
The default exposed Postgres port is `15432`; override it with
`SDKWORK_CLAW_POSTGRES_TEST_PORT` when needed.

Latest local Docker-mode attempt:

```text
pnpm.cmd test:postgres:docker
Docker engine is not available.
Preflight command: docker version
Original error: spawn EPERM
```

Latest attempt after package-bound route classification hardening produced the
same environment blocker; the result is unchanged after raw browser fetch
inventory, browser network purpose hardening, static delivery policy hardening,
and generated static delivery source manifest hardening:

```text
pnpm.cmd test:postgres:docker
[postgres-integration] docker availability check: docker version --format {{.Server.Version}}
[postgres-integration] Docker engine is not available. Preflight command: docker version. Start Docker Desktop or a compatible Docker engine, then run pnpm.cmd test:postgres:docker again. Original error: spawn EPERM
```

Latest attempt after generated static source manifest verification produced the
same environment blocker:

```text
pnpm.cmd test:postgres:docker
[postgres-integration] docker availability check: docker version --format {{.Server.Version}}
[postgres-integration] Docker engine is not available. Preflight command: docker version. Start Docker Desktop or a compatible Docker engine, then run pnpm.cmd test:postgres:docker again. Original error: spawn EPERM
```

Latest attempt after `/models` runtime catalog integration produced the same
environment blocker:

```text
pnpm.cmd test:postgres:docker
[postgres-integration] docker availability check: docker version --format {{.Server.Version}}
[postgres-integration] Docker engine is not available. Preflight command: docker version. Start Docker Desktop or a compatible Docker engine, then run pnpm.cmd test:postgres:docker again. Original error: spawn EPERM
```

Latest attempt after `/forum` runtime standard hardening produced the same
environment blocker:

```text
pnpm.cmd test:postgres:docker
[postgres-integration] docker availability check: docker version --format {{.Server.Version}}
[postgres-integration] Docker engine is not available. Preflight command: docker version. Start Docker Desktop or a compatible Docker engine, then run pnpm.cmd test:postgres:docker again. Original error: spawn EPERM
```

Latest status after App Center and API Reference Playground hardening is
unchanged: Docker-backed Postgres verification remains blocked by the local
Docker process environment, not by product code.

Latest recheck after admin group and admin user create-input hardening produced
the same environment blocker:

```text
pnpm.cmd test:postgres:docker
[postgres-integration] docker availability check: docker version --format {{.Server.Version}}
[postgres-integration] Docker engine is not available. Preflight command: docker version. Start Docker Desktop or a compatible Docker engine, then run pnpm.cmd test:postgres:docker again. Original error: spawn EPERM
```

Latest status after console API key create-command hardening is unchanged:
Docker-backed Postgres verification remains blocked by the local Docker process
environment, not by the API key command input changes.

Latest recheck after API Reference Playground SSR/DOM smoke hardening produced
the same environment blocker:

```text
pnpm.cmd test:postgres:docker
[postgres-integration] docker availability check: docker version --format {{.Server.Version}}
[postgres-integration] Docker engine is not available. Preflight command: docker version. Start Docker Desktop or a compatible Docker engine, then run pnpm.cmd test:postgres:docker again. Original error: spawn EPERM
```

Latest recheck after API Reference Playground response-download hardening
produced the same environment blocker:

```text
pnpm.cmd test:postgres:docker
[postgres-integration] docker availability check: docker version --format {{.Server.Version}}
[postgres-integration] Docker engine is not available. Preflight command: docker version. Start Docker Desktop or a compatible Docker engine, then run pnpm.cmd test:postgres:docker again. Original error: spawn EPERM
```

Latest recheck after `/api-reference` production route chunk smoke hardening
produced the same environment blocker:

```text
pnpm.cmd test:postgres:docker
[postgres-integration] docker availability check: docker version --format {{.Server.Version}}
[postgres-integration] Docker engine is not available. Preflight command: docker version. Start Docker Desktop or a compatible Docker engine, then run pnpm.cmd test:postgres:docker again. Original error: spawn EPERM
```

Latest recheck after API Reference Playground request-validation hardening
produced the same environment blocker:

```text
pnpm.cmd test:postgres:docker
[postgres-integration] docker availability check: docker version --format {{.Server.Version}}
[postgres-integration] Docker engine is not available. Preflight command: docker version. Start Docker Desktop or a compatible Docker engine, then run pnpm.cmd test:postgres:docker again. Original error: spawn EPERM
```

Latest recheck after API Reference Playground response serialization hardening
produced the same environment blocker:

```text
pnpm.cmd test:postgres:docker
[postgres-integration] docker availability check: docker version --format {{.Server.Version}}
[postgres-integration] Docker engine is not available. Preflight command: docker version. Start Docker Desktop or a compatible Docker engine, then run pnpm.cmd test:postgres:docker again. Original error: spawn EPERM
```

Latest recheck after API Reference Playground path-template hardening produced
the same environment blocker:

```text
pnpm.cmd test:postgres:docker
[postgres-integration] docker availability check: docker version --format {{.Server.Version}}
[postgres-integration] Docker engine is not available. Preflight command: docker version. Start Docker Desktop or a compatible Docker engine, then run pnpm.cmd test:postgres:docker again. Original error: spawn EPERM
```

Latest recheck after API Reference static code snippet path-template hardening
produced the same environment blocker:

```text
pnpm.cmd test:postgres:docker
[postgres-integration] docker availability check: docker version --format {{.Server.Version}}
[postgres-integration] Docker engine is not available. Preflight command: docker version. Start Docker Desktop or a compatible Docker engine, then run pnpm.cmd test:postgres:docker again. Original error: spawn EPERM
```

## Contract Guard Commands

The full gate includes these commercial contract checks:

```powershell
python -B -m tools.repository_delivery_guardian
python -B -m tools.clawrouter_sdk_guardian
python -B -m tools.clawrouter_skill_guardian
python -B -m tools.architecture_standard_guardian
python -B -m tools.rust_backend_architecture_guardian
python -B -m tools.clawrouter_gateway_openapi_generator --check
python -B -m tools.clawrouter_openapi_precision_audit
python -B -m tools.clawrouter_payload_sdk_audit
python -B -m tools.frontend_static_source_manifest --check
python -B -m tools.frontend_contract_guardian
python -B -m tools.schema_guardian
python -B -m tools.flyway_schema_contract_audit
python -B -m tools.frontend_operation_audit
python -B -m tools.frontend_field_audit
python -B -m tools.java_legacy_contract_audit
```

The shortcut below is allowed only for local investigation and must not be used
as final delivery evidence:

```powershell
node scripts/verify-claw-router-application.mjs --skip-contract-guardians
```

## SDK Route Failure-State Hardening

Commands:

```powershell
python -B -m unittest tests.test_app_center_runtime_standard tests.test_skills_runtime_standard
node --experimental-strip-types apps\sdkwork-clawrouter-pc\commons-runtime.test.ts
node --experimental-strip-types apps\sdkwork-clawrouter-pc\app-runtime.test.ts
node --experimental-strip-types apps\sdkwork-clawrouter-pc\skills-runtime.test.ts
pnpm.cmd --dir apps\sdkwork-clawrouter-pc typecheck --force
pnpm.cmd --dir apps\sdkwork-clawrouter-pc build
cargo test -p sdkwork-clawrouter-cloud-gateway --test edge_server edge_server_can_serve_portal_dist_without_node_server
node --experimental-strip-types apps\sdkwork-clawrouter-pc\server.test.ts
node scripts\run-claw-router-application.test.mjs
```

Observed result:

```text
test_app_center_runtime_standard + test_skills_runtime_standard: Ran 15 tests, OK
commons-runtime.test.ts: 6 passed
app-runtime.test.ts: 5 passed
skills-runtime.test.ts: 5 passed
portal typecheck: 27 tasks passed
portal build: built dist\server.mjs
production edge smoke: passed
server.test.ts: 50 passed
run-claw-router-application.test.mjs: 36 passed
```

The hardening covers:

- `/apps` and `/skills-hub` list routes no longer leave users in a permanent
  loading state when generated app SDK requests fail.
- `/apps/:id` and `/skills-hub/:id` detail routes now distinguish loading,
  retryable SDK/API failure, and not-found states.
- App Center preview handles SDK failure with a retryable section-level
  `BusinessStatePanel` instead of an unhandled Promise rejection.
- Category sidebars now expose recoverable category-load errors while allowing
  the primary list request to fail independently.
- Page request flows avoid updating React state after unmount by passing an
  active guard through async loaders.

## Current Risk Register

- Install package planning now gates the matrix and initialization contract, and
  the package builder consumes the same plan for archive, service, and
  container deployment packages. The current builder writes `.zip` and
  `.tar.gz` outputs with package and aggregate manifests, generated service
  manifests, generated container entrypoints, Containerfile, and metadata.
- Docker-backed Postgres verification is blocked in this machine because Docker
  is not available to the process (`docker version` failed with `spawn EPERM`).
  Run `pnpm.cmd test:postgres:docker` on a machine with Docker Desktop or a
  compatible Docker engine before release packaging.
- Browser-backed production DOM verification is implemented in the standard
  gate, but this local sandbox cannot spawn Chrome or Edge from Node
  (`spawn EPERM`). Local non-required mode records an explicit skip; CI and
  release packaging must run with `CLAWROUTER_BROWSER_SMOKE_REQUIRED=1` and a
  working Chrome/Edge/Chromium executable or an externally launched
  `CLAWROUTER_BROWSER_DEBUG_PORT`. The route matrix now includes SDK-backed
  App Center and Skills Hub error, success, empty, filter no-result,
  missing-detail, category-load failure, retry recovery states, and API
  Reference Playground validation, managed-header rejection, send-response,
  primitive/null response, `Send and Download`, drawer close, Bearer Token auth,
  network-error states, and local tool API disabled static snippet fallback with
  no `/api/code-snippet` browser request, so required
  CI/release evidence must exercise `/apps`, `/apps/app-1`,
  `/apps/__browser-smoke-success`, `/apps?__browser-smoke-empty=1`,
  `/apps?__browser-smoke-filter=1`, `/apps?__browser-smoke-categories=1`,
  `/apps/__browser-smoke-missing`, `/apps?__browser-smoke-retry=1`,
  `/skills-hub`, `/skills-hub/skill-1`,
  `/skills-hub/__browser-smoke-success`,
  `/skills-hub?__browser-smoke-empty=1`,
  `/skills-hub?__browser-smoke-filter=1`,
  `/skills-hub?__browser-smoke-categories=1`,
  `/skills-hub/__browser-smoke-missing`, and
  `/skills-hub?__browser-smoke-retry=1`,
  `/models?__browser-smoke-runtime=1`,
  `/models?__browser-smoke-groups=1`,
  `/models?__browser-smoke-filter=1`,
  `/models?__browser-smoke-empty-runtime=1`,
  `/models?__browser-smoke-detail-click=1`,
  `/models/newvendor%2Fruntime-good?__browser-smoke-detail=1`,
  `/models/unpricedvendor%2Fruntime-unpriced?__browser-smoke-unavailable-detail=1`,
  `/courses?__browser-smoke-category=1`,
  `/courses?__browser-smoke-level=1`,
  `/courses?__browser-smoke-search=1`,
  `/courses?__browser-smoke-card-click=1`,
  `/courses/c1?__browser-smoke-detail=1`,
  `/courses/c1?__browser-smoke-lesson-grid=1`,
  `/courses/c1?__browser-smoke-related=1`,
  `/courses/__browser-smoke-missing`,
  `/forum?__browser-smoke-category=1`,
  `/forum?__browser-smoke-search=1`,
  `/forum?__browser-smoke-empty=1`,
  `/forum?__browser-smoke-sort=1`,
  `/forum?__browser-smoke-card-click=1`,
  `/forum/1?__browser-smoke-detail=1`,
  `/forum/1?__browser-smoke-related=1`,
  `/forum/__browser-smoke-missing`,
  `/api-reference?__browser-smoke-playground-validation=1`,
  `/api-reference?__browser-smoke-playground-managed-header=1`,
  `/api-reference?__browser-smoke-playground-send=1`,
  `/api-reference?__browser-smoke-playground-primitive-response=1`,
  `/api-reference?__browser-smoke-playground-send-download=1`,
  `/api-reference?__browser-smoke-playground-api-key-auth=1`,
  `/api-reference?__browser-smoke-playground-network-error=1`, and
  `/api-reference?__browser-smoke-playground-drawer=1`, and
  `/api-reference?__browser-smoke-tool-api-disabled=1`, and
  `/api-reference?__browser-smoke-code-snippet-tabs=1` through a real browser.
- Static marketing/catalog pages now use seed/catalog naming instead of mock
  naming. The route classification standard now enforces whether each route is
  SDK-backed runtime, schema-provenanced content, or a gated local developer
  tool surface. All schema-provenanced static delivery routes now also require
  generated content-hash-backed static source manifest entries.
- Model catalog pricing is now sourced from the app runtime catalog where
  available, but public `/models` intentionally exposes only public reference
  price and safe availability reason. Public availability statuses are limited
  to `reference` and `unavailable`; customer-specific `available` price,
  upstream cost, group, plan, and margin fields are intentionally excluded by
  backend response tests, OpenAPI precision audit, generated SDK guardian, and
  frontend runtime tests until a scoped, authenticated pricing endpoint is
  designed.
- Public model detail performance values are catalog reference values, not live
  monitoring data. Real live latency/throughput charts should only be added
  after an authenticated metrics endpoint, retention policy, and source
  labeling contract exist.
- `/rankings` is intentionally still a schema-provenanced published catalog
  snapshot, not a realtime runtime endpoint. Realtime ranking should only be
  introduced after an app/backend API contract, snapshot freshness SLA, tenant
  access policy, and source-labeling rules are designed.
- `/courses` and `/courses/:id` are intentionally still schema-provenanced
  curated content snapshots, not runtime course-authoring, enrollment,
  personalized progress, or recommendation data. Move them to SDK-backed
  runtime delivery only after the course content API contract, freshness SLA,
  moderation workflow, access policy, and media-source policy are designed.
- `/forum` and `/forum/:id` are intentionally still schema-provenanced curated
  content snapshots, not runtime authoring, live comments, personalized
  community feeds, moderation queues, or per-user reaction state. Move them to
  SDK-backed runtime delivery only after the forum API contract, freshness SLA,
  moderation workflow, access policy, and abuse-control policy are designed.
- The generated SDKs and schema artifacts have existing uncommitted changes in
  the workspace. Treat them as part of the active product branch and verify the
  full generation pipeline before commit.
- Do not run SDK build commands in parallel with schema gates that inspect SDK
  `dist/` entry files. SDK build refreshes `dist/`; the standard
  `node scripts\verify-claw-router-application.mjs` sequence is ordered and avoids
  that transient read/write race.

## 2026-05-03 Codex Performance Cleanup Pass

Problem found:

- Repeated `pnpm.cmd verify` is the dominant local Codex iteration cost because
  it runs the full commercial gate: Rust format/check/tests, all Python
  standards, SDK and architecture guardians, portal forced typecheck,
  production build, bundle budget, and production smoke tests.
- Workspace scan size is acceptable after ignored heavy folders are excluded,
  but rebuild output is large. The largest local artifact is `target/`, which
  was measured at roughly 104 GB. Deleting it would reclaim disk space but would
  also make the next Rust compile/test run slower.
- Portal `node_modules` is also intentionally retained because removing it
  shifts the cost to reinstall time and network/cache dependency.

Solution applied:

- Added `pnpm.cmd verify:fast`, backed by
  `node scripts/verify-claw-router-application.mjs --fast`, for fast Codex and
  developer edit loops.
- `--fast` now builds a deliberately small verification plan containing only
  `node scripts/run-claw-router-application.test.mjs` and
  `python -B -m unittest tests.test_frontend_source_hygiene_standard`.
- Added `pnpm.cmd clean:fast`, backed by
  `node scripts/clean-claw-router-workspace.mjs`, for safe cleanup of
  rebuildable local artifacts.
- Default cleanup removes only `.tmp`, Python caches, portal `.turbo`, and
  portal `dist`. It does not remove `target`, portal `node_modules`, generated
  OpenAPI artifacts, generated SDK source, or schema registry files.
- Deep cleanup is explicit only:
  `node scripts/clean-claw-router-workspace.mjs --rust-target --node-modules`.

Verification evidence:

```powershell
node scripts\run-claw-router-application.test.mjs
node scripts\verify-claw-router-application.mjs --fast --dry-run
node scripts\clean-claw-router-workspace.mjs --dry-run
pnpm.cmd verify:fast
pnpm.cmd clean:fast
pnpm.cmd verify:fast
```

- Exit code 0 after the red/green TDD cycle. The tool tests now assert the root
  package exposes `verify:fast` and `clean:fast`, the verify runner parses
  `--fast`, the fast plan excludes heavy commercial gates, and the cleanup plan
  defaults to rebuildable local artifacts only.
- `node scripts\verify-claw-router-application.mjs --fast --dry-run` printed only
  two commands: tooling contract tests and frontend source hygiene tests.
- `node scripts\clean-claw-router-workspace.mjs --dry-run` printed only the
  safe default cleanup set: `.tmp`, Python caches, portal `.turbo`, portal
  `dist`, and scoped `__pycache__` directories.
- `pnpm.cmd verify:fast` passed before cleanup and passed again after cleanup.
  The local tool wall time was about 1.1-1.2 seconds in this workspace.
- `pnpm.cmd clean:fast` removed the safe default cleanup set. A follow-up path
  check confirmed `target/` and portal `node_modules` still exist, while portal
  `dist` and `.turbo` were removed.

Remaining delivery policy:

- Use `pnpm.cmd verify:fast` during frequent Codex iteration.
- Use `pnpm.cmd clean:fast` when stale local artifacts slow workspace tooling.
- Use `pnpm.cmd verify` before final delivery, release, or commit handoff.
- Keep `target/` and portal `node_modules` by default unless disk pressure is
  more important than preserving fast compile/reinstall behavior.

## 2026-05-15 Install Package Planning Standard

Issue found:

- the production build and start flows were standardized, but the install
  package layer did not yet have an executable cross-platform contract for
  Windows, Linux, macOS, x64, arm64, archive, service, container, fast
  initialization, health checks, and secret exclusion
- without a shared matrix, future package builders could drift by platform,
  accidentally include `.env.release`, skip catalog refresh, trust
  forwarded headers by default, or run expensive live `pnpm dev` smoke during
  package initialization

Solution applied:

- added `scripts/plan-claw-router-install-packages.mjs`
- added `pnpm.cmd install:packages:plan` and
  `pnpm.cmd install:packages:check`
- added `scripts/build-claw-router-install-package.mjs`
- added `pnpm.cmd install:package:check` and
  `pnpm.cmd install:package:build`
- added `scripts/smoke-install-package-init.mjs`
- added `pnpm.cmd install:init:smoke`
- the planner generates a 24-entry matrix across platforms, architectures, and
  deployment modes
- every package contract declares the edge binary, installer binary,
  `portal/dist`, `portal/dist/sdk-archives`, `.env.release.example`,
  `config/clawrouter.toml.example`, `install-manifest.json`,
  mode-specific service/container/desktop metadata, fast init commands, and
  `/healthz` plus `/readyz`
- archive, service, and container are server release profiles and default to PostgreSQL
  and require an external database DSN in the runtime TOML config or environment
  override; desktop packages default to a local SQLite database in the OS user
  data directory
- the planner rejects drift through `validateInstallPackagePlan(plan)` and CLI
  `--check`; JSON output is available for CI and future package builders
- the install package builder consumes the plan, writes real `.zip` outputs for
  Windows packages, writes real gzip-compressed tar archives for Linux and
  macOS packages, emits per-package manifests and
  `install-packages-manifest.json`, generates Windows service, systemd, launchd,
  Containerfile, platform-specific entrypoint, and container metadata artifacts,
  preserves executable mode on Linux/macOS binaries and container entrypoints,
  supports ustar prefix paths for long production asset names, supports pure
  `--json` output, and excludes `.env.release`
- the builder also supports `--all --check --dry-run` so the root
  `pnpm.cmd install:package:check` command validates archive, service,
  container, and desktop package plans across all 24
  platform/architecture/mode combinations without requiring staged production
  artifacts
- the install init smoke writes a temporary `.env.release` and
  `sdkwork-clawrouter.toml`, validates PostgreSQL for server package dry-runs
  and a file-backed SQLite initialization URL for desktop package dry-runs,
  verifies `sdkwork-claw-installer ensure` and
  `sdkwork-claw-installer refresh-catalog --force` are the initialization
  actions, supports pure JSON for CI, and can execute a real installer only
  when `--installer-bin` is provided
- README and CHECK_RESULT now document the install package standard, fast init
  commands, and security defaults

Verification evidence:

```powershell
node scripts\run-claw-router-application.test.mjs
python -B -m unittest tests.test_workspace_delivery_standard
pnpm.cmd install:packages:check
pnpm.cmd install:package:check
pnpm.cmd install:init:smoke
node scripts\plan-claw-router-install-packages.mjs --json --check
node --check scripts\build-claw-router-install-package.mjs
node --check scripts\smoke-install-package-init.mjs
git diff --check
python -B -m tools.repository_delivery_guardian
pnpm.cmd verify:fast
```

Expected install package builder contract:

- consume `scripts/plan-claw-router-install-packages.mjs` as the source of
  truth instead of hard-coding platform package lists
- build install packages under a deterministic output directory such as
  `dist/install-packages` by calling `pnpm.cmd install:package:build --`
  with `--package-id`, `--staging-root`, and `--output-dir`
- emit package manifests and `install-packages-manifest.json` with file size
  and SHA-256 checksums
- generate service manifests and container metadata from the shared plan instead
  of maintaining separate platform-specific package lists
- never include `.env.release` or secret values
- run fast install initialization through `sdkwork-claw-installer ensure` and
  `sdkwork-claw-installer refresh-catalog --force`
- gate package initialization with `pnpm.cmd install:init:smoke` by default, and
  pass `--installer-bin` on release hosts when a real installer binary is
  staged
- treat real `pnpm dev` smoke as an opt-in integration check, not a package
  initialization default

## 2026-05-04 Release Preflight Hardening

Issue found:

- the product had full commercial verification and safe cleanup commands, but
  no lightweight release preflight entrypoint to detect branch drift, missing
  staging/Postgres environment variables, command availability, or local
  Codex/Git IO risk before running the expensive gate.

Solution applied:

- added `pnpm.cmd release:preflight`, backed by
  `node scripts/release-preflight.mjs`
- default mode is read-only and local-friendly: missing staging environment is
  reported as `WARN`, while branch mismatch, `main...origin/main` drift,
  application worktree dirt, and missing required commands are `FAIL`
- strict release mode is explicit:
  `pnpm.cmd release:preflight -- --strict --strict-root-clean`
- JSON output is available through `--json` for CI parsing, and `--dry-run`
  prints a non-probing command plan
- the preflight reports Codex session jsonl count/size and non-destructive
  `git count-objects -vH` data without running `git prune`, `git gc`, or any
  cleanup automatically
- README delivery order now starts with release preflight before the full
  commercial gate

Verification evidence:

```powershell
node scripts\run-claw-router-application.test.mjs
node scripts\release-preflight.mjs
pnpm.cmd verify:fast
pnpm.cmd verify
```

- Red/green TDD evidence: the first run failed because
  `release:preflight` and `scripts/release-preflight.mjs` did not exist; after
  implementation the tooling contract tests passed.
- The tests assert parser behavior, default warning semantics, strict failure
  semantics, JSON output shape, recommended command list, and package script
  exposure.
- `node scripts\release-preflight.mjs` before commit correctly failed the
  application worktree check because this preflight change was still
  uncommitted, while reporting root unrelated changes, missing release
  environment variables, and Git loose-object footprint as warnings.
- `pnpm.cmd verify:fast` passed and ran the tooling contract tests plus
  frontend source hygiene tests.
- `pnpm.cmd verify` passed with exit code 0. The full gate covered Rust format,
  Rust warnings-as-errors compile, SDK/skill/architecture/OpenAPI/payload
  guardians, frontend static manifest and schema guards, Flyway and Java legacy
  audits, portal typecheck/build/bundle budget, production edge smoke,
  production browser DOM smoke, portal runtime/SSR tests, Rust workspace tests,
  476 Python tests, and schema quality gate.

Remaining delivery policy:

- Use `pnpm.cmd release:preflight` before every local release handoff.
- Use `pnpm.cmd release:preflight -- --strict --env-file .env.release --strict-root-clean`
  on CI or a release packaging host.
- Keep release environment variables aligned with
  `scripts/release-environment-contract.mjs` (v4). Treat `.env.release.example` as
  the checked-in reference template, generate `.env.release` on release
  hosts from the process environment with `pnpm.cmd release:env:write`, and run
  `pnpm.cmd release:preflight -- --strict --env-file .env.release --strict-root-clean`
  before packaging. The contract requires
  `SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL`, `PORTAL_PUBLIC_API_BASE_URL`,
  `PORTAL_PUBLIC_APP_API_BASE_URL`, `PORTAL_PUBLIC_BACKEND_API_BASE_URL`, and
  `PORTAL_PUBLIC_TOOL_API_ENABLED`, plus optional canonical edge private keys
  (`SDKWORK_CLAW_EDGE_CSP_CONNECT_SRC`, `SDKWORK_CLAW_TOOL_API_RATE_LIMIT_*`,
  `SDKWORK_CLAW_TOOL_API_SDK_GENERATOR_*`, `SDKWORK_CLAW_TOOL_API_SDK_ARCHIVE_ROOT`).
  `ensureClawRouterReleaseEnv()` and `write-release-env.mjs` emit the full
  19-key release profile order, including empty optional edge values.
- Run `pnpm check:application-env` (35 unit tests + entrypoint marker guard) and
  `pnpm check:gateway-request-identity` (server-owned request id source guard +
  `edge_env` / `request_identity` / `invocation_router` tests) before merge when
  touching env contracts or gateway invocation behavior. Root `pnpm check` now
  includes both gates.
- Prefer `pnpm.cmd release:env:write -- --check` followed by
  `pnpm.cmd release:env:write` on CI or release hosts. The writer reads the
  same contract variables from the process environment, refuses accidental
  overwrite without `--force`, refuses `.env.release.example` as an output
  target, and prints only a safe summary without secret values.
- `pnpm.cmd release` is the canonical release host entrypoint: it runs the
  release env writer in `--check` mode, regenerates `.env.release` with
  `--force`, runs strict release preflight, and then runs the full `pnpm verify`
  gate.
- Continue to use `pnpm.cmd verify` as the final commercial gate; preflight is
  a readiness check, not a replacement for compile, build, smoke, schema, and
  architecture verification.

## Recommended Next Step

Run the browser-backed production DOM smoke in required mode on CI or a release
host where Chrome, Edge, Chromium, or an externally launched CDP target is
available:

```powershell
$env:CLAWROUTER_BROWSER_SMOKE_REQUIRED="1"
pnpm.cmd verify
```

If Node cannot spawn the browser in that environment, launch Chrome or Edge
outside the Node process and pass the DevTools port:

```powershell
$env:CLAWROUTER_BROWSER_DEBUG_PORT="9222"
$env:CLAWROUTER_BROWSER_SMOKE_REQUIRED="1"
node apps\sdkwork-clawrouter-pc\scripts\smoke-production-browser.mjs
```

Then run Docker-backed Postgres verification on a machine where Docker Desktop
or a compatible Docker engine is available:

```powershell
pnpm.cmd test:postgres:docker
```

Then continue with the next highest-value commercial hardening pass:

- add an authenticated app model-detail/pricing endpoint only if customer-specific
  price availability is required on public detail pages
- expand browser DOM-level smoke coverage for `/models` further to cover
  provider search show-more behavior, list/grid view switching, sort order,
  copy-button behavior in details, and responsive/mobile sidebar behavior
- expand `/courses` browser DOM smoke further to cover responsive/mobile
  sidebar behavior, iframe unavailable fallback rendering from an invalid BVID
  fixture, and comment form validation once the static course UI accepts
  user-submitted draft state
- expand `/forum` browser DOM smoke further to cover responsive/mobile
  category controls, comment reply toggle behavior, report/share action
  disabled-state semantics, and future draft validation once static forum UI
  accepts user-submitted draft state
- expand browser DOM-level smoke coverage for `/api-reference` further to cover
  responsive/mobile viewport resizing, non-TypeScript language switching,
  response Copy button behavior, and OpenAPI reload failure fallback
- design and implement a real `/forum` runtime API only after authoring,
  moderation, freshness, access-control, and abuse-control policies are
  finalized
- design and implement a real `/rankings` runtime API only after the ranking
  freshness SLA, public/private metric boundary, and cache policy are finalized
- migrate the next freshness-sensitive public catalog route from static snapshot
  delivery to generated app SDK runtime delivery
- keep `frontend-route-classification.yaml`, frontend field/operation audits,
  OpenAPI specs, and generated SDKs regenerated together for every contract
  change
