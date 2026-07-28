-- sdkwork:migration
-- id: 0001_standardize_account_group_entitlements
-- engine: postgres
-- module: gateway-iam
-- purpose: Rename channel-group API-key routing entitlements to canonical account-group terminology.
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: access-exclusive-on-gateway-api-key-binding-tables
-- lock_timeout: 5s
-- statement_timeout: 2min
-- rewrite: Metadata-only table and column renames with index/constraint replacement.
-- replication_impact: Minimal DDL WAL; monitor lock waits and replica apply delay.
-- backfill: No row rewrite; account-group ids are preserved by the root routing migration.
-- observability: Migration history, binding counts, orphan validation, and PostgreSQL lock waits.
-- cancellation: Cancel before COMMIT; the transaction restores legacy names.
-- recovery: Deploy a reviewed forward-fix if a dependent client was not migrated.
-- contract_version: 0.3.0

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '2min';

DO $sdkwork_gateway_iam_migration$
BEGIN
    IF to_regclass('iam_gateway_api_key_channel_group') IS NULL THEN
        RETURN;
    END IF;
    IF to_regclass('iam_gateway_api_key_account_group') IS NOT NULL THEN
        RAISE EXCEPTION 'gateway IAM migration refuses mixed channel-group/account-group binding tables';
    END IF;
    IF to_regclass('ai_upstream_account_group') IS NULL THEN
        RAISE EXCEPTION 'canonical ai_upstream_account_group must be migrated before gateway IAM entitlements';
    END IF;
    IF EXISTS (
        SELECT 1
          FROM iam_gateway_api_key_channel_group b
         WHERE NOT EXISTS (
             SELECT 1 FROM ai_upstream_account_group g
              WHERE g.tenant_id = b.tenant_id
                AND g.organization_id = b.organization_id
                AND g.id = b.channel_group_id
         )
    ) THEN
        RAISE EXCEPTION 'gateway API-key binding contains an orphan account-group reference';
    END IF;

    ALTER TABLE iam_gateway_api_key RENAME COLUMN channel_group_id TO account_group_id;
    DROP INDEX IF EXISTS idx_iam_gateway_api_key_ai_channel_group_status;
    CREATE INDEX idx_iam_gateway_api_key_ai_account_group_status
        ON iam_gateway_api_key
            (tenant_id, organization_id, account_group_id, status, updated_at, id);

    ALTER TABLE iam_gateway_api_key_channel_group
        RENAME TO iam_gateway_api_key_account_group;
    ALTER TABLE iam_gateway_api_key_account_group
        RENAME CONSTRAINT iam_gateway_api_key_channel_group_pkey
        TO iam_gateway_api_key_account_group_pkey;
    ALTER TABLE iam_gateway_api_key_account_group
        RENAME COLUMN channel_group_id TO account_group_id;
    ALTER TABLE iam_gateway_api_key_account_group
        RENAME COLUMN channel_group_code TO account_group_code;
    ALTER TABLE iam_gateway_api_key_account_group
        DROP CONSTRAINT IF EXISTS ck_iam_gateway_api_key_channel_group_tenant_scope,
        DROP CONSTRAINT IF EXISTS fk_iam_gateway_api_key_channel_group_api_key,
        DROP CONSTRAINT IF EXISTS ck_iam_gateway_api_key_channel_group_ids,
        DROP CONSTRAINT IF EXISTS ck_iam_gateway_api_key_channel_group_weighting,
        DROP CONSTRAINT IF EXISTS ck_iam_gateway_api_key_channel_group_effective_interval;
    DROP INDEX IF EXISTS uk_iam_gateway_api_key_channel_group_uuid;
    DROP INDEX IF EXISTS uk_iam_gateway_api_key_channel_group_binding;
    DROP INDEX IF EXISTS idx_iam_gateway_api_key_channel_group_active;
    DROP INDEX IF EXISTS idx_iam_gateway_api_key_channel_group_group;

    ALTER TABLE iam_gateway_api_key_account_group
        ADD CONSTRAINT ck_iam_gateway_api_key_account_group_tenant_scope
            CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
        ADD CONSTRAINT fk_iam_gateway_api_key_account_group_api_key
            FOREIGN KEY (tenant_id, organization_id, api_key_id)
            REFERENCES iam_gateway_api_key (tenant_id, organization_id, id) ON DELETE RESTRICT,
        ADD CONSTRAINT ck_iam_gateway_api_key_account_group_ids
            CHECK (api_key_id > 0 AND account_group_id > 0),
        ADD CONSTRAINT ck_iam_gateway_api_key_account_group_weighting
            CHECK (priority >= 0 AND weight >= 0),
        ADD CONSTRAINT ck_iam_gateway_api_key_account_group_effective_interval
            CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from);
    CREATE UNIQUE INDEX uk_iam_gateway_api_key_account_group_uuid
        ON iam_gateway_api_key_account_group (uuid) WHERE deleted_at IS NULL;
    CREATE UNIQUE INDEX uk_iam_gateway_api_key_account_group_binding
        ON iam_gateway_api_key_account_group
            (tenant_id, organization_id, api_key_id, account_group_id, binding_role)
        WHERE deleted_at IS NULL;
    CREATE INDEX idx_iam_gateway_api_key_account_group_active
        ON iam_gateway_api_key_account_group
            (tenant_id, organization_id, api_key_id, status, priority, weight, id);
    CREATE INDEX idx_iam_gateway_api_key_account_group_group
        ON iam_gateway_api_key_account_group
            (tenant_id, organization_id, account_group_id, status, priority, id);
END
$sdkwork_gateway_iam_migration$;

COMMIT;
