-- sdkwork:migration
-- id: 0055_ai_capability_collections
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Reverses `0055_ai_capability_collections`. Only the four collection
--   tables created by this migration are removed; no sibling capability table
--   is touched, and every object is dropped in reverse dependency order so the
--   item/release foreign keys never block the drop sequence.
-- reversible: true
-- rollback: forward-fix
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

DROP INDEX IF EXISTS idx_ai_collection_release_published;
DROP INDEX IF EXISTS uk_ai_collection_release_order;
DROP TABLE IF EXISTS ai_collection_release;

DROP INDEX IF EXISTS idx_ai_collection_item_order;
DROP INDEX IF EXISTS uk_ai_collection_item_capability;
DROP TABLE IF EXISTS ai_collection_item;

DROP INDEX IF EXISTS idx_ai_collection_scope_featured;
DROP INDEX IF EXISTS idx_ai_collection_scope_category;
DROP INDEX IF EXISTS idx_ai_collection_scope_kind_status;
DROP INDEX IF EXISTS uk_ai_collection_scope_key;
DROP TABLE IF EXISTS ai_collection;

DROP INDEX IF EXISTS idx_ai_collection_category_parent;
DROP INDEX IF EXISTS idx_ai_collection_category_scope_kind;
DROP INDEX IF EXISTS uk_ai_collection_category_scope_code;
DROP TABLE IF EXISTS ai_collection_category;

COMMIT;
