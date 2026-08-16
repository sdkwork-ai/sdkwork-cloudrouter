# ADR-20260815-composable-pricing-and-billing

Status: accepted (implemented)
Requirement: REQ-2026-0001
Owner: cloudrouter-platform
Date: 2026-08-15
Specs: `COMPOSABLE_ARCHITECTURE_SPEC.md`, `DATABASE_SPEC.md`, `DATABASE_FRAMEWORK_SPEC.md`, `MIGRATION_SPEC.md`

## Context

Cloud Router previously treated request traces and usage facts as if they were
billable statistics. That made failed, free, not-applicable, and unresolved
calls visible as charges. Pricing was also split across model catalog records
and Cloud Router-specific plan tables, without one reusable product,
operation, meter, price-book, rate, and condition contract.

Official provider prices vary independently by vendor, region, product,
operation, model, meter, unit size, duration, quality, resolution, and result
count. A zero numeric amount is not enough to distinguish free service from an
unknown or non-applicable rate.

## Decision

The reusable `pricing` database module is the price authority. It owns:

- `pricing_product` and `pricing_operation` for sellable capability identity;
- `pricing_meter` for token, request, item, result, character, image, duration,
  pixel, storage, and bandwidth measurement units;
- `pricing_product_binding` for mapping products and operations to vendor,
  region, catalog model, API format, endpoint, and other external resources;
- immutable, versioned `pricing_price_book` records scoped by source, vendor,
  region, and currency;
- `pricing_rate` with explicit billability, charge timing, calculation mode,
  quantity aggregation, unit size, unit price, and effective interval;
- `pricing_rate_binding` for explicitly reusing one rate across one or more
  product-resource bindings without parsing identity from `rate_code`;
- `pricing_rate_condition` for typed rate dimensions;
- `pricing_import_run` for staged import, validation, activation, lineage, and
  replay evidence.

`sdkwork-models` is the official-price source. Every official rate declares
`priceBookCode`, `productCode`, `operationCode`, `billability`, `unitSize`, and
`rateHash`. Catalog refresh stages and validates a complete immutable version,
then atomically activates it. A catalog version with changed rate content is
rejected rather than overwritten.

`sdkwork-models-catalog-service::PriceService` is the single runtime pricing
entry point. Every caller supplies a `ResourceDefinition` containing the
pricing subject, vendor/provider/account, region, catalog model or API
resource, API/product/operation identity, meter, measured quantity, typed
dimensions, and event time. The service returns one `PriceResolution` with:

- `quoted`, `rated`, `non_chargeable`, or `unrated` status;
- explicit `chargeable`, `free`, `not_applicable`, or `unknown` billability;
- immutable price-book/rate/product/operation/vendor/region/meter identity;
- a `BillingStructure` when rating succeeds;
- a classified failure and complete pricing audit snapshot otherwise.

The billing strategy registry is composable. Token usage, API calls, generated
image quantity, duration, flat fee, and general unit quantity are independent
`BillingStrategy` implementations. Each strategy owns quantity validation,
minimum and step application, unit-size conversion, and exact decimal amount
calculation. `BillingStructure` carries official-reference, customer-charge,
and procurement-cost unit prices and amounts; Cloud Router must not duplicate
those formulas.

Streaming and other deferred-usage calls use two stages: `resolve` fixes the
rate before dispatch and returns `quoted`; `rate_resolved` applies the same
immutable rate to the final measured quantity. Missing prices, ambiguous
rates, resource identity mismatches, unknown billability, and unsupported or
ambiguous strategies return `unrated` and never produce a charge. Low-level
`PricingResolver` remains available for catalog previews and compatibility
tests, but it is not an authorized charge-producing runtime entry point.

The `cloudrouter-billing` module composes the shared pricing authority but does
not copy it. It owns application-specific plans, rules, account rate cards,
usage measurements, rating decisions, and charge lines. An account rate card is
the only runtime authority that binds a subject to a pricing plan. The flow
is:

```text
request trace
  -> zero or more usage measurements
  -> PriceService(ResourceDefinition)
  -> BillingStrategy -> BillingStructure
  -> one explicit rating decision per measurement
  -> charge line only for decision_status=rated and billability=chargeable
```

A trace is observability data, not proof of a charge. Failed fixed-request API
calls do not create a billable measurement. Missing quotes, `unknown`,
`free`, and `not_applicable` rates do not create charge lines. Zero price never
implicitly means either chargeable or free.

Amounts use the catalog unit base:

```text
rated_quantity = ceil_to_step(max(measured_quantity, minimum_quantity))
amount = rated_unit_price * rated_quantity / unit_size
```

This supports per-token, per-thousand-character, per-request, per-image,
per-result, and duration rates without hard-coded meter divisors. Dashboard
request counts use distinct charged invocation identities so multiple token or
result lines from one invocation do not inflate API call statistics.

`ai_metering_usage` remains the billed usage fact table. New
`ai_metering_usage` rows are written only after the same transaction has
persisted a `rated`, `chargeable` decision. A recorder-side verification
failure remains only in the measurement and rating ledger. A resource
classified as unresolved or non-chargeable before command construction
remains trace-only and cannot enter billed usage statistics. The legacy
`ai_pricing_*` tables and the unimplemented `cloudrouter_pricing_adjustment`
were removed before launch (see MIG-2026-0002); `ai_model_pricing` is a
runtime projection only.

The `pricing-rating-v2` runtime creates a charge only when all of the following
are true at the recorded event time:

1. The official price-book and rate identity is active and effective.
2. The rate is explicitly bound to the vendor/region/model or API resource.
3. The typed condition set exactly matches the official catalog snapshot.
4. Official unit size, unit price, currency, and billability match.
5. The immutable account-rate-card identity resolves the active Cloud Router
   pricing plan and most-specific rule.
6. The stored plan/rule inputs and PriceService pricing snapshot match those
   immutable identities.

Any failed gate records an `unrated` decision with a reason code and no charge
line. The recorder does not execute a billing strategy or recompute the final
amount. Rated decisions store price-book/rate identity, account-rate-card
scope and identity, and pricing-plan/rule identity for audit traceability.

## Alternatives

### Keep pricing inside Cloud Router

Rejected because the same product, operation, meter, regional price book, and
official provider rates are needed by other applications. Application-owned
copies would drift and make official price updates non-atomic.

### Treat every successful request as billable

Rejected because some operations are free, not applicable, unresolved, or
charged only after provider usage is known. Request success and billability
are separate decisions.

### Store all pricing logic as JSON

Rejected because billability, rate selection, money, unit size, effective
intervals, and idempotency are core query and audit fields. JSON remains only
for bounded typed dimensions and immutable snapshots.

## Consequences

- Shared pricing and Cloud Router billing are independently installable
  PostgreSQL modules with separate prefixes and owners.
- Official rate history is immutable and region-aware.
- Every charged amount is traceable to a measurement and rating decision.
- Invocation, legacy OpenAI usage, provider-adapter usage, and route pricing
  checks share the same price service contract.
- Adding a billing form requires registering a focused strategy rather than
  branching settlement or transport code.
- Settlement transitions billed usage facts and shadow charge lines together in
  one transaction; reconciliation gates run as `tools/check_pricing_reconciliation.py`
  per `MIG-2026-0002`.
- `pricing-rating-v2` performs active rate, binding, condition, plan, rule, and
  immutable payload verification before a charge line or billed usage fact is
  created. All quantity conversion and amount calculation remain owned by
  PriceService strategies. Reconciliation and rollout gates are defined in
  `MIG-2026-0002` and executed by `tools/check_pricing_reconciliation.py`.

## Verification

- `node tools/validate-catalog.mjs` in `sdkwork-models`
- `cargo test -p sdkwork-models --offline` in `sdkwork-models`
- `cargo test -p sdkwork-models-catalog-service price_service_tests` in
  `sdkwork-models`
- `cargo test -p sdkwork-cloudrouter-edge-runtime passthrough::tests::adapter_usage_line`
- `python -B -m tools.database_contract_materializer --root . --check`
- `pnpm db:validate`
- `cargo test -p sdkwork-cloudrouter-database-host --offline`
- `cargo test -p sdkwork-cloudrouter-router-service --offline`

## Supersedes / Superseded By

This decision supersedes legacy billing-source statements that treat raw
`ai_metering_usage` rows as final charge authority. No decision currently
supersedes this ADR.
