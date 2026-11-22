-- sdkwork:migration
-- id: 0047_payment_runtime_shape_guard
-- engine: postgres
-- module: sdkwork-cloudrouter
-- purpose: Converge the federated commerce_payment_intent / commerce_payment_attempt shape with the Cloud Router payment runtime projections.
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: exclusive
-- lock_timeout: 2s
-- statement_timeout: 30s
-- contract_version: 0.5.0
--
-- Ownership boundary: `commerce_payment_intent` and `commerce_payment_attempt`
-- are owned by the federated `sdkwork-payment` module, which is installed
-- before Cloud Router's own modules. Cloud Router's payment runtime projects a
-- provider-dispatch payload (`next_action_json`/`provider_native_json`), the
-- merchant order reference, and the two pre-confirmation statuses onto those
-- facts. The retired `payment-runtime` module used to declare a wider shape;
-- when it was retired the projections stopped being provisioned and every
-- payment-intent insert failed on a freshly installed database.
--
-- This guard is additive and idempotent: it only runs when the federated table
-- already exists, never creates or drops a table, and is a no-op when the
-- owning baseline already carries the columns. The owning repository remains
-- the authority; this migration must be removed once sdkwork-payment ships the
-- same columns in its own baseline.
DO $$
BEGIN
    IF to_regclass('commerce_payment_intent') IS NULL THEN
        RETURN;
    END IF;

    ALTER TABLE commerce_payment_intent
        ADD COLUMN IF NOT EXISTS merchant_order_no TEXT NOT NULL DEFAULT '';
    ALTER TABLE commerce_payment_intent
        ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT '';
    ALTER TABLE commerce_payment_intent
        ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT '';
    ALTER TABLE commerce_payment_intent
        ADD COLUMN IF NOT EXISTS supplier_code TEXT NOT NULL DEFAULT '';
    ALTER TABLE commerce_payment_intent
        ADD COLUMN IF NOT EXISTS scene_code TEXT NOT NULL DEFAULT '';
    ALTER TABLE commerce_payment_intent
        ADD COLUMN IF NOT EXISTS metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE commerce_payment_intent
        ADD COLUMN IF NOT EXISTS provider_native_json JSONB;
    ALTER TABLE commerce_payment_intent
        ADD COLUMN IF NOT EXISTS next_action_json JSONB;
    ALTER TABLE commerce_payment_intent
        ADD COLUMN IF NOT EXISTS captured_amount NUMERIC(18, 2) NOT NULL DEFAULT 0;
    ALTER TABLE commerce_payment_intent
        ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(18, 2) NOT NULL DEFAULT 0;

    ALTER TABLE commerce_payment_intent
        DROP CONSTRAINT IF EXISTS commerce_payment_intent_status_check;
    ALTER TABLE commerce_payment_intent
        ADD CONSTRAINT commerce_payment_intent_status_check
        CHECK (status IN (
            'created', 'pending', 'processing', 'succeeded', 'failed',
            'canceled', 'closed', 'requires_confirmation', 'requires_action'
        ));
END $$;

DO $$
BEGIN
    IF to_regclass('commerce_payment_attempt') IS NULL THEN
        RETURN;
    END IF;

    ALTER TABLE commerce_payment_attempt
        ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT '';

    ALTER TABLE commerce_payment_attempt
        DROP CONSTRAINT IF EXISTS commerce_payment_attempt_status_check;
    ALTER TABLE commerce_payment_attempt
        ADD CONSTRAINT commerce_payment_attempt_status_check
        CHECK (status IN (
            'created', 'pending', 'processing', 'succeeded', 'failed',
            'canceled', 'closed', 'requires_confirmation', 'requires_action'
        ));
END $$;

DO $$
BEGIN
    IF to_regclass('commerce_refund_event') IS NULL THEN
        RETURN;
    END IF;

    -- Cloud Router records the operator/system reason on the refund event; the
    -- federated shape keeps only the coded reason on `commerce_refund`.
    ALTER TABLE commerce_refund_event ADD COLUMN IF NOT EXISTS reason TEXT;
END $$;
