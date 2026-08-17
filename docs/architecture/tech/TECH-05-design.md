# Cloud Router Database Design

Status: current
Last aligned: 2026-08-17

The database contract is defined by the schema registry and materialized into
PostgreSQL contracts, migrations, DDL, API schemas, and generated SDKs. A table
is owned by the module that writes it. Cloud Router composes external registries
through dependencies and does not duplicate identity, commerce, or catalog
authorities.

## Core Rules

- New tables begin in a module contract before DDL or runtime code is changed.
- Tenant and organization scope is explicit on every tenant-owned fact.
- Internal `int64` identifiers serialize as decimal strings at API boundaries.
- Monetary and measured quantities use exact decimal representations.
- Effective intervals are half-open (`from <= event < to`) and historical facts
  use their recorded event time.
- Append-only facts, idempotency keys, lifecycle states, retention, legal holds,
  and audit metadata are explicit contract fields.
- JSON is limited to bounded typed dimensions, snapshots, and extension data;
  core identity, money, unit, lifecycle, and query fields remain columns.

## Pricing Ownership

Official provider prices are written by catalog sync / pricing-service into
three reusable tables:

| Table | Contract role |
| --- | --- |
| `pricing_import_run` | Import evidence, validation, activation, and source lineage |
| `pricing_price_book` | Immutable source/vendor/region/currency/price-side version |
| `pricing_rate` | Product-operation-meter-resource rate aggregate, including typed conditions, tiers, formula, and schedule |

Cloud Router Admin configuration and billing facts use six tables:

| Table | Contract role | Write owner |
| --- | --- | --- |
| `cloudrouter_pricing_plan` | Base side, currency, rounding, minimum charge, fail-closed policy | Admin pricing service |
| `cloudrouter_account_rate_card` | Subject-to-plan binding, priority, effective interval | Admin pricing service |
| `cloudrouter_pricing_rule` | Multiplier, markup, unit override, conditions, and schedule | Admin pricing service |
| `cloudrouter_usage_measurement` | Immutable quantity and `occurred_at` | Metering service |
| `cloudrouter_rating_decision` | Rating result and immutable selected identities | Rating service |
| `cloudrouter_charge_line` | Settled charge derived from a rated chargeable decision | Settlement service |

The first three official tables are not Admin-managed. Product, operation,
meter, resource binding, condition, tier, and formula structures are cohesive
fields of `pricing_rate`, not separate physical tables.

## Flexible Rate Contract

`pricing_rate` supports token, request, image, result, character, duration,
storage, traffic, and custom quantity meters. Calculation modes are per-unit,
flat, graduated tier, volume tier, and formula. Billability is explicit:
`chargeable`, `free`, `not_applicable`, or `unknown`. A chargeable rate has a
positive unit price; free and not-applicable rates have zero.

Standard rates use `rate_variant=standard`. Time-window rates use
`rate_variant=time_window` and a closed schedule containing an IANA time zone,
ISO weekdays, local start/end times, `endDayOffset` (`0` or `1`), and bounded
include/exclude dates. Cross-midnight windows are evaluated on the local start
date. Excluded dates win, included dates narrow the schedule, and matching
time-window rates outrank standard fallback rates.

## Runtime and Integrity

The gateway records invocation context and measured quantities. The reusable
`sdkwork-models-catalog-service::PriceService` selects the effective rate at
`occurred_at`, applies the registered billing strategy, and returns an exact
decimal billing structure. Cloud Router persists a rating decision with the
price-book, rate, card, plan, and rule identities. Only `rated + chargeable`
decisions may create charge lines.

Invalid IANA zones, malformed windows, overlapping equally-ranked candidates,
unknown billability, missing rates, condition mismatches, identity mismatches,
and unsupported strategies fail closed. Currency is three uppercase letters;
unit size is positive; effective intervals and tenant-scoped idempotency are
database-enforced. PostgreSQL guards and API closed schemas reject unknown
condition or schedule properties.

## Change Workflow

1. Update the owning schema contract and registry fragment.
2. Materialize database contracts, DDL, manifests, and OpenAPI components.
3. Regenerate SDKs from the contract; never hand-edit generated output.
4. Update the owning service, Admin UI, and focused tests.
5. Run schema quality, API precision, SDK, migration, and targeted runtime gates.

The canonical sources are [`sdkwork-cloudrouter.tables.yaml`](../../schema-registry/sdkwork-cloudrouter.tables.yaml),
the module contracts under `database/modules`, and
[ADR-20260815](../decisions/ADR-20260815-composable-pricing-and-billing.md).
