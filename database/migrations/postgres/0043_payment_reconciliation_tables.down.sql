-- sdkwork:migration
-- id: 0043_payment_reconciliation_tables
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Roll back provisioning of the Cloud Router-owned payment
--   reconciliation tables so the migration is reversible.
--
--   Drops only the three tables this migration owns and creates: they are
--   Cloud Router-owned with no inbound foreign keys and no data written by any
--   sibling repository.
--
--   `commerce_payment_reconciliation_run` is intentionally NOT dropped: it is
--   owned by the `payment-control-plane` module (and, upstream, by
--   `sdkwork-payment`). Dropping it here would destroy another repository's live
--   objects. The additive column guards applied by the up-migration are also
--   left in place because `ADD COLUMN IF NOT EXISTS` is idempotent and the
--   columns are part of the owner's current contract.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

DROP INDEX IF EXISTS idx_commerce_payment_reconciliation_item_unresolved;
DROP INDEX IF EXISTS idx_commerce_payment_reconciliation_item_run;
DROP TABLE IF EXISTS commerce_payment_reconciliation_item;

DROP INDEX IF EXISTS idx_commerce_payment_statement_item_refund_no;
DROP INDEX IF EXISTS idx_commerce_payment_statement_item_trade_no;
DROP INDEX IF EXISTS idx_commerce_payment_statement_item_statement;
DROP INDEX IF EXISTS ux_commerce_payment_statement_item_row;
DROP TABLE IF EXISTS commerce_payment_statement_item;

DROP INDEX IF EXISTS idx_commerce_payment_statement_run_match;
DROP INDEX IF EXISTS ux_commerce_payment_statement_idempotency;
DROP TABLE IF EXISTS commerce_payment_statement;

COMMIT;
