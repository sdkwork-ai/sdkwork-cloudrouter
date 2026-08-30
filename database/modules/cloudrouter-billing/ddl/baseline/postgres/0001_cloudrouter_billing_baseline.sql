-- Generated from docs/schema-registry/sdkwork-cloudrouter.tables.yaml.
-- Registry version: 0.5.0.
-- Registry SHA-256: 1a7169a14d4fdf8e24034dbe36dbdcce5e8d8e4165b8be555a6f0a46de253ce6.
-- Dialect: postgres.
-- Materialize: python -B -m tools.schema_compiler --dialect postgres --materialize.
-- Do not edit by hand; update Schema Registry and regenerate.

CREATE TABLE IF NOT EXISTS cloudrouter_pricing_plan (
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
    plan_code VARCHAR(96) NOT NULL,
    plan_name VARCHAR(256) NOT NULL,
    base_price_side VARCHAR(32) NOT NULL,
    currency_code VARCHAR(10) NOT NULL,
    fallback_policy VARCHAR(32) NOT NULL,
    rounding_mode VARCHAR(32) NOT NULL,
    minimum_charge_amount NUMERIC(38, 12) NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_cloudrouter_pricing_plan_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_cloudrouter_pricing_plan_minimum CHECK (minimum_charge_amount >= 0),
    CONSTRAINT ck_cloudrouter_pricing_plan_interval CHECK (effective_to IS NULL OR effective_to > effective_from),
    CONSTRAINT ck_cloudrouter_pricing_plan_base_side CHECK (base_price_side IN ('official_reference', 'upstream_cost', 'customer_charge', 'internal_transfer')),
    CONSTRAINT ck_cloudrouter_pricing_plan_fallback CHECK (fallback_policy = 'fail_closed'),
    CONSTRAINT ck_cloudrouter_pricing_plan_rounding CHECK (rounding_mode IN ('half_up', 'half_even', 'up', 'down')),
    CONSTRAINT ck_cloudrouter_pricing_plan_currency CHECK (currency_code ~ '^[A-Z]{3}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_pricing_plan_uuid ON cloudrouter_pricing_plan (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_pricing_plan_scope_id ON cloudrouter_pricing_plan (tenant_id, organization_id, id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_pricing_plan_code ON cloudrouter_pricing_plan (tenant_id, organization_id, plan_code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_cloudrouter_pricing_plan_scope_reference ON cloudrouter_pricing_plan (tenant_id, organization_id, id);

CREATE TABLE IF NOT EXISTS cloudrouter_account_rate_card (
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
    subject_type VARCHAR(32) NOT NULL,
    subject_id BIGINT,
    subject_code VARCHAR(160),
    pricing_plan_tenant_id BIGINT NOT NULL,
    pricing_plan_organization_id BIGINT NOT NULL,
    pricing_plan_id BIGINT NOT NULL,
    priority INTEGER NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_cloudrouter_account_rate_card_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_cloudrouter_account_rate_card_plan FOREIGN KEY (pricing_plan_tenant_id, pricing_plan_organization_id, pricing_plan_id) REFERENCES cloudrouter_pricing_plan (tenant_id, organization_id, id),
    CONSTRAINT ck_cloudrouter_account_rate_card_subject CHECK ((subject_id IS NOT NULL AND subject_code IS NULL) OR (subject_id IS NULL AND subject_code IS NOT NULL)),
    CONSTRAINT ck_cloudrouter_account_rate_card_subject_type CHECK (subject_type IN ('default', 'api_key', 'account_group', 'account', 'user', 'organization')),
    CONSTRAINT ck_cloudrouter_account_rate_card_interval CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_account_rate_card_uuid ON cloudrouter_account_rate_card (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_account_rate_card_scope_id ON cloudrouter_account_rate_card (tenant_id, organization_id, id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_account_rate_card_subject_id ON cloudrouter_account_rate_card (tenant_id, organization_id, subject_type, subject_id, pricing_plan_tenant_id, pricing_plan_organization_id, pricing_plan_id) WHERE subject_id IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_account_rate_card_subject_code ON cloudrouter_account_rate_card (tenant_id, organization_id, subject_type, subject_code, pricing_plan_tenant_id, pricing_plan_organization_id, pricing_plan_id) WHERE subject_code IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_cloudrouter_account_rate_card_scope_reference ON cloudrouter_account_rate_card (tenant_id, organization_id, id);
CREATE INDEX IF NOT EXISTS idx_cloudrouter_account_rate_card_resolve ON cloudrouter_account_rate_card (tenant_id, organization_id, subject_type, subject_id, status, priority, effective_from, id);
CREATE INDEX IF NOT EXISTS idx_cloudrouter_account_rate_card_code ON cloudrouter_account_rate_card (tenant_id, organization_id, subject_type, subject_code, status, priority, effective_from, id);

CREATE TABLE IF NOT EXISTS cloudrouter_usage_measurement (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT,
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    payload_hash VARCHAR(128),
    idempotency_key VARCHAR(128),
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    invocation_id VARCHAR(128) NOT NULL,
    measurement_key VARCHAR(160) NOT NULL,
    api_key_id BIGINT,
    account_id BIGINT,
    product_code VARCHAR(160) NOT NULL,
    operation_code VARCHAR(160) NOT NULL,
    meter_code VARCHAR(96) NOT NULL,
    vendor_code VARCHAR(64) NOT NULL,
    provider_code VARCHAR(64),
    region_code VARCHAR(64),
    catalog_key VARCHAR(256),
    quantity NUMERIC(38, 12) NOT NULL,
    unit_code VARCHAR(64) NOT NULL,
    measurement_source VARCHAR(32) NOT NULL,
    dimensions_json JSONB NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_cloudrouter_usage_measurement_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT ck_cloudrouter_usage_measurement_quantity CHECK (quantity >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_usage_measurement_scope_id ON cloudrouter_usage_measurement (tenant_id, organization_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_usage_measurement_idempotency ON cloudrouter_usage_measurement (tenant_id, organization_id, idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_usage_measurement_line ON cloudrouter_usage_measurement (tenant_id, organization_id, invocation_id, measurement_key);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cloudrouter_usage_measurement_scope_reference ON cloudrouter_usage_measurement (tenant_id, organization_id, id);
CREATE INDEX IF NOT EXISTS idx_cloudrouter_usage_measurement_rating ON cloudrouter_usage_measurement (tenant_id, organization_id, status, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_cloudrouter_usage_measurement_subject ON cloudrouter_usage_measurement (tenant_id, organization_id, user_id, occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_cloudrouter_usage_measurement_retention ON cloudrouter_usage_measurement (retention_until, id);

CREATE TABLE IF NOT EXISTS cloudrouter_pricing_rule (
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
    pricing_plan_id BIGINT NOT NULL,
    rule_code VARCHAR(96) NOT NULL,
    product_code VARCHAR(160),
    operation_code VARCHAR(160),
    meter_code VARCHAR(96),
    provider_code VARCHAR(64),
    region_code VARCHAR(64),
    catalog_key VARCHAR(256),
    formula_mode VARCHAR(32) NOT NULL,
    multiplier NUMERIC(38, 12) NOT NULL,
    markup_amount NUMERIC(38, 12) NOT NULL,
    unit_price_override NUMERIC(38, 12),
    conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    schedule JSONB,
    priority INTEGER NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_cloudrouter_pricing_rule_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT fk_cloudrouter_pricing_rule_plan FOREIGN KEY (tenant_id, organization_id, pricing_plan_id) REFERENCES cloudrouter_pricing_plan (tenant_id, organization_id, id),
    CONSTRAINT ck_cloudrouter_pricing_rule_amounts CHECK (multiplier >= 0 AND markup_amount >= 0 AND (unit_price_override IS NULL OR unit_price_override >= 0)),
    CONSTRAINT ck_cloudrouter_pricing_rule_formula CHECK ((formula_mode = 'multiplier_markup' AND unit_price_override IS NULL) OR (formula_mode = 'unit_price_override' AND unit_price_override IS NOT NULL AND multiplier = 1 AND markup_amount = 0)),
    CONSTRAINT ck_cloudrouter_pricing_rule_conditions_json CHECK (jsonb_typeof(conditions) = 'array'),
    CONSTRAINT ck_cloudrouter_pricing_rule_schedule_json CHECK (schedule IS NULL OR jsonb_typeof(schedule) = 'object'),
    CONSTRAINT ck_cloudrouter_pricing_rule_interval CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_pricing_rule_uuid ON cloudrouter_pricing_rule (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_pricing_rule_scope_id ON cloudrouter_pricing_rule (tenant_id, organization_id, id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_pricing_rule_plan_id ON cloudrouter_pricing_rule (id, pricing_plan_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_pricing_rule_code ON cloudrouter_pricing_rule (tenant_id, organization_id, pricing_plan_id, rule_code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_cloudrouter_pricing_rule_plan_reference ON cloudrouter_pricing_rule (id, pricing_plan_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cloudrouter_pricing_rule_scope_plan_reference ON cloudrouter_pricing_rule (tenant_id, organization_id, id, pricing_plan_id);
CREATE INDEX IF NOT EXISTS idx_cloudrouter_pricing_rule_resolve ON cloudrouter_pricing_rule (tenant_id, organization_id, pricing_plan_id, product_code, operation_code, meter_code, provider_code, region_code, status, priority, id);

CREATE TABLE IF NOT EXISTS cloudrouter_rating_decision (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT,
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    payload_hash VARCHAR(128),
    idempotency_key VARCHAR(128),
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    invocation_id VARCHAR(128) NOT NULL,
    measurement_id BIGINT NOT NULL,
    decision_status VARCHAR(32) NOT NULL,
    billability VARCHAR(32) NOT NULL,
    reason_code VARCHAR(96) NOT NULL,
    strategy_code VARCHAR(32),
    calculation_mode VARCHAR(32),
    charge_timing VARCHAR(32),
    quantity_aggregation VARCHAR(32),
    price_book_tenant_id BIGINT,
    price_book_organization_id BIGINT,
    price_book_id BIGINT,
    rate_id BIGINT,
    account_rate_card_tenant_id BIGINT,
    account_rate_card_organization_id BIGINT,
    account_rate_card_id BIGINT,
    pricing_plan_tenant_id BIGINT,
    pricing_plan_organization_id BIGINT,
    pricing_plan_id BIGINT,
    pricing_rule_id BIGINT,
    measured_quantity NUMERIC(38, 12) NOT NULL,
    rated_quantity NUMERIC(38, 12) NOT NULL,
    unit_size NUMERIC(38, 12),
    reference_unit_price NUMERIC(38, 12),
    cost_unit_price NUMERIC(38, 12),
    unit_price NUMERIC(38, 12),
    reference_amount NUMERIC(38, 12),
    cost_amount NUMERIC(38, 12),
    amount NUMERIC(38, 12),
    currency_code VARCHAR(10),
    billing_components JSONB NOT NULL,
    pricing_snapshot JSONB NOT NULL,
    decided_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_cloudrouter_rating_decision_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT fk_cloudrouter_rating_decision_measurement FOREIGN KEY (tenant_id, organization_id, measurement_id) REFERENCES cloudrouter_usage_measurement (tenant_id, organization_id, id),
    CONSTRAINT fk_cloudrouter_rating_decision_book FOREIGN KEY (price_book_tenant_id, price_book_organization_id, price_book_id) REFERENCES pricing_price_book (tenant_id, organization_id, id),
    CONSTRAINT fk_cloudrouter_rating_decision_rate FOREIGN KEY (price_book_tenant_id, price_book_organization_id, rate_id, price_book_id) REFERENCES pricing_rate (tenant_id, organization_id, id, price_book_id),
    CONSTRAINT fk_cloudrouter_rating_decision_rate_card FOREIGN KEY (account_rate_card_tenant_id, account_rate_card_organization_id, account_rate_card_id) REFERENCES cloudrouter_account_rate_card (tenant_id, organization_id, id),
    CONSTRAINT fk_cloudrouter_rating_decision_plan FOREIGN KEY (pricing_plan_tenant_id, pricing_plan_organization_id, pricing_plan_id) REFERENCES cloudrouter_pricing_plan (tenant_id, organization_id, id),
    CONSTRAINT fk_cloudrouter_rating_decision_rule FOREIGN KEY (pricing_plan_tenant_id, pricing_plan_organization_id, pricing_rule_id, pricing_plan_id) REFERENCES cloudrouter_pricing_rule (tenant_id, organization_id, id, pricing_plan_id),
    CONSTRAINT ck_cloudrouter_rating_decision_quantity CHECK (measured_quantity >= 0 AND rated_quantity >= 0),
    CONSTRAINT ck_cloudrouter_rating_decision_status CHECK (decision_status IN ('rated', 'non_chargeable', 'unrated')),
    CONSTRAINT ck_cloudrouter_rating_decision_billability CHECK (billability IN ('chargeable', 'free', 'not_applicable', 'unknown')),
    CONSTRAINT ck_cloudrouter_rating_decision_strategy CHECK (strategy_code IS NULL OR strategy_code IN ('flat_fee', 'token_usage', 'api_call', 'image_quantity', 'duration', 'unit_quantity', 'graduated_tier', 'volume_tier', 'formula')),
    CONSTRAINT ck_cloudrouter_rating_decision_calculation_mode CHECK (calculation_mode IS NULL OR calculation_mode IN ('per_unit', 'flat', 'graduated', 'volume', 'formula')),
    CONSTRAINT ck_cloudrouter_rating_decision_rate_identity CHECK ((price_book_tenant_id IS NULL AND price_book_organization_id IS NULL AND price_book_id IS NULL AND rate_id IS NULL) OR (price_book_tenant_id IS NOT NULL AND price_book_organization_id IS NOT NULL AND price_book_id IS NOT NULL AND rate_id IS NOT NULL)),
    CONSTRAINT ck_cloudrouter_rating_decision_rate_card_identity CHECK ((account_rate_card_tenant_id IS NULL AND account_rate_card_organization_id IS NULL AND account_rate_card_id IS NULL) OR (account_rate_card_tenant_id IS NOT NULL AND account_rate_card_organization_id IS NOT NULL AND account_rate_card_id IS NOT NULL)),
    CONSTRAINT ck_cloudrouter_rating_decision_plan_identity CHECK ((pricing_plan_tenant_id IS NULL AND pricing_plan_organization_id IS NULL AND pricing_plan_id IS NULL AND pricing_rule_id IS NULL) OR (pricing_plan_tenant_id IS NOT NULL AND pricing_plan_organization_id IS NOT NULL AND pricing_plan_id IS NOT NULL AND pricing_rule_id IS NOT NULL)),
    CONSTRAINT ck_cloudrouter_rating_decision_amount CHECK ((decision_status = 'rated' AND billability = 'chargeable' AND reference_unit_price IS NOT NULL AND reference_unit_price >= 0 AND (cost_unit_price IS NULL OR cost_unit_price >= 0) AND unit_price IS NOT NULL AND unit_price >= 0 AND reference_amount IS NOT NULL AND reference_amount >= 0 AND (cost_amount IS NULL OR cost_amount >= 0) AND amount IS NOT NULL AND amount >= 0 AND currency_code IS NOT NULL AND unit_size > 0 AND strategy_code IS NOT NULL AND calculation_mode IS NOT NULL AND price_book_id IS NOT NULL AND rate_id IS NOT NULL AND account_rate_card_id IS NOT NULL AND pricing_plan_id IS NOT NULL AND pricing_rule_id IS NOT NULL) OR (decision_status = 'non_chargeable' AND billability IN ('free', 'not_applicable') AND reference_amount IS NULL AND cost_amount IS NULL AND amount IS NULL AND currency_code IS NULL AND price_book_id IS NOT NULL AND rate_id IS NOT NULL) OR (decision_status = 'unrated' AND billability IN ('chargeable', 'unknown') AND reference_amount IS NULL AND cost_amount IS NULL AND amount IS NULL AND currency_code IS NULL)),
    CONSTRAINT ck_cloudrouter_rating_decision_currency CHECK (currency_code IS NULL OR currency_code ~ '^[A-Z]{3}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_rating_decision_scope_id ON cloudrouter_rating_decision (tenant_id, organization_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_rating_decision_idempotency ON cloudrouter_rating_decision (tenant_id, organization_id, idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_rating_decision_measurement ON cloudrouter_rating_decision (tenant_id, organization_id, measurement_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cloudrouter_rating_decision_scope_reference ON cloudrouter_rating_decision (tenant_id, organization_id, id);
CREATE INDEX IF NOT EXISTS idx_cloudrouter_rating_decision_invocation ON cloudrouter_rating_decision (tenant_id, organization_id, invocation_id, decision_status, decided_at, id);
CREATE INDEX IF NOT EXISTS idx_cloudrouter_rating_decision_retention ON cloudrouter_rating_decision (retention_until, id);

CREATE TABLE IF NOT EXISTS cloudrouter_charge_line (
    id BIGINT NOT NULL PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL,
    tenant_id BIGINT NOT NULL DEFAULT 0,
    organization_id BIGINT NOT NULL DEFAULT 0,
    user_id BIGINT,
    request_id VARCHAR(128),
    trace_id VARCHAR(128),
    payload_hash VARCHAR(128),
    idempotency_key VARCHAR(128),
    status INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retention_until TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    invocation_id VARCHAR(128) NOT NULL,
    rating_decision_id BIGINT NOT NULL,
    account_id BIGINT,
    charge_status VARCHAR(32) NOT NULL,
    product_code VARCHAR(160) NOT NULL,
    operation_code VARCHAR(160) NOT NULL,
    meter_code VARCHAR(96) NOT NULL,
    quantity NUMERIC(38, 12) NOT NULL,
    reference_amount NUMERIC(38, 12) NOT NULL,
    cost_amount NUMERIC(38, 12) NOT NULL,
    amount NUMERIC(38, 12) NOT NULL,
    currency_code VARCHAR(10) NOT NULL,
    charged_at TIMESTAMPTZ NOT NULL,
    settlement_id BIGINT,
    settled_at TIMESTAMPTZ,
    CONSTRAINT ck_cloudrouter_charge_line_tenant_scope CHECK (tenant_id > 0 AND organization_id >= 0),
    CONSTRAINT fk_cloudrouter_charge_line_decision FOREIGN KEY (tenant_id, organization_id, rating_decision_id) REFERENCES cloudrouter_rating_decision (tenant_id, organization_id, id),
    CONSTRAINT ck_cloudrouter_charge_line_amount CHECK (quantity > 0 AND reference_amount >= 0 AND cost_amount >= 0 AND amount > 0),
    CONSTRAINT ck_cloudrouter_charge_line_status CHECK (charge_status IN ('rated', 'pending', 'settled', 'reversed', 'failed')),
    CONSTRAINT ck_cloudrouter_charge_line_currency CHECK (currency_code ~ '^[A-Z]{3}$'),
    CONSTRAINT ck_cloudrouter_charge_line_settlement CHECK ((settlement_id IS NULL AND settled_at IS NULL) OR (settlement_id IS NOT NULL AND settled_at IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_charge_line_scope_id ON cloudrouter_charge_line (tenant_id, organization_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_charge_line_idempotency ON cloudrouter_charge_line (tenant_id, organization_id, idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_charge_line_decision ON cloudrouter_charge_line (tenant_id, organization_id, rating_decision_id);
CREATE INDEX IF NOT EXISTS idx_cloudrouter_charge_line_dashboard ON cloudrouter_charge_line (tenant_id, organization_id, user_id, charge_status, charged_at, invocation_id, id);
CREATE INDEX IF NOT EXISTS idx_cloudrouter_charge_line_settlement ON cloudrouter_charge_line (tenant_id, organization_id, charge_status, settled_at, id);
CREATE INDEX IF NOT EXISTS idx_cloudrouter_charge_line_retention ON cloudrouter_charge_line (retention_until, id);
