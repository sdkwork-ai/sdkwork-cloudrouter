-- sdkwork:migration
-- id: 0013_add_object_provider_name
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Add the display name column to object_provider so storage
--   providers can be named for maintenance and identification.
--   Existing rows keep an empty name; the admin UI falls back to
--   providerCode when name is empty.
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s
-- contract_version: 0.5.0
-- rewrite: column addition only; no row backfill

ALTER TABLE object_provider
    ADD COLUMN IF NOT EXISTS name VARCHAR(128) NOT NULL DEFAULT '';
