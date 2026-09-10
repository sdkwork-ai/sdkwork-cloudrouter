-- sdkwork:migration
-- id: 0041_ai_mcp_registry_and_gateway_membership
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Roll back the baseline-drift forward fix. Only valid while no data
--   has been written into the ai_mcp_* registry or iam_gateway_membership;
--   every writer would fail closed until the objects are re-provisioned.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

DROP INDEX IF EXISTS idx_ai_metering_usage_tenant_occurred;
DROP INDEX IF EXISTS idx_ai_metering_usage_settlement_claim;

DROP INDEX IF EXISTS idx_iam_gateway_membership_tenant_user_status;
DROP TABLE IF EXISTS iam_gateway_membership;

DROP INDEX IF EXISTS idx_ai_mcp_tool_scope_sort;
DROP INDEX IF EXISTS uk_ai_mcp_tool_scope_key;
DROP INDEX IF EXISTS uk_ai_mcp_tool_uuid;
DROP TABLE IF EXISTS ai_mcp_tool;

DROP INDEX IF EXISTS idx_ai_mcp_server_revision_scope_created;
DROP INDEX IF EXISTS uk_ai_mcp_server_revision_scope_no;
DROP INDEX IF EXISTS uk_ai_mcp_server_revision_uuid;
DROP TABLE IF EXISTS ai_mcp_server_revision;

DROP INDEX IF EXISTS idx_ai_mcp_server_scope_category;
DROP INDEX IF EXISTS idx_ai_mcp_server_scope_updated;
DROP INDEX IF EXISTS uk_ai_mcp_server_scope_key;
DROP INDEX IF EXISTS uk_ai_mcp_server_uuid;
DROP TABLE IF EXISTS ai_mcp_server;

DROP INDEX IF EXISTS idx_ai_mcp_binding_scope_priority;
DROP INDEX IF EXISTS uk_ai_mcp_binding_uuid;
DROP TABLE IF EXISTS ai_mcp_binding;

COMMIT;
