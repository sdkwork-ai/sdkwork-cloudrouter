# TECH-2026-11-18 Admin Product Center Reinstatement

Status: accepted  
Owner: SDKWork maintainers  
Application: sdkwork-cloudrouter  
Related: [TECH-2026-05-22-admin-product-center.md](./TECH-2026-05-22-admin-product-center.md) (retired plan), [TECH-2026-06-10-admin-product-center-commercial.md](./TECH-2026-06-10-admin-product-center-commercial.md) (retirement notice)

## 1. Decision

Cloud Router's admin header gains one first-class **Product Center (商品中心)**
module at `/admin/products`. It is a **composition host**, not a new domain
implementation:

```
catalog (products → SKUs → brands)
  → taxonomy (categories → category attributes)
    → inventory (stock levels → movements → reservations)
      → fulfillment (shipments → logistics tracking)
```

The 2026-06-30 retirement removed the Cloud Router portal's *legacy commerce
admin packages* (`@sdkwork/cloudrouter-pc-admin-catalog`,
`@sdkwork/cloudrouter-pc-admin-inventory`, the deleted `@sdkwork/commerce-*`
facades). This decision does not restore any of them. The Product Center is a
new, narrower surface: it composes the **owning modules' generated backend
SDKs** and keeps every domain rule in the module that owns it.

## 2. Capability ownership (高内聚)

| Surface | Owning module | Authority | Backend surface |
| --- | --- | --- | --- |
| Products, SKUs, categories, category attributes, brands | storefront catalog (`sdkwork-merchandise`) | `@sdkwork/shop-backend-sdk` | `/backend/v3/api/catalog/*` |
| Stock levels, movements, reservations | inventory (`sdkwork-inventory`) | `@sdkwork/inventory-backend-sdk` | `/backend/v3/api/inventory/*` |
| Shipments, packages, tracking numbers | order (`sdkwork-order`) | `@sdkwork/order-backend-sdk` | `/backend/v3/api/shipments/*` |

The Rust side already exposes the management contracts this surface needs, so
this change adds **no** backend endpoint, migration, or route contract:

- catalog (20 operations): category list/create/retrieve/update/delete,
  product list/create/retrieve/update/delete/publish/archive, product
  attributes replace, SKU list/create/retrieve/update/delete, attribute
  list/create/retrieve/update, category-attribute list/create/update/delete,
  attribute-value list/create/update/delete, brand list/create/retrieve/update/delete,
  price-list and media families.
- inventory (4 operations): `stocks.list`, `stocks.update`,
  `reservations.list`, `movements.list`.
- order shipments (6 operations): shipments list/retrieve, package
  management list, package create/update.

If a future capability is missing (for example a carrier webhook inside the
order module), it MUST be added to the owning module's Rust route, OpenAPI
authority, and generated SDK first, then composed here. The Product Center never
opens a raw HTTP path to compensate.

## 3. Coupling boundary (低耦合)

- The admin package `@sdkwork/cloudrouter-pc-admin-product` owns presentation
  only: pages, forms, tables, copy, and the contribution metadata the shell
  consumes.
- All data access goes through
  `@sdkwork/cloudroutes-pc-commons/sdk-clients`
  (`getSdkworkShopBackendSdkClient`, `getSdkworkInventoryBackendSdkClient`,
  `getSdkworkOrderBackendSdkClient`). No `fetch`, `axios`, or hand-built URL.
- Optimistic concurrency is preserved: every guarded write sends the `version`
  it read as `If-Match`, so a stale edit answers `41201` instead of silently
  overwriting a concurrent operator.
- Prices remain integer minor units; the UI formats them and never converts an
  identifier or amount to a lossy `number`.
- The package does not depend on `react-router-dom`; cross-screen links are plain
  anchors so any host can embed it.

## 4. Composition points

| File | Change |
| --- | --- |
| `apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudrouter-pc-admin-product/**` | new admin capability package |
| `.../sdkwork-cloudrouter-pc-admin-shell/src/adminModuleRegistry.ts` | header module `productCenter` + sidebar tree |
| `.../sdkwork-cloudrouter-pc-admin-shell/src/admin-route-permission-hints.ts` | `/admin/products` → `cloudrouter.admin.access` |
| `apps/sdkwork-cloudrouter-pc/src/admin/cloudRouterAdminHostMount.tsx` | 11 lazy routes with per-screen owning module + SDK family |
| `.../sdkwork-cloudrouter-pc-i18n/src/resources/index.ts` | en/zh bundle registration |
| `.../sdkwork-cloudroutes-pc-commons/src/sdk-clients.ts` | shop / inventory / order backend client factories |

## 5. Operation-contract representation

The Product Center's service operations are **not** redeclared in
`docs/schema-registry/frontend-field-contracts.yaml`. They are owned by the
catalog / inventory / order OpenAPI authorities and their generated SDK
contracts, exactly like the payment, membership, promotion, and base-data
clients that the frontend operation audit already treats as
capability-owned (`COMPOSED_COMMERCE_SDK_PATTERN`). `tools/frontend_operation_audit.py`
therefore carries a matching `PRODUCT_CENTER_DEPENDENCY_SDK_PATTERN` for
`getSdkworkShopBackendSdkClient`, `getSdkworkInventoryBackendSdkClient`, and
`getSdkworkOrderBackendSdkClient`.

The alternative — declaring catalog/inventory/shipment tables in the Cloud
Router contract — was rejected: the host does not serve those handlers, so the
declaration would claim table ownership the application does not have and would
falsify `required_tables`.

## 6. Debt policy change

`commerce-debt-runtime.test.ts` previously asserted that the admin registry must
not contain `productCenter`. That assertion encoded the retirement, not a
permanent standard. It now asserts the opposite for the Product Center while
keeping every legacy prohibition:

- forbidden: `@sdkwork/commerce-pc-*`, `@sdkwork/commerce-*` service/facade
  packages, `sdkwork-commerce-*-sdk` families, `cloudrouter-pc-admin-catalog`,
  `cloudrouter-pc-admin-inventory`, and the deleted `commerce` domain transport;
- required: `@sdkwork/cloudrouter-pc-admin-product` composed through
  `workspace:*`, with the three owning-module SDKs declared and used, and with no
  raw HTTP in the service layer.

## 7. Delivered capability matrix

| Surface | Create | Read | Update | Lifecycle |
| --- | --- | --- | --- | --- |
| Product (SPU) | ✓ | ✓ list / ✓ detail | ✓ | publish, archive |
| Product attributes (key / parameter) | — | ✓ (from detail) | ✓ replace whole set with `If-Match` | — |
| Product media (main/gallery/detail/sku/video) | ✓ `external_url` + Drive image upload | ✓ | ✓ role/alt/order/status | delete |
| SKU | ✓ single, ✓ variant matrix | ✓ | ✓ price/status/oversell | — |
| Brand | ✓ | ✓ | ✓ | — |
| Category | ✓ | ✓ | ✓ | — |
| Category tree (cascade) | ✓ root/child | ✓ lazy per level | ✓ create/edit/delete | delete |
| Attribute (dictionary) | ✓ | ✓ | ✓ name/unit/status | — |
| Attribute enum values | ✓ | ✓ | ✓ | delete |
| Category attribute binding | ✓ | ✓ | ✓ role/required/searchable/filterable/comparable | delete |
| Price list | ✓ | ✓ | ✓ name/segment/status | — |
| Price list item | ✓ | ✓ | ✓ price/min quantity/status | delete |
| Stock | — | ✓ | ✓ available/safety/status | — |
| Stock movement command (inbound / outbound / stocktake) | ✓ appends ledger row | — | — | — |
| Stock movement / reservation | — | ✓ | — | — |
| Shipment / package | package ✓ | ✓ | package ✓ | — |
| Shipment tracking event | ✓ append | ✓ timeline | — | — |
| Carrier registry | ✓ | ✓ | ✓ code/name/tracking URL/order/status | status toggle |

## 8. Owned-module completion performed

The inventory module was not commercially serviceable: its repository reads
`commerce_inventory_movement` and the stock `inbound_quantity`/`damaged_quantity`
columns, but no baseline or migration ever created them, and the only
"adjustment" path overwrote `available_quantity` without a ledger row, without an
organization guard, and without an idempotent command surface. Completed in
`sdkwork-inventory` before composing it here:

- `database/migrations/postgres/0002_inventory_movement_and_stock_quantities.up.sql`
  adds the missing columns and creates `commerce_inventory_movement` with the
  columns the repository already selects (baseline-plus-migrations strategy, so
  existing deployments upgrade in place).
- `PostgresCommerceInventoryStore::adjust_backend_stock` is a single transaction:
  row lock → non-negative quantity checks → stock update with `version + 1` →
  movement row with the before/after pair and direction → reload → commit.
- `POST /backend/v3/api/inventory/stocks/{stockId}/adjustments`
  (`inventory.stocks.adjustments.create`, permission `commerce.inventory.manage`)
  returns `201` with the updated stock; the request carries `quantityDelta` as an
  int64 **string** (`x-sdkwork-int64-string`), `movementType`
  (`inbound` | `outbound` | `stocktake`), and the required `Idempotency-Key`
  header. The movement id is derived from the stock and that key, so a replayed
  adjustment finds the existing ledger row and returns the current stock instead
  of moving the quantity twice. The route manifest had been marked idempotent
  while the handler ignored the key and used a random movement id — a real
  double-apply defect fixed in this change.
  (`inbound|outbound|stocktake`), `reason`, `requestNo`.
- `stocks.update` now refuses to reset unspecified fields to zero, rejects a
  negative available quantity, bumps `version`, and applies the organization
  guard.
- **int64 wire contract (API_SPEC §13.6)** completed for every inventory
  quantity: `InventoryStock`, `InventoryMovement`, `InventoryReservation`,
  `UpdateInventoryStockRequest`, and the app-api `CreateInventoryAdjustmentRequest`
  now declare `type: string, format: int64, pattern: ^-?[0-9]+$, x-sdkwork-int64-string: true`.
  `UpdateStockRequest` parses the optional quantities through
  `sdkwork_utils_rust::serde_int64::option`, and every response mapper serializes
  quantities as decimal strings, so the wire matches the generated SDK types
  (which always said `string`). This also fixes a real defect: the previous
  numeric JSON contract rejected the string bodies the generated SDK sends.
- The merchant adjustment path was rebuilt on the same transaction discipline
  (row lock, non-negative check, movement row with `merchant_adjustment` source,
  organization guard) and now parses the string delta.
- Rust unit tests cover the pre-database validation (zero delta, unknown movement
  type). The OpenAPI authority, route manifest, and generated
  `@sdkwork/inventory-backend-sdk` were regenerated with
  `node tools/inventory_api_sdk_generate.mjs` (backend family now has 5
  operations).

### Order module (logistics tracking)

The shipment tracking table (`commerce_shipment_tracking_event`) existed but no
write path was ever implemented and the backend admin API only listed
shipments/packages, so "物流" was display-only. Completed in `sdkwork-order`:

- `ShipmentTrackingEventManagementListQuery` / `CreateShipmentTrackingEventCommand`
  (operator scope: tenant + organization, no owner user id).
- Repository `list_management_shipment_tracking_events` (shipment scope check,
  occurrence-ordered, DB-paginated) and
  `create_management_shipment_tracking_event` (deterministic event id from the
  write command's idempotency key + `ON CONFLICT DO NOTHING`, so a retried
  carrier scan never duplicates the timeline).
- `GET`/`POST /backend/v3/api/shipments/{shipmentId}/tracking_events`
  (`shipments.trackingEvents.management.list` read permission,
  `shipments.trackingEvents.create` manage permission, idempotent POST).
- Service contract, route manifest, OpenAPI authority, and the generated
  `@sdkwork/order-backend-sdk` were updated in the same change; Rust route tests
  pass.

The Product Center then adds a shipment tracking timeline dialog
(`ShipmentTrackingDialog`) on both the shipment queue and the logistics board.

### Order module (carrier registry)

Shipments carried only a free-text `carrier_code`, so the admin could neither
validate a carrier nor render a tracking link. Completed in `sdkwork-order`:

- `database/migrations/postgres/0022_commerce_carrier.up.sql` creates
  `commerce_carrier` with a natural unique key `(tenant_id, organization_id,
  carrier_code)` and the `(tenant_id, status, sort_order)` read index.
- `CarrierListQuery` / `CreateCarrierCommand` / `UpdateCarrierCommand` /
  `CarrierView` / `CarrierPage`; the storage id is derived from the natural key,
  so a retried create with the same code is a no-op that returns the existing
  carrier instead of violating the unique index.
- `GET/POST /backend/v3/api/carriers` and `PATCH /backend/v3/api/carriers/{carrierId}`
  (`commerce.orders.read` / `commerce.orders.manage`, idempotent writes), plus
  route manifest, service contract, OpenAPI authority, and regenerated
  `@sdkwork/order-backend-sdk` (`orderAdminShipments.carriers`).

The Product Center composes it as «承运商管理» and the logistics board now shows
`Carrier name (code)` in the carrier group header, falling back to the raw code
when the registry has no entry for it.

### Shop module (category tree root filter)

The catalog list contract could filter by `parent_id`, but an absent `parent_id`
means "every category", so a tree UI had no way to load only the root level and
had to fetch the whole taxonomy. Completed in `sdkwork-merchandise` (the shop
catalog backend):

- `CategoryListQuery.root_only` + `root_only` query parameter on
  `GET /backend/v3/api/catalog/categories` (`type: boolean`, default `false`).
- `LIST_CATEGORIES_SQL` / `COUNT_CATEGORIES_SQL` gained
  `AND (NOT $5::BOOLEAN OR parent_id IS NULL)`, so both the page and its total
  count honour the filter.
- The shop OpenAPI authority was re-materialized
  (`tools/merchandise_openapi_export.mjs`) and `@sdkwork/shop-backend-sdk` was
  regenerated (`sdks/sdkwork-shop-backend-sdk`, `rootOnly?: boolean`).

The Product Center then replaced its full-taxonomy load with a lazy ladder: the
first column is `root_only=true`, and each deeper column is one `parent_id`
query issued when the operator opens a branch. Each level is capped by the
contract's 200-row page and the UI states when a level was truncated.

### Media upload (Drive)

The catalog media contract already accepts a full `MediaResource`, including
`source: drive` with `uri: drive://spaces/{spaceId}/nodes/{nodeId}`, so uploaded
files belong in the catalog without a schema change. Delivered in this
repository:

- New upload slot `admin-product-media` in
  `@sdkwork/cloudroutes-pc-commons` (`public_asset`, `image` profile, 5 MB,
  read-only share link) and its mirror entry in
  `apps/sdkwork-cloudrouter-pc/specs/upload.declaration.json`
  (`commerce.product_media`, scene `product-media`).
- The product detail media panel gained «上传图片»: the shared
  `DriveUploadImage` component (same one the community/admin-site upload fields
  use) uploads through `drive-app-sdk`, and the resulting Drive resource is
  registered as catalog media (`POST /catalog/media`, `mediaRole: main_image`)
  with the Drive reference, never an expiring signed URL.
- External-URL registration stays available for video/document/legacy assets.

## 9. Remaining gaps to commercial release

1. **Carrier service levels / SLA metadata** — the registry stores code, display
   name, tracking URL template, ordering, and enablement; per-service-level
   (express/standard) rates and SLA promises would need their own table and
   quote integration. Owner: `sdkwork-order`.
2. **Granular write permissions** — pages are gated by
   `cloudrouter.admin.access`; per-capability codes (product/inventory/
   shipment write) belong to the IAM module manifest and the bootstrap role.
3. **Catalog create replay semantics** — catalog creates carry no
   `Idempotency-Key`, so a retried create is **not** replay-idempotent. It cannot
   duplicate the record (the baseline has unique `(tenant_id, spu_no)`,
   `(tenant_id, sku_no)` and category/attribute business-key indexes), but the
   retry answers `409` instead of replaying the original `201`. Making it match
   the order/inventory command semantics needs an idempotency-key table in the
   catalog module. Owner: `sdkwork-shop` catalog.
4. **Admin shipment creation** — the order backend admin surface exposes no
   `POST /shipments` (shipments are created by the buyer/fulfillment flow), so the
   Product Center lists shipments and manages packages/tracking/carriers but
   cannot create one. Adding it is an owning-module feature. Owner:
   `sdkwork-order`.
5. **Inventory operation-id/tag naming** — every inventory operation uses the
   `inventory` tag while its operationId starts with `inventory.` (for example
   `inventory.stocks.list`), which `check-api-operation-patterns` reports as
   `operation-id-tag-duplication`. Fixing it renames generated SDK classes or
   root client properties for every consumer, so it needs a coordinated SDK shape
   migration rather than an in-place edit. Owner: `sdkwork-inventory`.
5. **Video / document media upload** — the Drive upload slot is image-only
   (`uploadProfileCode: image`, 5 MB); video and document attachments are still
   registered by URL. A video slot needs a streaming/presigned-playback design
   decision plus its own declaration entry.
6. **Real-backend smoke** — the browser suite runs the real admin shell with the
   owning-module APIs mocked (this environment has no PostgreSQL); a deployment
   verification should replay the same flows against the live gateway.

## 10. Verification

Commands run from the repository root unless stated otherwise:

```bash
pnpm --filter @sdkwork/cloudrouter-pc-admin-product typecheck   # pass
pnpm --filter @sdkwork/cloudrouter-pc-admin-product test        # 23/23 pass
node ../sdkwork-specs/tools/check-i18n-standard.mjs --root .    # pass (8878 files)
node ../sdkwork-specs/tools/check-workspace-member-protocol.mjs --root .   # pass
node ../sdkwork-specs/tools/check-dependency-list-completeness.mjs --root . # ok
node ../sdkwork-specs/tools/check-package-content-standard.mjs --workspace . # pass
node ../sdkwork-specs/tools/check-upload-declaration-standard.mjs --workspace .. # app entry valid (workspace-wide: 8 pre-existing violations in other repos)
node node_modules/vitest/vitest.mjs run packages/sdkwork-cloudroutes-pc-commons/src/file-upload/upload-declaration.test.ts \
  packages/sdkwork-cloudroutes-pc-commons/src/drive-media.test.ts   # 12/12 pass
pnpm --dir apps/sdkwork-cloudrouter-pc check:dependencies        # pass
node --import tsx --import ./scripts/css-stub-loader.mjs --test \
  admin-sidebar-runtime.test.ts                                  # 8/8 pass
node --import tsx --test commerce-debt-runtime.test.ts           # product-center test passes
python -B -m tools.frontend_operation_audit                      # no product-center gaps
python -B -m tools.frontend_contract_guardian                    # no product routes reported
```

Browser-level smoke (real admin shell, owning-module APIs mocked):

```bash
# terminal 1 — renderer only (standalone.development)
pnpm --dir apps/sdkwork-cloudrouter-pc dev
# terminal 2
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4736 PLAYWRIGHT_WEBSERVER_DISABLED=1 \
  pnpm --dir apps/sdkwork-cloudrouter-pc exec playwright test e2e/product-center-admin.spec.ts
# 12/12 pass: header module entry, catalog list, one-level-at-a-time category tree
# (root_only first, parent_id only after a branch opens), carrier registry + logistics
# carrier label, shipment tracking timeline dialog, product detail (SPU attributes +
# SKU matrix), price lists, attribute dictionary, inventory stocks, and the write
# paths (product create, stock movement with an int64-string delta and
# Idempotency-Key, tracking event, carrier create).
```

The same spec also covers the product detail page (SPU attributes + SKU matrix),
the price-list page, the attribute dictionary, and the inventory overview, and
runs 8/8 cases against the real admin shell with the owning-module APIs mocked
(the mock seam exists only because this environment has no PostgreSQL backend).

Owning-module verification (from `../sdkwork-inventory`):

```bash
cargo check -p sdkwork-inventory-repository-sqlx -p sdkwork-routes-inventory-backend-api  # pass
cargo test  -p sdkwork-inventory-repository-sqlx                                          # 2/2 pass
node tools/inventory_api_sdk_generate.mjs --check                                         # pass (backend: 5 ops)
node ../sdkwork-specs/tools/check-database-framework-standard.mjs --root .                # pass
node ../sdkwork-specs/tools/check-api-operation-patterns.mjs --workspace .                # int64 clean; tag-duplication debt remains
```

Owning-module verification for logistics (from `../sdkwork-order`):

```bash
cargo check -p sdkwork-order-repository-sqlx -p sdkwork-routes-order-backend-api  # pass
cargo test  -p sdkwork-routes-order-backend-api                                  # 19 pass
node sdks/sdkwork-order-backend-sdk/bin/generate-sdk.mjs                         # 75 generated files
node ../sdkwork-specs/tools/check-api-operation-patterns.mjs --workspace .       # pass
node ../sdkwork-specs/tools/check-api-response-envelope.mjs --workspace .        # pass
```

Owning-module verification for the category tree (from `../sdkwork-merchandise`
and `../sdkwork-shop`):

```bash
cargo check -p sdkwork-merchandise-service -p sdkwork-merchandise-repository-sqlx \
             -p sdkwork-merchandise-web-support -p sdkwork-routes-merchandise-backend-api  # pass
cargo test -p sdkwork-merchandise-service                                      # 11 pass
node tools/merchandise_openapi_export.mjs --check                             # pass (47 operations)
# shop:
pnpm api:materialize && pnpm api:check                                        # pass (2 authorities)
pnpm sdk:generate && pnpm sdk:check                                           # pass (backend 96 / app 45)
```

Registration of the two sibling SDK packages is authored in the canonical
workspace registry (`sdkwork-specs/workspace/consumers/sdkwork-cloudrouter.json`)
and materialized with
`node ../sdkwork-specs/tools/sync-workspace.mjs --repo sdkwork-cloudrouter --root .`,
so `pnpm-workspace.yaml` stays generator-owned. `agent.workflow.json` already
declared `sdkwork-shop` and `sdkwork-inventory` for CI checkout.

Pre-existing failures observed at this revision (reproduced without this change;
they are not caused by, and are not fixed by, this work):

- `apps/sdkwork-cloudrouter-pc/scripts/typecheck-owned-sources.mjs`: 10
  diagnostics, all in `packages/sdkwork-cloudroutes-pc-commons/src/documents-admin-client.ts`
  (`DocumentCategoriesApi`/`DocumentTagsApi`/`DocumentTaxonomyApi` drift against
  the sibling `sdkwork-documents` generated SDK).
- `sdk-composition-standard.test.mjs`: literal `route('...')` count expects 43
  while the host mount has had 70 since before this change; plus the payments
  source regex and the owner-only backend-SDK assertion.
- `commerce-debt-runtime.test.ts`: the retired-package assertion still lists
  `@sdkwork/cloudrouter-pc-admin-skill`, which the app legitimately depends on;
  and the `sdks/*/src/domains/index.ts` existence assertions.
- `frontend_contract_guardian`: 26 unrelated routes (applications, data, domains,
  model frontend, console IAM) have no delivery classification yet.
- `frontend_operation_audit`: unrelated pre-existing gaps in `admin-data`,
  `admin-domain`, `admin-application` tests, `sdkwork-models`, and `sdkwork-memory`.
- `pnpm build` (`standalone.production` and `standalone.development`): the local
  checkout's credential-entry profile carries the placeholder
  `__SDKWORK_DEPLOY_APPLICATION_ID__`, so `vite.config.ts` refuses to build until
  a real deployment credential is present. The dev server, typecheck, unit tests
  and browser E2E run normally; this is an environment constraint, not a product
  center defect. One `frontend_contract_guardian` finding against this module (API
  path literals inside a JSDoc comment) was fixed by rewording the comment.

## 11. Commercial readiness sign-off

| Objective capability | Delivered | Evidence |
| --- | --- | --- |
| Products / SPU attributes / media | product list+detail CRUD, SPU attribute editing, media register/edit/delete and Drive image upload | 23 unit tests, e2e cases 2/6, media upload typecheck + commons tests |
| SKU variant matrix | SKU list CRUD + combination matrix dialog from key attributes | e2e case 6 (`P-1-01`), unit tests |
| Category tree | lazy per-level ladder over `root_only`/`parent_id` | e2e case 3 (request assertions), category-tree unit test |
| Category attributes & values | bindings, enum value dictionary, value dialogs | attribute e2e case 7, unit tests |
| Price lists | list CRUD + items dialog | e2e case 7 |
| Inventory (inbound / outbound / stocktake) | adjust command with int64-string delta + idempotency, safety stock settings, movements/reservations views | e2e case 10, inventory cargo tests |
| Fulfillment & logistics | shipments, packages, tracking timeline, carrier registry + carrier label | e2e cases 4/5/12, order cargo tests |
| Permissions | owning backends enforce `commerce.catalog/inventory/orders.*`; IAM `commerce` module grants `commerce.*` to `org_admin`/`org_operations`; host routes gated by `cloudrouter.admin.access` | route manifests, IAM manifests |
| i18n | en-US + zh-CN bundles for every screen | `check-i18n-standard` pass (8878 files) |
| Tests | owning-module Rust tests, package unit tests, browser E2E | order 19, inventory 2, merchandise 11, product 23, commons 12, e2e 12 |
| Documentation | this document + superseded note | — |

Residual items are listed in section 9; none blocks the composed capability, and
each names the owning module.

