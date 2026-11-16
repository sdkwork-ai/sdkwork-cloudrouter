# CloudRouter Admin — Application Center

The App Center is the operator workspace for the platform's "app factory": it
unifies the IAM, Deploy, and App Store application systems, app templates, and
the App Store's governance surfaces behind one information architecture.

## Navigation

| Group | Route | Purpose |
| --- | --- | --- |
| Overview | `/admin/applications` | KPI snapshot, pending reviews, quick links, recent templates |
| Applications | `/admin/applications/iam` · `/deploy` · `/app-store` | Unified application catalog, integration bindings (official account, mini program, payment) |
| App Store · Categories | `/admin/applications/categories` | Store taxonomy CRUD |
| App Store · Visibility | `/admin/applications/listings` | Listing storefront visibility with audit reason |
| App Store · Collections | `/admin/applications/collections` | Editorial collections and ordered listing sets |
| App Store · Publishers | `/admin/applications/publishers` | Publisher profiles and verification reviews |
| App Store · Featured | `/admin/applications/featured` | Featured-slot placement windows |
| App Store · Moderation | `/admin/applications/moderation` | Review queue, review detail/assignment, approve/reject/request-changes decisions |
| App Store · Appeals | `/admin/applications/appeals` | Moderation appeals with decision notes |
| Templates · Library | `/admin/applications/templates` | Template list, create/edit/delete, versions, submit review |
| Templates · Reviews | `/admin/applications/template-reviews` | Pending-review queue with backend-admin decisions |
| Templates · Categories | `/admin/applications/template-categories` | Template taxonomy CRUD |
| Operations · Analytics | `/admin/applications/analytics` | Exact totals: pending reviews, publishers, listings, collections, categories |

## Data planes

- **Deploy app SDK** — author-side templates, versions, categories and submission.
- **Deploy backend SDK** — template approval/rejection/disable/feature and
  template-category CRUD. Base URL: `VITE_SDKWORK_DEPLOYMENTS_BACKEND_API_BASE_URL`
  (falls back to the shared backend base URL rules; configure it explicitly in
  deployments).
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
  (template review, template-category write, moderation decide, publisher
  verify, collection/featured/visibility writes, integration writes) to a
  permission code. Today every action falls back to the module gate because the
  IAM catalog has no finer codes; tighten the map once those codes exist.
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
