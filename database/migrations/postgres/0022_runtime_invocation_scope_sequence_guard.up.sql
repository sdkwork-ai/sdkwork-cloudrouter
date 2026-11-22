-- sdkwork:migration
-- id: 0022_runtime_invocation_scope_sequence_guard
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Close the invocation ordinal race. The scope key columns
--   (conversation_id, chat_turn_id, agent_session_id) become NOT NULL with an
--   empty-string default so the scoped sequence unique index guards every row
--   (PostgreSQL unique indexes treat NULLs as distinct, which would let two
--   concurrent creators reuse the same invocation_no in the same scope).
--   The app_runtime_store now allocates ordinals inside a transaction behind
--   a scope advisory lock; this index is the final collision guard and fails
--   closed on 23505.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

UPDATE ai_runtime_invocation
SET conversation_id = '' WHERE conversation_id IS NULL;

UPDATE ai_runtime_invocation
SET chat_turn_id = '' WHERE chat_turn_id IS NULL;

UPDATE ai_runtime_invocation
SET agent_session_id = '' WHERE agent_session_id IS NULL;

ALTER TABLE ai_runtime_invocation ALTER COLUMN conversation_id SET DEFAULT '';
ALTER TABLE ai_runtime_invocation ALTER COLUMN chat_turn_id SET DEFAULT '';
ALTER TABLE ai_runtime_invocation ALTER COLUMN agent_session_id SET DEFAULT '';

ALTER TABLE ai_runtime_invocation ALTER COLUMN conversation_id SET NOT NULL;
ALTER TABLE ai_runtime_invocation ALTER COLUMN chat_turn_id SET NOT NULL;
ALTER TABLE ai_runtime_invocation ALTER COLUMN agent_session_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_runtime_invocation_scope_sequence
    ON ai_runtime_invocation (
        tenant_id,
        organization_id,
        user_id,
        conversation_id,
        chat_turn_id,
        agent_session_id,
        invocation_no
    );

COMMIT;
