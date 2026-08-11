-- sdkwork:migration
-- id: 0022_runtime_invocation_scope_sequence_guard
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Roll back the scope sequence guard. The unique index is dropped;
--   the scope key columns return to nullable with no default. Note that
--   existing rows keep their normalized empty-string values.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

DROP INDEX IF EXISTS uk_ai_runtime_invocation_scope_sequence;

ALTER TABLE ai_runtime_invocation ALTER COLUMN conversation_id DROP NOT NULL;
ALTER TABLE ai_runtime_invocation ALTER COLUMN chat_turn_id DROP NOT NULL;
ALTER TABLE ai_runtime_invocation ALTER COLUMN agent_session_id DROP NOT NULL;

ALTER TABLE ai_runtime_invocation ALTER COLUMN conversation_id DROP DEFAULT;
ALTER TABLE ai_runtime_invocation ALTER COLUMN chat_turn_id DROP DEFAULT;
ALTER TABLE ai_runtime_invocation ALTER COLUMN agent_session_id DROP DEFAULT;

COMMIT;
