# Commerce Standard Product Foundation Design

## Objective

Build the standardized SDKWork Commerce product foundation for the first product-system phase:

- Product master data.
- Shop product publication.
- Pricing.
- Inventory.
- Media.

The design supports platform self-operated commerce, marketplace shop onboarding, and restaurant ordering/menu scenarios. The central decision is:

> Platform product master data is the system of record. Shop product publication is a sellable projection owned by the shop catalog layer.

This prevents SKU, price, inventory, and restaurant menu concerns from being mixed into the platform catalog fact source.

## Standards

This design follows the SDKWork standards already loaded for this workspace:

- `../sdkwork-specs/SOUL.md`
- `../sdkwork-specs/README.md`
- `../sdkwork-specs/REQUIREMENTS_SPEC.md`
- `../sdkwork-specs/ARCHITECTURE_DECISION_SPEC.md`
- `../sdkwork-specs/DOMAIN_SPEC.md`
- `../sdkwork-specs/API_SPEC.md`
- `../sdkwork-specs/DATABASE_SPEC.md`
- `../sdkwork-specs/SDK_SPEC.md`
- `../sdkwork-specs/WEB_BACKEND_SPEC.md`
- `../sdkwork-specs/MEDIA_RESOURCE_SPEC.md`
- `../sdkwork-specs/DRIVE_SPEC.md`
- `../sdkwork-specs/MIGRATION_SPEC.md`
- `../sdkwork-specs/NAMING_SPEC.md`
- `../sdkwork-specs/EVENT_SPEC.md`
- `../sdkwork-specs/SECURITY_SPEC.md`
- `../sdkwork-specs/PRIVACY_SPEC.md`
- `../sdkwork-specs/PERFORMANCE_SPEC.md`
- `../sdkwork-specs/TEST_SPEC.md`
- `../sdkwork-specs/QUALITY_GATE_SPEC.md`

## Industry Alignment

This is not a platform-specific copy. It extracts stable product-system boundaries from major commerce models.

| Source | Signal | SDKWork design implication |
| --- | --- | --- |
| Amazon SP-API Listings/Catalog/Product Type Definitions | Catalog items, seller listings, and product type schemas are separate concerns. | Keep `commerce.catalog` as the master-data source, introduce `commerce.shopCatalog` for sellable shop listings, and bind category attributes through typed schemas. |
| JD/JD Daojia/JD Seconds official product APIs | Product flows distinguish SPU/SKU, merchant goods, store-goods binding, category/brand/attribute dictionaries, product media, price, and inventory. | Add a shop listing layer and store/channel/fulfillment-location availability instead of embedding shop state in platform SKUs. |
| Meituan Waimai food APIs | Restaurant ordering needs dishes, SKU/specs, images, stock, package fee, menu categories, sort order, and sale windows. | Treat prepared food as a product type plus menu projection. Do not fork product tables for food. Add food option groups/options for modifiers and add-ons. |

Reference URLs:

- `https://developer-docs.amazon.com/sp-api/docs/manage-product-listings-guide`
- `https://developer-docs.amazon.com/sp-api/reference/listings-items-v2021-08-01`
- `https://developer-docs.amazon.com/sp-api/reference/catalog-items-v2022-04-01`
- `https://developer-docs.amazon.com/sp-api/reference/product-type-definitions-v2020-09-01`
- `https://opendj.jd.com/api/getAllApiByCategory/180.htm`
- `https://developer.waimai.meituan.com/home/doc/food/3`

## Existing State

The current repository already has a product foundation skeleton:

- Rust catalog domain: `ProductSpuDraft`, `ProductSkuDraft`, category and attribute drafts, `ProductType`, `ProductStatus`, `FulfillmentType`, `InventoryTrackingMode`.
- Rust inventory domain: stock, reservation, movement, reservation transitions, deduction policy.
- Storage migration: `commerce_product_category`, `commerce_product_attribute`, `commerce_product_attribute_value`, `commerce_product_spu`, `commerce_product_spu_category`, `commerce_product_sku`, `commerce_product_sku_attribute`, `commerce_product_media`, `commerce_price_list`, `commerce_price_list_item`, `commerce_inventory_stock`, `commerce_inventory_reservation`, `commerce_inventory_movement`.
- HTTP route metadata: app catalog read endpoints, current-shop product endpoints, backend catalog management endpoints, price-list endpoints, and inventory endpoints.

The next implementation must be incremental and compatible. It must not discard the existing route and SDK migration work already present in the dirty worktree.

## Bounded Contexts

| Context | Owns | Does not own |
| --- | --- | --- |
| `commerce.catalog` | Platform categories, brands, attributes, SPUs, SKUs, compliance master data, product master media bindings. | Shop publish state, shop price overrides, shop inventory, restaurant menu placement. |
| `commerce.shopCatalog` | Shop listing, listing SKU, channel/store visibility, listing audit, listing status events, restaurant menu publication. | Platform category dictionaries, global product schema, stock ledgers. |
| `commerce.pricing` | Price lists, shop price rules, channel/time-window price resolution. | Inventory quantity, order payment records. |
| `commerce.inventory` | Stock facts, reservations, immutable stock movements, adjustment idempotency. | Product descriptions and media ownership. |
| `commerce.media` | Business binding to SDKWork Drive `MediaResource`. | Upload sessions, presigned URLs, object storage lifecycle. |
| `commerce.catalogProjection` | Buyer/search/menu read models derived from catalog, listing, pricing, inventory, and media sources. | Primary writes. |

## Data Model

### Master Catalog Tables

`commerce_product_brand`

- System of record: `commerce.catalog`.
- Write owner: backend catalog admin and trusted platform import jobs.
- Key fields: `tenant_id`, `organization_id`, `brand_code`, `name`, `logo_media_resource_id`, `status`, `version`, audit fields.
- Unique key: `(tenant_id, brand_code)`.
- Query index: `(tenant_id, status, name)`.

`commerce_product_category`

- Existing table is retained.
- Add or normalize: `category_type`, `channel_scope`, `is_leaf`, `status`, `version`, `deleted_at`.
- Unique key remains `(tenant_id, category_no)`.
- Main read paths: category tree, leaf category lookup, admin category management.

`commerce_product_attribute`

- Existing table is retained.
- Add or normalize: `input_mode`, `is_sale_attribute`, `is_searchable`, `is_required_default`, `unit_code`, `validation_rule_json`, `version`, `deleted_at`.
- Core query fields remain first-class columns. Validation JSON is extension-only.

`commerce_product_attribute_value`

- Existing table is retained.
- Add or normalize: `external_code`, `locale_code`, `status`, `version`.
- Unique key remains `(tenant_id, attribute_id, value_code)`.

`commerce_product_category_attribute`

- Purpose: typed category schema binding.
- Key fields: `tenant_id`, `category_id`, `attribute_id`, `is_required`, `is_sale_attribute`, `is_filterable`, `is_searchable`, `sort_order`, `status`, `version`.
- Unique key: `(tenant_id, category_id, attribute_id)`.
- This table replaces any attempt to encode core category-schema rules inside product JSON.

`commerce_product_spu`

- Existing table is retained.
- Add or normalize: `brand_id`, `source_type`, `audit_status`, `audit_reason`, `version`, `deleted_at`.
- Product types must include current values and add `prepared_food`.
- Lifecycle: `draft -> pending_review -> active -> inactive -> archived`.
- Main indexes: `(tenant_id, organization_id, category_id, status)`, `(tenant_id, product_type, status)`, `(tenant_id, brand_id, status)`.

`commerce_product_sku`

- Existing table is retained.
- `price_amount` remains a default/base price only. Resolved sale price belongs to pricing.
- Add or normalize: `barcode`, `external_sku_code`, `weight_value`, `weight_unit`, `audit_status`, `version`, `deleted_at`.
- Fulfillment types must include current values and add restaurant/local-preparation semantics, such as `restaurant_prepare`.

`commerce_product_sku_spec`

- Purpose: first-class sale-spec binding for SKU variants.
- Key fields: `tenant_id`, `sku_id`, `attribute_id`, `attribute_value_id`, `custom_value`, `sort_order`, audit fields.
- Unique key: `(tenant_id, sku_id, attribute_id)`.
- Existing `commerce_product_sku_attribute` can be evolved or aliased to this table if migration compatibility is easier.

`commerce_product_spu_category`

- Existing table is retained.
- Keeps secondary categories and primary category flag.
- Main indexes already match the needed SPU/category lookup path.

### Shop Catalog Tables

`commerce_shop_listing`

- System of record: `commerce.shopCatalog`.
- Purpose: shop sellable product publication.
- Key fields: `tenant_id`, `organization_id`, `shop_id`, `listing_no`, `spu_id`, `sales_title`, `sales_subtitle`, `listing_type`, `status`, `audit_status`, `reviewed_at`, `published_at`, `unpublished_at`, `version`, `deleted_at`.
- Unique key: `(tenant_id, shop_id, listing_no)`.
- Query indexes: `(tenant_id, shop_id, status, updated_at)`, `(tenant_id, spu_id, status)`, `(tenant_id, audit_status, updated_at)`.

`commerce_shop_listing_sku`

- Purpose: shop-level sellable SKU.
- Key fields: `tenant_id`, `shop_id`, `listing_id`, `sku_id`, `listing_sku_no`, `sales_name`, `status`, `min_purchase_quantity`, `max_purchase_quantity`, `package_fee_amount`, `package_fee_currency_code`, `version`, audit fields.
- Unique key: `(tenant_id, shop_id, listing_sku_no)`.
- Query index: `(tenant_id, listing_id, status)`.
- Restaurant packaging fee is first-class because it is required in ordering, pricing, and receipt snapshots.

`commerce_shop_listing_channel`

- Purpose: channel, store, and fulfillment-location visibility.
- Key fields: `tenant_id`, `shop_id`, `listing_id`, `listing_sku_id`, `channel_code`, `fulfillment_location_id`, `availability_status`, `starts_at`, `ends_at`, `version`.
- Unique key: `(tenant_id, shop_id, listing_sku_id, channel_code, fulfillment_location_id)`.

`commerce_shop_listing_review`

- Purpose: audit record for listing review.
- Key fields: `tenant_id`, `shop_id`, `listing_id`, `review_status`, `review_reason`, `reviewed_by`, `reviewed_at`, `request_no`, `idempotency_key`.
- Unique key: `(tenant_id, request_no)`.

`commerce_shop_listing_status_event`

- Purpose: immutable listing status timeline.
- Key fields: `tenant_id`, `shop_id`, `listing_id`, `from_status`, `to_status`, `reason_code`, `operator_id`, `created_at`.
- Query index: `(tenant_id, shop_id, listing_id, created_at)`.

### Restaurant/Menu Tables

`commerce_shop_menu`

- Purpose: menu publication container for a shop/channel/time scope.
- Key fields: `tenant_id`, `shop_id`, `menu_no`, `name`, `channel_code`, `status`, `starts_at`, `ends_at`, `version`.
- Unique key: `(tenant_id, shop_id, menu_no)`.

`commerce_shop_menu_section`

- Purpose: menu category/group display.
- Key fields: `tenant_id`, `shop_id`, `menu_id`, `section_no`, `name`, `sort_order`, `status`.
- Unique key: `(tenant_id, menu_id, section_no)`.

`commerce_shop_menu_item`

- Purpose: display placement for listing/listing SKU in a menu section.
- Key fields: `tenant_id`, `shop_id`, `menu_id`, `section_id`, `listing_id`, `listing_sku_id`, `display_name`, `sort_order`, `sale_window_rule_id`, `status`.
- Unique key: `(tenant_id, menu_id, section_id, listing_sku_id)`.

`commerce_food_option_group`

- Purpose: prepared-food modifier/add-on group.
- Key fields: `tenant_id`, `shop_id`, `listing_id`, `group_no`, `name`, `min_select`, `max_select`, `is_required`, `sort_order`, `status`.
- Unique key: `(tenant_id, shop_id, listing_id, group_no)`.

`commerce_food_option`

- Purpose: option value and add-on price.
- Key fields: `tenant_id`, `shop_id`, `option_group_id`, `option_no`, `name`, `price_delta_amount`, `currency_code`, `inventory_tracking`, `status`.
- Unique key: `(tenant_id, option_group_id, option_no)`.

### Pricing Tables

`commerce_price_list`

- Existing table is retained.
- Move API resource namespace from `catalog.priceLists` toward `pricing.priceLists` while keeping compatibility aliases during migration.
- Add or normalize: `price_list_type`, `priority`, `channel_code`, `customer_segment_code`, `version`, `deleted_at`.

`commerce_price_list_item`

- Existing table is retained.
- Add or normalize: `starts_at`, `ends_at`, `min_quantity`, `status`, `version`.
- Unique key should include effective range only if the storage engine supports enforcing it safely; otherwise enforce overlap prevention in service tests.

`commerce_shop_price_rule`

- Purpose: shop override, channel price, time-window price, and restaurant item price.
- Key fields: `tenant_id`, `shop_id`, `listing_sku_id`, `channel_code`, `price_amount`, `currency_code`, `starts_at`, `ends_at`, `priority`, `status`, `version`.
- Query index: `(tenant_id, shop_id, listing_sku_id, channel_code, status, starts_at)`.

Price resolution priority:

1. Active shop/channel/time price rule.
2. Active shop default price rule.
3. Active price-list item.
4. SKU default/base price.

### Inventory Tables

`commerce_inventory_stock`

- Existing table is retained.
- Add or normalize: `shop_id`, `listing_sku_id`, `fulfillment_location_id`, `channel_code`, `safety_quantity`, `status`, `version`.
- Platform warehouse stock unique key: `(tenant_id, sku_id, warehouse_id)`.
- Shop/store stock unique key: `(tenant_id, shop_id, listing_sku_id, fulfillment_location_id)`.
- Quantity columns remain integers. No JSON for available/reserved/sold facts.

`commerce_inventory_reservation`

- Existing table is retained.
- Add or normalize: `shop_id`, `listing_sku_id`, `fulfillment_location_id`, `order_item_id`, `snapshot_json`.
- Immutable request identity: `(tenant_id, request_no)` and `(tenant_id, idempotency_key)`.
- State transitions: `reserved -> consumed | released | expired`.

`commerce_inventory_movement`

- Existing table is retained.
- Add or normalize: `shop_id`, `listing_sku_id`, `fulfillment_location_id`, `before_available_quantity`, `after_available_quantity`.
- Append-only. Do not update or delete normal movement rows.

### Media Tables

`commerce_product_media`

- Existing table must be evolved because it currently stores `url` as required data.
- New fact fields: `media_resource_id`, `drive_space_id`, `drive_node_id`, `drive_uri`, `resource_snapshot_json`, `owner_type`, `owner_id`, `media_role`, `media_type`, `sort_order`, `status`, audit fields.
- Owner types: `spu`, `sku`, `listing`, `listing_sku`, `menu_item`, `brand`, `certificate`.
- Media roles: `main_image`, `gallery_image`, `detail_image`, `sku_image`, `video`, `manual`, `certificate`, `dish_image`, `brand_logo`.
- The product system must not create upload sessions, presigned URLs, object keys, or storage lifecycle rules.

### Projection Tables

`commerce_listing_search_projection`

- Sources: catalog SPU/SKU, shop listing, pricing, inventory availability, product media.
- Rebuild key: `(tenant_id, shop_id, listing_id)`.
- Drift detection fields: `source_version_hash`, `projection_version`, `rebuilt_at`.

`commerce_menu_item_projection`

- Sources: shop menu, menu section, listing, listing SKU, food options, price resolution, inventory, media.
- Rebuild key: `(tenant_id, shop_id, menu_id, menu_item_id)`.
- Read path for buyer restaurant menu endpoints.

## API Contract

### Naming And Compatibility

- App API prefix: `/app/v3/api`.
- Backend API prefix: `/backend/v3/api`.
- Static path segments: lower snake case.
- Path params: lower camel case.
- Operation IDs: dotted lower camel case.
- Existing `catalog.products` and `shops.current.products` remain as compatibility surfaces.
- New standard shop publication resources use `shopCatalog`/`shops.current.listings`.
- Pricing moves to `pricing.*`, with `catalog.priceLists.*` kept as an alias during a compatibility window if current SDK consumers require it.

### Backend API

| Method | Path | Operation ID | Purpose |
| --- | --- | --- | --- |
| GET | `/backend/v3/api/catalog/brands` | `catalog.brands.list` | Manage brand dictionary. |
| POST | `/backend/v3/api/catalog/brands` | `catalog.brands.create` | Create brand. |
| GET | `/backend/v3/api/catalog/categories` | `catalog.categories.management.list` | Existing category admin list. |
| POST | `/backend/v3/api/catalog/categories` | `catalog.categories.create` | Existing category create. |
| GET | `/backend/v3/api/catalog/category_attributes` | `catalog.categoryAttributes.list` | Existing category-schema binding list. |
| POST | `/backend/v3/api/catalog/category_attributes` | `catalog.categoryAttributes.create` | Existing category-schema binding create. |
| GET | `/backend/v3/api/catalog/spus` | `catalog.spus.management.list` | Existing SPU admin list. |
| POST | `/backend/v3/api/catalog/spus` | `catalog.spus.create` | Create SPU. |
| PATCH | `/backend/v3/api/catalog/spus/{spuId}` | `catalog.spus.update` | Update SPU. |
| POST | `/backend/v3/api/catalog/spus/{spuId}/publish` | `catalog.spus.publish` | Publish SPU. |
| POST | `/backend/v3/api/catalog/spus/{spuId}/archive` | `catalog.spus.archive` | Archive SPU. |
| GET | `/backend/v3/api/catalog/skus` | `catalog.skus.list` | Existing SKU admin list. |
| POST | `/backend/v3/api/catalog/skus` | `catalog.skus.create` | Create SKU. |
| PATCH | `/backend/v3/api/catalog/skus/{skuId}` | `catalog.skus.update` | Update SKU. |
| POST | `/backend/v3/api/catalog/media_bindings` | `catalog.mediaBindings.create` | Bind Drive media to product owner. |
| GET | `/backend/v3/api/pricing/price_lists` | `pricing.priceLists.list` | List price lists. |
| POST | `/backend/v3/api/pricing/price_lists` | `pricing.priceLists.create` | Create price list. |
| PATCH | `/backend/v3/api/pricing/price_lists/{priceListId}` | `pricing.priceLists.update` | Update price list. |
| GET | `/backend/v3/api/shops/{shopId}/listings` | `shopCatalog.listings.management.list` | Admin listing governance. |
| GET | `/backend/v3/api/shops/{shopId}/listings/{listingId}` | `shopCatalog.listings.management.retrieve` | Admin listing detail. |
| POST | `/backend/v3/api/shops/{shopId}/listings/{listingId}/review` | `shopCatalog.listings.review` | Approve or reject listing. |
| GET | `/backend/v3/api/inventory/stocks` | `inventory.stocks.list` | Existing inventory admin list. |
| POST | `/backend/v3/api/inventory/stocks/{stockId}/adjust` | `inventory.stocks.adjust` | Existing inventory adjustment. |

### App API

| Method | Path | Operation ID | Purpose |
| --- | --- | --- | --- |
| GET | `/app/v3/api/catalog/categories` | `catalog.categories.list` | Existing buyer category list. |
| GET | `/app/v3/api/catalog/products` | `catalog.products.list` | Existing buyer product list compatibility view. |
| GET | `/app/v3/api/catalog/products/{productId}` | `catalog.products.retrieve` | Existing buyer product detail compatibility view. |
| GET | `/app/v3/api/shops/{shopId}/listings` | `shopCatalog.listings.list` | Buyer shop listing list. |
| GET | `/app/v3/api/shops/{shopId}/listings/{listingId}` | `shopCatalog.listings.retrieve` | Buyer shop listing detail. |
| GET | `/app/v3/api/shops/{shopId}/menus/current` | `shopCatalog.menus.current.retrieve` | Buyer current restaurant menu. |
| GET | `/app/v3/api/shops/current/listings` | `shops.current.listings.list` | Seller listing list. |
| POST | `/app/v3/api/shops/current/listings` | `shops.current.listings.create` | Seller creates listing from SPU/SKU. |
| PATCH | `/app/v3/api/shops/current/listings/{listingId}` | `shops.current.listings.update` | Seller updates listing. |
| POST | `/app/v3/api/shops/current/listings/{listingId}/publish` | `shops.current.listings.publish` | Seller submits/publishes listing. |
| POST | `/app/v3/api/shops/current/listings/{listingId}/unpublish` | `shops.current.listings.unpublish` | Seller unpublishes listing. |
| GET | `/app/v3/api/shops/current/listings/{listingId}/price_rules` | `shops.current.listings.priceRules.list` | Seller listing prices. |
| PUT | `/app/v3/api/shops/current/listings/{listingId}/price_rules` | `shops.current.listings.priceRules.upsert` | Seller upserts listing prices. |
| GET | `/app/v3/api/shops/current/menus` | `shops.current.menus.list` | Seller menu list. |
| POST | `/app/v3/api/shops/current/menus` | `shops.current.menus.create` | Seller menu create. |
| PATCH | `/app/v3/api/shops/current/menus/{menuId}` | `shops.current.menus.update` | Seller menu update. |
| GET | `/app/v3/api/shops/current/inventory/stocks` | `shops.current.inventory.stocks.list` | Existing seller stock list. |
| POST | `/app/v3/api/shops/current/inventory/stocks/{stockId}/adjustments` | `shops.current.inventory.stocks.adjustments.create` | Existing seller stock adjustment. |

### DTO Rules

- `int64` identifiers and quantities that can exceed JavaScript safe integer range are strings in API responses.
- Decimal amounts are strings.
- Write requests include `Idempotency-Key` for create, publish, review, price upsert, stock adjust, reservation, and release.
- Update requests carry `version` or `If-Match`.
- Lists are paginated and bounded. High-volume lists use cursor pagination.
- Generic search parameter is `q`.
- Protected endpoints require dual-token auth, typed context, explicit permissions, tenant scope, object scope, and audit metadata.
- Error responses use `application/problem+json`.
- Media DTOs use SDKWork `MediaResource`/Drive references, not raw storage URLs.

## Lifecycle

### Product Master

1. Backend admin or trusted import job creates category, brand, and attribute schema.
2. Admin creates SPU and SKU.
3. Media is uploaded through Drive, then bound through `commerce_product_media`.
4. SPU/SKU enter review if category rules require it.
5. Publish changes status to `active` and emits catalog change events.
6. Projection jobs rebuild buyer/search read models.

### Shop Listing

1. Seller selects an active SPU/SKU or starts from an approved platform template.
2. Seller creates listing and listing SKUs.
3. Seller sets title overrides, channels, fulfillment locations, food package fee, and optional menu placement.
4. Seller submits for review or directly publishes if policy allows.
5. Listing changes emit projection rebuild events.

### Pricing

1. Platform creates price lists and list items.
2. Seller creates shop price rules for listing SKUs.
3. Price resolver evaluates shop/channel/time override before price list and SKU default.
4. Order line snapshots store resolved price and source metadata.

### Inventory

1. Stock is kept by SKU warehouse or listing SKU fulfillment location.
2. Order creation reserves stock with an idempotency key.
3. Payment success consumes the reservation.
4. Cancellation, timeout, or eligible refund releases stock.
5. Every state change appends an inventory movement.

### Restaurant Menu

1. Prepared food is modeled as `product_type = prepared_food`.
2. Listing SKU is the sellable dish/spec.
3. Menu item places the listing SKU into a section.
4. Option groups/options model modifiers, add-ons, and combos.
5. Menu projection resolves display, price, package fee, sale window, inventory, and image.

## Events And Projections

Minimum change events:

- `commerce.catalog.spu.changed`
- `commerce.catalog.sku.changed`
- `commerce.catalog.media.changed`
- `commerce.shopCatalog.listing.changed`
- `commerce.pricing.priceRule.changed`
- `commerce.inventory.stock.changed`
- `commerce.menu.changed`

Each projection declares:

- Source tables.
- Source version hash.
- Rebuild command.
- Drift detection query.
- Compatibility window for projection schema changes.

## Security And Privacy

Required permissions:

- `commerce.catalog.read`
- `commerce.catalog.write`
- `commerce.catalog.publish`
- `commerce.shopCatalog.read`
- `commerce.shopCatalog.write`
- `commerce.shopCatalog.publish`
- `commerce.shopCatalog.review`
- `commerce.pricing.read`
- `commerce.pricing.write`
- `commerce.inventory.read`
- `commerce.inventory.adjust`
- `commerce.inventory.reserve`
- `commerce.media.bind`
- `commerce.menu.write`

Rules:

- Backend/service authorization is mandatory. UI hints are not security.
- Every shop-scoped command validates tenant, organization, shop ownership, and object ownership.
- Cross-shop listing, price, inventory, and menu updates are rejected even inside the same tenant unless the actor has explicit platform-admin scope.
- Logs must not include tokens, Drive credentials, sensitive business documents, or raw private contact data.
- Media retention, deletion, residency, and access are delegated to Drive and represented through `MediaResource`.

## Performance

P1 indexes:

- Product browsing: `(tenant_id, organization_id, category_id, status)`.
- Product type filtering: `(tenant_id, organization_id, product_type, status)`.
- Listing management: `(tenant_id, shop_id, status, updated_at)`.
- Listing audit: `(tenant_id, audit_status, updated_at)`.
- Buyer shop listing: `(tenant_id, shop_id, status, published_at)`.
- Price resolution: `(tenant_id, shop_id, listing_sku_id, channel_code, status, starts_at)`.
- Stock lookup: `(tenant_id, shop_id, listing_sku_id, fulfillment_location_id)`.
- Reservation expiry: `(tenant_id, status, expires_at)`.
- Media owner lookup: `(tenant_id, owner_type, owner_id, status, sort_order)`.

High-volume APIs use cursor pagination. Bulk import is asynchronous and idempotent. Projection reads are preferred for buyer search and menus.

## Testing And Quality Gates

The implementation must be test-first after the planning phase.

Required verification families:

1. Schema quality gate:
   - Table owner, system of record, write owner, read consumers, change channel.
   - Tenant, lifecycle, audit, version, soft delete, idempotency.
   - First-class query fields for status, tenant, amount, price, stock, category, shop, and permissions.
2. OpenAPI gate:
   - Prefixes, operation IDs, lower snake case path segments, lower camel case path params.
   - Decimal and int64 strings.
   - Pagination, security scheme, problem responses.
3. Rust domain/service tests:
   - Product type and fulfillment additions.
   - SPU/SKU validation.
   - Listing lifecycle and review transitions.
   - Price priority resolution.
   - Reservation transitions and stock movement append-only behavior.
   - Drive media binding validation.
4. SDK contract tests:
   - Generated app/backend SDK method tree exposes catalog, shop listing, pricing, inventory, menu, and media binding operations.
   - App/admin consumers use SDK service boundaries, not raw HTTP.
5. Security negative tests:
   - Cross-tenant and cross-shop writes fail.
   - Missing publish/review/adjust permissions fail.
   - Product media URL/object-key inputs are rejected.
6. Projection tests:
   - Listing search projection rebuild.
   - Menu item projection rebuild.
   - Drift detection identifies stale source hash.

## Implementation Direction

The implementation should be staged:

1. Add failing standard-contract tests for the target database/API/domain behavior.
2. Extend migration schema or add a follow-up migration for missing product-foundation tables.
3. Extend Rust catalog, pricing/shop catalog, inventory, and media binding domain/service contracts.
4. Update HTTP route metadata and OpenAPI exporter source contracts.
5. Regenerate app/backend SDKs from OpenAPI.
6. Update service ports/contracts and admin package usage if needed.
7. Run focused tests, then broader repository verification.

Generated SDK output must only be changed by generators. Existing dirty worktree changes must be preserved unless they directly conflict with the product-foundation implementation.

## Review Notes

Self-review focus before implementation:

- The design keeps catalog facts independent from shop sales facts.
- Restaurant ordering is represented by product type, listing, menu, and option extensions, not by a separate dish-only product system.
- Pricing and inventory are independent bounded contexts with explicit resolution paths.
- Media uses Drive/MediaResource and avoids product-local storage lifecycle.
- Existing compatibility endpoints are preserved while standard listing/pricing resources are introduced.
