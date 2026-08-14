-- sdkwork:migration
-- id: 0029_api_key_group_binding_routing_strategy
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Roll back the routing_strategy data migration. Explicitly configured
--   'weighted'/'quality_first' bindings are preserved; 'price_first' bindings
--   (the new default) are restored to the legacy 'auto' value.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

UPDATE iam_gateway_api_key_account_group
   SET routing_strategy = 'auto',
       updated_at = CURRENT_TIMESTAMP
 WHERE routing_strategy = 'price_first'
   AND deleted_at IS NULL;

COMMIT;
