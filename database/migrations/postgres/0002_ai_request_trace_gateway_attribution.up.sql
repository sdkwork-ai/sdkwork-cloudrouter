-- sdkwork:migration
-- id: 0002_ai_request_trace_gateway_attribution
-- engine: postgres
-- module: clawrouter
-- purpose: Add immutable gateway attribution snapshots, normalize trace error types, and add retention/query indexes.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 2min
-- contract_version: 0.3.0

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '2min';

ALTER TABLE ai_request_trace
    ADD COLUMN IF NOT EXISTS gateway_instance_id BIGINT,
    ADD COLUMN IF NOT EXISTS gateway_instance_code_snapshot VARCHAR(128),
    ADD COLUMN IF NOT EXISTS gateway_region_code_snapshot VARCHAR(64),
    ADD COLUMN IF NOT EXISTS gateway_node_name_snapshot VARCHAR(128);

-- Existing pre-release installations stored the logical error type as an
-- integer. The guarded block also supports fresh databases whose folded
-- baseline already contains VARCHAR(128), plus interrupted partial upgrades.
DO $sdkwork_migration$
DECLARE
    current_type TEXT;
    current_length INTEGER;
BEGIN
    SELECT data_type, character_maximum_length
      INTO current_type, current_length
      FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'ai_request_trace'
       AND column_name = 'error_type';

    IF current_type IS NULL THEN
        RAISE EXCEPTION 'ai_request_trace.error_type is missing';
    ELSIF current_type <> 'character varying'
       OR current_length IS DISTINCT FROM 128 THEN
        IF EXISTS (
            SELECT 1
              FROM ai_request_trace
             WHERE length(error_type::text) > 128
        ) THEN
            RAISE EXCEPTION
                'cannot normalize ai_request_trace.error_type: value exceeds 128 characters';
        END IF;
        ALTER TABLE ai_request_trace
            ALTER COLUMN error_type TYPE VARCHAR(128)
            USING CASE trim(error_type::text)
                WHEN '1' THEN 'provider_error'
                WHEN '2' THEN 'invalid_request_error'
                WHEN '3' THEN 'billing_error'
                ELSE NULLIF(trim(error_type::text), '')
            END;
    END IF;
END
$sdkwork_migration$;

CREATE INDEX IF NOT EXISTS idx_ai_request_trace_retention
    ON ai_request_trace (retention_until, id);

CREATE INDEX IF NOT EXISTS idx_ai_routing_decision_log_retention
    ON ai_routing_decision_log (retention_until, id);

CREATE INDEX IF NOT EXISTS idx_ai_config_change_event_retention
    ON ai_config_change_event (retention_until, id);

CREATE INDEX IF NOT EXISTS idx_ai_pricing_import_snapshot_retention
    ON ai_pricing_import_snapshot (retention_until, id);

CREATE INDEX IF NOT EXISTS idx_ai_usage_retention
    ON ai_usage (retention_until, id);

COMMIT;
