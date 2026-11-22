-- sdkwork:migration
-- id: 0033_unify_resource_binding
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Retire the three parallel upstream resource-binding tables in favor of
--   the unified `ai_resource_binding` table, and drop the legacy columnar
--   model blacklist/whitelist columns now that `ai_model_access_policy` is the
--   single authority:
--   - ai_upstream_supplier_resource      → ai_resource_binding (binding_scope=supplier)
--   - ai_upstream_account_group_resource → ai_resource_binding (binding_scope=account_group)
--   - ai_upstream_account_resource       → ai_resource_binding (binding_scope=account)
--   - ai_upstream_account.model_blacklist/model_whitelist  → ai_model_access_policy
--   - ai_upstream_account_group.model_blacklist/model_whitelist → ai_model_access_policy
--   - ai_upstream_supplier.model_blacklist/model_whitelist → ai_model_access_policy
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: disruptive
-- lock_timeout: 10s
-- statement_timeout: 120s

BEGIN;

-- ---------------------------------------------------------------------------
-- 1-3. Migrate legacy resource-binding tables into ai_resource_binding.
--
-- The legacy ai_upstream_supplier_resource / ai_upstream_account_group_resource
-- tables exist only when this database was upgraded from a schema created by an
-- older baseline. A fresh install builds the unified schema directly from the
-- current baseline (which no longer defines those tables), so each migration is
-- guarded with to_regclass and runs only when its source table is present.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('ai_upstream_supplier_resource') IS NOT NULL THEN
        INSERT INTO ai_resource_binding (
            id, uuid, tenant_id, organization_id, data_scope, status,
            created_at, updated_at, version, metadata,
            binding_scope, supplier_id, supplier_code,
            resource_id, resource_code, resource_group_code,
            grant_type, priority, effective_from, effective_to
        )
        SELECT
            source.id, source.uuid, source.tenant_id, source.organization_id, source.data_scope, source.status,
            source.created_at, source.updated_at, source.version, source.metadata,
            'supplier', source.supplier_id, supplier.supplier_code,
            source.resource_id, source.resource_code, source.resource_group_code,
            source.grant_type, source.priority, source.effective_from, source.effective_to
        FROM ai_upstream_supplier_resource source
        LEFT JOIN ai_upstream_supplier supplier
          ON supplier.id = source.supplier_id
         AND supplier.tenant_id = source.tenant_id
         AND supplier.organization_id = source.organization_id
        WHERE source.deleted_at IS NULL
        ON CONFLICT (tenant_id, organization_id, binding_scope, supplier_id, account_group_id, account_id, resource_id, resource_code, resource_group_code)
        DO NOTHING;
    END IF;

    IF to_regclass('ai_upstream_account_group_resource') IS NOT NULL THEN
        INSERT INTO ai_resource_binding (
            id, uuid, tenant_id, organization_id, data_scope, status,
            created_at, updated_at, version, metadata,
            binding_scope, account_group_id, account_group_code,
            resource_id, resource_code, resource_group_code,
            grant_type, priority, effective_from, effective_to
        )
        SELECT
            source.id, source.uuid, source.tenant_id, source.organization_id, source.data_scope, source.status,
            source.created_at, source.updated_at, source.version, source.metadata,
            'account_group', source.account_group_id, account_group.group_code,
            source.resource_id, source.resource_code, source.resource_group_code,
            source.grant_type, source.priority, source.effective_from, source.effective_to
        FROM ai_upstream_account_group_resource source
        LEFT JOIN ai_upstream_account_group account_group
          ON account_group.id = source.account_group_id
         AND account_group.tenant_id = source.tenant_id
         AND account_group.organization_id = source.organization_id
        WHERE source.deleted_at IS NULL
        ON CONFLICT (tenant_id, organization_id, binding_scope, supplier_id, account_group_id, account_id, resource_id, resource_code, resource_group_code)
        DO NOTHING;
    END IF;

    IF to_regclass('ai_upstream_account_resource') IS NOT NULL THEN
        INSERT INTO ai_resource_binding (
            id, uuid, tenant_id, organization_id, data_scope, status,
            created_at, updated_at, version, metadata,
            binding_scope, account_id, account_code,
            resource_id, resource_code, resource_group_code,
            grant_type, priority, effective_from, effective_to
        )
        SELECT
            source.id, source.uuid, source.tenant_id, source.organization_id, source.data_scope, source.status,
            source.created_at, source.updated_at, source.version, source.metadata,
            'account', source.account_id, account.account_code,
            source.resource_id, source.resource_code, source.resource_group_code,
            source.grant_type, source.priority, source.effective_from, source.effective_to
        FROM ai_upstream_account_resource source
        LEFT JOIN ai_upstream_account account
          ON account.id = source.account_id
         AND account.tenant_id = source.tenant_id
         AND account.organization_id = source.organization_id
        WHERE source.deleted_at IS NULL
        ON CONFLICT (tenant_id, organization_id, binding_scope, supplier_id, account_group_id, account_id, resource_id, resource_code, resource_group_code)
        DO NOTHING;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Migrate legacy model blacklist/whitelist columns to ai_model_access_policy.
--    Supplier scope: deny/allow rows.
--
-- The model_blacklist / model_whitelist columns exist only on databases
-- upgraded from an older baseline; fresh installs build the unified schema
-- directly. Each migration is guarded by a column-presence check.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ai_upstream_supplier' AND column_name = 'model_blacklist'
    ) THEN
        WITH migrated_rows AS (
            SELECT
                ROW_NUMBER() OVER () AS row_num,
                source.tenant_id, source.organization_id, source.data_scope,
                'supplier'::VARCHAR(32) AS scope_type,
                source.id AS scope_id,
                source.supplier_code AS scope_code,
                'deny'::VARCHAR(16) AS effect,
                entry->>'vendorCode' AS vendor_code,
                model.model_text AS model_pattern,
                'migrated supplier model blacklist' AS description
            FROM ai_upstream_supplier source
            CROSS JOIN jsonb_array_elements(source.model_blacklist) AS entry
            CROSS JOIN LATERAL (
                SELECT NULL::TEXT AS model_text
                WHERE jsonb_array_length(COALESCE(entry->'models', '[]'::jsonb)) = 0
                UNION ALL
                SELECT model_item #>> '{}' AS model_text
                FROM jsonb_array_elements(COALESCE(entry->'models', '[]'::jsonb)) AS model_item
                WHERE jsonb_array_length(COALESCE(entry->'models', '[]'::jsonb)) > 0
            ) model
            WHERE source.deleted_at IS NULL
              AND source.model_blacklist <> '[]'::jsonb
              AND entry->>'vendorCode' IS NOT NULL
        ),
        max_id AS (SELECT COALESCE((SELECT max(id) FROM ai_model_access_policy), 0)::BIGINT AS value)
        INSERT INTO ai_model_access_policy (
            id, uuid, tenant_id, organization_id, data_scope, status,
            created_at, updated_at, version, metadata,
            scope_type, scope_id, scope_code, effect,
            vendor_code, model_pattern, priority, description
        )
        SELECT
            (SELECT value FROM max_id) + row_num,
            '00000000-0000-0000-0000-' || LPAD(TO_HEX(row_num), 12, '0'),
            tenant_id, organization_id, data_scope, 1,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, '{}'::jsonb,
            scope_type, scope_id, scope_code, effect,
            vendor_code, model_pattern, 100, description
        FROM migrated_rows
        ON CONFLICT (tenant_id, organization_id, scope_type, scope_id, effect, vendor_code, model_pattern)
        DO NOTHING;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ai_upstream_supplier' AND column_name = 'model_whitelist'
    ) THEN
        WITH migrated_rows AS (
            SELECT
                ROW_NUMBER() OVER () AS row_num,
                source.tenant_id, source.organization_id, source.data_scope,
                'supplier'::VARCHAR(32) AS scope_type,
                source.id AS scope_id,
                source.supplier_code AS scope_code,
                'allow'::VARCHAR(16) AS effect,
                entry->>'vendorCode' AS vendor_code,
                model.model_text AS model_pattern,
                'migrated supplier model whitelist' AS description
            FROM ai_upstream_supplier source
            CROSS JOIN jsonb_array_elements(source.model_whitelist) AS entry
            CROSS JOIN LATERAL (
                SELECT NULL::TEXT AS model_text
                WHERE jsonb_array_length(COALESCE(entry->'models', '[]'::jsonb)) = 0
                UNION ALL
                SELECT model_item #>> '{}'
                FROM jsonb_array_elements(COALESCE(entry->'models', '[]'::jsonb)) AS model_item
                WHERE jsonb_array_length(COALESCE(entry->'models', '[]'::jsonb)) > 0
            ) model
            WHERE source.deleted_at IS NULL
              AND source.model_whitelist <> '[]'::jsonb
              AND entry->>'vendorCode' IS NOT NULL
        ),
        max_id AS (SELECT COALESCE((SELECT max(id) FROM ai_model_access_policy), 0)::BIGINT AS value)
        INSERT INTO ai_model_access_policy (
            id, uuid, tenant_id, organization_id, data_scope, status,
            created_at, updated_at, version, metadata,
            scope_type, scope_id, scope_code, effect,
            vendor_code, model_pattern, priority, description
        )
        SELECT
            (SELECT value FROM max_id) + row_num,
            '00000000-0000-0000-0000-' || LPAD(TO_HEX(row_num), 12, '0'),
            tenant_id, organization_id, data_scope, 1,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, '{}'::jsonb,
            scope_type, scope_id, scope_code, effect,
            vendor_code, model_pattern, 100, description
        FROM migrated_rows
        ON CONFLICT (tenant_id, organization_id, scope_type, scope_id, effect, vendor_code, model_pattern)
        DO NOTHING;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Migrate account-group model lists. Each entry is {vendorCode, models[]};
--    a models[] is expanded to one policy row per model, and an empty models[]
--    yields a vendor-level pattern (NULL), mirroring the supplier migration above.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ai_upstream_account_group' AND column_name = 'model_blacklist'
    ) THEN
        WITH migrated_rows AS (
            SELECT
                ROW_NUMBER() OVER () AS row_num,
                source.tenant_id, source.organization_id, source.data_scope,
                'account_group'::VARCHAR(32) AS scope_type,
                source.id AS scope_id,
                source.group_code AS scope_code,
                'deny'::VARCHAR(16) AS effect,
                entry->>'vendorCode' AS vendor_code,
                model.model_text AS model_pattern,
                'migrated account group model blacklist' AS description
            FROM ai_upstream_account_group source
            CROSS JOIN jsonb_array_elements(source.model_blacklist) AS entry
            CROSS JOIN LATERAL (
                SELECT NULL::TEXT AS model_text
                WHERE jsonb_array_length(COALESCE(entry->'models', '[]'::jsonb)) = 0
                UNION ALL
                SELECT model_item #>> '{}' AS model_text
                FROM jsonb_array_elements(COALESCE(entry->'models', '[]'::jsonb)) AS model_item
                WHERE jsonb_array_length(COALESCE(entry->'models', '[]'::jsonb)) > 0
            ) model
            WHERE source.deleted_at IS NULL
              AND source.model_blacklist <> '[]'::jsonb
              AND entry->>'vendorCode' IS NOT NULL
        ),
        max_id AS (SELECT COALESCE((SELECT max(id) FROM ai_model_access_policy), 0)::BIGINT AS value)
        INSERT INTO ai_model_access_policy (
            id, uuid, tenant_id, organization_id, data_scope, status,
            created_at, updated_at, version, metadata,
            scope_type, scope_id, scope_code, effect,
            vendor_code, model_pattern, priority, description
        )
        SELECT
            (SELECT value FROM max_id) + row_num,
            '00000000-0000-0000-0000-' || LPAD(TO_HEX(row_num), 12, '0'),
            tenant_id, organization_id, data_scope, 1,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, '{}'::jsonb,
            scope_type, scope_id, scope_code, effect,
            vendor_code, model_pattern, 100, description
        FROM migrated_rows
        ON CONFLICT (tenant_id, organization_id, scope_type, scope_id, effect, vendor_code, model_pattern)
        DO NOTHING;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ai_upstream_account_group' AND column_name = 'model_whitelist'
    ) THEN
        WITH migrated_rows AS (
            SELECT
                ROW_NUMBER() OVER () AS row_num,
                source.tenant_id, source.organization_id, source.data_scope,
                'account_group'::VARCHAR(32) AS scope_type,
                source.id AS scope_id,
                source.group_code AS scope_code,
                'allow'::VARCHAR(16) AS effect,
                entry->>'vendorCode' AS vendor_code,
                model.model_text AS model_pattern,
                'migrated account group model whitelist' AS description
            FROM ai_upstream_account_group source
            CROSS JOIN jsonb_array_elements(source.model_whitelist) AS entry
            CROSS JOIN LATERAL (
                SELECT NULL::TEXT AS model_text
                WHERE jsonb_array_length(COALESCE(entry->'models', '[]'::jsonb)) = 0
                UNION ALL
                SELECT model_item #>> '{}' AS model_text
                FROM jsonb_array_elements(COALESCE(entry->'models', '[]'::jsonb)) AS model_item
                WHERE jsonb_array_length(COALESCE(entry->'models', '[]'::jsonb)) > 0
            ) model
            WHERE source.deleted_at IS NULL
              AND source.model_whitelist <> '[]'::jsonb
              AND entry->>'vendorCode' IS NOT NULL
        ),
        max_id AS (SELECT COALESCE((SELECT max(id) FROM ai_model_access_policy), 0)::BIGINT AS value)
        INSERT INTO ai_model_access_policy (
            id, uuid, tenant_id, organization_id, data_scope, status,
            created_at, updated_at, version, metadata,
            scope_type, scope_id, scope_code, effect,
            vendor_code, model_pattern, priority, description
        )
        SELECT
            (SELECT value FROM max_id) + row_num,
            '00000000-0000-0000-0000-' || LPAD(TO_HEX(row_num), 12, '0'),
            tenant_id, organization_id, data_scope, 1,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0, '{}'::jsonb,
            scope_type, scope_id, scope_code, effect,
            vendor_code, model_pattern, 100, description
        FROM migrated_rows
        ON CONFLICT (tenant_id, organization_id, scope_type, scope_id, effect, vendor_code, model_pattern)
        DO NOTHING;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Retire legacy resource-binding tables and model-list columns.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS ai_upstream_supplier_resource;
DROP TABLE IF EXISTS ai_upstream_account_group_resource;
DROP TABLE IF EXISTS ai_upstream_account_resource;

ALTER TABLE ai_upstream_supplier
    DROP COLUMN IF EXISTS model_blacklist,
    DROP COLUMN IF EXISTS model_whitelist;

ALTER TABLE ai_upstream_account_group
    DROP COLUMN IF EXISTS model_blacklist,
    DROP COLUMN IF EXISTS model_whitelist;

ALTER TABLE ai_upstream_account
    DROP COLUMN IF EXISTS model_blacklist,
    DROP COLUMN IF EXISTS model_whitelist;

-- Route classification is derived at runtime (RouteKind::of on the invocation
-- resource); the redundant ai_resource_binding.route_kind column is removed.
ALTER TABLE ai_resource_binding
    DROP COLUMN IF EXISTS route_kind,
    DROP CONSTRAINT IF EXISTS ck_ai_resource_binding_kind;

-- A binding targets exactly one of a resource or a resource group (a group
-- grant carries only resource_group_code). resource_code must therefore be
-- nullable; the target-exclusivity check below mirrors the retired
-- ai_upstream_*_resource ck_*_target constraints.
ALTER TABLE ai_resource_binding
    ALTER COLUMN resource_code DROP NOT NULL;

ALTER TABLE ai_resource_binding
    DROP CONSTRAINT IF EXISTS ck_ai_resource_binding_target;

ALTER TABLE ai_resource_binding
    ADD CONSTRAINT ck_ai_resource_binding_target
        CHECK (
            (NULLIF(resource_code, '') IS NOT NULL)
            <> (NULLIF(resource_group_code, '') IS NOT NULL)
        );

COMMIT;
