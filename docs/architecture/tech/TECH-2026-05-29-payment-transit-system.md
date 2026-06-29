> Migrated from `docs/superpowers/plans/2026-05-29-payment-transit-system.md` on 2026-06-24.
> Owner: SDKWork maintainers

# Payment Transit System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the SDKWORK payment transit system incrementally, starting with mainstream payment providers and keeping domestic acquiring providers extensible through catalog, capability, route, and adapter registration.

**Architecture:** `/payments/v3` is the stable aggregate API. Appbase commerce owns canonical `commerce_payment_*` facts and schema. Claw Router owns contract exposure, provider adapter runtime, callback/reconciliation workers, and admin/API reference integration.

**Tech Stack:** Rust, Axum, SQLx, SQLite, Postgres, OpenAPI 3.1, React portal API reference, Appbase commerce schema registry.

---

## Scope

Initial production provider scope:

- `wechat_pay`
- `alipay`
- `stripe`
- `paypal`
- `apple_pay`
- `google_pay`

Extension provider scope:

- `unionpay`
- `yeepay`
- `jd_pay`
- `lianlian_pay`
- `lakala`
- `allinpay`
- `china_ums`
- `fuiou_pay`
- `sandpay`
- `huifu_pay`
- `baofoo`
- `bill99`
- `pingan_pay`
- `icbc_pay`
- `cmb_pay`
- `ccb_pay`
- `boc_pay`
- `psbc_pay`

The initial implementation must not hardcode future extension providers as active runtime support. Extension providers should be visible as future catalog capability options only when explicitly enabled by implementation work.

## Files

Contract and API reference:

- Modify: `crates/sdkwork-claw-http/specs/payment-aggregate-openapi.json`
- Modify: `crates/sdkwork-claw-http/src/contract_routes.rs`
- Modify: `crates/sdkwork-claw-http/src/router.rs`
- Modify: `../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/apiReferenceSchemaTabs.ts`
- Modify: `../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/pages/ApiReference.tsx`
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-i18n/src/resources/public/api-reference.ts`

Schema and registry:

- Modify: `docs/schema-registry/tables/006-commerce.yaml`
- Modify: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-storage-sqlx-rust/migrations/0001_commerce_foundation.sql`
- Modify: `generated/schema/postgres/schema.sql` only through the project schema generation workflow.
- Modify: `generated/openapi/schema-components.yaml` only through generation.

Backend payment center:

- Modify: `services/sdkwork-clawrouter-router-service/src/api/admin_transaction_center.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_transaction_center_store.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/admin_transaction_center_store.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/ports/admin_transaction_center_store.rs`

Payment callback and adapter runtime:

- Create: `services/sdkwork-clawrouter-router-service/src/application/payment_adapter.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/application/payment_provider_registry.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/api/app_payment_callback.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/payment_callback_store.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/payment_callback_store.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/ports/payment_callback_store.rs`

Bootstrap catalog:

- Modify: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-bootstrap-rust/src/lib.rs`
- Modify: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-bootstrap-rust/tests/commerce_bootstrap_standard.rs`

Tests:

- Modify: `crates/sdkwork-claw-http/tests/service_router.rs`
- Modify: `apps/sdkwork-clawrouter-pc/api-reference-playground-runtime.test.ts`
- Create: `services/sdkwork-clawrouter-router-service/tests/payment_provider_catalog_contract.rs`
- Create: `services/sdkwork-clawrouter-router-service/tests/payment_adapter_registry.rs`
- Create: `tests/test_payment_transit_schema_contract.py`

## Task 1: Contract Scope Alignment

- [x] Verify `payment-aggregate-openapi.json` parses as OpenAPI 3.1.

Run: `powershell -Command "Get-Content -Raw 'crates\sdkwork-claw-http\specs\payment-aggregate-openapi.json' | ConvertFrom-Json | Select-Object -ExpandProperty openapi"`

Expected: `3.1.2`

- [x] Keep `x-supported-provider-codes` limited to mainstream providers.

Expected values: `wechat_pay`, `alipay`, `stripe`, `paypal`, `apple_pay`, `google_pay`.

- [x] Keep extension providers in `x-extension-provider-codes`.

Expected values include `unionpay`, `yeepay`, `jd_pay`, `lianlian_pay`, `lakala`, `allinpay`, `china_ums`, `fuiou_pay`, `sandpay`, `huifu_pay`, `baofoo`, `bill99`, `pingan_pay`, `icbc_pay`, `cmb_pay`, `ccb_pay`, `boc_pay`, `psbc_pay`.

- [x] Keep `PaymentProviderCode` as a string pattern with initial and extension metadata, not a closed enum.

Reason: new provider support should not require a public API shape change.

- [x] Run focused contract tests.

Run: `cargo test -p sdkwork-claw-http service_router --test service_router`

Expected: pass, or update expected route assertions when payment aggregate route exposure is intentionally changed.

Result: payment aggregate focused filter passed with `cargo test -p sdkwork-claw-http payment_aggregate --test service_router`. Full `service_router` currently still has an unrelated commerce coupons/campaigns contract failure in this workspace.

## Task 2: Provider Catalog Alignment

- [x] Update backend validation so active runtime provider allowlists match the mainstream provider set.

Target file: `services/sdkwork-clawrouter-router-service/src/api/admin_transaction_center.rs`

Expected mainstream providers: `wechat_pay`, `alipay`, `stripe`, `paypal`, `apple_pay`, `google_pay`.

- [x] Move future domestic provider codes into catalog metadata or comments, not active validation.

Reason: admin UI may document future providers, but runtime should not accept unsupported provider account activation as production ready.

- [x] Update bootstrap provider seeds to mainstream active/inactive placeholders only.

Target file: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-bootstrap-rust/src/lib.rs`

Expected: mainstream providers have deterministic seed ids and inactive placeholders. Extension providers are not inserted as active runtime providers until their adapters exist.

- [x] Add provider catalog contract test.

Target file: `services/sdkwork-clawrouter-router-service/tests/payment_provider_catalog_contract.rs`

Expected checks:

- backend validation allows only mainstream provider codes.
- bootstrap mainstream provider seeds exist.
- extension provider codes are documented but not treated as active runtime providers.

## Task 3: Schema Foundation

- [x] Add canonical table definitions to `docs/schema-registry/tables/006-commerce.yaml`.

Required tables:

- `commerce_payment_provider_capability`
- `commerce_payment_operation_attempt`
- `commerce_payment_route_decision`
- `commerce_payment_capture`
- `commerce_payment_webhook_delivery`
- `commerce_payment_statement`
- `commerce_payment_statement_item`
- `commerce_payment_reconciliation_item`
- `commerce_payment_fee`
- `commerce_payment_dispute`
- `commerce_payment_dispute_event`
- `commerce_refund_item`
- `commerce_refund_attempt`
- `commerce_refund_event`

- [x] Add Appbase migration definitions.

Target file: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-storage-sqlx-rust/migrations/0001_commerce_foundation.sql`

Rule: table names keep `commerce_payment_*`; index and constraint names use short names such as `uk_pay_op_attempt_no`, `idx_pay_op_attempt_resource`, and `uk_pay_webhook_delivery_event`.

- [x] Add schema contract test.

Target file: `tests/test_payment_transit_schema_contract.py`

Expected checks:

- all required tables are in the schema registry.
- all required physical migration tables are present.
- no proposed index/constraint identifier exceeds 63 characters.
- generated schema is not hand-edited without registry/migration source changes.

- [x] Regenerate schema artifacts using the project schema workflow.

Expected modified generated files:

- `generated/schema/postgres/schema.sql`
- `generated/schema/registry/sdkwork-clawrouter.tables.effective.yaml`
- `generated/openapi/schema-components.yaml`

## Task 4: Adapter Runtime Skeleton

- [x] Create `PaymentProviderAdapter` interface.

Target file: `services/sdkwork-clawrouter-router-service/src/application/payment_adapter.rs`

Required operations:

- `capabilities`
- `create_payment_intent`
- `confirm_payment_intent`
- `capture_payment_intent`
- `cancel_payment_intent`
- `create_refund`
- `query_refund`
- `cancel_refund`
- `verify_webhook`
- `normalize_webhook`
- `download_statement`
- `parse_statement`
- `invoke_native_operation`

- [x] Create provider registry.

Target file: `services/sdkwork-clawrouter-router-service/src/application/payment_provider_registry.rs`

Expected behavior:

- resolves mainstream providers.
- returns capability errors for unsupported extension providers.
- never relies on path-string provider parsing for runtime support.

- [x] Add no-op/sandbox adapters for mainstream provider codes.

Expected: adapters normalize unsupported runtime calls as capability errors until real provider clients are added.

- [x] Add registry tests.

Target file: `services/sdkwork-clawrouter-router-service/tests/payment_adapter_registry.rs`

Expected checks:

- mainstream providers resolve.
- extension providers return unsupported provider/capability errors.
- provider aliases such as `wechat` and `wxpay` normalize to `wechat_pay` only through registry aliases.

## Task 5: Webhook Delivery Split

- [x] Introduce `commerce_payment_webhook_delivery` write path.

Targets:

- `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/payment_callback_store.rs`
- `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/payment_callback_store.rs`

Expected behavior:

- raw delivery metadata is stored before business processing.
- normalized event remains in `commerce_payment_webhook_event`.
- duplicate event id and nonce do not double fulfill.

- [x] Replace hardcoded callback provider parsing with registry lookup.

Target file: `services/sdkwork-clawrouter-router-service/src/api/app_payment_callback.rs`

Expected behavior:

- `wechat`, `wechatpay`, `wechat_pay`, and `wxpay` normalize to `wechat_pay`.
- `alipay` and `ali` normalize to `alipay`.
- `stripe` normalizes to `stripe`.
- unsupported extension providers return explicit unsupported provider error.

- [x] Run callback tests for SQLite and Postgres where available.

Run focused SQLite tests first. Run Postgres tests with `pnpm.cmd test:postgres` when persistence changes are ready.

## Task 6: Payment And Refund Runtime

- [x] Implement create/confirm/capture/cancel intent orchestration behind `/payments/v3`.

Expected:

- public API command idempotency.
- route decision captured in `commerce_payment_route_decision`.
- provider calls logged in `commerce_payment_operation_attempt`.
- unsupported extension provider returns capability error.

- [x] Persist payment intent runtime through SQLite and Postgres stores instead of in-memory app runtime.

Completed:

- `SqlitePaymentIntentRuntimeStore` writes `commerce_payment_intent`, `commerce_payment_attempt`, `commerce_payment_route_decision`, and `commerce_payment_operation_attempt`.
- `PostgresPaymentIntentRuntimeStore` mirrors the same SQL contract.
- app-api database startup paths inject the SQL runtime store into `/payments/v3`; the no-database router remains in-memory.
- `commerce_payment_intent` now carries aggregate-payment standard columns: `merchant_order_no`, `subject`, `provider_code`, `payment_method`, `scene_code`, `metadata_json`, `provider_native_json`, `next_action_json`, `captured_amount`, and `refunded_amount`.

- [x] Add runtime tests for mainstream no-op/sandbox adapters before real provider network clients.

Completed:

- `payment_intent_runtime` covers idempotent create, route decision capture, operation attempt logging, and unsupported extension provider rejection.
- `payment_aggregate_api` covers `/payments/v3` create, confirm, capture, and cancel.
- `sqlite_payment_intent_runtime_store` verifies SQL persistence and failed operation attempts.
- `postgres_payment_intent_runtime_sql_contract` locks the Postgres SQL contract.
- app-api `database_config_payment_aggregate_create_uses_sqlite_runtime_store_and_is_idempotent` proves configured database routes persist through SQLite runtime store.

- [x] Implement refund aggregate, refund attempt, refund event, and refund item runtime baseline.

Expected:

- full refund and partial refund supported.
- refund idempotency by tenant/provider/out refund no.
- invalid terminal state transitions rejected.

Completed baseline:

- `PaymentRefundRuntimeService` creates SDKWORK refund records for full/partial amount requests.
- refund create is idempotent by tenant and API idempotency key.
- refund requests validate payment intent existence, amount, and currency before persistence.
- refund item allocations are accepted through `/payments/v3/refunds`, validate positive quantities and exact amount allocation totals, reject item currency mismatches at the API boundary, and persist to `commerce_refund_item`.
- mainstream sandbox adapters log `create_refund` provider operation attempts and persist failed refund attempts/events when the provider capability is unsupported.
- SQLite runtime persists `commerce_refund`, `commerce_refund_item`, `commerce_refund_attempt`, `commerce_refund_event`, and `commerce_payment_operation_attempt`.
- Postgres runtime has matching SQL contract coverage.
- `/payments/v3/refunds` is wired into product API and app-api database runtime.
- `/payments/v3/refunds/{refundId}/cancel` is wired with terminal-state conflict protection and provider cancel operation logging for non-terminal refunds.

Additional adapter wiring baseline:

- `PaymentProviderRegistry` now supports explicit canonical provider adapter registration through `with_adapter` / `try_with_adapter`, allowing a configured real adapter to replace the default sandbox adapter without changing default startup behavior.
- Registry alias resolution is preserved after replacement, so aliases such as `stripe_checkout` still resolve to the configured canonical provider adapter.
- Adapter registration rejects provider code mismatches before runtime use.
- Default registry remains sandbox-only until provider account credential resolution is explicitly wired.

Deferred:

- provider-success status transitions will be completed when real mainstream adapters are added.

## Task 7: Reconciliation Runtime

- [x] Implement statement metadata and statement item import path.

Tables:

- `commerce_payment_statement`
- `commerce_payment_statement_item`

- [x] Implement reconciliation item generation.

Table:

- `commerce_payment_reconciliation_item`

Difference types:

- `missing_in_sdkwork`
- `missing_in_provider`
- `amount_mismatch`
- `currency_mismatch`
- `status_mismatch`
- `duplicate_provider_record`
- `fee_mismatch`
- `settlement_mismatch`
- `chargeback_mismatch`

- [x] Add reconciliation tests using fixture statements.

Expected: match, missing, duplicate, fee mismatch, and status mismatch cases are covered.

Completed baseline:

- `PaymentReconciliationRuntimeService` imports provider statements and statement items into runtime records with tenant-scoped idempotency.
- SQLite runtime persists `commerce_payment_statement`, `commerce_payment_statement_item`, and generated `commerce_payment_reconciliation_item` records.
- Postgres runtime has matching SQL contract coverage for statement import and reconciliation item writes.
- Reconciliation generation compares provider statement rows against SDKWORK internal ledger entries by SDKWORK trade/refund keys.
- Difference generation now covers `missing_in_sdkwork`, `missing_in_provider`, `amount_mismatch`, `currency_mismatch`, `status_mismatch`, `duplicate_provider_record`, `fee_mismatch`, `settlement_mismatch`, and `chargeback_mismatch`.
- Matching rows intentionally do not create reconciliation difference rows.

## Task 8: Mainstream Provider Real Adapters

- [ ] Implement WeChat Pay APIv3 adapter.

Scope:

- JSAPI or Native first.
- refund.
- trade bill/fund flow bill download.
- signature verification and certificate handling.

Completed baseline:

- Added `WeChatPayProviderAdapter` as an explicitly configured real adapter without changing the default sandbox registry.
- Added injectable `WeChatPayApiClient` and `WeChatPayCrypto` abstractions so APIv3 request signing, callback verification, and resource decryption stay separated from payment orchestration.
- Added a Hyper-backed WeChat Pay APIv3 client that builds `WECHATPAY2-SHA256-RSA2048` Authorization headers through injected crypto and supports JSON POST/GET requests.
- Implemented Native payment creation through `POST /v3/pay/transactions/native` with CNY enforcement, app id, merchant id, description, out trade number, notify URL, and amount mapping.
- Implemented order close through `POST /v3/pay/transactions/out-trade-no/{out_trade_no}/close`.
- Implemented domestic refund creation through `POST /v3/refund/domestic/refunds` with refund amount, original total amount, out refund number, and reason mapping.
- Implemented domestic refund query through `GET /v3/refund/domestic/refunds/{out_refund_no}`.
- Implemented WeChat Pay callback signature verification using timestamp, nonce, body, and signature headers through injected crypto verification.
- Implemented callback normalization and encrypted resource plaintext extraction through injected APIv3 resource decryption.
- Implemented trade bill download URL query through `GET /v3/bill/tradebill` and CSV trade bill parser summary metadata for reconciliation import.
- Added focused adapter contract tests for Native create, close, refund create/query, callback verification, callback normalization/decryption, trade bill download/parse, and invalid currency validation.

Deferred:

- JSAPI scene-specific payer/openid mapping can be added after provider account scene configuration is wired.
- Platform certificate rotation and concrete RSA/AES-GCM implementation are intentionally isolated behind `WeChatPayCrypto`; this avoids coupling low-level secret/certificate lifecycle into the adapter before the provider credential subsystem is completed.

- [ ] Implement Alipay OpenAPI adapter.

Scope:

- page or app pay first.
- refund.
- bill download URL query.
- RSA/RSA2 notification verification.

Completed baseline:

- Added `AlipayPaymentProviderAdapter` as an explicitly configured real adapter without changing the default sandbox registry.
- Added injectable `AlipayOpenApiClient` and `AlipaySigner` abstractions so OpenAPI request mapping and RSA2 signing/verification stay separated from business orchestration.
- Added a Hyper-backed Alipay OpenAPI gateway client that builds standard gateway parameters, signs canonical payloads, posts `application/x-www-form-urlencoded` requests, and unwraps method response payloads.
- Implemented `alipay.trade.page.pay` page-pay mapping with CNY enforcement, out trade number, total amount, subject, product code, notify URL, and return URL.
- Implemented `alipay.trade.close` payment close mapping.
- Implemented `alipay.trade.refund` refund mapping and `alipay.trade.fastpay.refund.query` refund query mapping.
- Implemented Alipay async notification verification using canonical form payload construction and injected signer verification.
- Implemented Alipay webhook normalization to SDKWORK standard event fields.
- Implemented Alipay bill download URL query through `alipay.data.dataservice.bill.downloadurl.query` and CSV bill parser summary metadata for reconciliation import.
- Added focused adapter contract tests for page pay, close, refund create/query, notification verification, notification normalization, bill download/parse, and invalid currency validation.

Deferred:

- App Pay/mobile SDK order-string variant selection can be added as a configured payment scene after provider account activation is wired.
- Concrete RSA2 private-key/public-key crypto implementation is intentionally isolated behind `AlipaySigner`; this avoids binding low-level key storage/secret management into the adapter before the provider account credential subsystem is completed.

- [ ] Implement Stripe adapter.

Scope:

- PaymentIntents or Checkout Sessions.
- refunds.
- webhook signature verification.
- balance transaction reporting.

Completed baseline:

- Added `StripePaymentProviderAdapter` as an explicitly configured real adapter without changing the default sandbox registry.
- Added injectable `StripePaymentHttpClient` and a Hyper-backed default client for Stripe form POST operations.
- Implemented PaymentIntent create mapping to `POST /v1/payment_intents` with amount, currency, automatic payment methods, tenant/order metadata, flat metadata, and idempotency key forwarding.
- Implemented PaymentIntent confirm, capture, and cancel mappings with idempotency key forwarding, partial capture amount mapping, cancellation reason normalization, and resource id validation.
- Implemented refund create, query, and cancel mappings with payment intent, amount, normalized reason, refund metadata, idempotency key forwarding, retrieve endpoint support, and refund resource id validation.
- Implemented Stripe webhook signature verification using `Stripe-Signature` `t` and `v1` values with HMAC-SHA256 over `timestamp.body`.
- Implemented Stripe webhook normalization to SDKWORK standard event fields.
- Implemented Stripe balance transaction statement download by UTC day boundary and parser summary metadata for reconciliation import.
- Added focused adapter contract tests for create/confirm/capture/cancel PaymentIntent, create/query/cancel refund, valid/invalid webhook signature verification, webhook normalization, statement download/parse, and invalid request validation.

Deferred:

- Config-driven provider registry wiring after credential storage and provider account activation paths are aligned.

- [ ] Implement PayPal adapter.

Scope:

- Orders create/capture.
- refunds.
- webhook verification.
- transaction reporting where available.

Completed baseline:

- Added `PayPalPaymentProviderAdapter` as an explicitly configured real adapter without changing the default sandbox registry.
- Added injectable `PayPalPaymentHttpClient` and a Hyper-backed default client with PayPal OAuth client-credentials authentication.
- Implemented PayPal Orders create mapping to `POST /v2/checkout/orders` with CAPTURE intent, purchase unit amount, order metadata, and PayPal request id forwarding.
- Implemented PayPal Orders capture mapping to `POST /v2/checkout/orders/{order_id}/capture` with capture id extraction for downstream refund routing.
- Implemented PayPal refund create and query mappings with capture id, amount, invoice id, payer note, request id forwarding, and refund resource id validation.
- Implemented PayPal webhook verification by delegating to `POST /v1/notifications/verify-webhook-signature` using configured webhook id and PayPal transmission headers.
- Implemented PayPal webhook normalization to SDKWORK standard event fields.
- Implemented PayPal transaction reporting download through `/v1/reporting/transactions` by UTC day range and parser summary metadata for reconciliation import.
- Added focused adapter contract tests for order create/capture, refund create/query, webhook verification, webhook normalization, transaction reporting download/parse, and invalid request validation.

Deferred:

- Config-driven provider registry wiring after credential storage and provider account activation paths are aligned.
- PayPal refund cancel remains unsupported because PayPal refunds do not expose the same generic cancel lifecycle as the aggregate interface.

## Task 9: Extension Provider Onboarding Pattern

- [ ] Document provider onboarding checklist.

Expected checklist:

- provider code reserved.
- capabilities declared.
- provider account credential references configured.
- route rules added.
- adapter registered.
- contract tests added.
- webhook verification tests added.
- reconciliation fixtures added.

- [ ] Add one extension provider as a reference implementation only after mainstream adapters pass their contract tests.

Recommended first extension candidate: `unionpay` or `yeepay`, based on business priority and documentation availability.

## Verification Gate

Run focused checks after each task. Before delivery of a runtime phase, run:

```powershell
pnpm.cmd verify
```

If persistence changes are included, also run:

```powershell
pnpm.cmd test:postgres
```

Completion requires:

- OpenAPI parses.
- API reference shows Payment Aggregate API.
- Mainstream provider set is consistent across contract, backend validation, bootstrap seeds, and registry.
- Schema registry, migration source, and generated schema agree.
- Unsupported extension providers fail with explicit capability/provider errors.
- No raw card data or raw provider secret values are stored.

