# Cloud Router Schema Registry Implementation Report

Status: implemented
Last aligned: 2026-08-17

## Authority

The machine-readable authority is
[`sdkwork-cloudrouter.tables.yaml`](sdkwork-cloudrouter.tables.yaml). Table
fragments own logical definitions, database module contracts materialize those
definitions, and generated DDL, manifests, OpenAPI contracts, SDKs, services,
and frontends must remain derived or aligned consumers.

Cloud Router composes external registries through `registry_dependencies`; it
does not copy tables owned by another application. Pricing is intentionally
split by write ownership, not by UI page.

## Pricing Physical Model

### Official price authority: 3 tables

| Table | Responsibility | Writer |
| --- | --- | --- |
| `pricing_import_run` | Import staging, validation, activation, lineage, counts, and failure evidence | catalog sync / pricing service |
| `pricing_price_book` | Immutable versioned book scoped by source, vendor, region, currency, and price side | pricing service |
| `pricing_rate` | Product, operation, meter, resource binding, billability, unit price, tiers, formula, conditions, schedule, and effective interval | pricing service |

The former product, operation, meter, binding, condition, tier, formula, and
schedule tables are not separate physical tables. Their bounded structures are
cohesive parts of `pricing_rate`. This removes join-heavy catalog reads without
turning core monetary and identity fields into untyped JSON.

### Cloud Router policy and facts: 6 tables

| Table | Responsibility | Admin writable |
| --- | --- | --- |
| `cloudrouter_pricing_plan` | Base price side, currency, rounding, minimum charge, and fail-closed behavior | yes |
| `cloudrouter_account_rate_card` | Subject-to-plan binding with priority and effective interval | yes |
| `cloudrouter_pricing_rule` | Plan-scoped multiplier, markup, unit-price override, conditions, and optional schedule | yes |
| `cloudrouter_usage_measurement` | One immutable measured quantity for an invocation | no |
| `cloudrouter_rating_decision` | Immutable rating result and selected book/rate/card/plan/rule identities | no |
| `cloudrouter_charge_line` | Charge fact created only from a rated and chargeable decision | no |

The `/admin/pricing/*` surface manages only plans, rate cards, and rules through
the generated `@sdkwork/cloudrouter-backend-sdk` pricing family. It cannot
mutate official price books or rates.

## Pricing Capability

`pricing_rate` supports token, request, image, result, duration, character,
storage, traffic, and other unit-based resources through explicit
`product_code`, `operation_code`, `meter_code`, `quantity_kind`, `unit_code`,
`unit_size`, and resource dimensions. Calculation modes cover per-unit, flat,
graduated-tier, volume-tier, and formula pricing. Billability is explicit:
`chargeable`, `free`, `not_applicable`, or `unknown`.

Standard rates use `rate_variant=standard` with no schedule. Time-window rates
use `rate_variant=time_window` and a closed schedule structure containing:

- an IANA time-zone identifier;
- one or more weekly windows using ISO weekdays;
- start and end wall-clock times;
- `endDayOffset` equal to `0` or `1` for same-day or cross-midnight windows;
- bounded include-date and exclude-date lists.

Rate and policy selection uses `cloudrouter_usage_measurement.occurred_at`, not
the processing clock. A matching time-window rate takes precedence over the
standard fallback. Equally ranked matches are conflicts and fail closed; they
never silently choose a row.

## Integrity Guarantees

- Price-book lifecycle and price side are closed enumerations.
- Currency is exactly three uppercase letters.
- Chargeable rates require a positive unit price; free and not-applicable rates
  require zero; unknown rates cannot create charges.
- Unit size is positive and effective intervals are half-open.
- Only one active price book exists for the same scope.
- Conditions, tiers, formulas, and schedules use closed, bounded JSON shapes
  enforced by API schemas, service validation, and PostgreSQL guards.
- IANA zones, cross-midnight semantics, date exceptions, and date-list limits
  are validated before activation.
- Measurement and rating idempotency keys are scoped and unique.
- A rating decision pins the full price-book, rate-card, plan, and rule identity.
- A charge line is valid only for `rated + chargeable` decisions.

## Runtime Flow

```text
catalog source
  -> pricing_import_run
  -> immutable pricing_price_book + pricing_rate

request
  -> cloudrouter_usage_measurement(occurred_at)
  -> subject rate card + plan + most-specific rule
  -> official standard/time-window rate
  -> sdkwork-models PriceService billing strategy
  -> cloudrouter_rating_decision
  -> cloudrouter_charge_line only when rated and chargeable
```

Missing prices, ambiguous matches, invalid schedules, unsupported formulas,
identity mismatches, and unknown billability produce an unrated decision and no
charge. Raw traces and successful requests are not billing evidence.

## Implementation Evidence

- Registry fragments: `tables/pricing-core.yaml` and
  `tables/cloudrouter-billing.yaml`
- Database contracts: `database/modules/pricing/contract/schema.yaml` and
  `database/modules/cloudrouter-billing/contract/schema.yaml`
- PostgreSQL guards: each module's `migrations/postgres/0002_*integrity_guards.up.sql`
- Runtime selection and persistence: `services/sdkwork-cloudrouter-router-service`
- Admin UI: `apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudrouter-pc-admin-pricing`
- Architecture decision:
  `docs/architecture/decisions/ADR-20260815-composable-pricing-and-billing.md`

Forbidden schema synonyms are maintained only by migration and guardian
prohibition lists; they are not part of the current registry or runtime.
