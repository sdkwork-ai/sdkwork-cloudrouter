# Cloud Router Sub2API Pricing and Billing Design

Status: accepted and implemented
Last aligned: 2026-08-17

This document defines the pricing boundary for the Cloud Router Sub2API path.
It is subordinate to the schema registry and
[ADR-20260815](../decisions/ADR-20260815-composable-pricing-and-billing.md).

## Design Boundary

Cloud Router has two pricing concerns:

1. Official provider price data, shared with model catalog consumers.
2. Customer billing policy and immutable billing facts for routed invocations.

They have different writers, lifecycles, and audit requirements and therefore
use separate database modules.

## Physical Tables

### Official authority: `pricing_*`

| Table | Contents | Writer |
| --- | --- | --- |
| `pricing_import_run` | Source version/hash, validation, activation, and replay evidence | catalog sync / pricing-service |
| `pricing_price_book` | Immutable source/vendor/region/currency/price-side version | pricing-service |
| `pricing_rate` | Complete product-operation-meter-resource rate aggregate | pricing-service |

`pricing_rate` contains the bounded product, operation, meter, and resource
binding fields. Its typed `conditions`, `tiers`, `formula`, and `schedule`
structures avoid auxiliary join tables while retaining explicit validation and
indexable identity fields.

### Cloud Router policy and billing facts: `cloudrouter_*`

| Table | Contents | Writer |
| --- | --- | --- |
| `cloudrouter_pricing_plan` | Base price side, currency, rounding, minimum charge, fail-closed policy | Admin pricing API |
| `cloudrouter_account_rate_card` | Subject/account/API-key to plan binding, priority, effective interval | Admin pricing API |
| `cloudrouter_pricing_rule` | Plan rule for multiplier, markup, unit-price override, typed conditions, schedule | Admin pricing API |
| `cloudrouter_usage_measurement` | One measured quantity and `occurred_at` for an invocation | metering service |
| `cloudrouter_rating_decision` | Result plus immutable official and policy identities | rating service |
| `cloudrouter_charge_line` | Settled amount; only rated and chargeable decisions qualify | settlement service |

The Admin `/admin/pricing/*` pages write only the first three tables through the
generated `@sdkwork/cloudrouter-backend-sdk`. They do not edit official prices.

## Rate Selection

Every invocation supplies a `ResourceDefinition` to
`sdkwork-models-catalog-service::PriceService`, including vendor/provider,
region, model or API resource, product/operation/meter, typed dimensions,
quantity, and event time. Selection is evaluated at
`cloudrouter_usage_measurement.occurred_at`:

1. Resolve the effective price book and rate for the vendor, region, resource,
   product, operation, meter, currency, and event time.
2. Resolve the subject's effective rate card and plan at the same event time.
3. Select the most-specific matching policy rule by priority and scope.
4. Evaluate the rate variant and schedule, then apply the registered billing
   strategy for the meter and calculation mode.
5. Persist a rating decision with every selected identity and the pricing
   snapshot.
6. Create a charge line only when the decision is `rated` and `chargeable`.

The processing clock is never used to reprice a historical event. Effective
intervals are half-open, and all selected identities are retained for replay.

## Standard and Time-Window Prices

`rate_variant=standard` is the fallback rate. A time-window rate uses a closed
schedule object:

```json
{
  "timeZone": "Asia/Shanghai",
  "weeklyWindows": [
    {
      "windowCode": "business-hours",
      "daysOfWeek": [1, 2, 3, 4, 5],
      "startTime": "09:00:00",
      "endTime": "12:00:00",
      "endDayOffset": 0
    }
  ],
  "includeDates": [],
  "excludeDates": []
}
```

`daysOfWeek` uses ISO weekday numbers. `endDayOffset=0` is same-day;
`endDayOffset=1` supports windows such as 22:00-02:00. Times are local wall
clock values in the declared IANA zone. Include dates narrow the eligible
calendar and exclude dates take precedence. Window codes are unique, windows
must be ordered and non-overlapping, and date lists are bounded and disjoint.

A matching time-window rate outranks a standard rate. If multiple candidates
remain at the same specificity and priority, resolution returns a conflict and
fails closed. No fallback is allowed for an ambiguous match.

## Rule Capability

The same contract supports:

- token, request, image, result, character, duration, storage, traffic, and
  custom quantity meters;
- per-unit, flat, graduated-tier, volume-tier, and formula calculations;
- typed scalar and scalar-array dimensions such as model variant, resolution,
  quality, cache state, region, and result count;
- customer charge, upstream cost, official reference, and internal transfer
  price sides;
- minimum quantity, quantity step, rounding, minimum charge, multiplier,
  markup, and explicit unit-price override.

Chargeable rates require a positive unit price. Free and not-applicable rates
use zero and remain explicit billability states. Unknown or unresolved prices
are unrated and cannot enter settlement.

## Runtime and API Ownership

The route layer records invocation context and measured usage but does not
calculate money. The PriceService and registered billing strategies own unit
conversion and exact decimal arithmetic. The rating and settlement services
persist facts and enforce idempotency. Generated App, Backend, and Open SDKs
are derived from the API contract; consumers do not use handwritten HTTP
pricing clients.

The model catalog may expose a read-only pricing projection for catalog display,
but it is never a second write authority. Catalog imports are staged and
activated atomically so a changed source version creates a new immutable book
and rate rows.

## Failure and Audit Rules

Missing identity, inactive or out-of-window rates, condition mismatch, invalid
schedule, ambiguous rule, unsupported strategy, currency mismatch, and unknown
billability all produce an unrated decision with a reason code. A charge line
requires a rated decision, explicit chargeable billability, positive unit size,
and pinned price-book/rate/card/plan/rule identities. Every mutable Admin change
is audited and invalidates the corresponding runtime snapshot cache.

## Verification

The implementation is validated by the schema quality gate, generated SDK and
skill guardians, API contract checks, PostgreSQL pricing-integrity migration
tests, model-catalog PriceService tests, and targeted Admin pricing TypeScript
transpilation. Full package typechecking additionally requires the workspace
shared packages `@sdkwork/sdk-common` and `@sdkwork/utils` to be resolvable.
