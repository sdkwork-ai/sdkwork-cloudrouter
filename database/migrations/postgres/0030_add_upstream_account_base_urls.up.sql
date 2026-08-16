-- sdkwork:migration
-- id: 0030_add_upstream_account_base_urls
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Add default_base_url and protocols to ai_upstream_account so an
--   account can override the supplier-level Base URL resolution with its own
--   fallback Base URL and per-protocol (LlmProtocolCode: openai_chat_completions,
--   openai_responses, anthropic_messages) Base URLs. Mirrors the supplier
--   fields (0024 protocols, 0028 default_base_url); when using a Base URL the
--   account configuration wins over the supplier configuration. Empty array
--   means no per-protocol overrides (inherit from the supplier).
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE ai_upstream_account
    ADD COLUMN IF NOT EXISTS default_base_url VARCHAR(2048);

ALTER TABLE ai_upstream_account
    ADD COLUMN IF NOT EXISTS protocols JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMIT;
