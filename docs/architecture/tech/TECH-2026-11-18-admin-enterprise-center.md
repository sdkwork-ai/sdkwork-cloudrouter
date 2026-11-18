# TECH-2026-11-18 Admin Enterprise Center

Status: accepted
Owner: SDKWork maintainers
Application: sdkwork-cloudrouter
Related: [TECH-2026-11-18-admin-product-center-reinstatement.md](./TECH-2026-11-18-admin-product-center-reinstatement.md), `sdkwork-company` PRD

## 1. Decision

Cloud Router's admin header gains one first-class **Enterprise Center (企业中心)**
module at `/admin/enterprise`. It is a **composition host** over the
`sdkwork-company` domain, not a new company implementation:

```
overview (platform KPIs)
  └─ company management (onboarding review 入驻审核, companies 公司管理, introductions 公司介绍)
  └─ dictionaries (company classifications 公司分类, industries 行业管理)
  └─ recruitment (job moderation 招聘, application funnel 投递)
```

The enterprise center owns presentation only. Company rules, DTOs, persistence,
and permissions stay in `sdkwork-company`; the host composes the module's
generated backend SDK exactly like the trading, messaging, and hardware centers.

## 2. Capability ownership (高内聚)

| Surface | Owning module | Authority | Backend surface |
| --- | --- | --- | --- |
| Companies, review, status, company introduction | `sdkwork-company` | `@sdkwork/company-backend-sdk` | `/backend/v3/api/company/companies*` |
| Company classifications dictionary | `sdkwork-company` | `@sdkwork/company-backend-sdk` | `/backend/v3/api/company/classifications*` |
| Industry dictionary | `sdkwork-company` | `@sdkwork/company-backend-sdk` | `/backend/v3/api/company/industries*` |
| Recruitment moderation and funnel | `sdkwork-company` | `@sdkwork/company-backend-sdk` | `/backend/v3/api/company/jobs*`, `/applications` |

The owning module was completed first, because the previous backend surface
could not serve a commercial admin:

- `companies.management.list` was hardcoded to page 1 / size 200 with no
  keyword, industry, location, or status filter. It now takes
  `q`/`industry`/`location`/`status`/`page`/`page_size`, keeps pending and
  disabled companies visible, and returns a real offset page envelope.
- `jobs.management.list` had the same defect (published-only, page 1 / 200).
  It now exposes every lifecycle status with
  `q`/`company_id`/`location`/`status`/`page`/`page_size`.
- **New**: `companies.management.retrieve`, `companies.profile.update`
  (公司介绍: name, industry, description, tags, contacts, nature, stage,
  financing stage, media), `classifications.*` CRUD (公司分类),
  `industries.*` CRUD (行业管理), and `applications.management.list`
  (platform recruitment funnel). Total backend operations: 31.
- Dictionaries are tree-aware: reparenting recomputes `level`/`path`, a node
  cannot move under its own descendant, industry delete is refused while the
  node has children or a company profile references its code, and
  classification parents must stay inside one category.
- New permissions (`company.classifications.read/manage`,
  `company.industries.read/manage`) and operation mappings were added to
  `specs/iam.module.manifest.json`; `org_admin` already holds `company.*`.

## 3. Coupling boundary (低耦合)

- The admin package `@sdkwork/company-pc-admin-enterprise` (in the
  `sdkwork-company` workspace) owns screens, forms, tables, copy, and the
  contribution metadata the shell consumes.
- All data access goes through
  `@sdkwork/cloudroutes-pc-commons/sdk-clients`
  (`getSdkworkCompanyBackendSdkClient`) over the generated
  `@sdkwork/company-backend-sdk`. No `fetch`, `axios`, or hand-built URL.
- Identifiers and int64 counters stay strings end to end; the UI never converts
  a company id or counter to a lossy `number`.
- The package does not depend on `react-router-dom`; cross-screen links use an
  injected `onNavigate` callback, so any host can embed it.
- The package owns its own intl provider (`admin.enterprise.*` copy). The shell
  resolves `admin.header.enterpriseCenter` and `admin.menu.enterprise.*` from
  the same bundle merged into the host catalog.

## 4. Composition points

| File | Change |
| --- | --- |
| `../sdkwork-company/apps/sdkwork-company-pc/packages/sdkwork-company-pc-admin-enterprise/**` | new admin capability package (contribution + screens + service + i18n) |
| `apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudrouter-pc-admin-shell/src/adminModuleRegistry.ts` | header module `enterpriseCenter` + sidebar tree |
| `.../sdkwork-cloudrouter-pc-admin-shell/src/admin-route-permission-hints.ts` | contribution permission hints spread |
| `apps/sdkwork-cloudrouter-pc/src/admin/enterpriseCenterHostElement.tsx` | host element: SDK client → service, section, locale, SPA navigation |
| `apps/sdkwork-cloudrouter-pc/src/admin/cloudRouterAdminHostMount.tsx` | 9 route records (owner `sdkwork-company`, SDK family `sdkwork-company-backend-sdk`) |
| `.../sdkwork-cloudrouter-pc-i18n/src/resources/index.ts` | en/zh bundle registration |
| `.../sdkwork-cloudroutes-pc-commons/src/sdk-clients.ts` | `getSdkworkCompanyBackendSdkClient` |
| `pnpm-workspace.yaml`, PC `package.json` workspaces/dependencies, `agent.workflow.json` | workspace + CI checkout wiring for `sdkwork-company` |

## 5. Delivered capability matrix

| Surface | Create | Read | Update | Lifecycle |
| --- | --- | --- | --- | --- |
| Company | — | ✅ list (filter + page) / ✅ detail | ✅ 公司介绍 profile | ✅ approve / reject review, ✅ activate / disable |
| Company onboarding application | — | ✅ list by status | ✅ persisted review note | ✅ approve (provisions company + owner membership) / reject |
| Company classification | ✅ | ✅ list by category | ✅ title/description/parent/sort/enabled (descendant levels follow a move) | ✅ delete (leaf only) |
| Industry | ✅ | ✅ filtered list | ✅ title/parent/sort/standard/market scope/enabled (descendant paths/levels follow a move) | ✅ delete (leaf, unreferenced, unlinked) |
| Job | — | ✅ list (all statuses + page) | — | ✅ moderation approve/reject |
| Application | — | ✅ platform funnel (company/job/stage/status/keyword) | — | — |
| Platform KPIs | — | ✅ companies/jobs/applications/supplies/demands/bids | — | — |

## 6. Verification

- `sdkwork-company`: `pnpm api:materialize:check`, `pnpm sdk:generate:check`,
  `pnpm typecheck`, `pnpm db:validate`, `pnpm test:node`,
  `cargo test --workspace`, and
  `cargo clippy -p sdkwork-company-storage-sqlx-rust -p sdkwork-company-service -p sdkwork-routes-company-backend-api --all-targets -- -D warnings`.
- Iteration defects fixed after the first landing: onboarding approval now
  actually provisions the company profile + owner membership (previously it
  only flipped the application status); the employer application list now
  matches every company the caller belongs to (comma-joined ids previously
  matched nothing); industry/classification moves rewrite descendant
  path/level and reject cyclic reparents; industry delete no longer relies on a
  cascading link delete; the onboarding queue is paginated; list ordering has
  stable tie-breakers; the company and job review dialogs no longer offer a note
  the model cannot persist (the onboarding application keeps the persisted
  note). Paginated admin lists recover to the previous page when a mutation
  empties the current page. The company module's query parameters are now
  canonical `lower_snake_case` (`company_id`, `job_id`, `demand_type`,
  `demand_id`), so the API operation-pattern validator passes with no
  violations.
- `sdkwork-api-company` validators: `check-api-response-envelope.mjs`,
  `check-pagination.mjs`, `check-api-runtime-parity.mjs`,
  `check-database-framework-standard.mjs`, and `check-cors-standard.mjs` pass.
  `check-api-operation-patterns.mjs` reports only the pre-existing camelCase
  query parameters (`companyId`, `jobId`, `demandType`, `demandId`) that this
  change did not introduce.
- `sdkwork-cloudrouter`: PC `typecheck` passes with **zero** diagnostics (the
  previous 10 `documents-admin-client.ts` failures were fixed by adapting the
  adapter to the generated documents app SDK's nested
  `documentOverview.overview` / `documentCategories.categories` /
  `documentTags.tags` / `documentTaxonomy.taxonomy` surfaces);
  `check:i18n-standard`, `check:repository-docs-standard`,
  `check:commerce-debt`, `check:cloud-router-application-env`,
  `check:cors-standard`, the admin sidebar/domain-center node tests, and the
  enterprise i18n runtime test pass. The PC browser build typechecks before
  bundling.
- Remaining repository-level gate that reports pre-existing, unrelated debt is
  `verify-repo` (feature packages importing generated SDKs directly and
  missing component-spec layer roles, all in modules outside the enterprise
  center). The workflow-default version drift and the stale test-runner
  documentation examples that used to fail their gates were aligned in this
  iteration.
