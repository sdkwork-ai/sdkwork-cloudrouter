-- sdkwork:migration
-- id: 0021_add_runtime_event_artifact_tables
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Roll back the runtime event and artifact tables.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

DROP TABLE IF EXISTS ai_runtime_invocation_event;
DROP TABLE IF EXISTS ai_runtime_artifact;

COMMIT;
