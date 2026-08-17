# Cloud Router Data Contracts

Status: current
Last aligned: 2026-08-17

This document describes the contract boundary for Cloud Router-owned data. The
machine-readable schema registry and module contracts are authoritative; this
document explains ownership and invariants rather than duplicating generated
DDL.

## Ownership and Scope

Cloud Router owns routing, metering, gateway IAM, operations, chat runtime, and
Cloud Router billing facts. Identity, account, payment, and model-catalog
systems remain external authorities and are composed through registry
dependencies. A Cloud Router table must have one write owner and a tenant scope
appropriate to its profile.

All persisted IDs are signed 64-bit integers internally and decimal strings on
API boundaries. Money and quantities use exact decimal values. Every mutable
configuration has a lifecycle, effective interval, version, audit metadata, and
tenant/organization scope. Append-only facts use idempotency and retention
controls.

## Pricing Contract

### Official authority

| Table | Required responsibility |
| --- | --- |
| `pricing_import_run` | Stage, validate, activate, and retain source catalog evidence |
| `pricing_price_book` | Immutable book version scoped by source, vendor, region, currency, and price side |
| `pricing_rate` | Store the full product, operation, meter, resource, billability, calculation, and schedule rate |

`pricing_rate` deliberately keeps product/operation/meter/resource identity and
bounded `conditions`, `tiers`, `formula`, and `schedule` structures together.
There are no separate product, operation, meter, binding, condition, tier, or
formula tables in the physical schema.

### Cloud Router billing

| Table | Required responsibility |
| --- | --- |
| `cloudrouter_pricing_plan` | Base price side, currency, rounding, minimum charge, and fail-closed setting |
| `cloudrouter_account_rate_card` | Subject to plan binding with priority and effective interval |
| `cloudrouter_pricing_rule` | Plan-scoped multiplier, markup, unit override, typed conditions, and schedule |
| `cloudrouter_usage_measurement` | One immutable invocation measurement with `occurred_at` |
| `cloudrouter_rating_decision` | Rated/non-chargeable/unrated result and pinned source/policy identities |
| `cloudrouter_charge_line` | Charge fact allowed only for rated and chargeable decisions |

Admin pricing APIs write only the plan, card, and rule tables. Metering,
rating, and settlement services own the final three tables.

## Validation Invariants

- Price-book lifecycle and price-side values are closed enumerations.
- Currency matches `^[A-Z]{3}$`.
- `unit_size > 0`; chargeable `unit_price > 0`; free and not-applicable
  `unit_price = 0`.
- Effective intervals are valid and active scope has at most one price book.
- Conditions are typed scalar/scalar-array objects with no unknown properties.
- Tiers are contiguous and formulas contain only approved dimensions and terms.
- Schedules use IANA zones, ISO weekdays, `HH:MM:SS` local times, unique window
  codes, same-day or cross-midnight offsets, and bounded disjoint date lists.
- Historical selection uses `occurred_at`, not the processing timestamp.
- Equal-specificity or overlapping candidates fail closed instead of selecting
  arbitrarily.
- Rating identity foreign keys pin book, rate, rate card, plan, and rule rows.
- No charge line exists without a matching rated chargeable decision.

## Selection and Settlement

```text
ResourceDefinition + occurred_at
  -> effective price book/rate (time-window before standard fallback)
  -> account rate card + plan + most-specific rule
  -> PriceService billing strategy and exact decimal amount
  -> rating decision with immutable identities
  -> charge line only when rated and chargeable
```

Token, request, image, result, duration, character, storage, traffic, flat,
graduated, volume, and formula pricing are represented by the same contract.
Unknown, missing, non-applicable, free, conflicting, or unsupported pricing is
recorded as a non-charge outcome and never becomes a charge line.

## Contract Workflow

Schema changes update the owning YAML contract first, then materialize PostgreSQL
DDL and manifests, regenerate OpenAPI and SDK artifacts, update service and UI
consumers, and run focused migration/API/runtime tests. Generated SDK output is
never hand-edited. The active references are:

- [`sdkwork-cloudrouter.tables.yaml`](../../schema-registry/sdkwork-cloudrouter.tables.yaml)
- `database/modules/pricing/contract/schema.yaml`
- `database/modules/cloudrouter-billing/contract/schema.yaml`
- [ADR-20260815](../decisions/ADR-20260815-composable-pricing-and-billing.md)
