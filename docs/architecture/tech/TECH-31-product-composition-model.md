> Migrated from `docs/31-product-composition-model.md` on 2026-06-24.
> Owner: SDKWork maintainers

> Version: 2.0  
> Date: 2026-06-24  
> Status: **active** — claw-router owns only generated gateway schema

## 1. Principle

`sdkwork-clawrouter` is the AI gateway and product shell. It **does not** compose sibling database modules or duplicate platform SoR tables. External capabilities are consumed through dependency SDKs and runtime services only.

| Capability | System of record | Claw-router DB lifecycle |
| --- | --- | --- |
| IAM foundation / OAuth / verification | `sdkwork-appbase` | **External** — appbase SDK / standalone auth bridge |
| Commerce base (wallet, orders, payments) | `sdkwork-商���` | **External** — commerce SDK facade |
| Commerce usage settlement projections | `sdkwork-clawrouter` | Generated in `schema.sql` (`commerce_usage_*`, `analytics_*`) |
| AI model catalog dictionary | `sdkwork-models` | **External** — bundled catalog or models SDK at runtime |
| Admin messaging delivery | `sdkwork-appbase-messaging` | **External** — messaging SDK |
| AI gateway / routing / ops | `sdkwork-clawrouter` | Generated in `schema.sql` |
| Application center / marketplace | `sdkwork-appstore` | **External** — appstore SDK |
| Drive file storage | `sdkwork-drive` | **External** — drive SDK |

## 2. Database lifecycle

`database/database.manifest.json` declares **no** sibling modules (`modules: []`).

Claw-router database lifecycle is limited to:

1. Generated claw-router schema (`generated/schema/postgres/schema.sql`)
2. Optional local baseline stubs under `database/ddl/baseline/postgres/` that do not import sibling SoR DDL

The router-service installer must not apply sibling commerce, models, messaging, or appstore DDL. IAM foundation subsets needed for standalone dev may remain as explicit, documented bootstrap exceptions in installer code until fully externalized.

## 3. Schema registry

Assembly registry (`docs/schema-registry/sdkwork-clawrouter.tables.yaml`) declares:

- Local `table_fragments` for claw-router-owned tables only
- **No** `registry_dependencies` — sibling domains are not merged into effective registry

Effective snapshot: `generated/schema/registry/sdkwork-clawrouter.tables.effective.yaml` (~93 tables)

## 4. Retired / external in claw-router

Do not add or regenerate DDL for:

- `platform_*` / `appstore_*` — owned by `sdkwork-appstore`
- `dr_drive_*` — owned by `sdkwork-drive`
- Base `commerce_*` (except usage projections), `promotion_*`, `messaging_*` — owned by sibling products
- `ai_model_*` catalog dictionary — owned by `sdkwork-models`
- Forum / content-feed tables — retired
- Core `iam_*` tenant/user tables — owned by appbase

`0002_clawrouter_legacy_projection.sql` is retired (empty stub).

`0004_messaging_runtime_projection.sql` is retired for new installs; messaging is external.

`c_category` remains for skill/agent/MCP classification until those domains are extracted.

## 5. API and frontend

- App center UI/APIs consume `sdkwork-appstore-*-sdk`
- Drive uploads/previews consume `sdkwork-drive-*-sdk`
- Admin commerce UI uses `@sdkwork/clawrouter-backend-sdk` commerce facade (no local commerce SoR tables)
- Admin OAuth uses `sdkwork-iam-backend-sdk`
- Model catalog admin/read paths use `sdkwork-models-*-sdk` or bundled catalog
- Declarations live in `specs/dependency-api-surfaces.json`

Schema registry composition follows `../sdkwork-specs/SCHEMA_REGISTRY_SPEC.md`.

