-- sdkwork:migration
-- id: 0007_pricing_catalog_generation
-- engine: postgres
-- module: cloudrouter-billing
-- purpose: Replace the 23-table `MAX(updated_at)` fingerprint probe with a
--   single-row generation counter per catalog partition.
--
--   The runtime refreshes its pricing snapshot on a fixed interval. To decide
--   whether a refresh is needed it aggregated `MAX(updated_at)` over every
--   table that feeds the snapshot — 23 aggregate queries against tables as
--   large as `pricing_rate` on every probe. That probe has three failure
--   modes this table removes:
--
--   * cost — full-table aggregates repeat forever even while nothing changes;
--   * correctness — a clock skew or an equal-timestamp `CURRENT_TIMESTAMP`
--     write leaves the maximum unchanged, so a real change is never seen;
--   * monotonicity — a row written with an older timestamp pulls the maximum
--     backwards and triggers a spurious reload.
--
--   A generation counter is monotonic by construction: every writer bumps it in
--   the same transaction as the business write, so the probe is one indexed
--   single-row read and a change can never be missed or invented.
--
--   `partition_key` scopes a generation to one slice of the catalog so a change
--   to a tenant price layer does not force a full reload. The empty string is
--   the whole-catalog generation.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s
-- contract_version: 0.6.0

CREATE TABLE IF NOT EXISTS cloudrouter_catalog_generation (
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
    config_scope VARCHAR(64) NOT NULL,
    partition_key VARCHAR(256) NOT NULL DEFAULT '',
    generation BIGINT NOT NULL DEFAULT 0,
    changed_by VARCHAR(128),
    changed_reason VARCHAR(256),
    CONSTRAINT ck_cloudrouter_catalog_generation_scope
        CHECK (BTRIM(config_scope) <> ''),
    CONSTRAINT ck_cloudrouter_catalog_generation_non_negative
        CHECK (generation >= 0),
    CONSTRAINT ck_cloudrouter_catalog_generation_tenant_scope
        CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0))
);

-- One live counter per (scope, partition). `deleted_at` participates so a
-- retired counter can be recreated instead of resurrected.
CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_catalog_generation
    ON cloudrouter_catalog_generation (config_scope, partition_key)
    WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uk_cloudrouter_catalog_generation_uuid
    ON cloudrouter_catalog_generation (uuid) WHERE deleted_at IS NULL;

-- Atomic bump used by every writer. `INSERT ... ON CONFLICT DO UPDATE` keeps it
-- race-free: two concurrent writers serialize on the row and both observe an
-- incremented generation.
CREATE OR REPLACE FUNCTION cloudrouter_bump_catalog_generation(
    p_scope VARCHAR,
    p_partition VARCHAR,
    p_tenant_id BIGINT,
    p_organization_id BIGINT,
    p_changed_by VARCHAR,
    p_reason VARCHAR
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    next_generation BIGINT;
BEGIN
    INSERT INTO cloudrouter_catalog_generation (
        id, uuid, tenant_id, organization_id, data_scope, status,
        created_at, updated_at, version, metadata,
        config_scope, partition_key, generation, changed_by, changed_reason
    ) VALUES (
        (EXTRACT(EPOCH FROM clock_timestamp()) * 1000000)::BIGINT,
        md5(random()::text || clock_timestamp()::text),
        p_tenant_id, p_organization_id, 0, 1,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, '{}'::jsonb,
        p_scope, COALESCE(p_partition, ''), 1, p_changed_by, p_reason
    )
    ON CONFLICT (config_scope, partition_key) WHERE deleted_at IS NULL
    DO UPDATE SET
        generation = cloudrouter_catalog_generation.generation + 1,
        updated_at = CURRENT_TIMESTAMP,
        version = cloudrouter_catalog_generation.version + 1,
        changed_by = COALESCE(EXCLUDED.changed_by, cloudrouter_catalog_generation.changed_by),
        changed_reason = COALESCE(EXCLUDED.changed_reason, cloudrouter_catalog_generation.changed_reason)
    RETURNING generation INTO next_generation;

    RETURN next_generation;
END
$$;

-- Seed the whole-catalog counter so the first probe finds a row instead of
-- treating "no row" as a change.
INSERT INTO cloudrouter_catalog_generation (
    id, uuid, tenant_id, organization_id, data_scope, status,
    created_at, updated_at, version, metadata,
    config_scope, partition_key, generation, changed_by, changed_reason
) VALUES (
    1, md5('sdkwork-cloudrouter-catalog-generation-1'), 0, 0, 0, 1,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, '{}'::jsonb,
    'pricing_catalog', '', 0, 'migration', 'initial generation'
)
ON CONFLICT (config_scope, partition_key) WHERE deleted_at IS NULL DO NOTHING;

-- Bump the catalog generation whenever a rate, price book, plan or rule row is
-- written. Triggers keep the invariant even for direct SQL, restores and
-- out-of-band repairs that bypass the admin API.
CREATE OR REPLACE FUNCTION cloudrouter_trigger_catalog_generation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM cloudrouter_bump_catalog_generation(
        'pricing_catalog',
        '',
        COALESCE(NEW.tenant_id, OLD.tenant_id, 0),
        COALESCE(NEW.organization_id, OLD.organization_id, 0),
        TG_TABLE_NAME,
        TG_OP
    );
    RETURN COALESCE(NEW, OLD);
END
$$;

DROP TRIGGER IF EXISTS trg_pricing_price_book_generation ON pricing_price_book;
CREATE TRIGGER trg_pricing_price_book_generation
AFTER INSERT OR UPDATE OR DELETE ON pricing_price_book
FOR EACH ROW EXECUTE FUNCTION cloudrouter_trigger_catalog_generation();

DROP TRIGGER IF EXISTS trg_pricing_rate_generation ON pricing_rate;
CREATE TRIGGER trg_pricing_rate_generation
AFTER INSERT OR UPDATE OR DELETE ON pricing_rate
FOR EACH ROW EXECUTE FUNCTION cloudrouter_trigger_catalog_generation();

DROP TRIGGER IF EXISTS trg_pricing_default_region_generation ON pricing_default_region;
CREATE TRIGGER trg_pricing_default_region_generation
AFTER INSERT OR UPDATE OR DELETE ON pricing_default_region
FOR EACH ROW EXECUTE FUNCTION cloudrouter_trigger_catalog_generation();

DROP TRIGGER IF EXISTS trg_cloudrouter_pricing_plan_generation ON cloudrouter_pricing_plan;
CREATE TRIGGER trg_cloudrouter_pricing_plan_generation
AFTER INSERT OR UPDATE OR DELETE ON cloudrouter_pricing_plan
FOR EACH ROW EXECUTE FUNCTION cloudrouter_trigger_catalog_generation();

DROP TRIGGER IF EXISTS trg_cloudrouter_pricing_rule_generation ON cloudrouter_pricing_rule;
CREATE TRIGGER trg_cloudrouter_pricing_rule_generation
AFTER INSERT OR UPDATE OR DELETE ON cloudrouter_pricing_rule
FOR EACH ROW EXECUTE FUNCTION cloudrouter_trigger_catalog_generation();

DROP TRIGGER IF EXISTS trg_cloudrouter_account_rate_card_generation ON cloudrouter_account_rate_card;
CREATE TRIGGER trg_cloudrouter_account_rate_card_generation
AFTER INSERT OR UPDATE OR DELETE ON cloudrouter_account_rate_card
FOR EACH ROW EXECUTE FUNCTION cloudrouter_trigger_catalog_generation();

DROP TRIGGER IF EXISTS trg_cloudrouter_group_resource_price_generation ON cloudrouter_group_resource_price;
CREATE TRIGGER trg_cloudrouter_group_resource_price_generation
AFTER INSERT OR UPDATE OR DELETE ON cloudrouter_group_resource_price
FOR EACH ROW EXECUTE FUNCTION cloudrouter_trigger_catalog_generation();
