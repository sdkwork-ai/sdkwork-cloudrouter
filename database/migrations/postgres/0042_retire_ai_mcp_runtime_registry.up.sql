-- sdkwork:migration
-- id: 0042_retire_ai_mcp_runtime_registry
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Retire the Cloud Router-owned half of the MCP runtime registry.
--
--   Migration 0041 created four `ai_mcp_*` tables here. Only two of them are
--   Cloud Router's:
--
--     * `ai_mcp_binding`          -- Cloud Router-owned
--     * `ai_mcp_server_revision`  -- Cloud Router-owned
--     * `ai_mcp_server`           -- owned by the sibling `sdkwork-mcp`
--     * `ai_mcp_tool`             -- owned by the sibling `sdkwork-mcp`
--
--   `sdkwork-mcp` declares `ai_mcp_server` and `ai_mcp_tool` in its own
--   baseline and serves the MCP API through its own assembly. Because 0041 used
--   `CREATE TABLE IF NOT EXISTS`, it silently no-opped on any database where
--   `sdkwork-mcp` had already created tables of those names; the ledger then
--   recorded 0041 as applied while the active shape stayed owned by the wrong
--   repository. That is why the live `ai_mcp_server` carries
--   `latest_connector_id` / `published_connector_id` / `tags_json` / `icon_ref`
--   -- `sdkwork-mcp`'s shape, not Cloud Router's.
--
--   Dropping `ai_mcp_server` / `ai_mcp_tool` here would destroy the sibling
--   repository's live objects and data, so this migration deliberately leaves
--   them alone: `sdkwork-mcp` remains the system of record and re-provisions
--   its own definitions through its own migrations. Cloud Router drops only the
--   two tables it actually owns, keeping no local MCP store -- matching the
--   prompt surface, owned by `sdkwork-prompts` in exactly the same way.
--
--   The `c_category` MCP *catalog* taxonomy (`data/categories/mcp/categories.json`,
--   categoryType 40) is a product-marketplace category seed unrelated to this
--   registry and is intentionally untouched.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

-- No FOREIGN KEY references these tables from other Cloud Router tables:
-- `ai_mcp_binding` and `ai_mcp_server_revision` carry bare `server_id` /
-- `tool_id` columns without constraint clauses, so the drop carries no cascade
-- risk -- including no risk into the retained `ai_mcp_server` / `ai_mcp_tool`.

DROP INDEX IF EXISTS idx_ai_mcp_server_revision_scope_created;
DROP INDEX IF EXISTS uk_ai_mcp_server_revision_scope_no;
DROP INDEX IF EXISTS uk_ai_mcp_server_revision_uuid;
DROP TABLE IF EXISTS ai_mcp_server_revision;

DROP INDEX IF EXISTS idx_ai_mcp_binding_scope_priority;
DROP INDEX IF EXISTS uk_ai_mcp_binding_uuid;
DROP TABLE IF EXISTS ai_mcp_binding;

COMMIT;
