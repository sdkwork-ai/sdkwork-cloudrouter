-- sdkwork:migration
-- id: 0006_align_chat_runtime_optional_cost
-- engine: postgres
-- module: clawrouter
-- purpose: Align chat runtime cost columns with the optional decimal contract.
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: access-exclusive-on-chat-runtime-tables
-- lock_timeout: 2s
-- statement_timeout: 1min
-- estimated_size: Metadata-only nullability, default, and check-constraint changes; no table rewrite expected.
-- write_traffic: Briefly pause chat writes while table constraints are replaced.
-- rewrite: PostgreSQL metadata-only ALTER COLUMN and CHECK constraint replacement.
-- replication_impact: Catalog DDL only; monitor lock waits and replica apply delay.
-- backfill: None; existing non-null values remain valid and future unknown costs may be null.
-- observability: Migration history, PostgreSQL lock waits, schema readiness, and drift verification.
-- cancellation: Transaction rollback restores the original nullability, defaults, and constraints.
-- recovery: Resolve lock contention and rerun; use a reviewed forward-fix for any unexpected contract conflict.
-- contract_version: 0.4.0

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '1min';

DO $sdkwork_migration$
BEGIN
    IF to_regclass('ai_chat_turn') IS NULL
       OR to_regclass('ai_runtime_usage_link') IS NULL THEN
        RAISE EXCEPTION
            'chat optional-cost migration requires the complete 0004 chat runtime schema';
    END IF;
END
$sdkwork_migration$;

ALTER TABLE ai_chat_turn
    ALTER COLUMN cost_amount DROP DEFAULT,
    ALTER COLUMN cost_amount DROP NOT NULL,
    DROP CONSTRAINT IF EXISTS ck_ai_chat_turn_non_negative_values,
    ADD CONSTRAINT ck_ai_chat_turn_non_negative_values
        CHECK (
            turn_no > 0
            AND input_token_total >= 0
            AND output_token_total >= 0
            AND cached_token_total >= 0
            AND reasoning_token_total >= 0
            AND (cost_amount IS NULL OR cost_amount >= 0)
            AND context_snapshot_count >= 0
            AND (final_output_item_id IS NULL OR final_output_item_id > 0)
            AND (context_snapshot_id IS NULL OR context_snapshot_id > 0)
        );

ALTER TABLE ai_runtime_usage_link
    ALTER COLUMN cost_amount DROP DEFAULT,
    ALTER COLUMN cost_amount DROP NOT NULL,
    DROP CONSTRAINT IF EXISTS ck_ai_runtime_usage_link_non_negative_values,
    ADD CONSTRAINT ck_ai_runtime_usage_link_non_negative_values
        CHECK (
            input_tokens >= 0
            AND output_tokens >= 0
            AND cached_tokens >= 0
            AND reasoning_tokens >= 0
            AND total_tokens >= 0
            AND (cost_amount IS NULL OR cost_amount >= 0)
            AND (usage_fact_id IS NULL OR usage_fact_id > 0)
        );

DO $sdkwork_migration$
DECLARE
    optional_cost_count INTEGER;
    nullable_check_count INTEGER;
BEGIN
    SELECT count(*)
      INTO optional_cost_count
      FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND (table_name, column_name) IN (
           ('ai_chat_turn', 'cost_amount'),
           ('ai_runtime_usage_link', 'cost_amount')
       )
       AND is_nullable = 'YES'
       AND column_default IS NULL;

    SELECT count(*)
      INTO nullable_check_count
      FROM pg_constraint
     WHERE conrelid IN (
               'ai_chat_turn'::regclass,
               'ai_runtime_usage_link'::regclass
           )
       AND conname IN (
               'ck_ai_chat_turn_non_negative_values',
               'ck_ai_runtime_usage_link_non_negative_values'
           )
       AND pg_get_constraintdef(oid) LIKE '%cost_amount IS NULL%';

    IF optional_cost_count <> 2 OR nullable_check_count <> 2 THEN
        RAISE EXCEPTION
            'chat optional-cost verification failed: columns %, constraints %',
            optional_cost_count,
            nullable_check_count;
    END IF;
END
$sdkwork_migration$;

COMMIT;
