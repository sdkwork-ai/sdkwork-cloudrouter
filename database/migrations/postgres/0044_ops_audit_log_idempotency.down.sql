-- sdkwork:migration
-- id: 0044_ops_audit_log_idempotency
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Remove the ops audit idempotency arbiter index.
DROP INDEX IF EXISTS ux_ops_audit_log_idempotency;
