-- sdkwork:migration
-- id: 0007_reconcile_canonical_contract_constraints
-- engine: postgres
-- module: clawrouter
-- purpose: Reconcile legacy nullability, constraints, and soft-delete-aware unique indexes with the canonical contract.
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: access-exclusive-on-clawrouter-contract-tables
-- lock_timeout: 5s
-- statement_timeout: 5min
-- estimated_size: Metadata changes plus validation scans of Claw Router-owned routing, pricing, trace, and usage tables.
-- write_traffic: Stop Claw Router configuration, routing, pricing, trace, and usage writes while this migration runs.
-- rewrite: Nullability and constraint changes are metadata-only when existing rows satisfy the contract; unique indexes are rebuilt.
-- replication_impact: Catalog DDL and bounded index WAL; monitor lock waits, WAL bytes, and replica lag.
-- backfill: None; invalid null, scope, range, relationship, or uniqueness data fails closed for explicit repair.
-- observability: Migration history, PostgreSQL lock waits, constraint validation, index predicates, schema readiness, and drift status.
-- cancellation: Transaction rollback restores all prior nullability, constraints, and indexes.
-- recovery: Repair the named contract violation and rerun this migration without changing prior lifecycle history.
-- contract_version: 0.4.0

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '5min';

DO $sdkwork_search_path$
DECLARE
    canonical_schema TEXT := current_schema();
BEGIN
    IF canonical_schema IS NULL THEN
        RAISE EXCEPTION
            'canonical contract reconciliation requires a canonical schema at the start of search_path';
    END IF;
    PERFORM set_config('search_path', quote_ident(canonical_schema), true);
END
$sdkwork_search_path$;

DO $sdkwork_migration$
DECLARE
    required_table TEXT;
BEGIN
    FOREACH required_table IN ARRAY ARRAY[
        'ai_config_change_event',
        'ai_config_version',
        'ai_model_mapping_rule',
        'ai_model_mapping_rule_binding',
        'ai_model_mapping_rule_item',
        'ai_pricing_import_snapshot',
        'ai_pricing_plan',
        'ai_pricing_plan_binding',
        'ai_pricing_rule',
        'ai_pricing_tier',
        'ai_quota_policy',
        'ai_request_trace',
        'ai_routing_decision_log',
        'ai_routing_policy',
        'ai_routing_profile',
        'ai_routing_rule',
        'ai_usage'
    ] LOOP
        IF to_regclass(required_table) IS NULL THEN
            RAISE EXCEPTION
                'canonical contract reconciliation requires table %, but it is missing',
                required_table;
        END IF;
    END LOOP;
END
$sdkwork_migration$;

ALTER TABLE ai_pricing_import_snapshot
    ALTER COLUMN request_id DROP NOT NULL;

ALTER TABLE ai_pricing_tier
    ALTER COLUMN pricing_rule_id SET NOT NULL;

ALTER TABLE ai_request_trace
    ALTER COLUMN request_id SET NOT NULL,
    ALTER COLUMN attempt_no SET NOT NULL,
    ALTER COLUMN started_at SET NOT NULL;

ALTER TABLE ai_routing_policy
    ALTER COLUMN policy_code SET NOT NULL;

ALTER TABLE ai_routing_profile
    ALTER COLUMN policy_id SET NOT NULL,
    ALTER COLUMN profile_version SET NOT NULL;

ALTER TABLE ai_routing_rule
    ALTER COLUMN profile_id SET NOT NULL,
    ALTER COLUMN rule_code SET NOT NULL;

ALTER TABLE ai_usage
    ALTER COLUMN request_id SET NOT NULL,
    ALTER COLUMN usage_type SET NOT NULL,
    ALTER COLUMN billing_meter_code SET NOT NULL,
    ALTER COLUMN billable_quantity SET NOT NULL,
    ALTER COLUMN currency SET NOT NULL,
    ALTER COLUMN occurred_at SET NOT NULL,
    ALTER COLUMN settlement_status SET NOT NULL,
    ALTER COLUMN idempotency_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_plan_scope_id
    ON ai_pricing_plan (tenant_id, organization_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_pricing_rule_scope_id
    ON ai_pricing_rule (tenant_id, organization_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_policy_scope_id
    ON ai_routing_policy (tenant_id, organization_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_routing_profile_scope_id
    ON ai_routing_profile (tenant_id, organization_id, id);

DROP INDEX IF EXISTS uk_ai_model_mapping_rule_uuid;
CREATE UNIQUE INDEX uk_ai_model_mapping_rule_uuid
    ON ai_model_mapping_rule (uuid)
    WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS uk_ai_model_mapping_rule_binding_uuid;
CREATE UNIQUE INDEX uk_ai_model_mapping_rule_binding_uuid
    ON ai_model_mapping_rule_binding (uuid)
    WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS uk_ai_model_mapping_rule_binding_target;
CREATE UNIQUE INDEX uk_ai_model_mapping_rule_binding_target
    ON ai_model_mapping_rule_binding
        (tenant_id, organization_id, rule_id, binding_type, binding_id, binding_code)
    WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS uk_ai_model_mapping_rule_item_uuid;
CREATE UNIQUE INDEX uk_ai_model_mapping_rule_item_uuid
    ON ai_model_mapping_rule_item (uuid)
    WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS uk_ai_pricing_plan_uuid;
CREATE UNIQUE INDEX uk_ai_pricing_plan_uuid
    ON ai_pricing_plan (uuid)
    WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS uk_ai_pricing_plan_tenant_code;
CREATE UNIQUE INDEX uk_ai_pricing_plan_tenant_code
    ON ai_pricing_plan (tenant_id, organization_id, plan_code)
    WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS uk_ai_pricing_plan_binding_uuid;
CREATE UNIQUE INDEX uk_ai_pricing_plan_binding_uuid
    ON ai_pricing_plan_binding (uuid)
    WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS uk_ai_pricing_plan_binding_subject;
CREATE UNIQUE INDEX uk_ai_pricing_plan_binding_subject
    ON ai_pricing_plan_binding
        (tenant_id, organization_id, subject_type, subject_id, pricing_plan_id)
    WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS uk_ai_pricing_rule_uuid;
CREATE UNIQUE INDEX uk_ai_pricing_rule_uuid
    ON ai_pricing_rule (uuid)
    WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS uk_ai_pricing_rule_plan_code;
CREATE UNIQUE INDEX uk_ai_pricing_rule_plan_code
    ON ai_pricing_rule (tenant_id, organization_id, pricing_plan_id, rule_code)
    WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS uk_ai_pricing_tier_uuid;
CREATE UNIQUE INDEX uk_ai_pricing_tier_uuid
    ON ai_pricing_tier (uuid)
    WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS uk_ai_pricing_tier_rule_code;
CREATE UNIQUE INDEX uk_ai_pricing_tier_rule_code
    ON ai_pricing_tier (tenant_id, organization_id, pricing_rule_id, tier_code)
    WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS uk_ai_quota_policy_tenant_subject;
CREATE UNIQUE INDEX uk_ai_quota_policy_tenant_subject
    ON ai_quota_policy
        (tenant_id, organization_id, subject_type, subject_id, quota_period, quota_unit)
    WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS uk_ai_routing_profile_policy_version;
CREATE UNIQUE INDEX uk_ai_routing_profile_policy_version
    ON ai_routing_profile (policy_id, profile_version)
    WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS uk_ai_routing_rule_profile_code;
CREATE UNIQUE INDEX uk_ai_routing_rule_profile_code
    ON ai_routing_rule (profile_id, rule_code)
    WHERE deleted_at IS NULL;

ALTER TABLE ai_config_change_event
    DROP CONSTRAINT IF EXISTS ck_ai_config_change_event_tenant_scope,
    ADD CONSTRAINT ck_ai_config_change_event_tenant_scope
        CHECK (tenant_id > 0 AND organization_id >= 0);

ALTER TABLE ai_config_version
    DROP CONSTRAINT IF EXISTS ck_ai_config_version_tenant_scope,
    ADD CONSTRAINT ck_ai_config_version_tenant_scope
        CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0));

ALTER TABLE ai_model_mapping_rule
    DROP CONSTRAINT IF EXISTS ck_ai_model_mapping_rule_tenant_scope,
    ADD CONSTRAINT ck_ai_model_mapping_rule_tenant_scope
        CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0));

ALTER TABLE ai_model_mapping_rule_binding
    DROP CONSTRAINT IF EXISTS ck_ai_model_mapping_rule_binding_tenant_scope,
    ADD CONSTRAINT ck_ai_model_mapping_rule_binding_tenant_scope
        CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0));

ALTER TABLE ai_model_mapping_rule_item
    DROP CONSTRAINT IF EXISTS ck_ai_model_mapping_rule_item_tenant_scope,
    ADD CONSTRAINT ck_ai_model_mapping_rule_item_tenant_scope
        CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0));

ALTER TABLE ai_pricing_import_snapshot
    DROP CONSTRAINT IF EXISTS ck_ai_pricing_import_snapshot_tenant_scope,
    ADD CONSTRAINT ck_ai_pricing_import_snapshot_tenant_scope
        CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0));

ALTER TABLE ai_pricing_plan
    DROP CONSTRAINT IF EXISTS ck_ai_pricing_plan_tenant_scope,
    DROP CONSTRAINT IF EXISTS ck_ai_pricing_plan_non_negative_amounts,
    DROP CONSTRAINT IF EXISTS ck_ai_pricing_plan_effective_interval,
    ADD CONSTRAINT ck_ai_pricing_plan_tenant_scope
        CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    ADD CONSTRAINT ck_ai_pricing_plan_non_negative_amounts
        CHECK (
            (default_multiplier IS NULL OR default_multiplier >= 0)
            AND (default_markup_amount IS NULL OR default_markup_amount >= 0)
            AND (min_charge_amount IS NULL OR min_charge_amount >= 0)
        ),
    ADD CONSTRAINT ck_ai_pricing_plan_effective_interval
        CHECK (effective_to IS NULL OR effective_to > effective_from);

ALTER TABLE ai_pricing_plan_binding
    DROP CONSTRAINT IF EXISTS ck_ai_pricing_plan_binding_tenant_scope,
    ADD CONSTRAINT ck_ai_pricing_plan_binding_tenant_scope
        CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0));

ALTER TABLE ai_pricing_rule
    DROP CONSTRAINT IF EXISTS ck_ai_pricing_rule_tenant_scope,
    DROP CONSTRAINT IF EXISTS fk_ai_pricing_rule_plan,
    DROP CONSTRAINT IF EXISTS ck_ai_pricing_rule_positive_units,
    DROP CONSTRAINT IF EXISTS ck_ai_pricing_rule_non_negative_amounts,
    DROP CONSTRAINT IF EXISTS ck_ai_pricing_rule_effective_interval,
    ADD CONSTRAINT ck_ai_pricing_rule_tenant_scope
        CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    ADD CONSTRAINT fk_ai_pricing_rule_plan
        FOREIGN KEY (tenant_id, organization_id, pricing_plan_id)
        REFERENCES ai_pricing_plan (tenant_id, organization_id, id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT ck_ai_pricing_rule_positive_units
        CHECK (
            (unit_size IS NULL OR unit_size > 0)
            AND (minimum_quantity IS NULL OR minimum_quantity >= 0)
            AND (quantity_step IS NULL OR quantity_step > 0)
            AND (included_quantity IS NULL OR included_quantity >= 0)
        ),
    ADD CONSTRAINT ck_ai_pricing_rule_non_negative_amounts
        CHECK (
            (multiplier IS NULL OR multiplier >= 0)
            AND (markup_amount IS NULL OR markup_amount >= 0)
            AND (unit_price_override IS NULL OR unit_price_override >= 0)
        ),
    ADD CONSTRAINT ck_ai_pricing_rule_effective_interval
        CHECK (effective_to IS NULL OR effective_to > effective_from);

ALTER TABLE ai_pricing_tier
    DROP CONSTRAINT IF EXISTS ck_ai_pricing_tier_tenant_scope,
    DROP CONSTRAINT IF EXISTS fk_ai_pricing_tier_rule,
    DROP CONSTRAINT IF EXISTS ck_ai_pricing_tier_quantity_range,
    DROP CONSTRAINT IF EXISTS ck_ai_pricing_tier_non_negative_amounts,
    DROP CONSTRAINT IF EXISTS ck_ai_pricing_tier_effective_interval,
    ADD CONSTRAINT ck_ai_pricing_tier_tenant_scope
        CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    ADD CONSTRAINT fk_ai_pricing_tier_rule
        FOREIGN KEY (tenant_id, organization_id, pricing_rule_id)
        REFERENCES ai_pricing_rule (tenant_id, organization_id, id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT ck_ai_pricing_tier_quantity_range
        CHECK (
            (min_quantity IS NULL OR min_quantity >= 0)
            AND (max_quantity IS NULL OR max_quantity >= 0)
            AND (min_quantity IS NULL OR max_quantity IS NULL OR max_quantity >= min_quantity)
            AND (quantity_step IS NULL OR quantity_step > 0)
            AND (included_quantity IS NULL OR included_quantity >= 0)
        ),
    ADD CONSTRAINT ck_ai_pricing_tier_non_negative_amounts
        CHECK (
            (input_unit_price IS NULL OR input_unit_price >= 0)
            AND (output_unit_price IS NULL OR output_unit_price >= 0)
            AND (cache_write_unit_price IS NULL OR cache_write_unit_price >= 0)
            AND (cache_read_unit_price IS NULL OR cache_read_unit_price >= 0)
            AND (image_unit_price IS NULL OR image_unit_price >= 0)
            AND (audio_unit_price IS NULL OR audio_unit_price >= 0)
            AND (video_unit_price IS NULL OR video_unit_price >= 0)
            AND (per_request_price IS NULL OR per_request_price >= 0)
            AND (multiplier IS NULL OR multiplier >= 0)
        ),
    ADD CONSTRAINT ck_ai_pricing_tier_effective_interval
        CHECK (effective_to IS NULL OR effective_to > effective_from);

ALTER TABLE ai_quota_policy
    DROP CONSTRAINT IF EXISTS ck_ai_quota_policy_tenant_scope,
    ADD CONSTRAINT ck_ai_quota_policy_tenant_scope
        CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0));

ALTER TABLE ai_request_trace
    DROP CONSTRAINT IF EXISTS ck_ai_request_trace_tenant_scope,
    DROP CONSTRAINT IF EXISTS ck_ai_request_trace_attempt,
    DROP CONSTRAINT IF EXISTS ck_ai_request_trace_http_status,
    DROP CONSTRAINT IF EXISTS ck_ai_request_trace_non_negative_metrics,
    ADD CONSTRAINT ck_ai_request_trace_tenant_scope
        CHECK (tenant_id > 0 AND organization_id >= 0),
    ADD CONSTRAINT ck_ai_request_trace_attempt
        CHECK (attempt_no >= 1),
    ADD CONSTRAINT ck_ai_request_trace_http_status
        CHECK (http_status IS NULL OR http_status BETWEEN 100 AND 599),
    ADD CONSTRAINT ck_ai_request_trace_non_negative_metrics
        CHECK (
            (latency_ms IS NULL OR latency_ms >= 0)
            AND (ttft_ms IS NULL OR ttft_ms >= 0)
            AND (prompt_tokens IS NULL OR prompt_tokens >= 0)
            AND (completion_tokens IS NULL OR completion_tokens >= 0)
            AND (cached_tokens IS NULL OR cached_tokens >= 0)
            AND (total_tokens IS NULL OR total_tokens >= 0)
        );

ALTER TABLE ai_routing_decision_log
    DROP CONSTRAINT IF EXISTS ck_ai_routing_decision_log_tenant_scope,
    ADD CONSTRAINT ck_ai_routing_decision_log_tenant_scope
        CHECK (tenant_id > 0 AND organization_id >= 0);

ALTER TABLE ai_routing_policy
    DROP CONSTRAINT IF EXISTS ck_ai_routing_policy_tenant_scope,
    DROP CONSTRAINT IF EXISTS ck_ai_routing_policy_non_negative_limits,
    ADD CONSTRAINT ck_ai_routing_policy_tenant_scope
        CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    ADD CONSTRAINT ck_ai_routing_policy_non_negative_limits
        CHECK (
            (slo_latency_ms IS NULL OR slo_latency_ms >= 0)
            AND (cost_ceiling IS NULL OR cost_ceiling >= 0)
        );

ALTER TABLE ai_routing_profile
    DROP CONSTRAINT IF EXISTS ck_ai_routing_profile_tenant_scope,
    DROP CONSTRAINT IF EXISTS fk_ai_routing_profile_policy,
    DROP CONSTRAINT IF EXISTS ck_ai_routing_profile_version,
    ADD CONSTRAINT ck_ai_routing_profile_tenant_scope
        CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    ADD CONSTRAINT fk_ai_routing_profile_policy
        FOREIGN KEY (tenant_id, organization_id, policy_id)
        REFERENCES ai_routing_policy (tenant_id, organization_id, id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT ck_ai_routing_profile_version
        CHECK (profile_version > 0);

ALTER TABLE ai_routing_rule
    DROP CONSTRAINT IF EXISTS ck_ai_routing_rule_tenant_scope,
    DROP CONSTRAINT IF EXISTS fk_ai_routing_rule_profile,
    DROP CONSTRAINT IF EXISTS ck_ai_routing_rule_priority,
    DROP CONSTRAINT IF EXISTS ck_ai_routing_rule_effective_interval,
    ADD CONSTRAINT ck_ai_routing_rule_tenant_scope
        CHECK (tenant_id >= 0 AND organization_id >= 0 AND (tenant_id > 0 OR organization_id = 0)),
    ADD CONSTRAINT fk_ai_routing_rule_profile
        FOREIGN KEY (tenant_id, organization_id, profile_id)
        REFERENCES ai_routing_profile (tenant_id, organization_id, id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT ck_ai_routing_rule_priority
        CHECK (priority IS NULL OR priority >= 0),
    ADD CONSTRAINT ck_ai_routing_rule_effective_interval
        CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from);

ALTER TABLE ai_usage
    DROP CONSTRAINT IF EXISTS ck_ai_usage_tenant_scope,
    DROP CONSTRAINT IF EXISTS uk_ai_usage_scope_id,
    DROP CONSTRAINT IF EXISTS uk_ai_usage_idempotency,
    DROP CONSTRAINT IF EXISTS ck_ai_usage_non_negative_counts,
    DROP CONSTRAINT IF EXISTS ck_ai_usage_non_negative_amounts,
    DROP CONSTRAINT IF EXISTS ck_ai_usage_currency,
    ADD CONSTRAINT ck_ai_usage_tenant_scope
        CHECK (tenant_id > 0 AND organization_id >= 0),
    ADD CONSTRAINT ck_ai_usage_non_negative_counts
        CHECK (
            (prompt_tokens IS NULL OR prompt_tokens >= 0)
            AND (completion_tokens IS NULL OR completion_tokens >= 0)
            AND (cached_tokens IS NULL OR cached_tokens >= 0)
            AND (total_tokens IS NULL OR total_tokens >= 0)
            AND (request_count IS NULL OR request_count >= 0)
            AND (result_count IS NULL OR result_count >= 0)
            AND (item_count IS NULL OR item_count >= 0)
            AND (character_count IS NULL OR character_count >= 0)
            AND (image_count IS NULL OR image_count >= 0)
        ),
    ADD CONSTRAINT ck_ai_usage_non_negative_amounts
        CHECK (
            billable_quantity >= 0
            AND (audio_seconds IS NULL OR audio_seconds >= 0)
            AND (video_seconds IS NULL OR video_seconds >= 0)
            AND (storage_byte_hours IS NULL OR storage_byte_hours >= 0)
            AND (official_reference_amount IS NULL OR official_reference_amount >= 0)
            AND (upstream_cost_amount IS NULL OR upstream_cost_amount >= 0)
            AND (customer_charge_amount IS NULL OR customer_charge_amount >= 0)
        ),
    ADD CONSTRAINT ck_ai_usage_currency
        CHECK (length(trim(currency)) BETWEEN 3 AND 10);

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_usage_scope_id
    ON ai_usage (tenant_id, organization_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_usage_idempotency
    ON ai_usage (tenant_id, organization_id, idempotency_key);

ALTER TABLE ai_usage
    ADD CONSTRAINT uk_ai_usage_scope_id
        UNIQUE USING INDEX uk_ai_usage_scope_id,
    ADD CONSTRAINT uk_ai_usage_idempotency
        UNIQUE USING INDEX uk_ai_usage_idempotency;

DO $sdkwork_migration$
DECLARE
    canonical_not_null_count INTEGER;
    canonical_constraint_count INTEGER;
    canonical_partial_index_count INTEGER;
    canonical_scope_index_count INTEGER;
    import_request_nullable BOOLEAN;
BEGIN
    SELECT count(*)
      INTO canonical_not_null_count
      FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND (table_name, column_name) IN (
           ('ai_pricing_tier', 'pricing_rule_id'),
           ('ai_request_trace', 'request_id'),
           ('ai_request_trace', 'attempt_no'),
           ('ai_request_trace', 'started_at'),
           ('ai_routing_policy', 'policy_code'),
           ('ai_routing_profile', 'policy_id'),
           ('ai_routing_profile', 'profile_version'),
           ('ai_routing_rule', 'profile_id'),
           ('ai_routing_rule', 'rule_code'),
           ('ai_usage', 'request_id'),
           ('ai_usage', 'usage_type'),
           ('ai_usage', 'billing_meter_code'),
           ('ai_usage', 'billable_quantity'),
           ('ai_usage', 'currency'),
           ('ai_usage', 'occurred_at'),
           ('ai_usage', 'settlement_status'),
           ('ai_usage', 'idempotency_key')
       )
       AND is_nullable = 'NO';

    SELECT is_nullable = 'YES'
      INTO import_request_nullable
      FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'ai_pricing_import_snapshot'
       AND column_name = 'request_id';

    SELECT count(*)
      INTO canonical_constraint_count
      FROM (VALUES
          ('ai_config_change_event', 'ck_ai_config_change_event_tenant_scope'),
          ('ai_config_version', 'ck_ai_config_version_tenant_scope'),
          ('ai_model_mapping_rule', 'ck_ai_model_mapping_rule_tenant_scope'),
          ('ai_model_mapping_rule_binding', 'ck_ai_model_mapping_rule_binding_tenant_scope'),
          ('ai_model_mapping_rule_item', 'ck_ai_model_mapping_rule_item_tenant_scope'),
          ('ai_pricing_import_snapshot', 'ck_ai_pricing_import_snapshot_tenant_scope'),
          ('ai_pricing_plan', 'ck_ai_pricing_plan_tenant_scope'),
          ('ai_pricing_plan', 'ck_ai_pricing_plan_non_negative_amounts'),
          ('ai_pricing_plan', 'ck_ai_pricing_plan_effective_interval'),
          ('ai_pricing_plan_binding', 'ck_ai_pricing_plan_binding_tenant_scope'),
          ('ai_pricing_rule', 'ck_ai_pricing_rule_tenant_scope'),
          ('ai_pricing_rule', 'fk_ai_pricing_rule_plan'),
          ('ai_pricing_rule', 'ck_ai_pricing_rule_positive_units'),
          ('ai_pricing_rule', 'ck_ai_pricing_rule_non_negative_amounts'),
          ('ai_pricing_rule', 'ck_ai_pricing_rule_effective_interval'),
          ('ai_pricing_tier', 'ck_ai_pricing_tier_tenant_scope'),
          ('ai_pricing_tier', 'fk_ai_pricing_tier_rule'),
          ('ai_pricing_tier', 'ck_ai_pricing_tier_quantity_range'),
          ('ai_pricing_tier', 'ck_ai_pricing_tier_non_negative_amounts'),
          ('ai_pricing_tier', 'ck_ai_pricing_tier_effective_interval'),
          ('ai_quota_policy', 'ck_ai_quota_policy_tenant_scope'),
          ('ai_request_trace', 'ck_ai_request_trace_tenant_scope'),
          ('ai_request_trace', 'ck_ai_request_trace_attempt'),
          ('ai_request_trace', 'ck_ai_request_trace_http_status'),
          ('ai_request_trace', 'ck_ai_request_trace_non_negative_metrics'),
          ('ai_routing_decision_log', 'ck_ai_routing_decision_log_tenant_scope'),
          ('ai_routing_policy', 'ck_ai_routing_policy_tenant_scope'),
          ('ai_routing_policy', 'ck_ai_routing_policy_non_negative_limits'),
          ('ai_routing_profile', 'ck_ai_routing_profile_tenant_scope'),
          ('ai_routing_profile', 'fk_ai_routing_profile_policy'),
          ('ai_routing_profile', 'ck_ai_routing_profile_version'),
          ('ai_routing_rule', 'ck_ai_routing_rule_tenant_scope'),
          ('ai_routing_rule', 'fk_ai_routing_rule_profile'),
          ('ai_routing_rule', 'ck_ai_routing_rule_priority'),
          ('ai_routing_rule', 'ck_ai_routing_rule_effective_interval'),
          ('ai_usage', 'ck_ai_usage_tenant_scope'),
          ('ai_usage', 'uk_ai_usage_scope_id'),
          ('ai_usage', 'uk_ai_usage_idempotency'),
          ('ai_usage', 'ck_ai_usage_non_negative_counts'),
          ('ai_usage', 'ck_ai_usage_non_negative_amounts'),
          ('ai_usage', 'ck_ai_usage_currency')
      ) AS expected(table_name, constraint_name)
      JOIN pg_constraint constraint_record
        ON constraint_record.conrelid = to_regclass(expected.table_name)
       AND constraint_record.conname = expected.constraint_name
       AND constraint_record.convalidated;

    SELECT count(*)
      INTO canonical_partial_index_count
      FROM pg_class index_record
      JOIN pg_index index_metadata
        ON index_metadata.indexrelid = index_record.oid
     WHERE index_record.relnamespace = current_schema()::regnamespace
       AND index_record.relname IN (
           'uk_ai_model_mapping_rule_uuid',
           'uk_ai_model_mapping_rule_binding_uuid',
           'uk_ai_model_mapping_rule_binding_target',
           'uk_ai_model_mapping_rule_item_uuid',
           'uk_ai_pricing_plan_uuid',
           'uk_ai_pricing_plan_tenant_code',
           'uk_ai_pricing_plan_binding_uuid',
           'uk_ai_pricing_plan_binding_subject',
           'uk_ai_pricing_rule_uuid',
           'uk_ai_pricing_rule_plan_code',
           'uk_ai_pricing_tier_uuid',
           'uk_ai_pricing_tier_rule_code',
           'uk_ai_quota_policy_tenant_subject',
           'uk_ai_routing_profile_policy_version',
           'uk_ai_routing_rule_profile_code'
       )
       AND pg_get_expr(index_metadata.indpred, index_metadata.indrelid)
           LIKE '%deleted_at IS NULL%';

    SELECT count(*)
      INTO canonical_scope_index_count
      FROM pg_class index_record
      JOIN pg_index index_metadata
        ON index_metadata.indexrelid = index_record.oid
     WHERE index_record.relnamespace = current_schema()::regnamespace
       AND index_record.relname IN (
           'uk_ai_pricing_plan_scope_id',
           'uk_ai_pricing_rule_scope_id',
           'uk_ai_routing_policy_scope_id',
           'uk_ai_routing_profile_scope_id'
       )
       AND index_metadata.indisunique
       AND index_metadata.indpred IS NULL;

    IF canonical_not_null_count <> 17
       OR import_request_nullable IS DISTINCT FROM TRUE
       OR canonical_constraint_count <> 41
       OR canonical_partial_index_count <> 15
       OR canonical_scope_index_count <> 4 THEN
        RAISE EXCEPTION
            'canonical contract verification failed: not-null %, import request nullable %, constraints %, partial indexes %, scope indexes %',
            canonical_not_null_count,
            import_request_nullable,
            canonical_constraint_count,
            canonical_partial_index_count,
            canonical_scope_index_count;
    END IF;
END
$sdkwork_migration$;

COMMIT;
