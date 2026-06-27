# Admin Product Center Design

## Status

This specification defines the admin Product Center for `sdkwork-clawrouter`.
It builds on the appbase commerce standard in
`2026-05-21-appbase-commerce-standard-design.md` and the current generated
backend SDK surface. It does not replace the appbase-owned `commerce_*` schema.

This is a control-plane design for professional product operations. The current
admin catalog and inventory packages already prove the domain split, generated
SDK boundary, and route taxonomy. The next step is to evolve them from generic
resource lists into a dedicated Product Center workspace.

## Goal

Build a complete admin Product Center that supports professional catalog,
inventory, pricing, attribute, and publication workflows for physical goods,
virtual goods, memberships, recharge products, subscriptions, and services.

The Product Center must let operators manage:

- Category trees and merchandising taxonomy.
- SPU product definitions.
- SKU variants and SKU attribute combinations.
- Product attributes and attribute values.
- Product media and product snapshots.
- Price lists and price list items.
- Stock, reservations, and immutable inventory ledger.
- Draft, review, approval, scheduling, publish, unpublish, reject, and archive
  lifecycle actions.
- Operational guardrails: idempotency, optimistic locking, audit, permissions,
  validation, and clear error states.

## Non-Goals

- Do not create a second product system such as `plus_product` or `plus_sku`.
  The standard product system is `commerce_product_*`.
- Do not hand-write admin HTTP calls in the portal. Admin remote calls must use
  `@sdkwork/clawrouter-backend-sdk` through the existing backend SDK boundary.
- Do not hand-edit generated SDK output.
- Do not mix app store or open-platform account management into product master
  data. App Center and Open Platform can link to products through explicit
  relationships later, but they are not the product master.
- Do not add compatibility routes or legacy billing/product aliases.
- Do not change database tables, columns, indexes, migrations, or embedded
  schemas without explicit approval before implementation.

## Current State

The repository already contains the foundation:

- Admin routes:
  - `/admin/catalog/products`
  - `/admin/catalog/categories`
  - `/admin/catalog/skus`
  - `/admin/catalog/attributes`
  - `/admin/catalog/prices`
  - `/admin/inventory/stocks`
  - `/admin/inventory/reservations`
  - `/admin/inventory/ledger`
- Frontend packages:
  - `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog`
  - `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-inventory`
- Services already use the generated backend SDK:
  - `getClawRouterBackendSdkClient().commerce.catalog.*`
  - `getClawRouterBackendSdkClient().commerce.inventory.*`
- Generated backend OpenAPI already exposes:
  - `catalog.attributes.list`
  - `catalog.attributes.create`
  - `catalog.categories.list`
  - `catalog.categories.create`
  - `catalog.categories.update`
  - `catalog.categories.delete`
  - `catalog.priceLists.list`
  - `catalog.priceLists.create`
  - `catalog.products.list`
  - `catalog.products.create`
  - `catalog.products.update`
  - `catalog.skus.list`
  - `catalog.skus.create`
  - `catalog.skus.update`
  - `inventory.ledgerEntries.list`
  - `inventory.reservations.list`
  - `inventory.stocks.list`
  - `inventory.stocks.update`
- Schema registry already declares appbase-owned tables:
  - `commerce_product_category`
  - `commerce_product_spu`
  - `commerce_product_sku`
  - `commerce_product_attribute`
  - `commerce_product_attribute_value`
  - `commerce_product_sku_attribute`
  - `commerce_product_media`
  - `commerce_price_list`
  - `commerce_price_list_item`
  - `commerce_inventory_stock`
  - `commerce_inventory_reservation`
  - `commerce_inventory_ledger`

The missing part is not route naming. The missing part is the professional
management layer: richer API commands, dedicated admin UI workflows, publication
state machine, SKU matrix, price item editing, media management, inventory
adjustments, and operational evidence.

## Design Options

### Option A: Extend `AdminResourceCenter`

Keep the current generic list component and add more columns, forms, and action
buttons.

Trade-off: low implementation cost and smaller visual change. It will still
feel like a generic table browser, and complex workflows such as SKU matrix
editing, staged publication, price list items, and stock adjustment will become
hard to maintain.

### Option B: Build A Dedicated Product Center Workspace

Keep the existing `admin-catalog` and `admin-inventory` packages and backend SDK
services, but replace their view layer with a product-operations workspace:

- Product list with filters, bulk actions, state badges, and side detail.
- Product editor with sections for basics, category, media, SKU matrix, price,
  inventory summary, publication, and audit.
- Category tree management.
- Attribute library and SKU attribute matrix.
- Price list and item management.
- Inventory stock dashboard with stock adjustment drawer.
- Publication workflow panel.

Trade-off: more upfront work, but it matches the domain and prevents a
long-lived generic-table ceiling. This is the recommended design.

### Option C: Introduce A Separate Commerce Admin UI Package

Create or adopt a reusable commerce admin package such as
`@sdkwork/commerce-admin-pc-react` and embed it in Claw Router.

Trade-off: useful later if appbase ships a mature reusable admin UI. Today the
Claw Router admin already has route, menu, SDK, auth, and layout conventions, so
introducing an external UI shell before the product flows are locked would add
integration risk.

## Decision

Use Option B.

The Product Center remains split by bounded context at package and API level:
catalog and inventory stay separate packages and SDK namespaces. The user
experience becomes one professional workspace inside the admin `productCenter`
module. This keeps architecture clean while letting operators work across SPU,
SKU, pricing, stock, and publication without thinking in raw table boundaries.

## Bounded Contexts

### Catalog

Catalog owns product master data:

- Product categories.
- SPU records.
- SKU records.
- Product attributes.
- Attribute values.
- SKU attribute bindings.
- Product media.
- Price list headers and price list items.
- Product lifecycle fields stored on SPU/SKU records.

Catalog does not own stock truth, order truth, payment, fulfillment, wallet, or
membership entitlement usage.

### Inventory

Inventory owns stock and stock evidence:

- Stock by SKU and warehouse.
- Available, reserved, sold, safety, and version fields.
- Reservation lifecycle.
- Immutable stock ledger.
- Manual stock adjustment commands.

Inventory must be ledger-first. A stock mutation writes ledger evidence and then
updates the stock summary. The admin UI must not present stock updates as a
silent direct quantity edit.

### Publication

Publication governs whether products and SKUs can be sold or shown:

- Draft editing.
- Submit for review.
- Approve or reject.
- Schedule publication.
- Publish.
- Unpublish.
- Archive.
- Publish snapshots.

Publication uses catalog data as its source, but the workflow deserves a
separate command boundary because it has state-machine rules, audit, idempotency,
and optional review policy.

### Pricing

Pricing owns market, currency, channel, and customer-segment price lists:

- Price list headers.
- Price list items by SKU.
- Active time windows.
- Currency and market constraints.
- Default price fallback from SKU only when no price list item matches.

Pricing stays inside `commerce.catalog` for the current backend SDK surface, but
the UI should present it as an explicit Product Center capability.

## Data Model

Use the existing appbase standard schema as the product system of record.

Required current tables:

- `commerce_product_category`
- `commerce_product_spu`
- `commerce_product_sku`
- `commerce_product_attribute`
- `commerce_product_attribute_value`
- `commerce_product_sku_attribute`
- `commerce_product_media`
- `commerce_price_list`
- `commerce_price_list_item`
- `commerce_inventory_stock`
- `commerce_inventory_reservation`
- `commerce_inventory_ledger`
- `ops_audit_log`

Recommended schema extensions, gated for explicit implementation approval:

- Add or standardize optimistic `version` fields on mutable product, category,
  SKU, price, and stock rows if not already available in generated schema.
- Add `commerce_product_publication_event` for state transitions, reviewer
  comments, schedule requests, and audit-friendly lifecycle history.
- Add `commerce_product_publish_snapshot` for immutable publish snapshots.
- Add `commerce_product_channel_visibility` if channel-specific publication
  rules cannot be represented by existing metadata or price list scope.
- Add `commerce_price_list_item` mutation coverage if only price list header
  creation is currently exposed.

If the implementation phase cannot change schema, the first version can map
publication actions onto existing `status` and `published_at` fields and store
transition evidence in `ops_audit_log`. That is acceptable as a phase-one
bridge only if the API contract makes the state transitions explicit.

## Product Status Model

The Product Center should normalize lifecycle states across SPU and SKU:

- `draft`: Editable, not sellable.
- `pending_review`: Submitted, edit restrictions apply.
- `approved`: Review passed, not necessarily published.
- `scheduled`: Approved and queued for a future publish time.
- `published`: Visible and sellable according to channel, inventory, and price
  rules.
- `unpublished`: Removed from sale but preserved.
- `rejected`: Review failed with reason.
- `archived`: Retired from active operations.

Allowed transitions:

- `draft -> pending_review`
- `pending_review -> approved`
- `pending_review -> rejected`
- `rejected -> draft`
- `approved -> scheduled`
- `approved -> published`
- `scheduled -> published`
- `scheduled -> unpublished`
- `published -> unpublished`
- `unpublished -> draft`
- `draft|unpublished|rejected -> archived`

Hard rules:

- `published` requires at least one active SKU.
- A physical SKU requires stock policy and inventory visibility before publish.
- A SKU cannot be published if its parent SPU is not publishable.
- Category changes for published products must either be immediate audited
  updates or new draft snapshots, depending on configured product policy.
- Publication commands require idempotency keys and audit correlation.

## API Contract

Keep the existing backend SDK namespace:

- `commerce.catalog.categories`
- `commerce.catalog.products`
- `commerce.catalog.skus`
- `commerce.catalog.attributes`
- `commerce.catalog.priceLists`
- `commerce.inventory.stocks`
- `commerce.inventory.reservations`
- `commerce.inventory.ledgerEntries`

Add contract coverage in this order:

1. Catalog read detail APIs:
   - `catalog.products.retrieve`
   - `catalog.skus.retrieve`
   - `catalog.categories.retrieve`
2. Attribute value and SKU matrix APIs:
   - `catalog.attributeValues.list`
   - `catalog.attributeValues.create`
   - `catalog.attributeValues.update`
   - `catalog.skuAttributes.list`
   - `catalog.skuAttributes.replace`
3. Media APIs:
   - `catalog.media.list`
   - `catalog.media.create`
   - `catalog.media.update`
   - `catalog.media.delete`
4. Price item APIs:
   - `catalog.priceListItems.list`
   - `catalog.priceListItems.upsert`
   - `catalog.priceListItems.delete`
5. Publication APIs:
   - `catalog.products.submitReview`
   - `catalog.products.approve`
   - `catalog.products.reject`
   - `catalog.products.schedulePublish`
   - `catalog.products.publish`
   - `catalog.products.unpublish`
   - `catalog.products.archive`
   - equivalent SKU-level commands only where SKU lifecycle can diverge from
     SPU lifecycle.
6. Inventory command APIs:
   - `inventory.stocks.adjust`
   - `inventory.stocks.reserve`
   - `inventory.stocks.release`
   - `inventory.stocks.reconcile`

Request rules:

- Mutations require `Idempotency-Key`.
- Every mutation accepts or produces `X-Request-Id` for audit correlation.
- State transitions use command-specific request types with reason, comment,
  scheduled time, expected version, and optional policy override fields.
- Stock adjustment requires a reason code and human-readable note.
- Price mutations must use string decimals for money, never float.
- Errors use the existing backend problem/result conventions and must be
  specific enough for the UI to show field-level or workflow-level feedback.

## Backend Module Design

The Rust backend should follow the current admin module pattern:

- `api/admin_product_center.rs` only if an aggregate workflow API is needed.
- Prefer domain-specific modules if they can stay cohesive:
  - `api/admin_catalog.rs`
  - `api/admin_inventory.rs`
  - `ports/admin_catalog_store.rs`
  - `ports/admin_inventory_store.rs`
  - `infrastructure/sql/sql_admin_catalog.rs`
  - `infrastructure/sql/sql_admin_inventory.rs`
  - `infrastructure/sql/sqlite/admin_catalog_store.rs`
  - `infrastructure/sql/postgres/admin_catalog_store.rs`
  - `infrastructure/sql/sqlite/admin_inventory_store.rs`
  - `infrastructure/sql/postgres/admin_inventory_store.rs`

Handlers normalize request bodies, validate enum values and lengths, resolve
subject and request id, build commands, and delegate to stores. Stores enforce
tenant/organization scope, optimistic version checks, idempotency where
available, referential checks, and audit writes.

Use dedicated command types for publication and inventory adjustment. Do not
encode workflow semantics as arbitrary partial updates from the UI.

## Frontend Architecture

Keep the packages:

- `sdkwork-clawrouter-pc-admin-catalog`
- `sdkwork-clawrouter-pc-admin-inventory`

Refactor each package into focused files:

```text
packages/sdkwork-clawrouter-pc-admin-catalog/src/
  index.tsx
  catalogService.ts
  catalogTypes.ts
  productCenterViewModel.ts
  ProductCenterShell.tsx
  ProductsWorkspace.tsx
  ProductEditorDrawer.tsx
  ProductSkuMatrix.tsx
  CategoryTreePanel.tsx
  AttributeLibraryPanel.tsx
  PriceListWorkspace.tsx
  PublicationPanel.tsx
  ProductAuditPanel.tsx

packages/sdkwork-clawrouter-pc-admin-inventory/src/
  index.tsx
  inventoryService.ts
  inventoryTypes.ts
  InventoryWorkspace.tsx
  StockDashboard.tsx
  StockAdjustmentDrawer.tsx
  ReservationMonitor.tsx
  InventoryLedgerTimeline.tsx
```

The service files remain the only remote-call boundary and must import from
`sdkwork-clawroutes-pc-commons/runtime`. View components call service functions,
not the SDK directly.

The UI should be operational and dense:

- Product list with search, category, type, status, publication, stock health,
  and price filters.
- KPI strip: total products, published products, draft/review count,
  out-of-stock SKU count, stock warnings.
- Product details in a drawer or detail route with stable sections:
  Basics, Category, Media, SKUs, Pricing, Inventory, Publication, Audit.
- SKU matrix editor for variant combinations.
- Category tree with inline create, rename, sort, move, archive.
- Attribute library with scope, value type, required/searchable/filterable
  flags, and active/inactive status.
- Price workspace with price list headers and SKU price item grid.
- Inventory workspace with stock adjustment drawer, reservation monitor, and
  ledger timeline.
- Publication panel with allowed next actions only.

Do not make a marketing-style landing page. The first screen should be the
working product list.

## Page And Route Strategy

Keep current routes stable:

- `/admin/catalog/products` opens the product workspace.
- `/admin/catalog/categories` opens the category panel as the primary view.
- `/admin/catalog/skus` opens SKU operations.
- `/admin/catalog/attributes` opens the attribute library.
- `/admin/catalog/prices` opens price list operations.
- `/admin/inventory/stocks` opens stock operations.
- `/admin/inventory/reservations` opens reservation operations.
- `/admin/inventory/ledger` opens inventory ledger.

Optional later route:

- `/admin/catalog/products/:productId` for shareable detail pages if drawer
  state becomes too complex.

## Permissions And Governance

Recommended permission keys:

- `commerce.catalog.read`
- `commerce.catalog.write`
- `commerce.catalog.publish`
- `commerce.catalog.review`
- `commerce.catalog.archive`
- `commerce.pricing.read`
- `commerce.pricing.write`
- `commerce.inventory.read`
- `commerce.inventory.adjust`
- `commerce.inventory.reconcile`

All sensitive mutations must write audit records. Publication review and stock
adjustment must include actor, tenant, organization, request id, idempotency
key, reason/comment, previous state, next state, and relevant entity ids.

## Validation Rules

Category:

- `categoryNo` is stable and unique per tenant and organization.
- Parent cannot be itself or descendant.
- A category with bound products cannot be hard-deleted.

Product:

- `spuNo` is stable and unique.
- Product type is one of standard commerce product types.
- Title and status are required.
- Publish requires active category unless product policy permits uncategorized
  sales.

SKU:

- `skuNo` is stable and unique.
- SKU must belong to an existing SPU.
- SKU fulfillment type must match product type policy.
- SKU price amount uses decimal string.
- Physical SKU requires inventory policy before publish.

Attribute:

- Attribute scope is `spu`, `sku`, or `both`.
- Value type is constrained to configured primitives such as `text`, `number`,
  `boolean`, `enum`, `multi_enum`, `date`, and `json`.
- Required SKU attributes must be present for every active SKU.

Inventory:

- Manual adjustment requires expected version, reason code, and note.
- Available stock cannot become negative unless a configured backorder policy
  permits it.
- Ledger entries are immutable.

Pricing:

- Currency code uses ISO-like uppercase codes.
- Price list item references valid SKU.
- Active windows cannot create ambiguous duplicate prices for the same market,
  channel, segment, and SKU unless priority ordering is explicit.

## Testing Strategy

Contract tests:

- OpenAPI exposes the required operation ids and write operations have
  `Idempotency-Key`.
- Generated backend SDK exposes the expected `commerce.catalog` and
  `commerce.inventory` methods.
- Frontend services use `getClawRouterBackendSdkClient()` and do not add raw
  fetch, axios, manual auth headers, or URL string bypasses.

Backend tests:

- Handler tests for validation, subject resolution, request id handling, and
  command mapping.
- SQLite and Postgres store contract tests for category, product, SKU,
  attribute, price, publication, stock adjustment, reservation, and ledger
  behavior.
- Optimistic locking and idempotency tests for mutations.

Frontend tests:

- Service tests that assert generated backend SDK paths and request params.
- View-model tests for status badges, allowed actions, stock health, price
  formatting, and error mapping.
- Component/runtime tests for major workflows:
  product list, product editor, SKU matrix, category tree, attribute library,
  inventory adjustment, publication panel.

Verification commands:

```powershell
python -B -m tools.api_contract_manifest
python -B -m tools.clawrouter_openapi_generator
node sdks\clawrouter-backend-sdk\bin\generate-sdk.mjs --language typescript
python -B -m tools.clawrouter_sdk_guardian
python -B -m tools.schema_quality_gate
pnpm --dir apps\sdkwork-clawrouter-pc exec tsx --test commerce-business-runtime.test.ts
```

Add narrower test commands per task in the implementation plan.

## Implementation Phases

### Phase 1: Contract And View-Model Upgrade

- Lock current catalog and inventory SDK coverage.
- Add missing read/detail and command operation contracts.
- Regenerate OpenAPI and backend SDK.
- Add frontend service wrappers and view-model normalization.
- Keep UI shape mostly stable while adding professional data semantics.

### Phase 2: Product Workspace

- Replace generic product list with dedicated `ProductsWorkspace`.
- Add product editor drawer.
- Add SKU matrix read/edit flow using generated SDK methods.
- Add publication panel with state-specific actions.

### Phase 3: Category, Attribute, Media, And Pricing

- Add category tree operations.
- Add attribute library and attribute values.
- Add media panel.
- Add price list item grid.

### Phase 4: Inventory Operations

- Add stock health dashboard.
- Add stock adjustment command with ledger evidence.
- Add reservation monitor.
- Add ledger timeline.

### Phase 5: Hardening

- Add permission gates.
- Add optimistic locking UI.
- Add bulk operations where safe.
- Add audit drill-down.
- Add smoke tests and visual checks across desktop and mobile admin viewports.

## Review Notes

- The current API surface is enough for list and simple create/update flows, but
  not enough for a professional Product Center. The implementation must close
  backend contract gaps before the UI depends on them.
- The official standard interface rule from provider adapter work has no direct
  bearing on Product Center, but the same architectural principle applies:
  default standard paths should be direct, and special behavior should be
  explicit through contracts, not hidden in UI fallbacks.
- The strongest design is not a monolithic `productCenter` backend namespace.
  Keep domain APIs clean and let the admin workspace compose them.
