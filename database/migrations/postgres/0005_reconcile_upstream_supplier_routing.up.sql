-- sdkwork:migration
-- id: 0005_reconcile_upstream_supplier_routing
-- engine: postgres
-- module: clawrouter
-- purpose: Reconcile schemas where 0003 history exists but legacy routing columns remain.
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: access-exclusive-on-routing-and-gateway-iam-tables
-- lock_timeout: 5s
-- statement_timeout: 5min
-- estimated_size: Metadata-only renames plus bounded updates on routing fact tables; no table rewrite expected.
-- write_traffic: Stop Claw Router writes while this migration runs.
-- rewrite: Column and table renames are metadata-only; retired nullable columns are dropped after explicit data checks.
-- replication_impact: Bounded update WAL for rows carrying legacy account references; monitor WAL bytes and replica lag.
-- backfill: Deterministic supplier/account projection from ai_upstream_account with orphan and conflict checks.
-- observability: Migration history, PostgreSQL lock waits, updated row counts, WAL bytes, replica lag, and schema readiness.
-- cancellation: Cancel before the retired-column cleanup phase; transaction rollback restores all changes.
-- recovery: Resolve conflicting or orphaned legacy rows, then rerun this migration without changing 0003 history.
-- contract_version: 0.4.0

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '5min';

DO $sdkwork_search_path$
DECLARE
    canonical_schema TEXT := current_schema();
    misplaced_public_binding_has_rows BOOLEAN;
BEGIN
    IF canonical_schema IS NULL THEN
        RAISE EXCEPTION
            'upstream routing reconciliation requires a canonical schema at the start of search_path';
    END IF;

    PERFORM set_config('search_path', quote_ident(canonical_schema), true);

    IF canonical_schema <> 'public'
       AND to_regclass('public.iam_gateway_api_key_account_group') IS NOT NULL THEN
        EXECUTE
            'SELECT EXISTS (SELECT 1 FROM public.iam_gateway_api_key_account_group)'
            INTO misplaced_public_binding_has_rows;
        IF misplaced_public_binding_has_rows THEN
            RAISE EXCEPTION
                'public.iam_gateway_api_key_account_group contains rows; merge them into %.iam_gateway_api_key_account_group before migration',
                canonical_schema;
        END IF;
        DROP TABLE public.iam_gateway_api_key_account_group;
    END IF;
END
$sdkwork_search_path$;

DO $sdkwork_migration$
DECLARE
    required_table TEXT;
    rename_record RECORD;
    cleanup_record RECORD;
    old_exists BOOLEAN;
    new_exists BOOLEAN;
BEGIN
    FOREACH required_table IN ARRAY ARRAY[
        'ai_upstream_account',
        'ai_pricing_rule',
        'ai_quota_policy',
        'ai_request_trace',
        'ai_routing_decision_log',
        'ai_routing_rule',
        'ai_usage',
        'iam_gateway_api_key'
    ] LOOP
        IF to_regclass(required_table) IS NULL THEN
            RAISE EXCEPTION
                'upstream routing reconciliation requires table %, but it is missing',
                required_table;
        END IF;
    END LOOP;

    IF to_regclass('ai_provider_object_route') IS NOT NULL
       AND to_regclass('ai_upstream_object_route') IS NOT NULL THEN
        RAISE EXCEPTION
            'upstream routing reconciliation found both ai_provider_object_route and ai_upstream_object_route';
    ELSIF to_regclass('ai_provider_object_route') IS NOT NULL THEN
        ALTER TABLE ai_provider_object_route RENAME TO ai_upstream_object_route;
    END IF;
    IF to_regclass('ai_upstream_object_route') IS NULL THEN
        RAISE EXCEPTION
            'upstream routing reconciliation requires ai_upstream_object_route';
    END IF;

    IF to_regclass('iam_gateway_api_key_channel_group') IS NOT NULL
       AND to_regclass('iam_gateway_api_key_account_group') IS NOT NULL THEN
        INSERT INTO iam_gateway_api_key_account_group (
            id,
            uuid,
            tenant_id,
            organization_id,
            user_id,
            owner_type,
            owner_id,
            data_scope,
            status,
            created_at,
            updated_at,
            version,
            deleted_at,
            deleted_by,
            metadata,
            api_key_id,
            account_group_id,
            account_group_code,
            binding_role,
            routing_strategy,
            priority,
            weight,
            effective_from,
            effective_to
        )
        SELECT id,
               uuid,
               tenant_id,
               organization_id,
               user_id,
               owner_type,
               owner_id,
               data_scope,
               status,
               created_at,
               updated_at,
               version,
               deleted_at,
               deleted_by,
               metadata,
               api_key_id,
               channel_group_id,
               channel_group_code,
               binding_role,
               routing_strategy,
               priority,
               weight,
               effective_from,
               effective_to
          FROM iam_gateway_api_key_channel_group;
        DROP TABLE iam_gateway_api_key_channel_group;
    ELSIF to_regclass('iam_gateway_api_key_channel_group') IS NOT NULL THEN
        ALTER TABLE iam_gateway_api_key_channel_group
            RENAME TO iam_gateway_api_key_account_group;
        ALTER TABLE iam_gateway_api_key_account_group
            RENAME COLUMN channel_group_id TO account_group_id;
        ALTER TABLE iam_gateway_api_key_account_group
            RENAME COLUMN channel_group_code TO account_group_code;
    END IF;
    IF to_regclass('iam_gateway_api_key_account_group') IS NULL THEN
        RAISE EXCEPTION
            'upstream routing reconciliation requires iam_gateway_api_key_account_group';
    END IF;

    IF EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name = 'ai_routing_decision_log'
           AND column_name = 'selected_channel_id'
    ) THEN
        IF EXISTS (
            SELECT 1
              FROM ai_routing_decision_log
             WHERE selected_channel_id IS NOT NULL
               AND selected_account_id IS NOT NULL
               AND selected_channel_id <> selected_account_id
        ) THEN
            RAISE EXCEPTION
                'routing decision contains conflicting legacy and canonical account references';
        END IF;
        IF EXISTS (
            SELECT 1
              FROM ai_routing_decision_log d
             WHERE d.selected_channel_id IS NOT NULL
               AND NOT EXISTS (
                   SELECT 1
                     FROM ai_upstream_account a
                    WHERE a.tenant_id = d.tenant_id
                      AND a.organization_id = d.organization_id
                      AND a.id = d.selected_channel_id
               )
        ) THEN
            RAISE EXCEPTION
                'routing decision contains an orphan legacy account reference';
        END IF;
        UPDATE ai_routing_decision_log
           SET selected_account_id = coalesce(selected_account_id, selected_channel_id);
    END IF;

    IF EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name = 'ai_routing_decision_log'
           AND column_name = 'selected_provider_id'
    ) THEN
        IF EXISTS (
            SELECT 1
              FROM ai_routing_decision_log
             WHERE selected_provider_id IS NOT NULL
               AND selected_account_id IS NULL
        ) THEN
            RAISE EXCEPTION
                'routing decision supplier backfill requires a canonical account reference';
        END IF;
        UPDATE ai_routing_decision_log d
           SET selected_provider_id = a.supplier_id
          FROM ai_upstream_account a
         WHERE a.tenant_id = d.tenant_id
           AND a.organization_id = d.organization_id
           AND a.id = d.selected_account_id;
    END IF;

    IF EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name = 'ai_usage'
           AND column_name = 'channel_id'
    ) THEN
        IF EXISTS (
            SELECT 1
              FROM ai_usage u
             WHERE u.channel_id IS NOT NULL
               AND NOT EXISTS (
                   SELECT 1
                     FROM ai_upstream_account a
                    WHERE a.tenant_id = u.tenant_id
                      AND a.organization_id = u.organization_id
                      AND a.id = u.channel_id
               )
        ) THEN
            RAISE EXCEPTION 'usage contains an orphan legacy account reference';
        END IF;
        IF EXISTS (
            SELECT 1
              FROM information_schema.columns
             WHERE table_schema = current_schema()
               AND table_name = 'ai_usage'
               AND column_name = 'provider_id'
        ) THEN
            UPDATE ai_usage u
               SET provider_id = a.supplier_id
              FROM ai_upstream_account a
             WHERE a.tenant_id = u.tenant_id
               AND a.organization_id = u.organization_id
               AND a.id = u.channel_id;
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name = 'ai_request_trace'
           AND column_name = 'channel_id'
    ) THEN
        IF EXISTS (
            SELECT 1
              FROM ai_request_trace t
             WHERE t.channel_id IS NOT NULL
               AND NOT EXISTS (
                   SELECT 1
                     FROM ai_upstream_account a
                    WHERE a.tenant_id = t.tenant_id
                      AND a.organization_id = t.organization_id
                      AND a.id = t.channel_id
               )
        ) THEN
            RAISE EXCEPTION 'request trace contains an orphan legacy account reference';
        END IF;
        IF EXISTS (
            SELECT 1
              FROM information_schema.columns
             WHERE table_schema = current_schema()
               AND table_name = 'ai_request_trace'
               AND column_name = 'provider_id'
        ) THEN
            UPDATE ai_request_trace t
               SET provider_id = a.supplier_id
              FROM ai_upstream_account a
             WHERE a.tenant_id = t.tenant_id
               AND a.organization_id = t.organization_id
               AND a.id = t.channel_id;
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name = 'ai_pricing_rule'
           AND column_name = 'channel_id'
    ) THEN
        IF EXISTS (
            SELECT 1
              FROM ai_pricing_rule r
             WHERE r.channel_id IS NOT NULL
               AND NOT EXISTS (
                   SELECT 1
                     FROM ai_upstream_account a
                    WHERE a.tenant_id = r.tenant_id
                      AND a.organization_id = r.organization_id
                      AND a.id = r.channel_id
               )
        ) THEN
            RAISE EXCEPTION 'pricing rule contains an orphan legacy account reference';
        END IF;
        IF EXISTS (
            SELECT 1
              FROM information_schema.columns
             WHERE table_schema = current_schema()
               AND table_name = 'ai_pricing_rule'
               AND column_name = 'provider_code'
        ) THEN
            UPDATE ai_pricing_rule r
               SET provider_code = a.supplier_code
              FROM ai_upstream_account a
             WHERE a.tenant_id = r.tenant_id
               AND a.organization_id = r.organization_id
               AND a.id = r.channel_id;
        END IF;
    END IF;

    FOR rename_record IN
        SELECT *
          FROM (VALUES
              ('ai_pricing_rule', 'provider_code', 'supplier_code'),
              ('ai_pricing_rule', 'channel_id', 'account_id'),
              ('ai_quota_policy', 'channel_group_id', 'account_group_id'),
              ('ai_request_trace', 'channel_group_id', 'account_group_id'),
              ('ai_request_trace', 'channel_group_snapshot', 'account_group_snapshot'),
              ('ai_request_trace', 'provider_id', 'supplier_id'),
              ('ai_request_trace', 'channel_id', 'account_id'),
              ('ai_request_trace', 'channel_name_snapshot', 'account_name_snapshot'),
              ('ai_routing_decision_log', 'selected_provider_id', 'selected_supplier_id'),
              ('ai_routing_rule', 'candidate_channels', 'candidate_account_groups'),
              ('ai_usage', 'channel_group_id', 'account_group_id'),
              ('ai_usage', 'channel_group_snapshot', 'account_group_snapshot'),
              ('ai_usage', 'provider_id', 'supplier_id'),
              ('ai_usage', 'channel_id', 'account_id'),
              ('ai_upstream_object_route', 'channel_group_id', 'account_group_id'),
              ('ai_upstream_object_route', 'provider_code', 'supplier_code'),
              ('ai_upstream_object_route', 'channel_id', 'account_id'),
              ('iam_gateway_api_key', 'channel_group_id', 'account_group_id')
          ) AS renames(table_name, old_column, new_column)
    LOOP
        SELECT EXISTS (
                   SELECT 1
                     FROM information_schema.columns
                    WHERE table_schema = current_schema()
                      AND table_name = rename_record.table_name
                      AND column_name = rename_record.old_column
               ),
               EXISTS (
                   SELECT 1
                     FROM information_schema.columns
                    WHERE table_schema = current_schema()
                      AND table_name = rename_record.table_name
                      AND column_name = rename_record.new_column
               )
          INTO old_exists, new_exists;
        IF old_exists AND new_exists THEN
            RAISE EXCEPTION
                'upstream routing reconciliation found both %.% and %.%',
                rename_record.table_name,
                rename_record.old_column,
                rename_record.table_name,
                rename_record.new_column;
        ELSIF old_exists THEN
            EXECUTE format(
                'ALTER TABLE %I RENAME COLUMN %I TO %I',
                rename_record.table_name,
                rename_record.old_column,
                rename_record.new_column
            );
        END IF;
    END LOOP;

    IF NOT EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name = 'ai_routing_decision_log'
           AND column_name = 'selected_credential_id'
    ) THEN
        ALTER TABLE ai_routing_decision_log
            ADD COLUMN selected_credential_id BIGINT;
    END IF;

    IF EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name = 'ai_routing_decision_log'
           AND column_name = 'selected_channel_id'
    ) THEN
        ALTER TABLE ai_routing_decision_log DROP COLUMN selected_channel_id;
    END IF;

    FOR cleanup_record IN
        SELECT *
          FROM (VALUES
              ('ai_request_trace', 'legacy_api_key_id'),
              ('ai_routing_decision_log', 'legacy_api_key_id'),
              ('ai_usage', 'legacy_api_key_id'),
              ('iam_gateway_api_key', 'legacy_api_key_id')
          ) AS cleanup(table_name, column_name)
    LOOP
        IF EXISTS (
            SELECT 1
              FROM information_schema.columns
             WHERE table_schema = current_schema()
               AND table_name = cleanup_record.table_name
               AND column_name = cleanup_record.column_name
        ) THEN
            EXECUTE format(
                'SELECT EXISTS (SELECT 1 FROM %I WHERE %I IS NOT NULL)',
                cleanup_record.table_name,
                cleanup_record.column_name
            ) INTO old_exists;
            IF old_exists THEN
                RAISE EXCEPTION
                    'retired column %.% still contains data; archive or reconcile it before migration',
                    cleanup_record.table_name,
                    cleanup_record.column_name;
            END IF;
            EXECUTE format(
                'ALTER TABLE %I DROP COLUMN %I',
                cleanup_record.table_name,
                cleanup_record.column_name
            );
        END IF;
    END LOOP;

    FOR cleanup_record IN
        SELECT *
          FROM (VALUES
              ('ai_usage', 'cost_amount'),
              ('ai_usage', 'unit_price_snapshot')
          ) AS cleanup(table_name, column_name)
    LOOP
        IF EXISTS (
            SELECT 1
              FROM information_schema.columns
             WHERE table_schema = current_schema()
               AND table_name = cleanup_record.table_name
               AND column_name = cleanup_record.column_name
        ) THEN
            EXECUTE format(
                'SELECT EXISTS (SELECT 1 FROM %I WHERE %I IS NOT NULL AND %I <> 0)',
                cleanup_record.table_name,
                cleanup_record.column_name,
                cleanup_record.column_name
            ) INTO old_exists;
            IF old_exists THEN
                RAISE EXCEPTION
                    'retired amount column %.% still contains non-zero data; reconcile it before migration',
                    cleanup_record.table_name,
                    cleanup_record.column_name;
            END IF;
            EXECUTE format(
                'ALTER TABLE %I DROP COLUMN %I',
                cleanup_record.table_name,
                cleanup_record.column_name
            );
        END IF;
    END LOOP;

    IF to_regclass('ai_usage_service_provider_edge') IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM ai_usage_service_provider_edge) THEN
            RAISE EXCEPTION
                'ai_usage_service_provider_edge still contains settlement rows; export and reconcile them before migration';
        END IF;
        DROP TABLE ai_usage_service_provider_edge;
    END IF;

    IF EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conrelid = 'ai_usage'::regclass
           AND conname = 'ai_usage_fact_pkey'
    ) AND NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conrelid = 'ai_usage'::regclass
           AND conname = 'ai_usage_pkey'
    ) THEN
        ALTER TABLE ai_usage
            RENAME CONSTRAINT ai_usage_fact_pkey TO ai_usage_pkey;
    END IF;

    FOR rename_record IN
        SELECT *
          FROM (VALUES
              ('iam_gateway_api_key_account_group', 'iam_gateway_api_key_channel_group_pkey', 'iam_gateway_api_key_account_group_pkey'),
              ('iam_gateway_api_key_account_group', 'ck_iam_gateway_api_key_channel_group_tenant_scope', 'ck_iam_gateway_api_key_account_group_tenant_scope'),
              ('iam_gateway_api_key_account_group', 'fk_iam_gateway_api_key_channel_group_api_key', 'fk_iam_gateway_api_key_account_group_api_key'),
              ('iam_gateway_api_key_account_group', 'ck_iam_gateway_api_key_channel_group_ids', 'ck_iam_gateway_api_key_account_group_ids'),
              ('iam_gateway_api_key_account_group', 'ck_iam_gateway_api_key_channel_group_weighting', 'ck_iam_gateway_api_key_account_group_weighting'),
              ('iam_gateway_api_key_account_group', 'ck_iam_gateway_api_key_channel_group_effective_interval', 'ck_iam_gateway_api_key_account_group_effective_interval'),
              ('ai_upstream_object_route', 'ai_provider_object_route_pkey', 'ai_upstream_object_route_pkey'),
              ('ai_upstream_object_route', 'ck_ai_provider_object_route_tenant_scope', 'ck_ai_upstream_object_route_tenant_scope')
          ) AS renames(table_name, old_name, new_name)
    LOOP
        SELECT EXISTS (
                   SELECT 1
                     FROM pg_constraint
                    WHERE conrelid = to_regclass(rename_record.table_name)
                      AND conname = rename_record.old_name
               ),
               EXISTS (
                   SELECT 1
                     FROM pg_constraint
                    WHERE conrelid = to_regclass(rename_record.table_name)
                      AND conname = rename_record.new_name
               )
          INTO old_exists, new_exists;
        IF old_exists AND new_exists THEN
            RAISE EXCEPTION
                'upstream routing reconciliation found both constraints % and % on %',
                rename_record.old_name,
                rename_record.new_name,
                rename_record.table_name;
        ELSIF old_exists THEN
            EXECUTE format(
                'ALTER TABLE %I RENAME CONSTRAINT %I TO %I',
                rename_record.table_name,
                rename_record.old_name,
                rename_record.new_name
            );
        END IF;
    END LOOP;

    FOR rename_record IN
        SELECT *
          FROM (VALUES
              ('idx_ai_quota_policy_model_channel_group', 'idx_ai_quota_policy_model_account_group'),
              ('idx_ai_model_mapping_rule_binding_channel_group_lookup', 'idx_ai_model_mapping_rule_binding_account_group_lookup'),
              ('idx_iam_gateway_api_key_ai_channel_group_status', 'idx_iam_gateway_api_key_ai_account_group_status'),
              ('uk_iam_gateway_api_key_channel_group_uuid', 'uk_iam_gateway_api_key_account_group_uuid'),
              ('uk_iam_gateway_api_key_channel_group_binding', 'uk_iam_gateway_api_key_account_group_binding'),
              ('idx_iam_gateway_api_key_channel_group_active', 'idx_iam_gateway_api_key_account_group_active'),
              ('idx_iam_gateway_api_key_channel_group_group', 'idx_iam_gateway_api_key_account_group_group'),
              ('uk_ai_provider_object_route_uuid', 'uk_ai_upstream_object_route_uuid'),
              ('uk_ai_provider_object_route_object', 'uk_ai_upstream_object_route_object'),
              ('idx_ai_provider_object_route_fast', 'idx_ai_upstream_object_route_fast'),
              ('idx_ai_provider_object_route_parent', 'idx_ai_upstream_object_route_parent'),
              ('idx_ai_provider_object_route_channel', 'idx_ai_upstream_object_route_account'),
              ('idx_ai_provider_object_route_expiry', 'idx_ai_upstream_object_route_expiry')
          ) AS renames(old_name, new_name)
    LOOP
        SELECT to_regclass(rename_record.old_name) IS NOT NULL,
               to_regclass(rename_record.new_name) IS NOT NULL
          INTO old_exists, new_exists;
        IF old_exists AND new_exists THEN
            EXECUTE format('DROP INDEX %I', rename_record.old_name);
        ELSIF old_exists THEN
            EXECUTE format(
                'ALTER INDEX %I RENAME TO %I',
                rename_record.old_name,
                rename_record.new_name
            );
        END IF;
    END LOOP;

    FOR rename_record IN
        SELECT *
          FROM (VALUES
              ('ai_pricing_rule', 'supplier_code'),
              ('ai_pricing_rule', 'account_id'),
              ('ai_quota_policy', 'account_group_id'),
              ('ai_request_trace', 'account_group_id'),
              ('ai_request_trace', 'account_group_snapshot'),
              ('ai_request_trace', 'supplier_id'),
              ('ai_request_trace', 'account_id'),
              ('ai_request_trace', 'account_name_snapshot'),
              ('ai_routing_decision_log', 'selected_supplier_id'),
              ('ai_routing_decision_log', 'selected_account_id'),
              ('ai_routing_decision_log', 'selected_credential_id'),
              ('ai_routing_rule', 'candidate_account_groups'),
              ('ai_usage', 'account_group_id'),
              ('ai_usage', 'account_group_snapshot'),
              ('ai_usage', 'supplier_id'),
              ('ai_usage', 'account_id'),
              ('ai_upstream_object_route', 'account_group_id'),
              ('ai_upstream_object_route', 'supplier_code'),
              ('ai_upstream_object_route', 'account_id'),
              ('iam_gateway_api_key', 'account_group_id'),
              ('iam_gateway_api_key_account_group', 'account_group_id'),
              ('iam_gateway_api_key_account_group', 'account_group_code')
          ) AS required(table_name, column_name)
    LOOP
        IF NOT EXISTS (
            SELECT 1
              FROM information_schema.columns
             WHERE table_schema = current_schema()
               AND table_name = rename_record.table_name
               AND column_name = rename_record.column_name
        ) THEN
            RAISE EXCEPTION
                'upstream routing reconciliation postcondition failed: %.% is missing',
                rename_record.table_name,
                rename_record.column_name;
        END IF;
    END LOOP;

    IF to_regclass('ai_provider_object_route') IS NOT NULL
       OR to_regclass('iam_gateway_api_key_channel_group') IS NOT NULL
       OR to_regclass('ai_usage_service_provider_edge') IS NOT NULL THEN
        RAISE EXCEPTION
            'upstream routing reconciliation postcondition failed: a retired table remains';
    END IF;
END
$sdkwork_migration$;

CREATE INDEX IF NOT EXISTS idx_ai_quota_policy_model_account_group
    ON ai_quota_policy
        (tenant_id, organization_id, model, account_group_id, status);

CREATE INDEX IF NOT EXISTS idx_ai_upstream_object_route_account
    ON ai_upstream_object_route
        (tenant_id, organization_id, account_group_id, account_id, status, id);

CREATE INDEX IF NOT EXISTS idx_iam_gateway_api_key_ai_account_group_status
    ON iam_gateway_api_key
        (tenant_id, organization_id, account_group_id, status, updated_at, id);

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_account_group_uuid
    ON iam_gateway_api_key_account_group (uuid)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_gateway_api_key_account_group_binding
    ON iam_gateway_api_key_account_group
        (tenant_id, organization_id, api_key_id, account_group_id, binding_role)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_iam_gateway_api_key_account_group_active
    ON iam_gateway_api_key_account_group
        (tenant_id, organization_id, api_key_id, status, priority, weight, id);

CREATE INDEX IF NOT EXISTS idx_iam_gateway_api_key_account_group_group
    ON iam_gateway_api_key_account_group
        (tenant_id, organization_id, account_group_id, status, priority, id);

COMMIT;
