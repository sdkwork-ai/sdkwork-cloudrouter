-- sdkwork:migration
-- id: 0008_add_api_key_secret_storage
-- engine: postgres
-- module: sdkwork-clawrouter
-- purpose: Add raw API key secret storage columns to iam_gateway_api_key.
--   Keys are stored either as plaintext (default) or AEAD ciphertext so
--   management surfaces can re-display the raw key. Existing rows have no
--   stored secret and keep key_secret_mode 'plaintext' with NULL columns.
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s
-- contract_version: 0.4.0
-- rewrite: column addition only; no row backfill

ALTER TABLE iam_gateway_api_key
    ADD COLUMN IF NOT EXISTS key_secret_mode VARCHAR(16) NOT NULL DEFAULT 'plaintext';

ALTER TABLE iam_gateway_api_key
    ADD COLUMN IF NOT EXISTS key_secret_plaintext TEXT;

ALTER TABLE iam_gateway_api_key
    ADD COLUMN IF NOT EXISTS key_secret_ciphertext TEXT;

ALTER TABLE iam_gateway_api_key
    ADD COLUMN IF NOT EXISTS key_secret_key_id VARCHAR(64);
