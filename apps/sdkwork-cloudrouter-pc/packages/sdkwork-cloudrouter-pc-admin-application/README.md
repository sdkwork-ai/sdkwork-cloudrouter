# CloudRouter Admin — Application Center

The App Center is the operator workspace for the platform's "app factory": it
unifies the IAM, Deploy, and App Store application systems, app templates, and
the App Store's governance surfaces behind one information architecture.

## Navigation

| Group | Route | Purpose |
| --- | --- | --- |
| Overview | `/admin/applications` | KPI snapshot, pending reviews, quick links, recent templates |
| Applications | `/admin/applications/iam` · `/deploy` · `/app-store` | Unified application catalog, integration bindings (official account, mini program, payment) |
| App Store · Categories | `/admin/applications/categories` | Store taxonomy as a five-column cascade with per-level CRUD |
| App Store · Visibility | `/admin/applications/listings` | Listing storefront visibility with audit reason |
| App Store · Collections | `/admin/applications/collections` | Editorial collections and ordered listing sets |
| App Store · Publishers | `/admin/applications/publishers` | Publisher profiles and verification reviews |
| App Store · Featured | `/admin/applications/featured` | Featured-slot placement windows |
| App Store · Moderation | `/admin/applications/moderation` | Review queue, review detail/assignment, approve/reject/request-changes decisions |
| App Store · Appeals | `/admin/applications/appeals` | Moderation appeals with decision notes |
| Templates · Library | `/admin/applications/templates` | Template list, create/edit/delete, versions, submit review |
| Templates · Reviews | `/admin/applications/template-reviews` | Pending-review queue with backend-admin decisions |
| Templates · Categories | `/admin/applications/template-categories` | Template taxonomy as a five-column cascade with per-level CRUD |
| Operations · Analytics | `/admin/applications/analytics` | Exact totals: pending reviews, publishers, listings, collections, categories |

## Category cascade

Both taxonomies render through the shared
`@sdkwork/cloudroutes-pc-commons` `CascadeCategoryManager`:

- five fixed columns (level 1 through level 5); selecting a node reveals its
  children in the next column;
- per-node actions live in one dropdown trigger (add child / edit / move /
  lifecycle / delete) so the category name keeps the row width;
- siblings can be reordered with the accessible up/down buttons or by dragging a
  node onto a sibling; the page reindexes the sibling group and persists gaps;
- a locate box jumps to a category by name/code and selects its ancestor path;
- the depth cap is enforced in the UI (column create hidden at level 5, forms
  reject a parent whose subtree would exceed five levels);
- the App Store backend has no hard-delete operation, so “delete” is the
  contract's soft-delete status transition;
- category forms start with zh-CN/en-US slots and can add optional storefront
  locales (for example ja-JP, ko-KR, fr-FR); saved locales are preserved and
  cannot be removed because the backend only upserts localizations;
- template categories are maintained on the Deploy backend API
  (`/backend/v3/api/template_categories`); the app-plane
  `/app/v3/api/template_categories` list is a read-only fallback used when the
  Deploy backend URL is unavailable, and the panel disables every write action
  in that state.

## Data planes

- **Deploy app SDK** — author-side templates, versions, categories and submission.
  Confirmed surface (route manifest
  `sdks/_route-manifests/app-api/sdkwork-routes-deploy-app-api.route-manifest.json`):
  `template.appTemplates.list|create|retrieve|update|delete|submit` on
  `/app/v3/api/app_templates`, `template.appTemplateVersions.list|create` on
  `/app/v3/api/app_templates/{templateUuid}/versions`, and
  `template.templateCategories.list` on `/app/v3/api/template_categories`.
  `/app/v3/api/marketplace/templates` is browse-only (`marketplaceTemplates.list|retrieve`)
  and is not used for authoring.
- **Deploy account bindings** — `apps.resourceLinks.list|update|delete` on
  `/app/v3/api/apps/{appId}/resource_links` is the authority for the official
  account, mini program and payment accounts an environment acts as
  (`deploy_application_resource_link`). `deploy_app.metadata.integrations` is
  **not** a binding authority: the console writes only `linkedApplications`
  there (the IAM / App Store anchor) and reads the pre-migration `environments`
  document once as a seed, so an operator can migrate without a second writer.
  A `migratedEnvironments` ledger in the same key records which legacy
  environments have already been written to the authority, so clearing a
  binding does not resurrect it from the untouched document.
  A binding is only addressable on a fleet lifecycle environment
  (`development`, `test`, `staging`, `demo`, `production`); the drawer explains
  that limit for a custom Deploy environment key instead of sending a request
  the API rejects.
- **App-kind matrix** — `services/application-integration-requirements.ts` maps
  every Deploy `appKind` (H5, PC, WeChat/Douyin mini program, Flutter, iOS,
  Android, HarmonyOS, desktop, API, legacy web) to the channel and payment
  accounts it can use, the channel auto-login depends on, and whether it opens
  the cashier. The drawer renders that matrix as a readiness checklist
  (`channel`, `payment`, `auto-login`, `cashier`); validation turns gaps into
  warnings (missing required account) and contradictions into errors (a WeChat
  account on a Douyin app, payment on an API service, a non-WeChat pay provider
  on a WeChat mini program, a non-lifecycle environment).
- **Deploy backend SDK** — template approval/rejection/disable/feature and
  template-category CRUD. Confirmed surface (route manifest
  `sdks/_route-manifests/backend-api/sdkwork-routes-deploy-backend-api.route-manifest.json`):
  `template.appTemplates.list|retrieve|update|delete` on
  `/backend/v3/api/app_templates` and
  `template.templateCategories.list|create|retrieve|update|delete` on
  `/backend/v3/api/template_categories`. Base URL:
  `VITE_SDKWORK_DEPLOYMENTS_BACKEND_API_BASE_URL` (falls back to the shared
  backend base URL rules; configure it explicitly in deployments).
- **App Store backend SDK** — categories, listings visibility, collections,
  publishers, featured slots, moderation.
- **Payment / IAM backend SDKs** — integration account catalogs and
  environment-scoped bindings.

All services live under `src/services/`; pages never construct SDK clients.
Generated SDK payloads are normalized at the service boundary into typed view
models, and failures are classified (`unauthorized`, `forbidden`, `not-found`,
`conflict`, `validation`, `unavailable`) so each surface can show the right
empty/error/permission state.

## Permissions

- Module gate: `cloudrouter.admin.access` on every route.
- Action seam: `src/permissions/application-center-actions.ts` maps each action
  to a permission code.
  - Template actions require the Deploy codes the Deploy route manifests
    enforce: template authoring and review → `deploy.appTemplates.write`,
    template taxonomy maintenance → `deploy.templateCategories.write`
    (reads → `deploy.appTemplates.read` / `deploy.templateCategories.read`).
  - App Store actions (moderation decide, publisher verify, collection/featured/
    visibility writes, store-category writes, integration writes) still fall
    back to the module gate because the IAM catalog defines no finer code.
- `isApplicationCenterActionAllowed` accepts the action's own code **or** the
  module gate. The application's declared `backend.accessTokenPermissionScope`
  carries only `cloudrouter.*` / `iam.*` / `community.*`, so a deploy-only gate
  would hide template controls from operators the Deploy backend still
  authorizes. Wildcard grants (`*`, `deploy.*`) resolve through the shared IAM
  matcher.
- UI gating is defense in depth; the backend remains the authority.

## Configuration & operational notes

- `VITE_SDKWORK_DEPLOYMENTS_BACKEND_API_BASE_URL` is required for template
  review and template-category writes. Missing configuration surfaces an
  explicit "service unavailable — verify the Deploy backend URL" message.
- Collections can be created and their item set replaced, but the backend has no
  collection-item read endpoint, so the editor starts empty and warns that saving
  replaces the stored set.
- Analytics is a snapshot of exact backend totals, not a time series.
- The App Store menu is split into Store operations (categories, listings,
  collections, featured) and Trust & safety (publishers, moderation, appeals).
- The package test suite is run with `--maxWorkers=1` on constrained Windows
  hosts to avoid the OS file-handle limit (`EMFILE`).

## Verification

```sh
pnpm --dir apps/sdkwork-cloudrouter-pc exec tsc --noEmit -p tsconfig.typecheck.json
pnpm --dir apps/sdkwork-cloudrouter-pc --filter @sdkwork/cloudrouter-pc-admin-application test
pnpm --dir apps/sdkwork-cloudrouter-pc build
node ../sdkwork-specs/tools/check-i18n-standard.mjs --root .
node ../sdkwork-specs/tools/check-application-layering.mjs --root .
```
