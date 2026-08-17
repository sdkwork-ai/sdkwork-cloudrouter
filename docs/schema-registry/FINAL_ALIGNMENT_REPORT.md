# Cloud Router Pricing Alignment Report

Status: aligned
Last aligned: 2026-08-17

This document records the current production design. The registry, database
contracts, generated API artifacts, runtime services, and Admin pricing UI are
the implementation authorities; this report contains no retired table design.

## Ownership Boundary

Official provider pricing is catalog data. `sdkwork-models` publishes validated
pricing records and catalog sync / pricing-service writes the reusable
`pricing_*` module. The Cloud Router Admin pricing pages configure customer
billing policy and write only `cloudrouter_*` policy tables.

## Current Tables

### Official pricing (`pricing_*`): 3 physical tables

1. `pricing_import_run` records source version, source hash, validation counts,
   activation state, and import evidence.
2. `pricing_price_book` is an immutable, versioned book with source/vendor/
   region/currency/price-side scope and one active book per scope.
3. `pricing_rate` stores the complete rate aggregate: product, operation, meter,
   resource identity, billability, calculation mode, unit size and price,
   effective interval, typed conditions, tiers, formula, and standard or
   time-window schedule.

### Cloud Router billing (`cloudrouter_*`): 6 physical tables

1. `cloudrouter_pricing_plan`
2. `cloudrouter_account_rate_card`
3. `cloudrouter_pricing_rule`
4. `cloudrouter_usage_measurement`
5. `cloudrouter_rating_decision`
6. `cloudrouter_charge_line`

The first three are configuration owned by Admin. The last three are append-only
facts owned by metering/rating/settlement services. The rating decision stores
the immutable identities needed to reproduce an amount after prices change.

## Supported Rules

The model supports:

- token, request, image, audio/video duration, result, character, storage,
  traffic, and arbitrary quantity meters;
- flat, per-unit, graduated tier, volume tier, and formula calculations;
- typed scalar and scalar-array conditions with bounded dimensions;
- customer multipliers, markups, and explicit unit-price overrides inside a
  pricing plan;
- standard prices and weekly time-window prices in one rate family;
- IANA time zones, ISO weekdays, same-day and cross-midnight windows;
- include-date and exclude-date exceptions, with bounded list size;
- historical selection by `occurred_at` across book, rate, plan, card, and rule
  effective intervals.

For a time-window rate, local wall-clock time is derived in the declared IANA
zone. A window matches its listed start day; `endDayOffset=1` carries the end
into the following local day. Excluded dates always win, included dates narrow
the schedule, and a matching window outranks the standard fallback. Overlapping
or equally ranked candidates are a conflict and fail closed.

## Safety and Accounting Rules

- Currency is a three-letter uppercase ISO-style code.
- Unit size is positive.
- A chargeable unit price is strictly positive; free and not-applicable prices
  are exactly zero.
- Unknown billability, missing rates, invalid dimensions, and ambiguous rules
  are unrated and cannot produce charge lines.
- Only a `rated` and `chargeable` rating decision can create a charge line.
- Measurement, decision, and charge-line identities are tenant-scoped and
  idempotent.
- All API int64 identifiers remain decimal strings on the wire.
- Closed API schemas and database guards reject unknown condition/schedule keys,
  invalid time zones, malformed times, duplicate window codes, and oversized
  exception lists.

## Verification State

The following alignment checks have passed for the current workspace:

```text
python -B -m tools.database_contract_materializer
python -B -m tools.schema_compiler --dialect postgres --materialize
python -B -m tools.schema_manifest
python -B -m tools.openapi_component_generator
python -B -m tools.frontend_field_audit
python -B -m tools.frontend_operation_audit
python -B -m tools.api_contract_manifest
python -B -m tools.cloudrouter_openapi_generator
node sdks/cloudrouter-app-sdk/bin/generate-sdk.mjs --language typescript
node sdks/cloudrouter-backend-sdk/bin/generate-sdk.mjs --language typescript
node sdks/cloudrouter-open-sdk/bin/generate-sdk.mjs --language typescript
python -B -m tools.schema_quality_gate
python -B -m tools.cloudrouter_sdk_guardian
python -B -m tools.cloudrouter_skill_guardian
cargo test -p sdkwork-cloudrouter-router-service --test postgres_pricing_integrity_migration
```

The full Admin package typecheck remains dependent on workspace-wide
`@sdkwork/sdk-common` and `@sdkwork/utils` packages. Changed pricing files were
validated by targeted TypeScript transpilation and filtered diagnostics; the
dependency resolution issue is outside this pricing module.
