-- sdkwork:migration
-- id: 0024_add_upstream_supplier_protocols
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Add the protocols JSONB array to ai_upstream_supplier so a supplier
--   can declare multiple LLM API protocols (LlmProtocolCode enum:
--   openai_chat_completions, openai_responses, anthropic_messages) with an
--   independent base URL per protocol. The existing protocol_code column stays
--   as the primary protocol (first item) for list display and verifier
--   compatibility. Column-addition-only migration; existing rows keep the
--   default empty array.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE ai_upstream_supplier ADD COLUMN IF NOT EXISTS protocols JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMIT;
