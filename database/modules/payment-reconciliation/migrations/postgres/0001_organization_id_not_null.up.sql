-- sdkwork:migration
-- id: 0001_organization_id_not_null
-- engine: postgres
-- module: cloudrouter-payment-reconciliation
-- purpose: Enforce organization_id NOT NULL DEFAULT '0' on the payment
--   reconciliation baseline tables.
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

UPDATE commerce_payment_statement SET organization_id = '0' WHERE organization_id IS NULL;
ALTER TABLE commerce_payment_statement ALTER COLUMN organization_id SET DEFAULT '0';
ALTER TABLE commerce_payment_statement ALTER COLUMN organization_id SET NOT NULL;

UPDATE commerce_payment_statement_item SET organization_id = '0' WHERE organization_id IS NULL;
ALTER TABLE commerce_payment_statement_item ALTER COLUMN organization_id SET DEFAULT '0';
ALTER TABLE commerce_payment_statement_item ALTER COLUMN organization_id SET NOT NULL;

UPDATE commerce_payment_reconciliation_item SET organization_id = '0' WHERE organization_id IS NULL;
ALTER TABLE commerce_payment_reconciliation_item ALTER COLUMN organization_id SET DEFAULT '0';
ALTER TABLE commerce_payment_reconciliation_item ALTER COLUMN organization_id SET NOT NULL;

UPDATE commerce_payment_reconciliation_run SET organization_id = '0' WHERE organization_id IS NULL;
ALTER TABLE commerce_payment_reconciliation_run ALTER COLUMN organization_id SET DEFAULT '0';
ALTER TABLE commerce_payment_reconciliation_run ALTER COLUMN organization_id SET NOT NULL;

COMMIT;
