# payment-control-plane module

Cloud Router-owned payment routing and settlement bookkeeping.

## Owned tables

| Table | Purpose |
|---|---|
| `commerce_payment_route_decision` | Which upstream account/rule Cloud Router picked for a payment attempt, and why. |
| `commerce_payment_operation_attempt` | One upstream provider operation issued by Cloud Router, with request/response digests and the provider's native ids. |
| `commerce_refund_attempt` | One refund leg sent to an upstream provider. |
| `commerce_refund_item` | Per-line amounts inside a Cloud Router refund. |

These are written and read by
`services/sdkwork-cloudrouter-router-service/src/infrastructure/sql/postgres/payment_intent_runtime_store.rs`.

## Ownership boundary

The merchant-facing commerce payment facts are **not** owned here. They belong to the
federated `sdkwork-payment` module:

- `commerce_payment_intent`
- `commerce_payment_attempt`
- `commerce_refund`
- `commerce_refund_event`

`sdkwork-payment` is registered as the **first** federated commerce module by
`services/sdkwork-cloudrouter-installer/src/federated.rs`, so it creates its tables before
this application's own modules run.

## Why this module replaced `payment-runtime`

The retired `payment-runtime` module declared all eight tables above. Because its baseline
used `CREATE TABLE IF NOT EXISTS` and the federated payment module ran first, the four
`commerce_payment_intent` / `commerce_payment_attempt` / `commerce_refund` /
`commerce_refund_event` definitions **silently no-opped** — so the migration ledger recorded
the module as applied while the live tables kept `sdkwork-payment`'s shape. The two
definitions had also drifted: `payment-runtime` declared 25/15/17/9 columns where the live
tables have 27/25/21/14.

This module keeps only the four tables Cloud Router genuinely owns. It no longer competes
with the federated module for any table name, so a fresh database provisions them from this
baseline instead of inheriting a no-op.

## Column types

Types follow the `commerce_*` family convention set by `sdkwork-payment`, which differs from
Cloud Router's `ai_*` family:

| Family | Identifiers | Money |
|---|---|---|
| `commerce_*` (this module, `sdkwork-payment`, `payment-reconciliation`) | `TEXT` | `TEXT` decimal string |
| `ai_*` (Cloud Router root baseline) | `BIGINT` / `VARCHAR(n)` | `NUMERIC(38,12)` |

This is deliberate: these tables share a database with the federated commerce modules, so
their key types must stay wire-compatible with them. It also means the tables **cannot** be
compiled from `docs/schema-registry/sdkwork-cloudrouter.tables.yaml` — that compiler injects
BIGINT common columns from the `ai_*` convention. This module is therefore hand-authored, the
same way `payment-reconciliation` is.

## Organization scope

`organization_id` is `NOT NULL DEFAULT '0'` (DATABASE_SPEC DB089). The platform sentinel `'0'`
means "no organization"; `NULL` is never valid (DB090).

- Write path: `.bind(command.organization_id.as_deref().or(Some("0")))`
- Read path: normalizes any legacy `NULL` back to the sentinel.

## Regenerating

The baseline is hand-authored and must **not** be regenerated from the schema registry. Edit
`ddl/baseline/postgres/0001_payment_control_plane_baseline.sql` directly and keep
`contract/schema.yaml`, `contract/table-registry.json` and `database.manifest.json` in sync.
