-- sdkwork:migration
-- id: 0006_pricing_default_region
-- engine: postgres
-- module: pricing
-- purpose: Add admin-configured default billing region per catalog key.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s
-- contract_version: 0.5.0

CREATE TABLE IF NOT EXISTS pricing_default_region (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    data_scope INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    vendor_code VARCHAR(64) NOT NULL,
    product_code VARCHAR(160) NOT NULL,
    catalog_key VARCHAR(256) NOT NULL,
    default_region_code VARCHAR(64) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    description VARCHAR(1024),
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_pricing_default_region_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT uk_pricing_default_region_uuid UNIQUE (uuid),
    CONSTRAINT uk_pricing_default_region_scope_id UNIQUE (tenant_id, organization_id, id),
    CONSTRAINT uk_pricing_default_region_catalog_key UNIQUE (tenant_id, organization_id, catalog_key) WHERE deleted_at IS NULL,
    CONSTRAINT ck_pricing_default_region_currency CHECK (currency_code ~ '^[A-Z]{3}$'),
    CONSTRAINT ck_pricing_default_region_region_not_blank CHECK (BTRIM(default_region_code) <> ''),
    CONSTRAINT ck_pricing_default_region_interval CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_pricing_default_region_uuid ON pricing_default_region (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_pricing_default_region_scope_id ON pricing_default_region (tenant_id, organization_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_pricing_default_region_catalog_key ON pricing_default_region (tenant_id, organization_id, catalog_key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pricing_default_region_scope_reference ON pricing_default_region (tenant_id, organization_id, id);
CREATE INDEX IF NOT EXISTS idx_pricing_default_region_catalog_key
    ON pricing_default_region (tenant_id, organization_id, vendor_code, catalog_key, default_region_code, id);