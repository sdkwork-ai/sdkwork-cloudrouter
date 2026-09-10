-- =============================================================================
-- payment-runtime baseline (PostgreSQL)
--
-- Payment intent/refund runtime tables written by the Cloud Router
-- `sdkwork-cloudrouter-router-service` payment runtime stores
-- (`infrastructure/sql/postgres/payment_intent_runtime_store.rs`).
--
-- Ownership model (matches the payment-reconciliation module precedent):
-- - `commerce_payment_intent`, `commerce_payment_attempt`, `commerce_refund`,
--   `commerce_refund_item`, and `commerce_refund_event` are shared payment
--   facts. The federated sdkwork-payment baseline declares a different
--   (operator-facing) column shape and status vocabulary, and no deployed
--   authority previously materialized the runtime shape at all. This module
--   is the materialization authority for the runtime shape: fresh
--   environments get the runtime tables directly, and self-healing ALTERs
--   plus explicit constraint drops make a payment-baseline-shaped table
--   writable by the runtime.
-- - `commerce_payment_route_decision`, `commerce_payment_operation_attempt`,
--   and `commerce_refund_attempt` are Cloud Router-owned runtime tables with
--   no DDL anywhere else in the workspace.
--
-- Idempotency arbiters: the runtime deduplicates intents/refunds on
-- (tenant_id, idempotency_key); those unique partial indexes are created
-- unconditionally so `INSERT ... ON CONFLICT` works on every table origin.
-- =============================================================================

CREATE TABLE IF NOT EXISTS commerce_payment_intent (
    id                   TEXT PRIMARY KEY,
    tenant_id            TEXT NOT NULL,
    organization_id      TEXT,
    owner_user_id        TEXT NOT NULL,
    order_id             TEXT NOT NULL,
    merchant_order_no    TEXT NOT NULL DEFAULT '',
    subject              TEXT NOT NULL DEFAULT '',
    provider             TEXT NOT NULL DEFAULT '',
    supplier_code        TEXT NOT NULL DEFAULT '',
    payment_method       TEXT NOT NULL DEFAULT '',
    scene_code           TEXT NOT NULL DEFAULT 'web',
    amount               TEXT NOT NULL,
    currency_code        TEXT NOT NULL DEFAULT 'CNY',
    status               TEXT NOT NULL DEFAULT 'requires_confirmation'
                         CONSTRAINT commerce_payment_intent_cloudrouter_status_check
                         CHECK (status IN ('requires_confirmation', 'requires_action', 'processing', 'succeeded', 'failed', 'canceled')),
    request_no           TEXT NOT NULL DEFAULT '',
    idempotency_key      TEXT NOT NULL,
    metadata_json        TEXT NOT NULL DEFAULT '{}',
    provider_native_json TEXT,
    next_action_json     TEXT,
    captured_amount      TEXT NOT NULL DEFAULT '0.00',
    refunded_amount      TEXT NOT NULL DEFAULT '0.00',
    version              BIGINT NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at           TIMESTAMPTZ NULL
);

-- Self-heal: make a pre-existing (federated baseline shaped) table writable
-- by the runtime store.
ALTER TABLE commerce_payment_intent ADD COLUMN IF NOT EXISTS merchant_order_no TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_payment_intent ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_payment_intent ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_payment_intent ADD COLUMN IF NOT EXISTS supplier_code TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_payment_intent ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_payment_intent ADD COLUMN IF NOT EXISTS scene_code TEXT NOT NULL DEFAULT 'web';
ALTER TABLE commerce_payment_intent ADD COLUMN IF NOT EXISTS amount TEXT NOT NULL DEFAULT '0.00';
ALTER TABLE commerce_payment_intent ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'CNY';
ALTER TABLE commerce_payment_intent ADD COLUMN IF NOT EXISTS request_no TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_payment_intent ADD COLUMN IF NOT EXISTS metadata_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE commerce_payment_intent ADD COLUMN IF NOT EXISTS provider_native_json TEXT;
ALTER TABLE commerce_payment_intent ADD COLUMN IF NOT EXISTS next_action_json TEXT;
ALTER TABLE commerce_payment_intent ADD COLUMN IF NOT EXISTS captured_amount TEXT NOT NULL DEFAULT '0.00';
ALTER TABLE commerce_payment_intent ADD COLUMN IF NOT EXISTS refunded_amount TEXT NOT NULL DEFAULT '0.00';
ALTER TABLE commerce_payment_intent ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE commerce_payment_intent ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
-- The runtime binds organization_id as optional; a NOT NULL constraint from
-- another baseline would reject runtime inserts.
ALTER TABLE commerce_payment_intent ALTER COLUMN organization_id DROP NOT NULL;
-- The federated baseline status CHECK does not accept runtime status values
-- (requires_confirmation/requires_action); drop it by its auto-assigned name.
-- The runtime-shaped table declares its own named CHECK above.
ALTER TABLE commerce_payment_intent DROP CONSTRAINT IF EXISTS commerce_payment_intent_status_check;

CREATE UNIQUE INDEX IF NOT EXISTS ux_commerce_payment_intent_tenant_idempotency
    ON commerce_payment_intent (tenant_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_commerce_payment_intent_owner
    ON commerce_payment_intent (tenant_id, owner_user_id, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_commerce_payment_intent_status
    ON commerce_payment_intent (tenant_id, status, created_at);

CREATE TABLE IF NOT EXISTS commerce_payment_attempt (
    id                  TEXT PRIMARY KEY,
    tenant_id           TEXT NOT NULL,
    organization_id     TEXT,
    owner_user_id       TEXT NOT NULL,
    payment_intent_id   TEXT NOT NULL,
    order_id            TEXT NOT NULL,
    provider            TEXT NOT NULL DEFAULT '',
    out_trade_no        TEXT NOT NULL DEFAULT '',
    amount              TEXT NOT NULL,
    currency_code       TEXT NOT NULL DEFAULT 'CNY',
    status              TEXT NOT NULL DEFAULT 'requires_confirmation',
    callback_payload    TEXT NOT NULL DEFAULT '{}',
    paid_at             TIMESTAMPTZ NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE commerce_payment_attempt ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_payment_attempt ADD COLUMN IF NOT EXISTS out_trade_no TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_payment_attempt ADD COLUMN IF NOT EXISTS amount TEXT NOT NULL DEFAULT '0.00';
ALTER TABLE commerce_payment_attempt ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'CNY';
ALTER TABLE commerce_payment_attempt ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'requires_confirmation';
ALTER TABLE commerce_payment_attempt ADD COLUMN IF NOT EXISTS callback_payload TEXT NOT NULL DEFAULT '{}';
ALTER TABLE commerce_payment_attempt ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_commerce_payment_attempt_intent
    ON commerce_payment_attempt (tenant_id, payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_commerce_payment_attempt_out_trade_no
    ON commerce_payment_attempt (tenant_id, out_trade_no);

CREATE TABLE IF NOT EXISTS commerce_payment_route_decision (
    id                       TEXT PRIMARY KEY,
    tenant_id                TEXT NOT NULL,
    organization_id          TEXT,
    payment_intent_id        TEXT NOT NULL,
    payment_attempt_id       TEXT NOT NULL,
    route_rule_id            TEXT,
    account_id               TEXT NOT NULL DEFAULT '',
    supplier_code            TEXT NOT NULL DEFAULT '',
    provider_account_id      TEXT,
    method_code              TEXT NOT NULL DEFAULT '',
    scene_code               TEXT NOT NULL DEFAULT '',
    country_code             TEXT,
    currency_code            TEXT NOT NULL DEFAULT 'CNY',
    amount                   TEXT NOT NULL DEFAULT '0.00',
    risk_level               TEXT,
    decision_reason          TEXT NOT NULL DEFAULT '',
    fallback_from_account_id TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE commerce_payment_route_decision ADD COLUMN IF NOT EXISTS route_rule_id TEXT;
ALTER TABLE commerce_payment_route_decision ADD COLUMN IF NOT EXISTS account_id TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_payment_route_decision ADD COLUMN IF NOT EXISTS supplier_code TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_payment_route_decision ADD COLUMN IF NOT EXISTS provider_account_id TEXT;
ALTER TABLE commerce_payment_route_decision ADD COLUMN IF NOT EXISTS method_code TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_payment_route_decision ADD COLUMN IF NOT EXISTS scene_code TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_payment_route_decision ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE commerce_payment_route_decision ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'CNY';
ALTER TABLE commerce_payment_route_decision ADD COLUMN IF NOT EXISTS amount TEXT NOT NULL DEFAULT '0.00';
ALTER TABLE commerce_payment_route_decision ADD COLUMN IF NOT EXISTS risk_level TEXT;
ALTER TABLE commerce_payment_route_decision ADD COLUMN IF NOT EXISTS decision_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_payment_route_decision ADD COLUMN IF NOT EXISTS fallback_from_account_id TEXT;

CREATE INDEX IF NOT EXISTS idx_commerce_payment_route_decision_intent
    ON commerce_payment_route_decision (tenant_id, payment_intent_id);

CREATE TABLE IF NOT EXISTS commerce_payment_operation_attempt (
    id                     TEXT PRIMARY KEY,
    tenant_id              TEXT NOT NULL,
    organization_id        TEXT,
    operation_no           TEXT NOT NULL,
    supplier_code          TEXT NOT NULL DEFAULT '',
    provider_account_id    TEXT,
    account_id             TEXT,
    operation_code         TEXT NOT NULL DEFAULT '',
    sdkwork_resource_type  TEXT NOT NULL DEFAULT '',
    sdkwork_resource_id    TEXT NOT NULL DEFAULT '',
    idempotency_key        TEXT NOT NULL,
    request_digest         TEXT,
    response_digest        TEXT,
    native_request_id      TEXT,
    native_trade_id        TEXT,
    native_refund_id       TEXT,
    http_status            INTEGER,
    provider_error_code    TEXT,
    provider_error_message TEXT,
    retryable              BOOLEAN NOT NULL DEFAULT FALSE,
    status                 TEXT NOT NULL DEFAULT 'PENDING',
    started_at             TIMESTAMPTZ NOT NULL,
    completed_at           TIMESTAMPTZ NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE commerce_payment_operation_attempt ADD COLUMN IF NOT EXISTS operation_no TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_payment_operation_attempt ADD COLUMN IF NOT EXISTS supplier_code TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_payment_operation_attempt ADD COLUMN IF NOT EXISTS provider_account_id TEXT;
ALTER TABLE commerce_payment_operation_attempt ADD COLUMN IF NOT EXISTS account_id TEXT;
ALTER TABLE commerce_payment_operation_attempt ADD COLUMN IF NOT EXISTS operation_code TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_payment_operation_attempt ADD COLUMN IF NOT EXISTS sdkwork_resource_type TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_payment_operation_attempt ADD COLUMN IF NOT EXISTS sdkwork_resource_id TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_payment_operation_attempt ADD COLUMN IF NOT EXISTS idempotency_key TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_payment_operation_attempt ADD COLUMN IF NOT EXISTS request_digest TEXT;
ALTER TABLE commerce_payment_operation_attempt ADD COLUMN IF NOT EXISTS response_digest TEXT;
ALTER TABLE commerce_payment_operation_attempt ADD COLUMN IF NOT EXISTS native_request_id TEXT;
ALTER TABLE commerce_payment_operation_attempt ADD COLUMN IF NOT EXISTS native_trade_id TEXT;
ALTER TABLE commerce_payment_operation_attempt ADD COLUMN IF NOT EXISTS native_refund_id TEXT;
ALTER TABLE commerce_payment_operation_attempt ADD COLUMN IF NOT EXISTS http_status INTEGER;
ALTER TABLE commerce_payment_operation_attempt ADD COLUMN IF NOT EXISTS provider_error_code TEXT;
ALTER TABLE commerce_payment_operation_attempt ADD COLUMN IF NOT EXISTS provider_error_message TEXT;
ALTER TABLE commerce_payment_operation_attempt ADD COLUMN IF NOT EXISTS retryable BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE commerce_payment_operation_attempt ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE commerce_payment_operation_attempt ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_commerce_payment_operation_attempt_no
    ON commerce_payment_operation_attempt (tenant_id, operation_no);

CREATE INDEX IF NOT EXISTS idx_commerce_payment_operation_attempt_resource
    ON commerce_payment_operation_attempt (tenant_id, sdkwork_resource_type, sdkwork_resource_id);

CREATE TABLE IF NOT EXISTS commerce_refund (
    id                 TEXT PRIMARY KEY,
    tenant_id          TEXT NOT NULL,
    organization_id    TEXT,
    payment_intent_id  TEXT NOT NULL DEFAULT '',
    payment_attempt_id TEXT NOT NULL DEFAULT '',
    refund_no          TEXT NOT NULL,
    amount             TEXT NOT NULL,
    currency_code      TEXT NOT NULL DEFAULT 'CNY',
    supplier_code      TEXT NOT NULL DEFAULT '',
    reason             TEXT,
    status             TEXT NOT NULL DEFAULT 'pending'
                       CONSTRAINT commerce_refund_cloudrouter_status_check
                       CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled')),
    request_no         TEXT,
    idempotency_key    TEXT NOT NULL,
    version            BIGINT NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at         TIMESTAMPTZ NULL
);

ALTER TABLE commerce_refund ADD COLUMN IF NOT EXISTS payment_intent_id TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_refund ADD COLUMN IF NOT EXISTS supplier_code TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_refund ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE commerce_refund ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE commerce_refund ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
ALTER TABLE commerce_refund ALTER COLUMN organization_id DROP NOT NULL;
-- The federated baseline status CHECK does not accept the runtime 'pending'
-- status; drop it by its auto-assigned name (runtime table declares its own
-- named CHECK above).
ALTER TABLE commerce_refund DROP CONSTRAINT IF EXISTS commerce_refund_status_check;

-- Runtime idempotency arbiter: `INSERT ... ON CONFLICT` in insert_refund.
CREATE UNIQUE INDEX IF NOT EXISTS ux_commerce_refund_tenant_idempotency
    ON commerce_refund (tenant_id, idempotency_key);

-- Refund cumulative-cap reservation guard: sums active refunds per intent.
CREATE INDEX IF NOT EXISTS idx_commerce_refund_intent_active
    ON commerce_refund (tenant_id, payment_intent_id, status);

CREATE INDEX IF NOT EXISTS idx_commerce_refund_claim
    ON commerce_refund (tenant_id, status, created_at);

CREATE TABLE IF NOT EXISTS commerce_refund_attempt (
    id                  TEXT PRIMARY KEY,
    tenant_id           TEXT NOT NULL,
    organization_id     TEXT,
    refund_attempt_no   TEXT NOT NULL,
    refund_id           TEXT NOT NULL,
    supplier_code       TEXT NOT NULL DEFAULT '',
    provider_account_id TEXT,
    out_refund_no       TEXT NOT NULL DEFAULT '',
    provider_refund_id  TEXT,
    amount              TEXT NOT NULL DEFAULT '0.00',
    currency_code       TEXT NOT NULL DEFAULT 'CNY',
    status              TEXT NOT NULL DEFAULT 'RECEIVED',
    failure_code        TEXT,
    failure_message     TEXT,
    submitted_at        TIMESTAMPTZ NULL,
    succeeded_at        TIMESTAMPTZ NULL,
    failed_at           TIMESTAMPTZ NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE commerce_refund_attempt ADD COLUMN IF NOT EXISTS refund_attempt_no TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_refund_attempt ADD COLUMN IF NOT EXISTS supplier_code TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_refund_attempt ADD COLUMN IF NOT EXISTS provider_account_id TEXT;
ALTER TABLE commerce_refund_attempt ADD COLUMN IF NOT EXISTS out_refund_no TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_refund_attempt ADD COLUMN IF NOT EXISTS provider_refund_id TEXT;
ALTER TABLE commerce_refund_attempt ADD COLUMN IF NOT EXISTS amount TEXT NOT NULL DEFAULT '0.00';
ALTER TABLE commerce_refund_attempt ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'CNY';
ALTER TABLE commerce_refund_attempt ADD COLUMN IF NOT EXISTS failure_code TEXT;
ALTER TABLE commerce_refund_attempt ADD COLUMN IF NOT EXISTS failure_message TEXT;
ALTER TABLE commerce_refund_attempt ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NULL;
ALTER TABLE commerce_refund_attempt ADD COLUMN IF NOT EXISTS succeeded_at TIMESTAMPTZ NULL;
ALTER TABLE commerce_refund_attempt ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ NULL;
ALTER TABLE commerce_refund_attempt ALTER COLUMN organization_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commerce_refund_attempt_refund
    ON commerce_refund_attempt (tenant_id, refund_id);

CREATE TABLE IF NOT EXISTS commerce_refund_item (
    id                     TEXT PRIMARY KEY,
    tenant_id              TEXT NOT NULL,
    organization_id        TEXT,
    refund_id              TEXT NOT NULL,
    order_item_id          TEXT NOT NULL DEFAULT '',
    quantity               INTEGER NOT NULL DEFAULT 0,
    refund_amount          TEXT NOT NULL DEFAULT '0.00',
    tax_refund_amount      TEXT NOT NULL DEFAULT '0.00',
    shipping_refund_amount TEXT NOT NULL DEFAULT '0.00',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE commerce_refund_item ADD COLUMN IF NOT EXISTS order_item_id TEXT NOT NULL DEFAULT '';
ALTER TABLE commerce_refund_item ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE commerce_refund_item ADD COLUMN IF NOT EXISTS refund_amount TEXT NOT NULL DEFAULT '0.00';
ALTER TABLE commerce_refund_item ADD COLUMN IF NOT EXISTS tax_refund_amount TEXT NOT NULL DEFAULT '0.00';
ALTER TABLE commerce_refund_item ADD COLUMN IF NOT EXISTS shipping_refund_amount TEXT NOT NULL DEFAULT '0.00';
ALTER TABLE commerce_refund_item ALTER COLUMN organization_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commerce_refund_item_refund
    ON commerce_refund_item (tenant_id, refund_id);

CREATE TABLE IF NOT EXISTS commerce_refund_event (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL,
    organization_id TEXT,
    refund_id       TEXT NOT NULL,
    event_type      TEXT NOT NULL,
    from_status     TEXT,
    to_status       TEXT NOT NULL,
    reason          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE commerce_refund_event ADD COLUMN IF NOT EXISTS from_status TEXT;
ALTER TABLE commerce_refund_event ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE commerce_refund_event ALTER COLUMN organization_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commerce_refund_event_refund
    ON commerce_refund_event (tenant_id, refund_id, created_at DESC);
