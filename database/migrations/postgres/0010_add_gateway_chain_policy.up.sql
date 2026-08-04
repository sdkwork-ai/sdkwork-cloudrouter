-- sdkwork:migration
-- id: 0010_add_gateway_chain_policy
-- engine: postgres
-- module: sdkwork-clawrouter
-- purpose: Add the gateway call-chain policy table backing global and
--   per-API-key chain configuration (concurrency limits, IP allow/deny
--   lists, per-stage switches). One active row per scope (GLOBAL or API_KEY)
--   carries a JSONB payload that the call-chain PolicyResolver merges over
--   built-in defaults; legacy sources (iam_gateway_access_policy IP lists,
--   iam_gateway_risk_rule WAF rules) keep working unchanged.
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s
-- contract_version: 0.4.0
-- rewrite: new table only; no backfill

CREATE TABLE IF NOT EXISTS iam_gateway_chain_policy (
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
    policy_name VARCHAR(128),
    scope_type INTEGER,
    scope_id BIGINT,
    payload JSONB,
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    CONSTRAINT ck_iam_gateway_chain_policy_tenant_scope CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_chain_policy_scope
    ON iam_gateway_chain_policy (tenant_id, organization_id, scope_type, scope_id, status)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_iam_gateway_chain_policy_scope_status
    ON iam_gateway_chain_policy (tenant_id, organization_id, scope_type, scope_id, status);
