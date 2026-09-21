-- =============================================================================
-- payment-control-plane baseline (PostgreSQL)
--
-- Cloud Router-owned payment routing and settlement bookkeeping. These tables
-- record how Cloud Router routed a payment, which upstream operation it issued,
-- and which refund legs it attempted.
--
-- Ownership boundary: the merchant-facing commerce payment facts
-- (`commerce_payment_intent`, `commerce_payment_attempt`, `commerce_refund`,
-- `commerce_refund_event`) are owned by the federated `sdkwork-payment` module,
-- which the installer bootstraps before this application's own modules. They are
-- deliberately absent here.
--
-- Column types follow the `commerce_*` family convention established by
-- `sdkwork-payment`: `TEXT` identifiers and `TEXT` decimal money (not
-- BIGINT/VARCHAR/NUMERIC, which is the `ai_*` family convention). The sibling
-- `payment-reconciliation` module is authored the same way.
--
-- This module replaces the retired `payment-runtime` module, whose baseline also
-- carried duplicate definitions of the four `sdkwork-payment` tables. Because
-- those were declared with `CREATE TABLE IF NOT EXISTS` and the federated module
-- ran first, every one of them silently no-opped while the migration ledger
-- recorded the module as applied.
-- =============================================================================

CREATE TABLE IF NOT EXISTS commerce_payment_route_decision (
    id                       TEXT PRIMARY KEY,
    tenant_id                TEXT NOT NULL,
    organization_id          TEXT NOT NULL DEFAULT '0',
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

CREATE TABLE IF NOT EXISTS commerce_payment_operation_attempt (
    id                     TEXT PRIMARY KEY,
    tenant_id              TEXT NOT NULL,
    organization_id        TEXT NOT NULL DEFAULT '0',
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

CREATE TABLE IF NOT EXISTS commerce_refund_attempt (
    id                  TEXT PRIMARY KEY,
    tenant_id           TEXT NOT NULL,
    organization_id     TEXT NOT NULL DEFAULT '0',
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

CREATE TABLE IF NOT EXISTS commerce_refund_item (
    id                     TEXT PRIMARY KEY,
    tenant_id              TEXT NOT NULL,
    organization_id        TEXT NOT NULL DEFAULT '0',
    refund_id              TEXT NOT NULL,
    order_item_id          TEXT NOT NULL DEFAULT '',
    quantity               INTEGER NOT NULL DEFAULT 0,
    refund_amount          TEXT NOT NULL DEFAULT '0.00',
    tax_refund_amount      TEXT NOT NULL DEFAULT '0.00',
    shipping_refund_amount TEXT NOT NULL DEFAULT '0.00',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commerce_payment_reconciliation_run (
    id                      TEXT PRIMARY KEY,
    tenant_id               TEXT NOT NULL,
    organization_id         TEXT NOT NULL DEFAULT '0',
    run_no                  TEXT NOT NULL,
    provider_code           TEXT,
    provider_account_id     TEXT,
    reconciliation_type     TEXT NOT NULL DEFAULT 'daily'
                            CHECK (reconciliation_type IN ('daily', 'weekly', 'monthly', 'manual', 'settlement')),
    period_start            TIMESTAMPTZ NOT NULL,
    period_end              TIMESTAMPTZ NOT NULL,
    status                  TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'queued', 'running', 'succeeded', 'failed', 'canceled')),
    matched_count           INTEGER NOT NULL DEFAULT 0,
    mismatched_count        INTEGER NOT NULL DEFAULT 0,
    unmatched_count         INTEGER NOT NULL DEFAULT 0,
    total_difference_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    currency_code           TEXT NOT NULL DEFAULT 'CNY',
    request_no              TEXT,
    idempotency_key         TEXT NOT NULL,
    version                 BIGINT NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ NULL
);

-- The reconciliation worker shares this run table with `payment-reconciliation`,
-- which owns the statement/result tables. These additive guards keep the worker
-- runnable against a baseline that predates those columns; all are no-ops here.
ALTER TABLE commerce_payment_reconciliation_run ADD COLUMN IF NOT EXISTS reconciliation_type TEXT NOT NULL DEFAULT 'daily';
ALTER TABLE commerce_payment_reconciliation_run ADD COLUMN IF NOT EXISTS unmatched_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE commerce_payment_reconciliation_run ADD COLUMN IF NOT EXISTS total_difference_amount NUMERIC(18,2) NOT NULL DEFAULT 0;
ALTER TABLE commerce_payment_reconciliation_run ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'CNY';
ALTER TABLE commerce_payment_reconciliation_run ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE commerce_payment_reconciliation_run ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_commerce_payment_reconciliation_run_no
    ON commerce_payment_reconciliation_run (tenant_id, run_no)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_commerce_payment_reconciliation_run_claim
    ON commerce_payment_reconciliation_run (tenant_id, status, created_at)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_commerce_payment_route_decision_intent
    ON commerce_payment_route_decision (tenant_id, payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_commerce_payment_operation_attempt_no
    ON commerce_payment_operation_attempt (tenant_id, operation_no);
CREATE INDEX IF NOT EXISTS idx_commerce_payment_operation_attempt_resource
    ON commerce_payment_operation_attempt (tenant_id, sdkwork_resource_type, sdkwork_resource_id);
CREATE INDEX IF NOT EXISTS idx_commerce_refund_attempt_refund
    ON commerce_refund_attempt (tenant_id, refund_id);
CREATE INDEX IF NOT EXISTS idx_commerce_refund_item_refund
    ON commerce_refund_item (tenant_id, refund_id);
