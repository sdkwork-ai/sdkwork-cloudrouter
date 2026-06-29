# Appbase Commerce Platform Design

> Superseded: this billing-centered draft has been replaced by
> `2026-05-21-appbase-commerce-standard-design.md`.
> New implementation work must follow the no-compatibility commerce standard:
> no `/billing` namespace, no legacy route aliases, no compatibility envelopes,
> and no product-local fallback commerce stores.

## Goal

Build `sdkwork-appbase` into the reusable commerce foundation for accounts, ledgers,
orders, payments, refunds, coupons, invoices, recharge catalogs, idempotency, and
transaction boundaries. Product applications such as `sdkwork-clawrouter` must
consume the appbase commerce platform as a set of composable building blocks
instead of hosting generic commerce logic locally.

The end state is not just code reuse inside `sdkwork-clawrouter`. Other
applications must be able to integrate the same commerce capabilities quickly by
mounting appbase routers, creating appbase SQL stores, registering provider
adapters, and calling appbase service facades.

## Current Assessment

`sdkwork-appbase` already has a strong foundation:

- `sdkwork-商���-core-rust` defines shared commerce context, money, points,
  account asset types, ledger direction, status concepts, operation contracts,
  idempotency records, and service errors.
- `sdkwork-商���-account-rust`, `sdkwork-商���-payment-rust`,
  `sdkwork-商���-order-rust`, `sdkwork-商���-promotion-rust`, and
  `sdkwork-商���-invoice-rust` define domain objects, commands, queries,
  ports, and service contracts.
- `sdkwork-商���-storage-sqlx-rust` owns the reusable `commerce_*` schema,
  migration contracts, table catalog, and storage capability manifest.
- `sdkwork-商���-runtime-rust` owns runtime dispatch, idempotency, transaction
  boundary abstractions, and operation execution envelopes.
- `sdkwork-商���-http-rust` defines app/backend route metadata for
  `/app/v3/api/billing/*`.
- `sdkwork-商���-bootstrap-rust` composes runtime, storage, HTTP, Tauri, and
  bootstrap contract validation.
- `sdkwork-商���-membership-sqlx-rust` already behaves like a reusable
  finished block: it provides concrete SQLite/Postgres stores and app/admin
  routers for membership.

The platform is not complete yet:

- Account, payment, order, promotion/coupon, invoice, refund, recharge, and
  payment-webhook paths do not all have reusable SQLx stores in appbase.
- Wallet, points, token, asset exchange, top-up, withdrawal, transfer, and
  deduction operations are only partially modeled. Core has `Cash`, `Points`,
  and `Token` asset types, and storage has `commerce_account`,
  `commerce_account_ledger_entry`, `commerce_recharge_package`, and
  `commerce_exchange_rule`, but appbase does not yet provide a complete reusable
  wallet service/router for these operations.
- The HTTP crate exposes route contracts, but it does not yet provide complete
  mountable Axum routers for all generic commerce operations.
- Runtime operation contracts exist, but there is no complete set of generic
  service handlers wired to concrete SQL stores.
- `sdkwork-clawrouter` still owns generic commerce API/store implementations
  such as app billing, recharge, checkout, payment callback, account summary,
  admin marketing, and admin finance read/write paths.
- Some `sdkwork-clawrouter` tests already guard against old `plus_*` tables,
  but the generic replacement logic still lives in `sdkwork-clawrouter` instead
  of appbase.

## Frontend/Backend Commercial Capability Alignment

The current front/back design is directionally aligned, but it is not yet a
complete commercial-grade appbase platform.

### What Is Aligned

- The portal has clear commercial workspaces: console account, billing,
  recharge, checkout, settlements, admin finance, admin marketing, admin user
  balance adjustment, and membership.
- Portal commercial calls are routed through
  `sdkwork-clawroutes-pc-commons/src/commerce-runtime.ts`, then through generated
  `@sdkwork/clawrouter-app-sdk` or `@sdkwork/clawrouter-backend-sdk`.
- `sdkwork-appbase` has reusable frontend blocks:
  `@sdkwork/commerce-contracts`, `@sdkwork/commerce-sdk-ports`, and
  `@sdkwork/commerce-service`.
- `sdkwork-appbase/specs/appbase-capabilities.yaml` declares commerce as an L3
  reusable capability with contracts, SDK ports, service, runtime, SQLx storage,
  and PC React layers.
- The claw-router schema registry already exposes many commerce operations and
  generated SDK operation ids for app and backend surfaces.
- Appbase SQL migration already owns a broad `commerce_*` schema with
  idempotency, account, ledger, coupon, order, payment intent, payment attempt,
  webhook event, payment method, refund, exchange rule, recharge package, membership,
  and invoice tables.

These are useful building blocks. They are not enough to declare the system
commercially complete because the front/back contract surface is ahead of the
reusable appbase runtime/storage/router implementation.

### Current Gaps

1. Frontend contract is wider than backend implementation.

   The portal and appbase TypeScript service expose wallet overview/accounts,
   transactions, operations, top-ups, withdrawals, transfers, exchanges, points
   recharge records/orders/cancel, token deductions, coupon catalog/claim/usage,
   payment record detail, and preflight operations. In `sdkwork-clawrouter`,
   several matching routes in `app_commerce.rs` still return an empty list,
   default zero balance, path item unavailable, or `5010` command-store
   unavailable.

2. Backend implementation is wider than appbase implementation.

   Admin promotion management, coupon stocks/codes, recharge records/packages,
   exchange rules, payment attempts, finance ledger, usage statements, account
   summary, checkout, recharge, and payment callback have real Rust API/store
   shape in `sdkwork-clawrouter-router-service`. Those are generic commerce concerns and
   should move to appbase stores/services/routers.

3. Appbase runtime is not yet the source of truth for all exposed operations.

   `sdkwork-商���-runtime-rust` registers account summary, coupons, orders,
   payment intents/records, membership, and invoices. It does not yet register the
   wallet, points recharge, account points, token, exchange, coupon catalog,
   coupon usage rollback, checkout status, payment webhook, refund,
   settlements, finance, or backend marketing operations currently exposed by
   the product surface.

4. Appbase HTTP is still route metadata, not a complete mountable backend.

   `sdkwork-商���-http-rust` defines route contracts and execution metadata.
   It does not yet provide full Axum routers wired to appbase runtime handlers
   and SQLx stores for all generic commerce operations.

5. Frontend type safety is not yet at commercial SDK level.

   `@sdkwork/commerce-service` and `@sdkwork/commerce-sdk-ports` provide a good
   reusable call boundary, but many request/response shapes are still
   `unknown`/`Record<string, unknown>`. Feature packages define local DTOs,
   status enums, money parsing, exchange validation, and display fallbacks. A
   second app can reuse the call shape, but it cannot yet rely on appbase as a
   complete typed commerce SDK.

6. Asset exchange is not generic enough.

   Frontend and backend code still hard-code or validate only `POINTS -> CASH`.
   A building-block commerce platform must support configured asset pairs such
   as cash, points, token, stored credit, voucher credit, or product-defined
   assets through appbase exchange rules and host capability policy.

7. Pagination and filtering are inconsistent.

   Backend finance validates page/page_size/status/time filters, while several
   marketing and app-side routes expose list operations without consistent
   pagination, cursor, status filters, asset filters, or total/count metadata.
   Commercial admin screens need stable list contracts for large datasets.

8. Commercial operations lack full lifecycle surfaces.

   Missing or incomplete generic appbase surfaces include payment method
   management, payment provider config, webhook event inspection/replay,
   reconciliation jobs, refunds, chargebacks/disputes, invoice review/issuance,
   statement close/reopen, settlement exports, coupon eligibility/rule preview,
   account adjustment approval, and audit event search.

9. Security/compliance boundaries are not explicit enough.

   A commercial payment system should keep appbase out of raw card-data storage,
   model provider tokens/secrets separately, enforce idempotency for every
   mutation, expose audit logs for admin writes, and define PCI/OWASP-aligned
   controls for auth, authorization, logging, payment page/provider integration,
   webhook verification, and secure failure handling. As of 2026-05-20, PCI SSC
   publishes PCI DSS v4.0.1 as the current PCI DSS line, and OWASP ASVS 5.0.0 is
   the current stable ASVS release. The appbase design should use these as
   security baselines without claiming compliance automatically.

### Required App-Side Capability Set

The reusable appbase app surface should expose, implement, and type these
operations end to end:

- Account summary with cash/points/token balances and per-asset account status.
- Wallet account list, wallet overview, transaction list/detail, and operation
  lookup by request number.
- Top-up, withdrawal, transfer, exchange, prehold, settlement, and release, all
  idempotent and ledger-backed.
- Points balance/history, points recharge package list, recharge order create,
  recharge order status, recharge cancellation, points transfer, and points
  exchange.
- Token balance and token deduction with capability flags.
- Coupon catalog, eligibility preview, claim, redeem, usage, rollback, current
  user coupon list/detail, and expiry handling.
- Order list/detail/create/cancel/status and payment-success lookup.
- Payment intent/attempt creation, checkout status, payment record list/detail,
  method list, provider next action, and failure reason normalization.
- Refund application/status when supported by provider.
- Invoice title management, invoice application/list/detail/items/submit/cancel,
  and provider issue status.
- Settlement dashboard and statement list/detail/download for user-visible bills.
- Stable error categories, idempotency replay/conflict status, and retry-safe
  request identifiers.

### Required Backend/Admin Capability Set

The reusable appbase backend surface should expose, implement, and type these
operations end to end:

- Account ledger query with tenant/org/user/asset filters, balance snapshot,
  immutable ledger evidence, and export support.
- Manual balance adjustment with reason, approval status, idempotency,
  operator identity, and audit log.
- Coupon template/campaign/rule management, batch generation, code lifecycle,
  claim/redeem/rollback search, and eligibility diagnostics.
- Recharge package catalog CRUD with visibility windows, status, sort order,
  asset type, price, bonus, and product/SKU linkage.
- Exchange rule CRUD with source/target asset types, rate precision,
  min/max amount, effective window, status, and audit log.
- Order management with status filters, amount breakdown, coupon application,
  payment attempts, refund references, and lifecycle events.
- Payment attempt search, provider status sync, webhook event list/detail,
  replay, nonce/event-id dedupe, verification result, and reconciliation run.
- Refund management with provider refund command, partial refund support,
  failure reason, and ledger reversal.
- Invoice review/issue/void lifecycle and provider document metadata.
- Statements, settlements, revenue reports, downloads, and reconciliation
  reports.
- Provider configuration, webhook secrets, key rotation metadata, and health
  checks.
- Risk and operations views: suspicious duplicate callbacks, idempotency
  conflicts, failed mutations, locked accounts, and irreversible admin actions.

### Frontend UX Completion Standard

Each commercial frontend module should be backed by real appbase contracts, not
fake success branches or empty placeholders. The minimum UX contract is:

- Typed view model from appbase service types, not locally invented duplicate
  DTOs.
- Loading, empty, success, recoverable error, permission denied, and unavailable
  capability states.
- Search, filters, pagination/cursor, sorting where the backend supports large
  lists.
- Idempotent mutation feedback: submitted, processing, replayed, completed,
  failed, conflict.
- User-visible payment status: pending, requires action, paid, failed, expired,
  closed, refunding, refunded.
- Admin-visible audit context: operator, request id, idempotency key, source
  system, created/updated timestamps.
- Export/download flows for invoices, statements, settlement reports, and
  ledger reports when those capabilities are enabled.
- No frontend-local hard-coding of asset pairs, status aliases, provider names,
  or money precision when appbase can provide the contract.

### Contract And SDK Rules

- App product-surface calls must continue to go through generated
  `@sdkwork/clawrouter-app-sdk` via the shared commerce runtime boundary.
- Backend/admin calls must continue to go through generated
  `@sdkwork/clawrouter-backend-sdk` via the same boundary.
- `sdkwork-appbase` reusable packages must never import concrete
  `@sdkwork/clawrouter-*` SDK packages. They should depend on generic
  `@sdkwork/commerce-sdk-ports` and app-provided adapters.
- If a method exists in the frontend contract, appbase must either implement it
  or mark it as an explicit disabled capability with a stable error. Silent
  empty lists and default zero balances are not acceptable for commercial
  readiness.
- OpenAPI, schema registry, generated SDKs, TypeScript appbase contracts, Rust
  runtime operation contracts, HTTP route metadata, and SQLx store traits must
  use the same operation names and lifecycle states.

### Commercial Readiness Acceptance Criteria

- A second SDKWork app can mount appbase commerce, inject generated SDK adapters,
  run SQLite/Postgres migrations, and complete account, wallet, points recharge,
  order, payment, coupon, refund, invoice, and ledger flows without importing
  `sdkwork-clawrouter`.
- Every mutation has idempotency, request hash, transaction boundary, audit
  metadata, and deterministic retry behavior.
- Every balance change writes an immutable ledger entry before the operation is
  considered successful.
- Every list used by admin or billing screens has stable filters and pagination.
- Payment provider callbacks are verified, deduplicated, recorded, replayable,
  and reconciled against payment attempts/orders.
- Coupon, recharge, exchange, payment, invoice, refund, wallet, points, and
  token status machines reject invalid transitions.
- Appbase ships fake/test providers for local integration and real provider
  adapter interfaces for production integration.
- Portal modules consume appbase typed services and generated SDK contracts,
  while claw-router keeps only product-specific policies and projections.

## Architecture Principles

1. Appbase owns generic commerce primitives.

   Anything that can be reused by another SDKWork application belongs in
   `sdkwork-appbase`: account balance, ledger mutation, order lifecycle, payment
   intent/attempt/refund, coupon claim/redeem/rollback, invoice lifecycle,
   wallet operations, points and token operations, asset exchange, recharge
   package catalog, webhook event recording, idempotency, transaction boundary,
   runtime dispatch, route binding, and provider adapter contracts.

2. Product apps own adapters and product policy.

   `sdkwork-clawrouter` may own AI usage facts, model pricing, route/channel
   logic, usage settlement workers, product-specific response mapping, and
   product-specific orchestration. It must not own the generic commerce ledger,
   payment, order, coupon, or invoice implementation.

3. Blocks compose through small stable interfaces.

   A host application should combine:

   - SQL store block: SQLite/Postgres repository implementations.
   - Runtime block: operation registry, idempotency, transaction manager.
   - HTTP block: app/backend routers and request context extraction.
   - Provider block: payment/refund/invoice/webhook adapters.
   - Bootstrap block: migration, seed, preflight, capability validation.

4. Appbase APIs must support more than claw-router.

   Any public type or route must be named and shaped around commerce concepts,
   not `claw-router` concepts. Claw-router-specific names, model pricing, gateway
   usage facts, or portal response details must not leak into appbase.

5. No dual sources of truth.

   Account balance and ledger facts must have one generic commerce source of
   truth. Product apps can write bridge/projection tables, but not duplicate
   generic balances, orders, payments, coupons, or invoices.

## Target Module Shape

### Core Domain Blocks

`sdkwork-商���-core-rust` remains the shared foundation:

- `CommerceRuntimeContext`
- `CommerceMoney`, points/token asset helpers
- account asset type and ledger direction
- service errors and stable error codes
- idempotency record and request hash
- operation/service contracts
- transaction boundary metadata
- capability flags

Domain crates keep their narrow responsibilities:

- `sdkwork-商���-account-rust`: account summary, ledger entry draft, prehold,
  wallet summary, points/token balance, top-up, withdrawal, transfer, exchange,
  deduction, account mutation commands, and account queries.
- `sdkwork-商���-order-rust`: order draft, order item, amount breakdown,
  order status lifecycle, paid order reference.
- `sdkwork-商���-payment-rust`: payment intent, payment attempt, refund,
  provider command contract, webhook verification contract.
- `sdkwork-商���-promotion-rust`: promotion offers, immutable offer
  versions, scopes, audience rules, time windows, budgets, stocks, codes, user
  coupons, discount applications, allocations, ledgers, external bindings, and
  event outbox.
- `sdkwork-商���-invoice-rust`: invoice title, invoice application, invoice
  item, invoice status lifecycle, provider command contract.
- `sdkwork-商���-membership-rust`: membership, levels, entitlements,
  usage, benefits.

These crates must stay storage-agnostic and host-agnostic.

### SQLx Storage Blocks

`sdkwork-商���-storage-sqlx-rust` should grow from schema catalog into the
default concrete storage implementation. It should provide:

- `SqliteCommerceAccountStore` and `PostgresCommerceAccountStore`
- `SqliteCommerceWalletStore` and `PostgresCommerceWalletStore`
- `SqliteCommerceLedgerStore` and `PostgresCommerceLedgerStore`
- `SqliteCommerceExchangeRuleStore` and `PostgresCommerceExchangeRuleStore`
- `SqliteCommerceOrderStore` and `PostgresCommerceOrderStore`
- `SqliteCommercePaymentStore` and `PostgresCommercePaymentStore`
- `SqliteCommerceRefundStore` and `PostgresCommerceRefundStore`
- `SqliteCommercePromotionStore` and `PostgresCommercePromotionStore`
- `SqliteCommerceInvoiceStore` and `PostgresCommerceInvoiceStore`
- `SqliteCommerceRechargeCatalogStore` and `PostgresCommerceRechargeCatalogStore`
- `SqliteCommerceWebhookEventStore` and `PostgresCommerceWebhookEventStore`
- `SqliteCommerceIdempotencyStore` and `PostgresCommerceIdempotencyStore`
- `SqliteCommerceTransactionManager` and `PostgresCommerceTransactionManager`

The stores should expose typed traits from domain crates or from a small shared
`sdkwork-商���-platform-rust` facade crate if cross-domain operations need a
single cohesive API.

Postgres implementations must use row locking where concurrent mutation matters.
SQLite implementations must provide equivalent transactional protection within
SQLite constraints.

### Runtime Blocks

`sdkwork-商���-runtime-rust` should provide:

- a typed operation registry
- service handler traits for account/order/payment/promotion/invoice/recharge
- idempotent execution
- transaction execution
- stable JSON operation envelopes
- runtime preflight showing registered services, capabilities, and missing
  provider adapters

Runtime handlers should delegate to appbase stores and provider ports. They
should not know Axum, Tauri, or claw-router.

### Wallet and Points Blocks

Wallet and points must be first-class appbase capabilities, not claw-router
placeholders. The platform should support these generic operations:

- wallet overview
- wallet account list
- wallet transaction list and detail
- wallet operation lookup by request number
- cash top-up request
- withdrawal request
- wallet transfer
- asset exchange
- points balance
- points history
- points recharge package list
- points recharge order creation and lookup
- points recharge cancellation
- points transfer
- points exchange rule list
- points exchange creation and lookup
- token balance
- token deduction

The initial asset model is:

- `cash`: decimal money with currency
- `points`: non-negative integer reward/credit unit
- `token`: non-negative integer usage unit

All mutations must append `commerce_account_ledger_entry`; no operation may
update account balances without a ledger entry and idempotency key.

Recharge is a composition of order, payment, payment attempt, and account ledger
credit. Points recharge packages belong in appbase catalog storage, while a host
application may choose which packages are visible through policy or feature flags.

Exchange uses `commerce_exchange_rule` and must be generic across asset pairs,
not hard-coded to `POINTS -> CASH`. Product apps may restrict allowed pairs, but
the appbase rule engine must support configured pairs.

Transfers and deductions must be capability-guarded operations. Hosts can disable
them through appbase capability flags, but the contract and default store support
must be present.

### HTTP Blocks

Appbase should expose mountable routers, either by extending
`sdkwork-商���-http-rust` or by adding `sdkwork-商���-axum-rust`.

Required routers:

- app account/billing router
- app wallet router
- app points router
- app token router
- app asset exchange router
- app orders router
- app payments router
- app coupons router
- app recharge router
- app invoice router
- app membership router, wrapping the existing membership SQLx router
- backend/admin commerce router for catalog, coupons, payment attempts, recharge
  packages, invoices, refunds, and ledger views

The host application must provide:

- authenticated context extraction
- optional body limit configuration
- provider adapter registry
- response-envelope compatibility mode if the product has an existing envelope
- route prefix configuration only when needed

The default route contract should remain compatible with
`/app/v3/api/billing/*`.

### Provider Blocks

Payment and invoice providers should be plug-ins:

- `CommercePaymentProvider`
- `CommerceRefundProvider`
- `CommercePaymentWebhookVerifier`
- `CommerceInvoiceProvider`

Provider implementations can live in separate appbase packages. The base
platform should ship a no-op/test provider for local development and tests.

Provider adapters must return normalized appbase domain outcomes. They must not
write product tables directly.

### Bootstrap Blocks

`sdkwork-商���-bootstrap-rust` should produce a one-call host integration
surface:

- migration/preflight
- seed installation
- storage capability validation
- runtime capability validation
- HTTP route manifest validation
- provider-adapter validation
- integration summary for host logs

The host should be able to create a platform with a small builder:

```rust
let commerce = CommercePlatform::builder()
    .sqlite(pool)
    .auth_context_extractor(extractor)
    .payment_provider(provider)
    .build()
    .await?;

let app = Router::new().merge(commerce.app_router());
```

The exact builder API can evolve, but the integration experience must stay this
small.

## Claw-Router Migration Boundary

`sdkwork-clawrouter` should keep:

- AI usage recording and `ai_usage_fact`
- model and route pricing
- provider relay and channel/account-pool routing
- usage settlement worker orchestration
- product-specific admin/app response mapping
- bridge/projection tables that are unique to gateway usage settlement
- OpenAPI/schema generation for the claw-router product surface

`sdkwork-clawrouter` should remove or shrink:

- generic billing store
- generic wallet, points, token, exchange, transfer, and deduction store
- generic recharge store
- generic payment callback store
- generic checkout store
- generic account summary store
- generic coupon/admin marketing implementation
- generic finance ledger/payment/order implementation

After migration, those modules should become thin adapters that delegate to
appbase stores/services or disappear entirely when the appbase router can be
mounted directly.

## Phase B: Appbase Platform Completion

Phase B produces a reusable appbase commerce platform independent of
`sdkwork-clawrouter`.

Deliverables:

1. Add appbase SQLx stores for account, ledger, order, payment, refund,
   promotion, invoice, wallet, points, token, exchange rules, transfers,
   deductions, recharge catalog, webhook event, idempotency, and transaction
   manager.
2. Add appbase runtime handlers that compose those stores into generic commerce
   operations.
3. Add appbase Axum routers for app and backend commerce surfaces.
4. Extend bootstrap to validate SQL stores, runtime handlers, HTTP routers, and
   provider adapters.
5. Add independent appbase tests for SQLite and Postgres SQL contracts.
6. Add integration docs showing how a new application mounts the commerce
   platform.

Acceptance criteria:

- Appbase tests can create a SQLite commerce platform, run migration/seed, mount
  routers, create an order, create a payment intent, claim/redeem a coupon, and
  append account ledger entries without using claw-router code.
- Appbase tests can list wallet accounts, read points/token balances, create a
  points recharge order, process a payment-success ledger credit, transfer
  points, exchange assets through a configured rule, and reject unsupported
  operations through capability flags without using claw-router code.
- Appbase Postgres SQL contract tests cover the same business paths.
- No appbase public API mentions claw-router, model routing, gateway usage, or
  portal-specific response shapes.
- A new host app can integrate appbase commerce with a small builder or a short
  documented setup.

### Phase B Slice 1 Status

Implemented in the first account/wallet/ledger slice:

- appbase account/wallet/ledger domain contracts for wallet account items,
  wallet overview, wallet transaction list/detail, wallet operation lookup, and
  idempotent ledger append outcomes
- SQLite account wallet store with account reads, wallet overview, transaction
  reads, operation lookup, ledger append, idempotency replay/conflict handling,
  and insufficient-balance rejection
- Postgres account wallet store with the same public API and row-locking write
  path; currently compile/API-tested without a live Postgres behavioral run
- runtime operation contracts and storage-agnostic account runtime handler for
  `wallet.overview.retrieve`, `wallet.accounts.list`,
  `wallet.transactions.list`, `wallet.transactions.retrieve`,
  `wallet.operations.retrieve`, and `ledger.entries.append`
- mountable appbase Axum wallet router for app wallet read routes and disabled
  mutation placeholders for top-up, withdrawal, transfer, exchange, and token
  deduction
- TypeScript appbase commerce contracts verified against the wallet operation
  catalog; no claw-router SDK dependency was introduced into appbase
- `sdkwork-clawrouter` DB-configured app API now mounts the appbase wallet
  router for wallet routes while retaining product-local fallback routes for
  still-unmigrated commerce capabilities

Still pending after Slice 1:

- top-up, withdrawal, transfer, exchange, token deduction, points recharge,
  order, payment, refund, coupon, invoice, settlement, and admin finance command
  handlers in appbase
- live Postgres behavior verification for the account wallet store
- backend/admin appbase routers for generic commerce management surfaces
- removal of old product-local commerce stores/routes after appbase reaches
  functional parity
- SDK/OpenAPI regeneration and frontend migration work where exposed product
  contracts change

## Phase C: Ecosystem and Polishing

Phase C turns the completed platform into a polished building-block ecosystem.

Deliverables:

1. Provider adapter packages for common payment/invoice/webhook flows.
2. Generated SDK alignment for app/backend commerce APIs.
3. Admin UI/backend integration conventions that consume appbase contracts
   instead of product-local duplicate contracts.
4. Tauri/local private integration examples.
5. Example app showing minimal setup.
6. Compatibility guidance for products with existing response envelopes.
7. Architecture guardrails that prevent product apps from reimplementing generic
   commerce SQL.

Acceptance criteria:

- A second SDKWork app can integrate account/order/payment/coupon flows without
  copying claw-router code.
- SDK consumers see stable operation IDs, request/response contracts, and error
  codes from appbase.
- Provider adapters can be swapped without changing core stores.
- Product apps only provide context extraction, provider configuration, and
  product-specific composition.

## Testing Strategy

Appbase tests:

- domain unit tests for each domain crate
- SQLx SQLite tests for every store
- Postgres SQL contract tests for every store
- runtime idempotency and transaction tests
- HTTP route tests with fake auth context
- bootstrap preflight tests
- provider adapter contract tests with fake providers

Claw-router migration tests:

- architecture tests that forbid generic commerce SQL implementations in
  `sdkwork-clawrouter`
- integration tests that prove claw-router app/backend routes delegate to
  appbase
- usage settlement tests that prove product-specific bridge behavior remains
  intact
- OpenAPI/SDK tests that prove the exposed product contract remains compatible

## Error Handling

Appbase should expose stable commerce error categories:

- validation
- unauthenticated
- unauthorized
- not_found
- conflict
- invalid_state
- provider_unavailable
- payment_verification_failed
- idempotency_conflict
- storage
- unknown

Product apps may map these to their response envelopes, but they should not
invent new generic commerce errors for appbase-owned failures.

## Non-Goals

- Do not move claw-router AI gateway usage pricing into appbase commerce.
- Do not make appbase depend on claw-router.
- Do not preserve legacy `plus_*` Java-compatible assumptions as the new local
  private source of truth.
- Do not build UI-specific logic into appbase stores or services.
- Do not expose provider-specific payment behavior through generic domain types.
- Do not treat wallet, points, token, exchange, transfer, or deduction as
  claw-router-only convenience endpoints.

## Open Decisions

1. Whether to add a new `sdkwork-商���-platform-rust` facade crate or keep
   the facade inside `sdkwork-商���-runtime-rust`.
2. Whether Axum routers should live in `sdkwork-商���-http-rust` or a new
   `sdkwork-商���-axum-rust` crate.
3. Whether admin/backend commerce routes should be generated only from the
   appbase manifest or also hand-mounted by host apps.
4. Which payment provider adapter should be implemented first for a real
   end-to-end integration test.

## Approval Checklist

- Appbase is the owner of generic commerce capability.
- Claw-router is only a commerce consumer and product adapter.
- Phase B completes reusable platform capability before Phase C polish.
- Phase C focuses on SDKs, provider adapters, docs, examples, and guardrails.
- No generic account/payment/order/coupon/invoice implementation remains coupled
  to claw-router after migration.
