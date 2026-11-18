# TECH-2026-11-18 Admin Product Center Reinstatement

Status: accepted  
Owner: SDKWork maintainers  
Application: sdkwork-cloudrouter  
Related: [TECH-2026-05-22-admin-product-center.md](./TECH-2026-05-22-admin-product-center.md) (retired plan), [TECH-2026-06-10-admin-product-center-commercial.md](./TECH-2026-06-10-admin-product-center-commercial.md) (retirement notice)

## 1. Decision

Cloud Router's admin header gains one first-class **Product Center (ÂïÜÂìÅ‰∏≠ÂøÉ)**
module at `/admin/products`. It is a **composition host**, not a new domain
implementation:

```
catalog (products ‚Ü?SKUs ‚Ü?brands)
  ‚Ü?taxonomy (categories ‚Ü?category attributes)
    ‚Ü?inventory (stock levels ‚Ü?movements ‚Ü?reservations)
      ‚Ü?fulfillment (shipments ‚Ü?logistics tracking)
```

The 2026-06-30 retirement removed the Cloud Router portal's *legacy commerce
admin packages* (`@sdkwork/cloudrouter-pc-admin-catalog`,
`@sdkwork/cloudrouter-pc-admin-inventory`, the deleted `@sdkwork/commerce-*`
facades). This decision does not restore any of them. The Product Center is a
new, narrower surface: it composes the **owning modules' generated backend
SDKs** and keeps every domain rule in the module that owns it.

## 2. Capability ownership (È´òÂÜÖËÅ?

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

## 3. Coupling boundary (‰ΩéËÄ¶Âêà)

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
| `.../sdkwork-cloudrouter-pc-admin-shell/src/admin-route-permission-hints.ts` | `/admin/products` ‚Ü?`cloudrouter.admin.access` |
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

The alternative ‚Ä?declaring catalog/inventory/shipment tables in the Cloud
Router contract ‚Ä?was rejected: the host does not serve those handlers, so the
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
| Product (SPU) | ‚ú?| ‚ú?list / ‚ú?detail | ‚ú?| publish, archive |
| Product attributes (key / parameter) | ‚Ä?| ‚ú?(from detail) | ‚ú?replace whole set with `If-Match` | ‚Ä?|
| Product media (main/gallery/detail/sku/video) | ‚ú?`external_url` + Drive image/video/document upload | ‚ú?| ‚ú?role/alt/order/status | delete |
| SKU | ‚ú?single, ‚ú?variant matrix | ‚ú?| ‚ú?price/status/oversell | ‚Ä?|
| Brand | ‚ú?| ‚ú?| ‚ú?| ‚Ä?|
| Category | ‚ú?| ‚ú?| ‚ú?| ‚Ä?|
| Category tree (cascade) | ‚ú?root/child | ‚ú?lazy per level | ‚ú?create/edit/lifecycle/delete | delete |
| Attribute (dictionary) | ‚ú?| ‚ú?| ‚ú?name/unit/status | ‚Ä?|
| Attribute enum values | ‚ú?| ‚ú?| ‚ú?| delete |
| Category attribute binding | ‚ú?| ‚ú?| ‚ú?role/required/searchable/filterable/comparable | delete |
| Price list | ‚ú?| ‚ú?| ‚ú?name/segment/status | ‚Ä?|
| Price list item | ‚ú?| ‚ú?| ‚ú?price/min quantity/status | delete |
| Stock | ‚Ä?| ‚ú?| ‚ú?available/safety/status | ‚Ä?|
| Stock movement command (inbound / outbound / stocktake) | ‚ú?appends ledger row | ‚Ä?| ‚Ä?| ‚Ä?|
| Stock movement / reservation | ‚Ä?| ‚ú?| ‚Ä?| ‚Ä?|
| Shipment / package | shipment ‚ú?+ package ‚ú?| ‚ú?| package ‚ú? shipment ‚ú?| ‚Ä?|
| Shipment tracking event | ‚ú?append | ‚ú?timeline | ‚Ä?| ‚Ä?|
| Carrier registry | ‚ú?| ‚ú?| ‚ú?code/name/tracking URL/order/status | status toggle |

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
  row lock ‚Ü?non-negative quantity checks ‚Ü?stock update with `version + 1` ‚Ü?  movement row with the before/after pair and direction ‚Ü?reload ‚Ü?commit.
- `POST /backend/v3/api/inventory/stocks/{stockId}/adjustments`
  (`inventory.stocks.adjustments.create`, permission `commerce.inventory.manage`)
  returns `201` with the updated stock; the request carries `quantityDelta` as an
  int64 **string** (`x-sdkwork-int64-string`), `movementType`
  (`inbound` | `outbound` | `stocktake`), and the required `Idempotency-Key`
  header. The movement id is derived from the stock and that key, so a replayed
  adjustment finds the existing ledger row and returns the current stock instead
  of moving the quantity twice. The route manifest had been marked idempotent
  while the handler ignored the key and used a random movement id ‚Ä?a real
  double-apply defect fixed in this change.
  (`inbound|outbound|stocktake`), `reason`, `requestNo`.
- `stocks.update` now refuses to reset unspecified fields to zero, rejects a
  negative available quantity, bumps `version`, and applies the organization
  guard.
- **int64 wire contract (API_SPEC ¬ß13.6)** completed for every inventory
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
shipments/packages, so "Áâ©ÊµÅ" was display-only. Completed in `sdkwork-order`:

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

The Product Center composes it as ¬´ÊâøËøêÂïÜÁÆ°ÁêÜ¬?and the logistics board now shows
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
- Route manifest, service contract, OpenAPI authority and
  `@sdkwork/order-backend-sdk` were regenerated. The first OpenAPI patch inserted
  a second `/backend/v3/api/shipments` object that shadowed the existing list
  operation; the two operations are now merged into one path, and the regenerated
  SDK exposes `shipments.list`, `shipments.create`, `shipments.retrieve`, and
  `fulfillments.management.list`.

The Product Center shipment page gained ¬´Êñ∞Âª∫ÂèëË¥ßÂçï¬? fulfillment and carrier are
selects (falling back to text when the lookups are unavailable), the optional
tracking number is recorded, and the write carries `Idempotency-Key`.

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
per-row create/edit/lifecycle/delete actions, `code ¬∑ status` secondary line,
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
  - `admin-product-media` ‚Ä?image profile, 5 MB, `main_image`
  - `admin-product-video` ‚Ä?video profile, 100 MB, `video`
  - `admin-product-document` ‚Ä?document profile, 20 MB, `manual`
  All use the `public_asset` category with a read-only share link.
- The product detail media panel gained ¬´‰∏ä‰º†Â™í‰Ωì¬ª: a kind selector chooses the
  slot, images upload through the shared `DriveUploadImage` component while
  video/document upload through the commons `useCloudRouterUpload` hook (MIME and
  size validation included). The resulting Drive resource is registered as
  catalog media (`POST /catalog/media`) with the Drive reference, never an
  expiring signed URL.
- External-URL registration stays available for legacy assets.

## 9. Remaining gaps to commercial release

1. **Carrier service levels / SLA metadata** ‚Ä?the registry stores code, display
   name, tracking URL template, ordering, and enablement; per-service-level
   (express/standard) rates and SLA promises would need their own table and
   quote integration. Owner: `sdkwork-order`.
2. **Granular write permissions** ‚Ä?pages are gated by
   `cloudrouter.admin.access`; per-capability codes (product/inventory/
   shipment write) belong to the IAM module manifest and the bootstrap role.
3. **Catalog create replay semantics** ‚Ä?catalog creates carry no
   `Idempotency-Key`, so a retried create is **not** replay-idempotent. It cannot
   duplicate the record (the baseline has unique `(tenant_id, spu_no)`,
   `(tenant_id, sku_no)` and category/attribute business-key indexes), but the
   retry answers `409` instead of replaying the original `201`. Making it match
   the order/inventory command semantics needs an idempotency-key table in the
   catalog module. Owner: `sdkwork-shop` catalog.
4. **Inventory operation-id/tag naming** ‚Ä?every inventory operation uses the
   `inventory` tag while its operationId starts with `inventory.` (for example
   `inventory.stocks.list`), which `check-api-operation-patterns` reports as
   `operation-id-tag-duplication`. Fixing it renames generated SDK classes or
   root client properties for every consumer, so it needs a coordinated SDK shape
   migration rather than an in-place edit. Owner: `sdkwork-inventory`.
5. **Real-backend smoke** ‚Ä?the browser suite runs the real admin shell with the
   owning-module APIs mocked (this environment has no PostgreSQL); a deployment
   verification should replay the same flows against the live gateway.
6. **Shipment / package status vocabulary** ‚Ä?the order admin contract types
   `ShipmentSummary.status` and the package `status` as free strings (no enum or
   CHECK in the schema), so the UI keeps text inputs for those two. Enumerating
   the lifecycle belongs to `sdkwork-order`; reservation statuses and inventory
   movement types are already selects because their owning module defines them.

## 10. Verification

Commands run from the repository root unless stated otherwise:

```bash
pnpm --filter @sdkwork/cloudrouter-pc-admin-product typecheck   # pass
pnpm --filter @sdkwork/cloudrouter-pc-admin-product test        # 23/23 pass
node ../sdkwork-specs/tools/check-i18n-standard.mjs --root .    # pass (8887 files)
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
# terminal 1 ‚Ä?renderer only (standalone.development)
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

- **Drive media preview** ‚Ä?the media grid only rendered `url`/`publicUrl`, so
  uploaded (Drive-backed) images showed `‚Äî`. Previews now resolve a short-lived
  URL through the shared drive media resolver; video/document rows render a kind
  icon instead of a broken `<img>`.
- **Editing Drive media** ‚Ä?the edit dialog required a URL and would have
  rewritten a drive resource into `external_url`. The URL field is optional for
  Drive resources (blank keeps the uploaded file) and only an explicitly entered
  URL replaces the resource.
- **Stale lists after edit dialogs** ‚Ä?product, SKU, brand, price-list and
  inventory dialogs closed without reloading the table. All of them now capture
  the row action context's `reload` and refresh after a successful write.
- **Tracking timeline truncation** ‚Ä?the dialog loaded only the first 100 events;
  it now pages until the timeline is exhausted (bounded at 1,000).
- **Safety stock validation** ‚Ä?the inventory update path rejected a negative
  available quantity but accepted a negative safety stock; it now rejects both,
  with a Rust unit test.
- **Stock status input** ‚Ä?the stock settings/status filter used free-text inputs;
  both are now `active | inactive` selects.
- **Category delete guard** ‚Ä?deleting a non-leaf category now explains that its
  children must be removed first instead of opening a confirmation the backend
  would reject (covered by the category-tree unit test).
- **Overview full document reload** ‚Ä?the overview metric and chain cards used
  plain anchors, so every click reloaded the SPA. The host now injects
  `onNavigate` and the cards navigate client-side (covered by the E2E that clicks
  the products card and asserts the list renders).
- **Inventory filter/enum drift** ‚Ä?movement-type and reservation-status filters
  are now selects over the owning-module enums (`inbound|outbound|stocktake`,
  `reserved|consumed|released|expired`); the stock adjustment dialog seeds
  `stocktake` explicitly instead of showing an empty movement type.
- **Price-list item SKU picker** ‚Ä?the item dialog lists the first 200 SKUs
  (`skuNo ¬∑ title`) with a documented free-text fallback when the lookup fails,
  instead of requiring a pasted id.
- **External media identity** ‚Ä?registering media by URL sent a
  `media-<uuid>` resource id, but the catalog requires a positive int64
  (`MediaResource.id`, validated by `media_resource_identity`), so every
  external-URL media create was rejected. The id is now a deterministic 63-bit
  FNV-1a digest of the URL, inside the signed int64 range; the E2E asserts the
  submitted id is numeric and below 2^63.
- **SKU product picker** ‚Ä?SKU creation only accepted a pasted product id; it now
  lists the first 200 products (`productNo ¬∑ title`) with the same free-text
  fallback.
- **Shipment list readability** ‚Ä?the shipment table now resolves
  `fulfillmentId` to the fulfillment number and `carrierCode` to
  ¬´carrier name (code)¬ª using the same lookups the create dialog loads; an
  unknown reference still falls back to the raw id/code.
- **Regression coverage for shipment creation** ‚Ä?the service suite asserts the
  fulfillment query shape and the shipment write's idempotency key (24 tests),
  and the order service gained four unit tests for
  `CreateShipmentCommand` normalization/validation and
  `FulfillmentManagementListQuery` pagination (64 tests). The Application Center
  header spec now sets a 60s navigation timeout so a cold dev-server compile
  cannot fail it.
- **Delete coverage for contract-supported records** ‚Ä?products, SKUs, and
  brands expose a confirmation dialog that sends `If-Match` (the shared
  `ConfirmDeleteDialog` keeps the dialog open and shows the owning service's
  rejection). The service suite asserts the versioned delete calls, and the E2E
  deletes a SKU and verifies the `If-Match` version reaches the request. Category
  deletion stays on the taxonomy tree because that is where the leaf/depth guard
  lives.

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
| Fulfillment & logistics | shipment creation from a fulfillment, shipment list, packages, tracking timeline, carrier registry + carrier label | e2e cases 4/5/12/15, order cargo tests |
| Permissions | owning backends enforce `commerce.catalog/inventory/orders.*`; IAM `commerce` module grants `commerce.*` to `org_admin`/`org_operations`; host routes gated by `cloudrouter.admin.access` | route manifests, IAM manifests |
| i18n | en-US + zh-CN bundles for every screen | `check-i18n-standard` pass (8887 files) |
| Tests | owning-module Rust tests, package unit tests, browser E2E | order 19 routes + 64 service, inventory 3, merchandise 11, product 24, commons 12, e2e 16 |
| Documentation | this document + superseded note | ‚Ä?|

Residual items are listed in section 9; none blocks the composed capability, and
each names the owning module.

