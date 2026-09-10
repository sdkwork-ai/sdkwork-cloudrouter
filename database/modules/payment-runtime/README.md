# payment-runtime module

Materialization authority for the Cloud Router payment intent/refund runtime
schema consumed by `sdkwork-cloudrouter-router-service`
(`infrastructure/sql/postgres/payment_intent_runtime_store.rs`).

Owned tables (Cloud Router-only runtime facts):
`commerce_payment_route_decision`, `commerce_payment_operation_attempt`,
`commerce_refund_attempt`.

Shared payment facts materialized in the runtime shape (the federated
sdkwork-payment baseline declares a different operator-facing shape):
`commerce_payment_intent`, `commerce_payment_attempt`, `commerce_refund`,
`commerce_refund_item`, `commerce_refund_event`. The baseline self-heals
pre-existing tables with `ADD COLUMN IF NOT EXISTS` and drops conflicting
auto-named status CHECKs; idempotency arbiters
(`(tenant_id, idempotency_key)` unique partial indexes) are created
unconditionally so runtime `INSERT ... ON CONFLICT` works on every origin.
