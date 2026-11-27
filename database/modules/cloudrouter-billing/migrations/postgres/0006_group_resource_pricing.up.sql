-- sdkwork:migration
-- id: 0006_group_resource_pricing
-- engine: postgres
-- module: cloudrouter-billing
-- purpose: Add per-resource price definitions scoped to an account group, and
--   record which layer priced a rating decision.
--
--   Cloud Router previously exposed exactly one customer-price knob per
--   account group (`ai_upstream_account_group.sale_multiplier`) applied to
--   every resource and meter. Operators cannot price one model, one image
--   meter, or one video tier independently, cannot express a group-level free
--   resource, and cannot schedule a limited-time group price. The
--   `cloudrouter_group_resource_price` table adds that missing layer:
--   one row prices one (group, resource, operation, meter, region, provider)
--   tuple with a closed set of price modes and an effective interval.
--
--   `price_mode` is closed and each mode owns exactly one payload, so a row
--   can never mix a multiplier with an override and silently change what
--   billing applies. The per-resource row REPLACES the group multiplier for
--   the tuples it covers instead of stacking on top of it, so an operator
--   reading the admin table can predict the charged price without composing
--   two multipliers.
--
--   `cloudrouter_rating_decision.pricing_layer` records which layer produced
--   the customer amount (`plan_reference`, `plan_rule`, `group_resource`,
--   `group_multiplier`) so every charged amount stays auditable across layers.
--
--   The rate-card identity on a rated decision becomes optional: a plan can be
--   reached through the account group binding without a subject-scoped rate
--   card, and that path previously made every chargeable resolution unrated.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s
-- contract_version: 0.6.0

CREATE TABLE IF NOT EXISTS cloudrouter_group_resource_price (
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
    account_group_id BIGINT NOT NULL,
    account_group_code_snapshot VARCHAR(64) NOT NULL,
    resource_type VARCHAR(32) NOT NULL,
    catalog_key VARCHAR(256) NOT NULL,
    operation_code VARCHAR(160) NOT NULL,
    meter_code VARCHAR(96) NOT NULL,
    region_code VARCHAR(64) NOT NULL,
    provider_code VARCHAR(64) NOT NULL DEFAULT '',
    price_mode VARCHAR(24) NOT NULL,
    multiplier NUMERIC(38, 12) NOT NULL DEFAULT 1,
    markup_amount NUMERIC(38, 12) NOT NULL DEFAULT 0,
    unit_price_override NUMERIC(38, 12),
    currency_code VARCHAR(10) NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_cloudrouter_group_resource_price_tenant_scope
        CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    CONSTRAINT ck_cloudrouter_group_resource_price_resource_type
        CHECK (resource_type IN ('model', 'image', 'video', 'api', 'audio', 'other')),
    CONSTRAINT ck_cloudrouter_group_resource_price_mode
        CHECK (price_mode IN ('multiplier', 'markup', 'unit_price', 'free')),
    CONSTRAINT ck_cloudrouter_group_resource_price_payload
        CHECK (
            (price_mode = 'multiplier' AND multiplier > 0 AND markup_amount = 0 AND unit_price_override IS NULL)
            OR (price_mode = 'markup' AND multiplier = 1 AND markup_amount >= 0 AND unit_price_override IS NULL)
            OR (price_mode = 'unit_price' AND multiplier = 1 AND markup_amount = 0 AND unit_price_override > 0)
            OR (price_mode = 'free' AND multiplier = 1 AND markup_amount = 0 AND unit_price_override = 0)
        ),
    CONSTRAINT ck_cloudrouter_group_resource_price_interval
        CHECK (effective_to IS NULL OR effective_to > effective_from),
    CONSTRAINT ck_cloudrouter_group_resource_price_currency
        CHECK (currency_code ~ '^[A-Z]{3}$'),
    CONSTRAINT ck_cloudrouter_group_resource_price_target
        CHECK (
            BTRIM(catalog_key) <> ''
            AND BTRIM(operation_code) <> ''
            AND BTRIM(meter_code) <> ''
            AND BTRIM(region_code) <> ''
            AND BTRIM(account_group_code_snapshot) <> ''
        ),
    CONSTRAINT fk_cloudrouter_group_resource_price_group
        FOREIGN KEY (tenant_id, organization_id, account_group_id)
        REFERENCES ai_upstream_account_group (tenant_id, organization_id, id)
        ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_group_resource_price_uuid
    ON cloudrouter_group_resource_price (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_group_resource_price_scope_id
    ON cloudrouter_group_resource_price (tenant_id, organization_id, id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_group_resource_price_target
    ON cloudrouter_group_resource_price (
        tenant_id, organization_id, account_group_id,
        catalog_key, operation_code, meter_code, region_code, provider_code
    ) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cloudrouter_group_resource_price_resolve
    ON cloudrouter_group_resource_price (
        tenant_id, organization_id, account_group_id, resource_type,
        catalog_key, meter_code, status, effective_from, id
    );

-- Which layer finally priced the customer amount. New decision rows always
-- carry a value once the writer is deployed; existing history keeps NULL
-- because the layer it used was never recorded.
ALTER TABLE cloudrouter_rating_decision
    ADD COLUMN IF NOT EXISTS pricing_layer VARCHAR(32);

ALTER TABLE cloudrouter_rating_decision
    DROP CONSTRAINT IF EXISTS ck_cloudrouter_rating_decision_layer;
ALTER TABLE cloudrouter_rating_decision
    ADD CONSTRAINT ck_cloudrouter_rating_decision_layer
    CHECK (
        pricing_layer IS NULL
        OR pricing_layer IN ('plan_reference', 'plan_rule', 'group_resource', 'group_multiplier')
    );

-- A rate card is no longer required for a rated decision. A plan reached
-- through the account-group binding has no subject-scoped card, and rejecting
-- that shape (as the previous constraint did) turned every such chargeable
-- resolution into an unrated decision. The card identity stays all-or-nothing
-- when it is present.
ALTER TABLE cloudrouter_rating_decision
    DROP CONSTRAINT IF EXISTS ck_cloudrouter_rating_decision_amount;
ALTER TABLE cloudrouter_rating_decision
    ADD CONSTRAINT ck_cloudrouter_rating_decision_amount
    CHECK (
        (
            decision_status = 'rated'
            AND billability = 'chargeable'
            AND reference_unit_price IS NOT NULL AND reference_unit_price >= 0
            AND (cost_unit_price IS NULL OR cost_unit_price >= 0)
            AND unit_price IS NOT NULL AND unit_price >= 0
            AND reference_amount IS NOT NULL AND reference_amount >= 0
            AND (cost_amount IS NULL OR cost_amount >= 0)
            AND amount IS NOT NULL AND amount >= 0
            AND currency_code IS NOT NULL
            AND unit_size > 0
            AND strategy_code IS NOT NULL
            AND calculation_mode IS NOT NULL
            AND price_book_id IS NOT NULL
            AND rate_id IS NOT NULL
            AND pricing_plan_id IS NOT NULL
            AND pricing_rule_id IS NOT NULL
        )
        OR (
            decision_status = 'non_chargeable'
            AND billability IN ('free', 'not_applicable')
            AND reference_amount IS NULL
            AND cost_amount IS NULL
            AND amount IS NULL
            AND currency_code IS NULL
            AND price_book_id IS NOT NULL
            AND rate_id IS NOT NULL
        )
        OR (
            decision_status = 'unrated'
            AND billability IN ('chargeable', 'unknown')
            AND reference_amount IS NULL
            AND cost_amount IS NULL
            AND amount IS NULL
            AND currency_code IS NULL
        )
    );
