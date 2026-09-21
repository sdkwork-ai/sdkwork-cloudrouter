-- sdkwork:migration
-- id: 0043_payment_reconciliation_tables
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Provision the payment reconciliation tables the Cloud Router
--   reconciliation store and worker write to.
--
--   Three tables had no DDL anywhere in the workspace while
--   `PostgresPaymentReconciliationStore` referenced all of them:
--
--     * `commerce_payment_statement`             -- provider settlement header
--     * `commerce_payment_statement_item`        -- provider settlement line
--     * `commerce_payment_reconciliation_item`   -- difference/result row
--
--   They are owned by the declared federated module `payment-reconciliation`
--   (`commerce_payment_` prefix family, declared in
--   `database/modules/payment-reconciliation/contract/table-registry.json`).
--   `sdkwork-payment` supplies no definitions for them, so Cloud Router is the
--   system of record. The federated `payment-control-plane` module supplies
--   `commerce_payment_reconciliation_run`; this migration only re-asserts the
--   columns the worker reads so the worker also runs against an older run table.
--
--   All statements are `IF NOT EXISTS`, so replaying against a database that
--   already carries the federated baseline is a no-op and cannot overwrite a
--   sibling repository's objects.
--
--   Column types follow the `commerce_*` family convention established by
--   `sdkwork-payment`: TEXT identifiers and TEXT decimal money (not
--   BIGINT/VARCHAR/NUMERIC, which is the `ai_*` family convention).
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

CREATE TABLE IF NOT EXISTS commerce_payment_statement (
    id                      TEXT PRIMARY KEY,
    tenant_id               TEXT NOT NULL,
    organization_id         TEXT NOT NULL DEFAULT '0',
    statement_no            TEXT NOT NULL,
    supplier_code           TEXT NOT NULL,
    provider_account_id     TEXT,
    statement_type          TEXT NOT NULL,
    settlement_currency     TEXT NOT NULL,
    period_start            TIMESTAMPTZ NOT NULL,
    period_end              TIMESTAMPTZ NOT NULL,
    provider_statement_id   TEXT,
    file_ref                TEXT,
    file_digest             TEXT NOT NULL DEFAULT '',
    download_status         TEXT NOT NULL DEFAULT 'pending',
    parse_status            TEXT NOT NULL DEFAULT 'pending',
    row_count               BIGINT NOT NULL DEFAULT 0,
    total_amount            TEXT NOT NULL DEFAULT '0.00',
    fee_amount              TEXT NOT NULL DEFAULT '0.00',
    net_amount              TEXT NOT NULL DEFAULT '0.00',
    downloaded_at           TIMESTAMPTZ,
    parsed_at               TIMESTAMPTZ,
    request_no              TEXT NOT NULL,
    idempotency_key         TEXT NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ,
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_commerce_payment_statement_idempotency
    ON commerce_payment_statement (tenant_id, idempotency_key)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_commerce_payment_statement_run_match
    ON commerce_payment_statement (tenant_id, supplier_code, period_start, period_end)
    WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS commerce_payment_statement_item (
    id                      TEXT PRIMARY KEY,
    tenant_id               TEXT NOT NULL,
    organization_id         TEXT NOT NULL DEFAULT '0',
    statement_id            TEXT NOT NULL,
    supplier_code           TEXT NOT NULL,
    provider_account_id     TEXT,
    row_no                  TEXT NOT NULL,
    native_trade_id         TEXT,
    native_refund_id        TEXT,
    native_order_no         TEXT,
    sdkwork_out_trade_no    TEXT,
    sdkwork_out_refund_no   TEXT,
    transaction_type        TEXT NOT NULL,
    occurred_at             TIMESTAMPTZ NOT NULL,
    settled_at              TIMESTAMPTZ,
    gross_amount            TEXT NOT NULL,
    fee_amount              TEXT NOT NULL,
    net_amount              TEXT NOT NULL,
    currency_code           TEXT NOT NULL,
    provider_status         TEXT NOT NULL,
    raw_row_digest          TEXT NOT NULL,
    metadata_json           JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ,
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_commerce_payment_statement_item_row
    ON commerce_payment_statement_item (tenant_id, statement_id, row_no)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_commerce_payment_statement_item_statement
    ON commerce_payment_statement_item (tenant_id, statement_id)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_commerce_payment_statement_item_trade_no
    ON commerce_payment_statement_item (tenant_id, sdkwork_out_trade_no)
    WHERE deleted_at IS NULL AND sdkwork_out_trade_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_commerce_payment_statement_item_refund_no
    ON commerce_payment_statement_item (tenant_id, sdkwork_out_refund_no)
    WHERE deleted_at IS NULL AND sdkwork_out_refund_no IS NOT NULL;

CREATE TABLE IF NOT EXISTS commerce_payment_reconciliation_item (
    id                      TEXT PRIMARY KEY,
    tenant_id               TEXT NOT NULL,
    organization_id         TEXT NOT NULL DEFAULT '0',
    reconciliation_run_id   TEXT NOT NULL,
    statement_id            TEXT NOT NULL,
    statement_item_id       TEXT,
    payment_attempt_id      TEXT,
    refund_id               TEXT,
    refund_attempt_id       TEXT,
    supplier_code           TEXT NOT NULL,
    difference_type         TEXT NOT NULL,
    match_status            TEXT NOT NULL DEFAULT 'mismatch',
    internal_amount         TEXT,
    provider_amount         TEXT,
    difference_amount       TEXT,
    currency_code           TEXT,
    internal_status         TEXT,
    provider_status         TEXT,
    resolution_status       TEXT NOT NULL DEFAULT 'unresolved',
    resolution_note         TEXT,
    resolved_by             TEXT,
    resolved_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ,
    version                 BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_commerce_payment_reconciliation_item_run
    ON commerce_payment_reconciliation_item (tenant_id, reconciliation_run_id, difference_type)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_commerce_payment_reconciliation_item_unresolved
    ON commerce_payment_reconciliation_item (tenant_id, resolution_status, created_at)
    WHERE deleted_at IS NULL AND resolution_status = 'unresolved';

-- `commerce_payment_reconciliation_run` is owned by the `payment-control-plane`
-- module. These additive guards keep the reconciliation worker runnable against a
-- run table that predates the columns it writes; all are no-ops on current
-- baselines.
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

COMMIT;
