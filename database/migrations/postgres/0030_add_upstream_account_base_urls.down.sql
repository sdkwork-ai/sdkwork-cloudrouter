-- sdkwork:migration
-- id: 0030_add_upstream_account_base_urls
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Roll back the default_base_url and protocols columns on
--   ai_upstream_account.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE ai_upstream_account
    DROP COLUMN IF EXISTS protocols;

ALTER TABLE ai_upstream_account
    DROP COLUMN IF EXISTS default_base_url;

COMMIT;
