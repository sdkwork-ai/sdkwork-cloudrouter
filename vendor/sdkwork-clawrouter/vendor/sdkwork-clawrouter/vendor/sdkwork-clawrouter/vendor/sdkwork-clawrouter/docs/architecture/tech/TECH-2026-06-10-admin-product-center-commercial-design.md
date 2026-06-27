> Migrated from `docs/superpowers/specs/2026-06-10-admin-product-center-commercial-design.md` on 2026-06-24.
> Owner: SDKWork maintainers

## Status

This specification supersedes the product-center direction in
`2026-05-22-admin-product-center-design.md` for the current implementation
shape.

The user goal is to continuously polish the admin Product Center until category
management, stores, multi-spec products and SKUs, category attributes, SKU
attributes, complete product-detail configuration, and the end-to-end admin flow
are commercially complete.

This spec is intentionally broader than a single UI patch. A commercial Product
Center is a contract-backed catalog operations system. The UI, generated SDK
surface, backend commands, store behavior, and publish validation must line up.

## Evidence From Current Code

The current authority split is:

- `sdkwork-clawrouter` owns the admin shell, route mounting, local Claw Router
  backend catalog and inventory APIs, generated Claw Router SDK families, and
  wrapper packages used by `apps/sdkwork-clawrouter-pc`.
- `sdkwork-commerce` owns the reusable commerce Product Admin PC package at
  `apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-admin-product`.
- `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog`
  currently re-exports the commerce-owned product admin package.
- The commerce product admin package is declared by its component spec as the
  authority for product-center admin UI and service orchestration.
- The product admin package must call through `@sdkwork/commerce-service`,
  backed by generated Commerce backend SDK clients. It must not call Claw
  Router backend SDK catalog methods directly.
- Claw Router admin/backend frontend code must use generated
  `@sdkwork/clawrouter-backend-sdk` for Claw Router management surfaces. It
  must not add raw HTTP, manual auth headers, local SDK forks, or compat
  bypasses.

The current implementation already has useful product-center foundations:

- Admin menu routes under `/admin/catalog/*` and `/admin/inventory/*`.
- Catalog endpoints for categories, products, SKUs, attributes, category
  attributes, category seeds, and price list headers.
- Inventory endpoints for stock, reservations, and movement/ledger records.
- Commerce service method tree coverage for shops, catalog, inventory, audit,
  and related commerce modules.
- Product creation/edit UI with product type, leaf category selection, product
  detail text, spec groups, generated SKU draft matrix, SKU images, SKU price,
  stock quantity draft fields, and SKU attribute definition synchronization.
- Category management, attribute binding management, SKU management, and price
  list listing/creation entry points.
- Current parallel work in `sdkwork-commerce` already moves product edit loading
  to `catalog.products.management.retrieve` instead of list-search fallback.

The current implementation is still incomplete for the requested commercial
goal:

- Store/shop visibility is not part of the product publish loop.
- Product detail configuration is not a structured, persisted detail model.
- Category attribute values are not a complete reusable library.
- SKU attributes and SKU matrix generation are not backed by a full aggregate
  read/write contract.
- Price list items are not a complete SKU price editing surface.
- Inventory/source assignment is not integrated into product readiness.
- Publish readiness is not an authoritative backend-driven workflow.
- The UI files are growing large, especially `ProductCreatePage.tsx`, and need
  focused subcomponents before more behavior is added.

## Industry Alignment

Use these professional catalog systems as design reference points, not as
libraries to copy:

- Shopify's modern product model separates products, options, variants, media,
  and extensible product data. The relevant lesson is that variants are the
  purchasable units generated from option combinations, while the product
  remains the shared merchandising record.
- Adobe Commerce configurable products model each sellable variation as its own
  SKU and derive configurable product behavior from variation attributes,
  variation images, prices, and inventory. The relevant lesson is that SKU
  matrix generation, child-SKU inventory, and configurable attribute rules must
  be explicit.
- Adobe Commerce inventory uses sources and stocks to model warehouses,
  stores, distribution centers, pickup locations, and drop shippers. The
  relevant lesson is that store/source assignment is part of product readiness,
  not an unrelated stock table.
- Pimcore Classification Store shows how professional PIM systems organize
  category/class-specific attributes into stores, groups, keys, localization,
  inheritance, validation, and editor ordering. The relevant lesson is that
  category attributes need a template model, not only a flat attribute list.
- GS1 Global Data Model and GPC concepts separate trade-item attributes from
  classification attributes. The relevant lesson is that item-level product
  facts and category-driven classification facts must both be supported without
  overbuilding full GS1 compliance in this phase.

## Business Shape

Default to supporting both physical and virtual commerce, with physical commerce
as the complete-flow baseline.

Physical commerce is the stricter superset because it needs categories, stores,
sources, inventory, fulfillment, SKU-level price, SKU-level media, shipment
policy, and stock-safe publication. Virtual products, memberships, points
recharge, wallet recharge, subscriptions, and services use the same catalog
shell but change fulfillment and readiness rules:

- `physical_good`: requires inventory/source policy before publish.
- `virtual_good`: requires digital delivery or entitlement mapping.
- `membership`: requires membership package/plan linkage.
- `points_recharge` and `wallet_recharge`: require recharge package or account
  credit mapping.
- `subscription`: requires subscription activation mapping.
- `service`: requires service activation or appointment/fulfillment policy.

## Goals

The Product Center must let an operator complete this end-to-end flow:

1. Manage shop/store records and understand which stores or channels can sell a
   product.
2. Manage category trees and leaf category templates.
3. Manage attribute definitions, attribute values, and category bindings.
4. Create or edit a product SPU with basic data, media, detail sections,
   categories, category attributes, SEO, service promises, and fulfillment
   policy.
5. Define product option/spec groups and generate sellable SKU variants.
6. Edit SKU numbers, barcode, images, SKU attributes, price, inventory policy,
   fulfillment type, tax category, sales unit, and status in a SKU matrix.
7. Assign store/channel visibility and inventory/source policy.
8. Edit price list items or default SKU price without losing money precision.
9. Run a readiness checklist and publish only when required data is complete.
10. Inspect audit, stock, reservations, and ledger evidence for the product.

## Non-Goals

- Do not create a second product master such as `plus_product` or `plus_sku`.
  The commerce product system remains the source of truth.
- Do not hand-edit generated SDK output. Contract gaps must be fixed at the
  route/OpenAPI/SDK-generation source.
- Do not introduce raw HTTP calls in admin product UI or services.
- Do not move commerce-owned product admin implementation into Claw Router just
  to make local editing easier.
- Do not change tables, columns, indexes, migrations, or embedded database
  schemas without explicit human approval.
- Do not implement full GS1/GDS compliance in this phase. Use GS1 as quality
  guidance for attribute completeness and data consistency.

## Recommended Approach

Use a contract-first commercial completion approach.

The old alternatives still apply:

- UI-first polish is too shallow. It can make the page look complete while the
  business flow remains unreliable.
- A full PIM rebuild is too large and would fight the existing commerce
  standard.
- Contract-first completion is the right middle path: close authoritative API
  gaps, keep generated SDK boundaries clean, and use the UI as a dense admin
  workflow over those contracts.

## Domain Model

Use existing commerce domain concepts wherever possible:

- Shop/store: `commerce_shop`.
- Product category: `commerce_product_category`.
- Product SPU: `commerce_product_spu`.
- Product SPU category binding: `commerce_product_spu_category`.
- Product SKU: `commerce_product_sku`.
- Product attribute: `commerce_product_attribute`.
- Product attribute value: `commerce_product_attribute_value`.
- Product SKU attribute: `commerce_product_sku_attribute`.
- Product media: `commerce_product_media`.
- Price list: `commerce_price_list`.
- Price list item: `commerce_price_list_item`.
- Inventory stock: `commerce_inventory_stock`.
- Inventory reservation: `commerce_inventory_reservation`.
- Inventory movement/ledger: `commerce_inventory_movement`.
- Audit: `commerce_audit_log` or Claw Router audit equivalent for Claw Router
  hosted operations.

If channel visibility or detail sections cannot be represented safely in
existing metadata, add a contract proposal before adding storage:

- `commerce_product_channel_visibility`
- `commerce_product_detail_section`
- `commerce_product_publication_event`
- `commerce_product_publish_snapshot`

These are proposed only. Schema changes require explicit approval.

## API And SDK Surface

### Commerce Product Admin Surface

The commerce product admin package should consume these backend service methods
through `@sdkwork/commerce-service`:

- `admin.shops.management.list`
- `admin.shops.management.retrieve`
- `admin.catalog.categories.management.list`
- `admin.catalog.categories.create`
- `admin.catalog.categories.update`
- `admin.catalog.categories.delete`
- `admin.catalog.products.management.list`
- `admin.catalog.products.management.retrieve`
- `admin.catalog.products.create`
- `admin.catalog.products.update`
- `admin.catalog.products.delete`
- `admin.catalog.skus.list`
- `admin.catalog.skus.create`
- `admin.catalog.skus.update`
- `admin.catalog.skus.delete`
- `admin.catalog.attributes.management.list`
- `admin.catalog.attributes.create`
- `admin.catalog.categoryAttributes.list`
- `admin.catalog.categoryAttributes.create`
- `admin.catalog.categoryAttributes.update`
- `admin.catalog.categoryAttributes.delete`
- `admin.catalog.priceLists.list`
- `admin.catalog.priceLists.create`
- `admin.catalog.priceLists.update`
- `admin.inventory.stocks.list`
- `admin.inventory.stocks.update`
- `admin.inventory.reservations.list`
- `admin.inventory.movements.list`
- `admin.audit.commerceEvents.list`

Required gaps to add before the UI depends on them:

- Attribute value list/create/update/archive.
- SKU attribute matrix replace or bulk upsert.
- Product aggregate retrieve that returns product, categories, category
  attributes, media/detail sections, SKU variants, SKU attributes, default
  price, price list items, inventory summary, shop/store visibility, readiness
  status, and audit references.
- Product aggregate draft save or transactional upsert.
- Price list item list/upsert/delete.
- Product detail section list/replace, or explicit detail config fields on the
  aggregate if storage cannot change yet.
- Product publish-readiness validate.
- Product submit review, approve, reject, schedule publish, publish,
  unpublish, archive.
- Inventory adjustment as a command with reason, note, expected version, and
  idempotency.

### Claw Router Surface

Claw Router must keep its admin shell routes stable:

- `/admin/catalog/products`
- `/admin/catalog/products/new`
- `/admin/catalog/products/:productId` if a route-based editor is adopted.
- `/admin/catalog/categories`
- `/admin/catalog/skus`
- `/admin/catalog/attributes`
- `/admin/catalog/prices`
- `/admin/inventory/stocks`
- `/admin/inventory/reservations`
- `/admin/inventory/ledger`

Claw Router package code should remain a wrapper around the commerce-owned
product admin implementation unless Claw Router-specific shell integration is
required.

## Product Workspace UX

The first screen must be the operating workspace, not a landing page.

The Product Center shell should have:

- A compact filter bar: keyword, category, shop/store, product type, status,
  publish readiness, inventory risk, price completeness, and updated time.
- A KPI strip: total products, publishable products, draft/review count,
  active SKU count, out-of-stock SKU count, incomplete details, incomplete
  attributes.
- A dense product table: product title, SPU, type, primary category, shops,
  SKU count, price range, stock health, readiness, status, updated time, and
  row actions.
- A details panel or route-based editor for actual work.

The editor should be split into focused sections:

1. Basic information: title, subtitle, SPU, product type, brand, status.
2. Categories and templates: leaf categories, shop category, category path,
   category attribute requirements.
3. Detail configuration: main media, gallery, video, detail images, rich
   sections, selling points, parameters, SEO/share, service promises, shipping
   and after-sale policy.
4. Attributes: SPU attributes from category templates and reusable attribute
   values.
5. Specs and SKU matrix: spec groups, spec values, generated combinations,
   SKU code, barcode, image, price, stock draft, fulfillment, tax, sales unit,
   and SKU attributes.
6. Stores and inventory: shop/store visibility, warehouse/source assignment,
   stock policy, safety stock, reservations, and stock movement summary.
7. Pricing: default SKU price, price list item grid, market/currency/channel
   validity window, and customer segment.
8. Publishing: readiness checklist, validation errors, allowed actions,
   scheduling, review comments, and final publish/unpublish.
9. Audit: timeline of product, SKU, price, inventory, and publication changes.

## Category And Attribute Design

Categories must drive product forms.

Category management requirements:

- Tree view with root, child, and leaf categories.
- Create, rename, move, sort, archive, and seed initialization.
- Prevent invalid parent cycles.
- Surface product counts and bound attribute counts.
- Display leaf-category readiness rules.

Attribute management requirements:

- Attribute definition fields: code/no, name, value type, scope, required,
  searchable, filterable, status, sort order.
- Supported value types: text, number, boolean, enum, multi_enum, date, json.
- Attribute value library for enum-like attributes.
- Category binding fields: category, attribute, required, searchable,
  filterable, sort order, status.
- SKU attribute groups can reuse attribute definitions and attribute values.
- Product editor reads active category bindings and renders missing required
  fields as readiness failures.

## SKU Matrix Design

The SKU matrix must treat SKU variants as sellable units.

Core behavior:

- Spec groups such as Color, Size, Material, Duration, Plan, or Region create
  combinations.
- Each combination maps to one SKU draft row.
- Existing SKU IDs are preserved during edit.
- Removing a spec value should mark affected existing SKUs inactive or draft
  until the operator confirms archive behavior.
- New generated SKU rows start in draft/inactive unless the product is being
  published and readiness passes.
- SKU attributes persist as `commerce_product_sku_attribute` or the approved
  equivalent.
- SKU image can inherit product image or use a unique SKU image.
- SKU price is a decimal string.
- SKU inventory is read from inventory stock; direct stock edits must use an
  inventory command, not a silent product save.

## Product Detail Configuration

Detail configuration must be structured enough for commercial operation:

- Main image.
- Gallery images.
- SKU-specific images.
- Detail images.
- Video.
- Text description.
- Selling points.
- Parameter table.
- Service promises.
- Shipping and after-sale policy.
- SEO title/description/keywords.
- Share title/description/image.
- Optional custom rich sections.

Minimum first implementation can store detail config as validated JSON metadata
or media records if schema change is not approved. The API contract still must
name the fields so the UI does not depend on ad hoc blobs.

## Store, Channel, And Inventory Design

Store management in this phase uses `commerce_shop` and existing shop APIs.
The Product Center needs a store selector and store visibility state, but not a
new store domain.

Inventory requirements:

- Physical SKU requires stock policy before publish.
- Stock is tracked by SKU and warehouse/source.
- Stock updates require expected version, reason code, note, idempotency key,
  and ledger evidence.
- Stock can be shown inside product edit, but stock mutation belongs to
  inventory service.
- Virtual products can mark inventory policy as not managed, but must provide
  entitlement, digital delivery, or activation mapping.

## Publish Readiness

Publication is a workflow, not a raw status patch.

Readiness checks:

- Product title, product type, SPU, and status exist.
- At least one active leaf category exists when policy requires categories.
- All required category attributes are filled.
- Detail configuration passes the minimum media/content policy.
- At least one sellable SKU exists.
- Every active SKU has SKU no, title, fulfillment type, valid decimal price,
  and required SKU attributes.
- Physical active SKUs have inventory/source policy.
- Store/channel visibility is configured.
- Price list requirements are met for enabled markets/currencies.
- Required audit context and idempotency key exist for mutating commands.

Publication actions:

- Save draft.
- Validate readiness.
- Submit review.
- Approve.
- Reject with reason.
- Schedule publish.
- Publish.
- Unpublish.
- Archive.

If a full publication event table is not approved yet, map first-phase actions
onto existing status and audit records. The API must still expose named
commands so the UI does not encode lifecycle rules.

## Error Handling

The UI must distinguish:

- field validation errors,
- workflow readiness failures,
- stale version conflicts,
- missing SDK method or unsupported contract,
- permission failures,
- idempotency conflicts,
- backend persistence errors,
- generated SDK/runtime configuration errors.

Readiness failures should be actionable and point to the editor section that
needs attention.

## Implementation Boundaries

The implementation should proceed in this order:

1. Preserve current parallel work and current `retrieveCommerceProduct` edit
   loading behavior.
2. Split the large product editor into focused modules before adding more
   behavior.
3. Add contract/service tests for missing product-center SDK methods.
4. Add aggregate read model and product draft save behavior.
5. Add category attribute values and category-template rendering.
6. Add SKU matrix persistence and SKU attribute value persistence.
7. Add detail configuration persistence.
8. Add shop/store visibility and inventory-source readiness.
9. Add price list item editing.
10. Add publish-readiness validation and publication commands.
11. Add audit and operational trace surfaces.
12. Verify the complete flow through the admin shell.

## Verification Strategy

Narrow checks first:

- Commerce product admin service tests for method delegation through
  `@sdkwork/commerce-service`.
- Source guards that prevent raw HTTP, retired field names, and list-search edit
  fallback.
- View-model tests for SKU matrix generation, category required attribute
  rendering, readiness status, money string validation, and inventory health.
- Backend route/store tests for new commands.

Contract checks:

- Commerce contracts expose required operation IDs.
- Generated Commerce backend SDK exposes required method tree entries.
- Claw Router schema registry/OpenAPI/SDK are updated only for Claw
  Router-owned surfaces.
- Generated SDK output is regenerated, never hand-edited.

Runtime checks:

- Product list loads.
- Category tree loads and can create/update a category.
- Attribute definition and category binding load.
- Product can be created as draft.
- Product can be edited through retrieve, not list-search fallback.
- Spec groups generate SKU rows.
- SKU rows persist and reload.
- Detail config persists and reloads.
- Store visibility/inventory readiness appears.
- Publish readiness blocks incomplete products.
- Publish succeeds for a complete product.
- Inventory movement/ledger evidence appears after stock mutation.

## Acceptance Criteria

The goal is not complete until current evidence proves all of these:

- Category management is operational and validates hierarchy rules.
- Store/shop selection is part of product visibility or readiness.
- Product SPU create/edit/retrieve works.
- Multi-spec SKU matrix works on create and edit.
- SKU rows are persisted as backend SKUs and reload with stable IDs.
- Category attributes and required category values drive product forms.
- SKU attributes are persisted and reload as SKU attribute selections.
- Product detail configuration is structured, saved, reloaded, and validated.
- Price list item or equivalent SKU pricing is complete enough for publishing.
- Inventory/source policy is represented for physical SKUs.
- Readiness validation prevents incomplete publication.
- A complete product can pass the admin flow from draft through publish.
- The admin UI uses generated SDK-backed service boundaries.
- Generated output is not hand-edited.
- Relevant tests and runtime checks cover the completed flow.

## References

- Shopify product model, options, variants, media, and extensible product data:
  https://shopify.dev/docs/apps/build/graphql/migrate/new-product-model
- Adobe Commerce configurable product workflow and child SKU inventory:
  https://experienceleague.adobe.com/en/docs/commerce-admin/catalog/products/types/product-create-configurable
- Adobe Commerce product attributes and attribute sets:
  https://experienceleague.adobe.com/en/docs/commerce-admin/catalog/product-attributes/product-attributes
- Adobe Commerce inventory sources and stocks:
  https://experienceleague.adobe.com/en/docs/commerce-admin/inventory/basics/sources-stocks
- Adobe Commerce assigning inventory sources per product:
  https://experienceleague.adobe.com/en/docs/commerce-admin/inventory/quantities/sources-assign-per-product
- Pimcore Classification Store:
  https://docs.pimcore.com/platform/Pimcore/Objects/Object_Classes/Data_Types/Classification_Store/
- GS1 Global Data Model:
  https://ref.gs1.org/standards/gdm/


