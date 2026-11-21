-- sdkwork:migration
-- id: 0029_api_key_group_binding_routing_strategy
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Migrate legacy api key account group bindings from routing_strategy
--   'auto' (follow group default) to the default business routing strategy
--   'price_first' (price priority). The binding table columns already exist;
--   this is a pure data migration. New bindings default to 'price_first'.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

UPDATE iam_gateway_api_key_account_group
   SET routing_strategy = 'price_first',
       updated_at = CURRENT_TIMESTAMP
 WHERE routing_strategy = 'auto'
   AND deleted_at IS NULL;

COMMIT;
