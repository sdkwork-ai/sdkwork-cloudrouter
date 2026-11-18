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
catalog (products · SKUs · brands)
  └─ taxonomy (categories · category attributes)
    └─ inventory (stock levels · movements · reservations)
      └─ fulfillment (shipments · logistics tracking)
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
| `.../sdkwork-cloudrouter-pc-admin-shell/src/admin-route-permission-hints.ts` | `/admin/products` →`cloudrouter.admin.access` |
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
| Product media (main/gallery/detail/sku/video) | ✓ `external_url` + Drive image/video/document upload | ✓ | ✓ role/alt/order/status | delete |
| SKU | ✓ single, ✓ variant matrix | ✓ | ✓ price/status/oversell | delete |
| Brand | ✓ | ✓ | ✓ | delete |
| Category | ✓ | ✓ | ✓ | delete |
| Category tree (cascade) | ✓ root/child | ✓ lazy per level | ✓ create/edit/lifecycle/delete | delete |
| Attribute (dictionary) | ✓ | ✓ | ✓ name/unit/status | — |
| Attribute enum values | ✓ | ✓ | ✓ | delete |
| Category attribute binding | ✓ | ✓ | ✓ role/required/searchable/filterable/comparable | delete |
| Price list | ✓ | ✓ | ✓ name/segment/status | — |
| Price list item | ✓ | ✓ | ✓ price/min quantity/status | delete |
| Stock | — | ✓ | ✓ available/safety/status | — |
| Stock movement command (inbound / outbound / stocktake) | ✓ appends ledger row | — | — | — |
| Stock movement / reservation | — | ✓ | — | — |
| Shipment / package | shipment ✓ + package ✓ | ✓ | package ✓, shipment ✓ | mark shipped |
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

### Order module (admin fulfillment list and shipment creation)

The admin surface could list shipments but had no way to read the fulfillment a
shipment belongs to, and no way to create one. Completed in `sdkwork-order`:

- `FulfillmentManagementListQuery` + `PostgresCommerceOrderStore::list_management_fulfillments`
  (tenant/organization scope, optional order/status filters, DB pagination) and
  `GET /backend/v3/api/fulfillments` (`fulfillments.management.list`,
  `commerce.orders.read`).
- `CreateShipmentCommand` + `create_management_shipment`: verifies the
  fulfillment exists inside the caller's organization, derives the shipment id
  from tenant/fulfillment/idempotency key (a replay returns the existing
  shipment), generates `SHP-{requestNo}` and inserts the row with status
  `created`. Exposed as `POST /backend/v3/api/shipments` (`shipments.create`,
  `commerce.orders.manage`, idempotent).
- `MarkShipmentShippedCommand` + `mark_management_shipment_shipped`: exposes the
  lifecycle advance that package edits previously triggered only by typing the
  exact status `shipped`. It marks the shipment, its fulfillment, and the owner
  order as `shipped` (idempotent: rows already shipped/delivered are skipped) and
  is exposed as
  `POST /backend/v3/api/shipments/{shipmentId}/mark_shipped`
  (`shipments.markShipped`, `commerce.orders.manage`, idempotent).
- Route manifest, service contract, OpenAPI authority and
  `@sdkwork/order-backend-sdk` were regenerated. The first OpenAPI patch inserted
  a second `/backend/v3/api/shipments` object that shadowed the existing list
  operation; the two operations are now merged into one path, and the regenerated
  SDK exposes `shipments.list`, `shipments.create`, `shipments.retrieve`, and
  `fulfillments.management.list`.

The Product Center shipment page gained «新建发货单»: fulfillment and carrier are
selects (falling back to text when the lookups are unavailable), the optional
tracking number is recorded, and the write carries `Idempotency-Key`. Shipments
that are not yet shipped also expose «标记已发货», which calls the mark-shipped
command and refreshes the list.

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

The Product Center renders the taxonomy with the same **`CascadeCategoryManager`**
component the Application Center uses (five columns, per-column create actions,
per-row create/edit/lifecycle/delete actions, `code · status` secondary line,
empty/selection hints). Data stays lazy: the first column is `root_only=true`,
and a deeper column is fetched with `parent_id` the first time its branch is
opened, so a large catalog never ships the whole taxonomy to the browser. Row
actions are compact icon buttons, so the category name keeps its column width.

### UI alignment with the Application Center

The Application Center's category tab rendered two headers and two refresh
buttons: `ApplicationManagementPage` always rendered its page header while the
embedded `AppStoreCategoryPanel` rendered its own category header. The page
header is now omitted on the `categories` view, so the category panel owns the
header there (verified by `e2e/application-category-header.spec.ts`).

### Media upload (Drive)

The catalog media contract already accepts a full `MediaResource`, including
`source: drive` with `uri: drive://spaces/{spaceId}/nodes/{nodeId}`, so uploaded
files belong in the catalog without a schema change. Delivered in this
repository:

- Three upload slots in `@sdkwork/cloudroutes-pc-commons`, each mirrored in
  `apps/sdkwork-cloudrouter-pc/specs/upload.declaration.json`
  (`commerce.product_media`, scenes `product-media`, `product-media-video`,
  `product-media-document`):
  - `admin-product-media` — image profile, 5 MB, `main_image`
  - `admin-product-video` — video profile, 100 MB, `video`
  - `admin-product-document` — document profile, 20 MB, `manual`
  All use the `public_asset` category with a read-only share link.
- The product detail media panel gained «上传媒体»: a kind selector chooses the
  slot, images upload through the shared `DriveUploadImage` component while
  video/document upload through the commons `useCloudRouterUpload` hook (MIME and
  size validation included). The resulting Drive resource is registered as
  catalog media (`POST /catalog/media`) with the Drive reference, never an
  expiring signed URL.
- External-URL registration stays available for legacy assets.

### Seed catalog and startup initialization

The admin list was not the cause of the "only two products" report: the live
development database contained exactly two SPUs (`membership-catalog`,
`course-catalog`) because the shop module's seed profile only declared those two
catalogs. The read path lists whatever the owning module returns, and the
inventory/shipment views are operational (not seeded reference data).

The shop module now seeds a full retail graph in
`database/seeds/common/003_retail_catalog.sql` (registered in
`seed.manifest.json` after the course seed):

- two root categories with five leaf categories (network, smart home,
  accessories, office peripherals, home appliance), so the five-column cascade
  has real depth;
- six attributes with dictionaries (colour, connectivity, capacity, material,
  warranty months, power watts) and their category templates;
- three brands and nine physical/service SPUs with 14 variant SKUs, SKU axes,
  SPU specifications, ten media rows, and thirteen retail price-list overrides;
- all statements upsert on reserved seed-id blocks, so boot seeding and
  `db:seed` are idempotent and never overwrite operator edits.

A second, generator-based seed —
`database/seeds/common/004_industry_catalog.sql`, also in the `standard` profile
— produces the industry-scale default catalog required for every environment:

- ten industry roots (3C digital, home appliances, apparel, beauty, food, home,
  sports, baby, office, automotive) with four leaf categories each, every leaf
  carrying a colour + package-specification sales axis and one profile parameter
  (warranty, power, material or shelf life);
- twelve industry brands, six attribute dictionaries and category templates;
- **1200 SPUs** (120 per industry) and **2400 variant SKUs** generated by
  PostgreSQL `generate_series` from a deterministic formula: realistic brand +
  series + model names, CNY prices inside per-category bands, 88 % active /
  5 % draft / 4 % inactive / 3 % archived spread, one main image per product
  plus a gallery every fifth product, one SPU parameter per product, and a
  price-list row for every active SKU;
- the whole file is ~31 KB of SQL, so startup seeding stays fast while still
  creating over a thousand products; reserved seed-id ranges were widened in
  `database/contract/schema.yaml` (SPUs 1500..159999, SKUs 1600..169999,
  media 2400..259999, price items 2100..219999, and so on) so generated ids stay
  far below runtime snowflakes;
- `tests/static/industry_catalog_seed.test.mjs` guards the requirement: the
  manifest must apply the file and the generator must produce at least 1000
  products.

Shop's `database.manifest.json` already sets `seedOnBoot: true` with the
`standard` profile, so the boot path (`bootstrap_merchandise_database`) runs
init → migrate → seed on every service start; an explicit install/upgrade runs
`db:init` / `db:migrate` first and then the same seed set. The same seed files
are therefore applied in development, test, staging, demo and production; an
environment that disables boot seeding still receives them through its install
lifecycle (`db:seed`). Every shipped topology file
(`etc/topology/{standalone,cloud}.{development,test,staging,demo,production}.env`)
sets `SDKWORK_DATABASE_SEED_ON_BOOT=true`, so all five environments seed on
service start. Applying the set to the development database
(`pnpm db:seed`, "applied 1 seed script") moved the catalog from 2 products /
17 SKUs / 2 categories to **1211 products (1066 active and sellable) /
2431 SKUs / 59 categories / 17 brands / 1453 media rows / 2134 price items**.
A second `db:seed` run reports "applied 0 seed script(s)", proving idempotency and
that operator edits to seeded rows are not overwritten on later boots.

The order module gained `database/seeds/common/002_carriers.sql` (SF, JD, YTO,
DHL with tracking URL templates) so the carrier registry and the shipment
create dialog have reference data. `commerce_carrier` comes from migration
`0022_commerce_carrier`; the development database had `autoMigrate: false` and
the migration had not been applied, which is exactly why boot-seed would have
failed before: **migrations must run before seeds on install/upgrade**. After
`pnpm db:migrate` (2 migrations) and `pnpm db:seed` (1 script), both modules
report `pending_migrations=0` and the four carriers are readable.

Inventory stock and fulfillment rows were previously left to their flows, which
made the demo surfaces (stock list, movements, reservations, shipments,
packages, tracking timeline, logistics board) empty. For the professional demo
they are now seeded too, with clearly labelled `demo-*` ids:

- `sdkwork-inventory` `database/seeds/common/002_demo_stocks.sql`: **2413 stock
  rows** on `wh-main` (2400 generated SKUs + the 13 retail SKUs), 4 movement
  ledger rows (two inbound, one outbound, one stocktake), and 2 reservations for
  the demo orders. Every 37th stock row is deliberately below its safety stock
  (available 5 / safety 50, **64 low-stock rows**) so the inventory views show a
  realistic mix. The inventory manifest now sets `seedOnBoot: true`, so every
  environment seeds stock on service start.
- `sdkwork-order` `database/seeds/common/003_demo_shipments.sql`: **3
  fulfillments, 3 shipments, 4 packages, 5 tracking events** across SF, JD and
  YTO — one delivered shipment with a three-step timeline, one in-transit
  shipment, and one freshly created shipment, so the shipment queue, logistics
  board and tracking dialog all have data.
- Catalog media from the 003/004 seeds now uses external placeholder URLs
  (`https://picsum.photos/seed/...`) instead of `drive://` demo URIs that had no
  resolvable Drive node, so product thumbnails render instead of showing an
  empty preview.

### Professional demo polish

- **Price-list items are paginated** (50 rows/page, total count, page-size
  selector) instead of silently loading only the first 100 of the 2134 seeded
  rows.
- **SKU and product pickers page through the whole catalog** (bounded at 25
  pages) instead of offering only the first 200 records.
- **Product create/edit category pickers list leaf categories only** and keep
  the current category visible when existing data sits on a non-leaf node.
- **Inventory rows resolve SKUs**: stock, movement and reservation tables (and
  the price-item table) show `skuNo` with the SKU title as a tooltip instead of
  opaque numeric ids; movement types render localized labels. The lookup pages
  through the catalog once per service instance and caches the result, so a
  2400-row inventory page does not re-request 13 pages per mount.
- Shipment rows resolve fulfillment numbers and carrier names, inventory rows
  surface available vs safety stock, and the overview cards reflect the seeded
  totals.

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
4. **Inventory operation-id/tag naming** — every inventory operation uses the
   `inventory` tag while its operationId starts with `inventory.` (for example
   `inventory.stocks.list`), which `check-api-operation-patterns` reports as
   `operation-id-tag-duplication`. Fixing it renames generated SDK classes or
   root client properties for every consumer, so it needs a coordinated SDK shape
   migration rather than an in-place edit. Owner: `sdkwork-inventory`.
5. **Real-backend smoke** — the browser suite runs the real admin shell with the
   owning-module APIs mocked (this environment has no PostgreSQL); a deployment
   verification should replay the same flows against the live gateway.
6. **Shipment / package status vocabulary** — the order admin contract still
   types `ShipmentSummary.status` and the package `status` as free strings (no
   enum or CHECK in the schema). The lifecycle is now reachable through the
   explicit mark-shipped command instead of typing `shipped` into a package, and
   the package dialog documents that behavior; enumerating the remaining states
   belongs to `sdkwork-order`.

## 10. Verification

Commands run from the repository root unless stated otherwise:

```bash
pnpm --filter @sdkwork/cloudrouter-pc-admin-product typecheck   # pass
pnpm --filter @sdkwork/cloudrouter-pc-admin-product test        # 24/24 pass
node ../sdkwork-specs/tools/check-i18n-standard.mjs --root .    # pass (8888 files)
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

Data initialization (owning modules, idempotent; installs run migrations first):

```bash
cd ../sdkwork-merchandise && pnpm db:seed    # 003 + 004: 1211 SPUs / 2431 SKUs / 59 categories / 2134 price items
cd ../sdkwork-inventory && pnpm db:migrate && pnpm db:seed   # 2413 stocks / 4 movements / 2 reservations
cd ../sdkwork-order && pnpm db:migrate && pnpm db:seed   # 4 carriers + 3 shipments / 4 packages / 5 tracking events
node --test tests/static/industry_catalog_seed.test.mjs  # ≥1000 generated products guard (in sdkwork-merchandise)
```

Browser-level smoke (real admin shell, owning-module APIs mocked):

```bash
# terminal 1 — renderer only (standalone.development)
pnpm --dir apps/sdkwork-cloudrouter-pc dev
# terminal 2
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4736 PLAYWRIGHT_WEBSERVER_DISABLED=1 \
  pnpm --dir apps/sdkwork-cloudrouter-pc exec playwright test e2e/product-center-admin.spec.ts
# 15/15 pass: header module entry, overview SPA navigation, catalog list,
# five-column category cascade
# (root_only first, parent_id only after a branch opens, column/depth/action
# assertions), carrier registry + logistics carrier label, shipment tracking
# timeline dialog, product detail (SPU attributes + SKU matrix), price lists,
# attribute dictionary, inventory stocks, and the write paths (product create,
# stock movement with an int64-string delta and Idempotency-Key, tracking event,
# carrier create).
```

A separate browser spec covers the Application Center taxonomy header:
`e2e/application-category-header.spec.ts` asserts the categories view renders the
category panel header exactly once (one refresh action) and the shared cascade
renders its level columns. The product-center suite and this spec run together
(16/16).

### Review round fixes (self-audit)

A follow-up audit of the delivered UI surfaced and fixed these defects:

- **Drive media preview** — the media grid only rendered `url`/`publicUrl`, so
  uploaded (Drive-backed) images showed `—`. Previews now resolve a short-lived
  URL through the shared drive media resolver; video/document rows render a kind
  icon instead of a broken `<img>`.
- **Editing Drive media** — the edit dialog required a URL and would have
  rewritten a drive resource into `external_url`. The URL field is optional for
  Drive resources (blank keeps the uploaded file) and only an explicitly entered
  URL replaces the resource.
- **Stale lists after edit dialogs** — product, SKU, brand, price-list and
  inventory dialogs closed without reloading the table. All of them now capture
  the row action context's `reload` and refresh after a successful write.
- **Tracking timeline truncation** — the dialog loaded only the first 100 events;
  it now pages until the timeline is exhausted (bounded at 1,000).
- **Safety stock validation** — the inventory update path rejected a negative
  available quantity but accepted a negative safety stock; it now rejects both,
  with a Rust unit test.
- **Stock status input** — the stock settings/status filter used free-text inputs;
  both are now `active | inactive` selects.
- **Category delete guard** — deleting a non-leaf category now explains that its
  children must be removed first instead of opening a confirmation the backend
  would reject (covered by the category-tree unit test).
- **Overview full document reload** — the overview metric and chain cards used
  plain anchors, so every click reloaded the SPA. The host now injects
  `onNavigate` and the cards navigate client-side (covered by the E2E that clicks
  the products card and asserts the list renders).
- **Inventory filter/enum drift** — movement-type and reservation-status filters
  are now selects over the owning-module enums (`inbound|outbound|stocktake`,
  `reserved|consumed|released|expired`); the stock adjustment dialog seeds
  `stocktake` explicitly instead of showing an empty movement type.
- **Price-list item SKU picker** — the item dialog lists the first 200 SKUs
  (`skuNo · title`) with a documented free-text fallback when the lookup fails,
  instead of requiring a pasted id.
- **External media identity** — registering media by URL sent a
  `media-<uuid>` resource id, but the catalog requires a positive int64
  (`MediaResource.id`, validated by `media_resource_identity`), so every
  external-URL media create was rejected. The id is now a deterministic 63-bit
  FNV-1a digest of the URL, inside the signed int64 range; the E2E asserts the
  submitted id is numeric and below 2^63.
- **SKU product picker** — SKU creation only accepted a pasted product id; it now
  lists the first 200 products (`productNo · title`) with the same free-text
  fallback.
- **Shipment list readability** — the shipment table now resolves
  `fulfillmentId` to the fulfillment number and `carrierCode` to
  «carrier name (code)» using the same lookups the create dialog loads; an
  unknown reference still falls back to the raw id/code.
- **Regression coverage for shipment creation** — the service suite asserts the
  fulfillment query shape and the shipment write's idempotency key (24 tests),
  and the order service gained four unit tests for
  `CreateShipmentCommand` normalization/validation and
  `FulfillmentManagementListQuery` pagination (64 tests). The Application Center
  header spec now sets a 60s navigation timeout so a cold dev-server compile
  cannot fail it.
- **Delete coverage for contract-supported records** — products, SKUs, and
  brands expose a confirmation dialog that sends `If-Match` (the shared
  `ConfirmDeleteDialog` keeps the dialog open and shows the owning service's
  rejection). The service suite asserts the versioned delete calls, and the E2E
  deletes a SKU and verifies the `If-Match` version reaches the request. Category
  deletion stays on the taxonomy tree because that is where the leaf/depth guard
  lives.
- **Shipment lifecycle action** — «标记已发货» calls the new mark-shipped command
  with `Idempotency-Key` and refreshes the queue; the package status field now
  documents that setting `shipped` also advances the chain. The E2E asserts the
  request path and key.

Owning-module verification (from `../sdkwork-inventory`):

```bash
cargo check -p sdkwork-inventory-repository-sqlx -p sdkwork-routes-inventory-backend-api  # pass
cargo test  -p sdkwork-inventory-repository-sqlx                                          # 3/3 pass
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

- `apps/sdkwork-cloudrouter-pc/scripts/typecheck-owned-sources.mjs`: reported 10
  diagnostics earlier in this revision, all in
  `packages/sdkwork-cloudroutes-pc-commons/src/documents-admin-client.ts`
  (`DocumentCategoriesApi`/`DocumentTagsApi`/`DocumentTaxonomyApi` drift against
  the sibling `sdkwork-documents` generated SDK). The owning module has since
  aligned that SDK; the current run passes with 0 diagnostics.
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
- **Concurrent `enterpriseCenter` work** (not part of this module): it briefly
  left `AdminLayout`/`AdminRoutePermissionGuard` type errors and one
  `admin-sidebar-runtime` failure because the new module id was not yet part of
  the admin-module union, and its `@sdkwork/company-backend-sdk` import was
  missing the workspace link. The sibling work has since completed: `pnpm
  install` restored the link, `typecheck-owned-sources` passes with 0
  diagnostics, and `admin-sidebar-runtime` passes 8/8.

## 11. Commercial readiness sign-off

| Objective capability | Delivered | Evidence |
| --- | --- | --- |
| Products / SPU attributes / media | product list+detail CRUD, SPU attribute editing, media register/edit/delete and Drive image upload | 24 unit tests, e2e cases 2/6, media upload typecheck + commons tests |
| SKU variant matrix | SKU list CRUD + combination matrix dialog from key attributes | e2e case 6 (`P-1-01`), unit tests |
| Category tree | five-column cascade (shared `CascadeCategoryManager`) with lazy per-level loading | e2e case 3 (request assertions + column/action assertions), category-tree unit test |
| Category attributes & values | bindings, enum value dictionary, value dialogs | attribute e2e case 7, unit tests |
| Price lists | list CRUD + items dialog | e2e case 7 |
| Inventory (inbound / outbound / stocktake) | adjust command with int64-string delta + idempotency, safety stock settings, movements/reservations views | e2e case 10, inventory cargo tests |
| Fulfillment & logistics | shipment creation from a fulfillment, mark shipped, shipment list, packages, tracking timeline, carrier registry + carrier label | e2e cases 4/5/12/15/17, order cargo tests |
| Permissions | owning backends enforce `commerce.catalog/inventory/orders.*`; IAM `commerce` module grants `commerce.*` to `org_admin`/`org_operations`; host routes gated by `cloudrouter.admin.access` | route manifests, IAM manifests |
| i18n | en-US + zh-CN bundles for every screen | `check-i18n-standard` pass (8888 files) |
| Tests | owning-module Rust tests, package unit tests, browser E2E | order 19 routes + 66 service, inventory 3, merchandise 11, product 24, commons 12, e2e 17 |
| Data initialization | catalog + carrier + inventory + fulfillment demo seeds applied on install/upgrade and boot seeding | 1211 products (1066 active) / 2431 SKUs / 59 categories / 2134 price items / 4 carriers / 2413 stocks (64 low-stock) / 4 movements / 2 reservations / 3 shipments + 4 packages + 5 tracking events; `pending_migrations=0` |
| Documentation | this document + superseded note | —|

Residual items are listed in section 9; none blocks the composed capability, and
each names the owning module.

