# MIG-2026-0002 Composable Pricing And Billing

Status: complete
Owner: cloudrouter-platform
Requirement: REQ-2026-0001
Type: database and runtime
Strategy: expand-contract, dual-write, reconcile, cutover, contract
Completed: 2026-08-16 (pre-launch consolidation; no production data migration
was required because the application had not shipped)

## Outcome

The composable pricing and billing architecture is fully landed:

- `pricing` and `cloudrouter-billing` modules are the only pricing and billing
  authorities. The legacy `ai_pricing_*` tables
  (`ai_pricing_import_snapshot`, `ai_pricing_plan`,
  `ai_pricing_plan_binding`, `ai_pricing_rule`, `ai_pricing_tier`) and the
  unimplemented `cloudrouter_pricing_adjustment` were physically removed from
  the schema registry, baselines, contracts, and manifests; no compatibility
  window or cutoff is needed because the application never shipped with them.
- `sdkwork-models-catalog-service::PriceService` is the single runtime pricing
  entry point. Invocation, route selection, OpenAI usage, and provider-adapter
  usage all resolve through `ResourceDefinition` and consume
  `PriceResolution`/`BillingStructure`; no charge-producing path computes
  amounts or unit conversions locally.
- The gateway usage recorder persists usage measurement, rating decision,
  charge line, and the billed usage fact in one transaction with stable
  idempotency keys. The usage settlement worker now settles both the billed
  usage fact and its shadow charge line (`rated -> settled`) in the same
  transaction, so the new ledger and the settlement input never disagree.
- The `standard` global pricing plan and its default rule are bootstrapped
  idempotently by the official pricing sync, so account-group rate cards and
  runtime plan resolution never depend on a table that nothing writes.
- Reconciliation runs as a tool: `tools/check_pricing_reconciliation.py`
  implements all eight checks below against a live schema.

## Producers And Consumers

Producers are the `sdkwork-models` official catalog, Cloud Router catalog
refresh, invocation usage extraction, pricing resolution, and gateway usage
recorder. Consumers are customer settlement, wallet/accounting integration,
app and admin dashboards, usage exports, and operational reconciliation.
All charge-producing consumers resolve and rate through
`sdkwork-models-catalog-service::PriceService` using `ResourceDefinition`.

## Database Installation

The root manifest registers modules in dependency order: root, `gateway-iam`,
`operations`, `pricing`, then `cloudrouter-billing`. The explicit database-host
`migrate` operation initializes each registered module.

For an existing shared PostgreSQL schema, each module has no lifecycle
installation state and its anchor table is absent. The lifecycle framework
therefore applies that module's baseline once. It does not replay the root
Cloud Router baseline. Future changes use immutable module migrations.

Production and staging startup do not auto-migrate. Operators run the
controlled lifecycle job before application rollout:

```text
pnpm db:plan
pnpm db:migrate
pnpm db:drift:check
```

## Runtime Rules

- `cloudrouter_account_rate_card` is the only runtime authority that binds an
  account group or other subject to a pricing plan.
- `ai_metering_usage` receives new rows only after a rated, chargeable
  decision commits in the same transaction. A measured line that fails
  active-rate or pricing-plan verification is retained only in the new
  measurement and decision ledger. A line classified as `free`,
  `not_applicable`, or `unrated` by `PriceService` before command construction
  remains trace-only and never enters billed usage statistics.
- New pricing concepts are added only to the owning `pricing_*` or
  `cloudrouter_*` module.
- Runtime callers construct `ResourceDefinition` and consume
  `PriceResolution`/`BillingStructure`. Direct `PricingResolver` use is limited
  to non-charging catalog previews and compatibility tests.
- Token divisors, minimum/step logic, duration conversion, image/result count,
  and amount multiplication must not exist in settlement, transport, or
  provider-adapter code.
- Provider-adapter usage lines with `free`, `not_applicable`, or `unrated`
  resolution do not create charge commands. A batch containing no rated,
  chargeable line performs no usage write.

## Reconciliation

Required checks run per tenant, organization, currency, day, meter, and
invocation. They are implemented in `tools/check_pricing_reconciliation.py`:

1. Every billed usage fact has exactly one measurement and one rating
   decision for the same stable usage identity; every charge line belongs to
   exactly one decision and every decision belongs to exactly one measurement.
2. Positive billed customer charge rows have one rated, chargeable charge line
   with the same quantity, currency, and amount.
3. Failed fixed-request calls, unknown prices, and non-positive unresolved
   prices have no charge line.
4. Summed charge amount matches billed settlement input within exact
   `NUMERIC(38,12)` arithmetic; floating-point tolerance is forbidden.
5. `COUNT(DISTINCT invocation_id)` is stable when one invocation has multiple
   token, image, item, or duration lines.
6. Every rated decision has non-null price-book/rate identity,
   account-rate-card scope and identity, and pricing-plan/rule identity; every
   unrated decision has no charge line and a classified reason code.
7. Active identity verification matches the vendor, region, catalog/API
   binding, typed conditions, official unit price, rate card, plan, rule, and
   immutable PriceService snapshot. The recorder does not execute billing
   strategies or recompute final amounts.
8. The stored pricing snapshot identifies the `PriceService` status,
   billability, rate identity, selected strategy, measured/rated quantity,
   unit size, and the three amount sides used by the charge command.

Reconciliation failures block settlement cutover. They do not trigger writes
that mutate historical charge lines.

## Rollback And Forward Fix

Rollback is application-compatible: deploy the prior application while the
module tables remain intact. Module tables are retained for audit and replay;
down migrations and data deletion are not part of rollback. If a shadow row is
wrong, append or update through the governed idempotent rating correction path
and preserve the original decision snapshot.

## Verification

- `cargo test -p sdkwork-cloudrouter-database-host --offline`
- `cargo test -p sdkwork-cloudrouter-router-service --test postgres_gateway_usage_recorder_sql_contract --offline`
- `cargo test -p sdkwork-cloudrouter-router-service --test app_dashboard_store_sql_contract --offline`
- `cargo test -p sdkwork-cloudrouter-router-service --test postgres_usage_settlement_store_sql_contract --offline`
- `cargo test -p sdkwork-cloudrouter-router-service --test upstream_route_selector`
- `cargo test -p sdkwork-cloudrouter-edge-runtime passthrough::tests::adapter_usage_line`
- `cargo test -p sdkwork-models-catalog-service price_service_tests` in
  `sdkwork-models`
- `python -B -m tools.check_pricing_reconciliation --database-url <url>` (runs
  the §Reconciliation data checks above; exit 0 when every check passes)
- `python -B -m tools.database_contract_materializer --root . --check`
- `pnpm db:validate`
