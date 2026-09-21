-- sdkwork:migration
-- id: 0045_price_list_customer_segment
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Project `customer_segment` onto the federated `commerce_price_list`.
--
--   The Cloud Router admin catalog price-list surface
--   (`list_price_lists` / `create_price_list` / `load_price_list` in
--   `admin_catalog_store.rs`) selects, inserts and updates `customer_segment`,
--   but the `sdkwork-merchandise` baseline did not define the column, so all
--   three operations failed with
--   `column "customer_segment" does not exist`.
--
--   `commerce_price_list` is owned by `sdkwork-merchandise`; the column is added
--   to that repository's baseline and migrations as well. This guard exists so a
--   Cloud Router deployment that composes an older merchandise baseline still
--   reaches a working price-list surface.
--
--   The guard is additive and nullable with no default, so it is a no-op against
--   a baseline that already carries the column and cannot rewrite another
--   repository's data.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE commerce_price_list ADD COLUMN IF NOT EXISTS customer_segment TEXT;

CREATE INDEX IF NOT EXISTS idx_commerce_price_list_segment
    ON commerce_price_list (tenant_id, customer_segment, status);

COMMIT;
