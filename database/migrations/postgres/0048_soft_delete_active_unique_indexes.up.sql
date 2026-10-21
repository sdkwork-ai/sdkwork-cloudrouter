-- sdkwork:migration
-- id: 0048_soft_delete_active_unique_indexes
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Make the user-preference and webhook-endpoint natural keys unique among active rows only, so a deleted row no longer blocks re-creating the same key.
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 30s
-- contract_version: 0.5.0
--
-- Both tables use soft delete. Their natural-key unique indexes previously
-- covered deleted rows too, so a user who removed a webhook endpoint could
-- never re-create the same `endpoint_code`. The registry now declares
-- `soft_delete_policy: active_unique`; the compiler emits the partial
-- predicate for clean installs and this migration converges existing ones.
-- The old index made duplicate active keys impossible, so the rebuild needs no
-- de-duplication pass and cannot fail on existing data.
DROP INDEX IF EXISTS uk_iam_user_preference_scope;
CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_user_preference_scope
    ON iam_user_preference (tenant_id, organization_id, user_id)
    WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS uk_integration_webhook_endpoint_scope_code;
CREATE UNIQUE INDEX IF NOT EXISTS uk_integration_webhook_endpoint_scope_code
    ON integration_webhook_endpoint (tenant_id, organization_id, endpoint_code)
    WHERE deleted_at IS NULL;
