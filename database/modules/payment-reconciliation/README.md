# payment-reconciliation

Cloud Router payment reconciliation database module (table prefix `commerce_payment_`).

Owns the provider statement and reconciliation result tables consumed by the
cloudrouter reconciliation runtime and worker:

- `commerce_payment_statement` — imported provider billing statement header.
- `commerce_payment_statement_item` — imported provider billing statement rows.
- `commerce_payment_reconciliation_item` — generated differences between a
  statement and the internal SDKWORK payment/refund ledger.

`commerce_payment_reconciliation_run` is owned by the federated `sdkwork-payment`
database module (payment center). This module ships self-healing `ALTER`
statements so the worker's run-claim columns are guaranteed to exist even when
the packaged payment module predates them.

Statement and reconciliation amounts are stored as `TEXT` (decimal strings)
because the reconciliation runtime reads and compares provider bill amounts as
decimal strings and never performs SQL-side arithmetic on them.

The internal ledger used by reconciliation reads `commerce_payment_attempt` and
`commerce_refund` (both owned by `sdkwork-payment`); there is no
`commerce_refund_attempt` table in the federated payment module, so refund
ledger entries always carry a NULL `refund_attempt_id`.
