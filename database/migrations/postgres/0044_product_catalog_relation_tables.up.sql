-- sdkwork:migration
-- id: 0044_product_catalog_relation_tables
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Provision the four Cloud Router-owned product catalog *relation*
--   tables.
--
--   `admin_catalog_store.rs` (and `admin_marketing_store.rs`) read and write
--   four relation tables that have no DDL in the federated `sdkwork-merchandise`
--   module:
--
--     * `commerce_product_spu_category`         -- SPU <-> category, ordered
--     * `commerce_product_category_attribute`   -- category <-> attribute binding
--     * `commerce_product_sku_attribute`        -- SKU attribute selection
--     * `commerce_product_media`                -- SPU/SKU media relation
--
--   `sdkwork-merchandise` owns only the six *master-data* tables
--   (`commerce_product_spu`, `commerce_product_sku`, `commerce_product_category`,
--   `commerce_product_attribute`, `commerce_product_attribute_value`,
--   `commerce_price_list`) and declares `table_prefix: commerce_` for exactly
--   those. It publishes no DDL for the relation tables above, so `list_products`,
--   `list_skus`, `create_product`/`update_product` category binding,
--   `replace_category_attributes` and `replace_sku_image` all failed with
--   `relation "commerce_product_spu_category" does not exist`.
--
--   These four tables are therefore Cloud Router-owned registry entries declared
--   in `database/contract/table-registry.json` under the `commerce_` prefix
--   family. Column shape follows the `commerce_*` family convention established
--   by `sdkwork-merchandise` and `sdkwork-payment`: TEXT ids and TEXT decimal
--   money.
--
--   `commerce_product_media` follows `MEDIA_RESOURCE_SPEC.md` section 6
--   ("Merchandise Catalog Profile"): media is a relation with `owner_type` /
--   `owner_id` / `media_role`, ordered by `sort_order`, and persistence uses
--   stable media identity (`drive_uri` plus a `resource_snapshot`) rather than a
--   bare URL column. SKU image is `owner_type = 'sku'` + `media_role = 'sku_image'`.
--
--   All statements are `IF NOT EXISTS`, so replaying against a database that
--   already carries the tables is a no-op and cannot overwrite a sibling
--   repository's objects.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

CREATE TABLE IF NOT EXISTS commerce_product_spu_category (
    id              TEXT NOT NULL PRIMARY KEY,
    tenant_id       TEXT NOT NULL,
    organization_id TEXT NOT NULL DEFAULT '0',
    spu_id          TEXT NOT NULL,
    category_id     TEXT NOT NULL,
    primary_flag    BIGINT NOT NULL DEFAULT 0,
    sort_order      BIGINT NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'active',
    created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ux_commerce_product_spu_category
        UNIQUE (tenant_id, spu_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_commerce_product_spu_category_category
    ON commerce_product_spu_category (tenant_id, category_id, status);
CREATE INDEX IF NOT EXISTS idx_commerce_product_spu_category_spu
    ON commerce_product_spu_category (tenant_id, spu_id);

CREATE TABLE IF NOT EXISTS commerce_product_category_attribute (
    id              TEXT NOT NULL PRIMARY KEY,
    tenant_id       TEXT NOT NULL,
    organization_id TEXT NOT NULL DEFAULT '0',
    category_id     TEXT NOT NULL,
    attribute_id    TEXT NOT NULL,
    required        BOOLEAN NOT NULL DEFAULT FALSE,
    searchable      BOOLEAN NOT NULL DEFAULT FALSE,
    filterable      BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order      BIGINT NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'active',
    created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ux_commerce_product_category_attribute
        UNIQUE (tenant_id, category_id, attribute_id)
);

CREATE INDEX IF NOT EXISTS idx_commerce_product_category_attribute_category
    ON commerce_product_category_attribute (tenant_id, category_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_commerce_product_category_attribute_attribute
    ON commerce_product_category_attribute (tenant_id, attribute_id);

CREATE TABLE IF NOT EXISTS commerce_product_sku_attribute (
    id                 TEXT NOT NULL PRIMARY KEY,
    tenant_id          TEXT NOT NULL,
    organization_id    TEXT NOT NULL DEFAULT '0',
    sku_id             TEXT NOT NULL,
    attribute_id       TEXT NOT NULL,
    attribute_value_id TEXT,
    custom_value       TEXT,
    created_at         TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ux_commerce_product_sku_attribute
        UNIQUE (tenant_id, sku_id, attribute_id)
);

CREATE INDEX IF NOT EXISTS idx_commerce_product_sku_attribute_sku
    ON commerce_product_sku_attribute (tenant_id, sku_id);
CREATE INDEX IF NOT EXISTS idx_commerce_product_sku_attribute_value
    ON commerce_product_sku_attribute (tenant_id, attribute_id, attribute_value_id);

CREATE TABLE IF NOT EXISTS commerce_product_media (
    id                TEXT NOT NULL PRIMARY KEY,
    tenant_id         TEXT NOT NULL,
    organization_id   TEXT NOT NULL DEFAULT '0',
    owner_type        TEXT NOT NULL,
    owner_id          TEXT NOT NULL,
    media_role        TEXT NOT NULL,
    drive_uri         TEXT,
    resource_snapshot JSONB,
    alt_text          TEXT,
    sort_order        BIGINT NOT NULL DEFAULT 0,
    status            TEXT NOT NULL DEFAULT 'active',
    created_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_commerce_product_media_owner_type
        CHECK (owner_type IN ('spu', 'sku')),
    CONSTRAINT ck_commerce_product_media_media_role
        CHECK (media_role IN ('main_image', 'gallery_image', 'detail_image', 'sku_image', 'video', 'manual', 'certificate')),
    CONSTRAINT ux_commerce_product_media_slot
        UNIQUE (tenant_id, owner_type, owner_id, media_role, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_commerce_product_media_owner
    ON commerce_product_media (tenant_id, owner_type, owner_id, status, sort_order);

COMMIT;
