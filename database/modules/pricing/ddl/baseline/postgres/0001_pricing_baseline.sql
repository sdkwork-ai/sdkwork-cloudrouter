-- Generated from docs/schema-registry/sdkwork-cloudrouter.tables.yaml.
-- Registry version: 0.5.0.
-- Registry SHA-256: 6b994396308e8480d180d9ad76a67c4051170bead55285ad15b34bf490f3da0d.
-- Dialect: postgres.
-- Materialize: python -B -m tools.schema_compiler --dialect postgres --materialize.
-- Do not edit by hand; update Schema Registry and regenerate.

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
    provider_code VARCHAR(64) NOT NULL DEFAULT '',
    product_code VARCHAR(160) NOT NULL,
    resource_code VARCHAR(256) NOT NULL DEFAULT '',
    catalog_key VARCHAR(256) NOT NULL,
    resource_key VARCHAR(64) NOT NULL DEFAULT '',
    default_region_code VARCHAR(64) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    description VARCHAR(1024),
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_pricing_default_region_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_pricing_default_region_currency CHECK (currency_code ~ '^[A-Z]{3}$'),
    CONSTRAINT ck_pricing_default_region_region_not_blank CHECK (BTRIM(default_region_code) <> ''),
    CONSTRAINT ck_pricing_default_region_interval CHECK (effective_to IS NULL OR effective_to > effective_from),
    CONSTRAINT ck_pricing_default_region_resource_key_blank CHECK (BTRIM(resource_key) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_pricing_default_region_uuid ON pricing_default_region (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_pricing_default_region_scope_id ON pricing_default_region (tenant_id, organization_id, id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_pricing_default_region_resource_key ON pricing_default_region (tenant_id, organization_id, resource_key) WHERE deleted_at IS NULL AND BTRIM(resource_key) <> '';
CREATE UNIQUE INDEX IF NOT EXISTS uq_pricing_default_region_scope_reference ON pricing_default_region (tenant_id, organization_id, id);
CREATE INDEX IF NOT EXISTS idx_pricing_default_region_catalog_key ON pricing_default_region (tenant_id, organization_id, vendor_code, catalog_key, default_region_code, id);
CREATE INDEX IF NOT EXISTS idx_pricing_default_region_resource_key ON pricing_default_region (tenant_id, organization_id, resource_key, default_region_code, id);

CREATE TABLE IF NOT EXISTS pricing_import_run (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT,
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    payload_hash VARCHAR(128),
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_system VARCHAR(64) NOT NULL,
    source_catalog_version VARCHAR(128) NOT NULL,
    source_hash VARCHAR(128) NOT NULL,
    import_state VARCHAR(32) NOT NULL,
    row_count BIGINT NOT NULL,
    accepted_count BIGINT NOT NULL,
    rejected_count BIGINT NOT NULL,
    staged_at TIMESTAMPTZ NOT NULL,
    activated_at TIMESTAMPTZ,
    failure_summary VARCHAR(1024),
    CONSTRAINT ck_pricing_import_run_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_pricing_import_run_counts CHECK (row_count >= 0 AND accepted_count >= 0 AND rejected_count >= 0 AND accepted_count + rejected_count <= row_count),
    CONSTRAINT ck_pricing_import_run_state CHECK (import_state IN ('staging', 'validated', 'activated', 'rejected', 'failed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_pricing_import_run_uuid ON pricing_import_run (uuid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_pricing_import_run_scope_id ON pricing_import_run (tenant_id, organization_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_pricing_import_run_source ON pricing_import_run (tenant_id, organization_id, source_system, source_catalog_version, source_hash);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pricing_import_run_scope_reference ON pricing_import_run (tenant_id, organization_id, id);
CREATE INDEX IF NOT EXISTS idx_pricing_import_run_latest ON pricing_import_run (tenant_id, organization_id, source_system, import_state, staged_at, id);
CREATE INDEX IF NOT EXISTS idx_pricing_import_run_retention ON pricing_import_run (retention_until, id);

CREATE TABLE IF NOT EXISTS pricing_price_book (
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
    import_run_id BIGINT,
    namespace_code VARCHAR(64) NOT NULL,
    price_book_code VARCHAR(160) NOT NULL,
    price_book_version VARCHAR(128) NOT NULL,
    price_side VARCHAR(32) NOT NULL,
    source_system VARCHAR(64) NOT NULL,
    vendor_code VARCHAR(64) NOT NULL,
    region_code VARCHAR(64) NOT NULL,
    source_catalog_version VARCHAR(128) NOT NULL,
    source_hash VARCHAR(128) NOT NULL,
    lifecycle_state VARCHAR(32) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    activated_at TIMESTAMPTZ,
    CONSTRAINT ck_pricing_price_book_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_pricing_price_book_import FOREIGN KEY (tenant_id, organization_id, import_run_id) REFERENCES pricing_import_run (tenant_id, organization_id, id),
    CONSTRAINT ck_pricing_price_book_state CHECK (lifecycle_state IN ('draft', 'staged', 'active', 'retired', 'rejected')),
    CONSTRAINT ck_pricing_price_book_side CHECK (price_side IN ('official_reference', 'upstream_cost', 'customer_charge', 'internal_transfer')),
    CONSTRAINT ck_pricing_price_book_currency CHECK (currency_code ~ '^[A-Z]{3}$'),
    CONSTRAINT ck_pricing_price_book_interval CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_pricing_price_book_uuid ON pricing_price_book (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_pricing_price_book_scope_id ON pricing_price_book (tenant_id, organization_id, id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_pricing_price_book_version ON pricing_price_book (tenant_id, organization_id, namespace_code, price_book_code, vendor_code, region_code, price_book_version) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_pricing_price_book_source ON pricing_price_book (tenant_id, organization_id, source_system, vendor_code, region_code, source_catalog_version, price_book_code, source_hash) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_pricing_price_book_active ON pricing_price_book (tenant_id, organization_id, namespace_code, price_book_code, vendor_code, region_code) WHERE lifecycle_state = 'active' AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pricing_price_book_scope_reference ON pricing_price_book (tenant_id, organization_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pricing_price_book_rate_dimensions ON pricing_price_book (tenant_id, organization_id, id, vendor_code, region_code, currency_code);
CREATE INDEX IF NOT EXISTS idx_pricing_price_book_active ON pricing_price_book (tenant_id, organization_id, namespace_code, lifecycle_state, effective_from, id);

CREATE TABLE IF NOT EXISTS pricing_rate (
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
    price_book_id BIGINT NOT NULL,
    rate_code VARCHAR(192) NOT NULL,
    rate_hash VARCHAR(128) NOT NULL,
    product_code VARCHAR(160) NOT NULL,
    product_kind VARCHAR(64) NOT NULL,
    product_display_name VARCHAR(256) NOT NULL,
    operation_code VARCHAR(160) NOT NULL,
    operation_kind VARCHAR(64) NOT NULL,
    operation_display_name VARCHAR(256) NOT NULL,
    meter_code VARCHAR(96) NOT NULL,
    meter_display_name VARCHAR(256) NOT NULL,
    quantity_kind VARCHAR(64) NOT NULL,
    unit_code VARCHAR(64) NOT NULL,
    vendor_code VARCHAR(64) NOT NULL,
    provider_code VARCHAR(64) NOT NULL,
    account_id BIGINT,
    region_code VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_code VARCHAR(256) NOT NULL,
    catalog_key VARCHAR(256),
    api_format VARCHAR(64),
    endpoint_code VARCHAR(160),
    billability VARCHAR(32) NOT NULL,
    charge_timing VARCHAR(32) NOT NULL,
    calculation_mode VARCHAR(32) NOT NULL,
    quantity_aggregation VARCHAR(32) NOT NULL,
    unit_size NUMERIC(38, 12) NOT NULL,
    unit_price NUMERIC(38, 12) NOT NULL,
    minimum_quantity NUMERIC(38, 12) NOT NULL,
    quantity_step NUMERIC(38, 12),
    currency_code VARCHAR(3) NOT NULL,
    conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    tiers JSONB NOT NULL DEFAULT '[]'::jsonb,
    formula JSONB,
    priority INTEGER NOT NULL,
    rate_variant VARCHAR(32) NOT NULL DEFAULT 'standard',
    schedule JSONB,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    source_url VARCHAR(2048) NOT NULL,
    source_observed_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_pricing_rate_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_pricing_rate_book FOREIGN KEY (tenant_id, organization_id, price_book_id) REFERENCES pricing_price_book (tenant_id, organization_id, id),
    CONSTRAINT fk_pricing_rate_book_dimensions FOREIGN KEY (tenant_id, organization_id, price_book_id, vendor_code, region_code, currency_code) REFERENCES pricing_price_book (tenant_id, organization_id, id, vendor_code, region_code, currency_code),
    CONSTRAINT ck_pricing_rate_quantities CHECK (unit_size > 0 AND unit_price >= 0 AND minimum_quantity >= 0 AND (quantity_step IS NULL OR quantity_step > 0)),
    CONSTRAINT ck_pricing_rate_interval CHECK (effective_to IS NULL OR effective_to > effective_from),
    CONSTRAINT ck_pricing_rate_billability CHECK (billability IN ('chargeable', 'free', 'not_applicable', 'unknown')),
    CONSTRAINT ck_pricing_rate_charge_timing CHECK (charge_timing IN ('request_accepted', 'successful_result', 'usage_reported')),
    CONSTRAINT ck_pricing_rate_calculation_mode CHECK (calculation_mode IN ('per_unit', 'flat', 'graduated', 'volume', 'formula')),
    CONSTRAINT ck_pricing_rate_quantity_aggregation CHECK (quantity_aggregation IN ('sum', 'maximum', 'minimum', 'last', 'distinct_invocation')),
    CONSTRAINT ck_pricing_rate_flat_unit_size CHECK (calculation_mode <> 'flat' OR unit_size = 1),
    CONSTRAINT ck_pricing_rate_chargeable_price CHECK (billability <> 'chargeable' OR unit_price > 0),
    CONSTRAINT ck_pricing_rate_non_chargeable_price CHECK (billability NOT IN ('free', 'not_applicable') OR unit_price = 0),
    CONSTRAINT ck_pricing_rate_currency CHECK (currency_code ~ '^[A-Z]{3}$'),
    CONSTRAINT ck_pricing_rate_conditions_json CHECK (jsonb_typeof(conditions) = 'array'),
    CONSTRAINT ck_pricing_rate_tiers_json CHECK (jsonb_typeof(tiers) = 'array'),
    CONSTRAINT ck_pricing_rate_formula_json CHECK (formula IS NULL OR jsonb_typeof(formula) = 'object'),
    CONSTRAINT ck_pricing_rate_variant CHECK (rate_variant IN ('standard', 'time_window')),
    CONSTRAINT ck_pricing_rate_schedule_json CHECK (schedule IS NULL OR jsonb_typeof(schedule) = 'object'),
    CONSTRAINT ck_pricing_rate_schedule_variant CHECK ((rate_variant = 'standard' AND schedule IS NULL) OR (rate_variant = 'time_window' AND schedule IS NOT NULL)),
    CONSTRAINT ck_pricing_rate_calculation_payload CHECK ((calculation_mode IN ('graduated', 'volume')) = (jsonb_array_length(tiers) > 0) AND (calculation_mode = 'formula') = (formula IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_pricing_rate_uuid ON pricing_rate (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_pricing_rate_scope_id ON pricing_rate (tenant_id, organization_id, id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_pricing_rate_book_code ON pricing_rate (tenant_id, organization_id, price_book_id, rate_code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_pricing_rate_book_hash ON pricing_rate (tenant_id, organization_id, price_book_id, rate_hash) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pricing_rate_scope_reference ON pricing_rate (tenant_id, organization_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pricing_rate_scope_book_reference ON pricing_rate (tenant_id, organization_id, id, price_book_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rate_resolve ON pricing_rate (tenant_id, organization_id, catalog_key, product_code, operation_code, meter_code, provider_code, region_code, billability, status, priority, effective_from, id);
