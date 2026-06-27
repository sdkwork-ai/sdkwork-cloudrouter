> Migrated from `docs/superpowers/specs/2026-05-29-payment-transit-system-design.md` on 2026-06-24.
> Owner: SDKWork maintainers

# Payment Transit System Design

## Goal

Build an industry-grade SDKWORK payment transit system that can normalize native payment providers into one stable API, one SDK contract, and one auditable payment fact model. The first implementation should focus on mainstream providers: WeChat Pay, Alipay, Stripe, PayPal, and tokenized card/wallet payments. Domestic acquiring providers such as UnionPay, YeePay, JD Pay, LianLian Pay, Lakala, Allinpay, China UMS, Fuiou Pay, Sandpay, Huifu Pay, Baofoo, 99Bill, Ping An Pay, and major bank channels must be supported by the same extensible catalog and adapter model, but can be enabled gradually.

The first landing target is definition and design. Runtime provider integrations are intentionally out of scope until the model, contracts, tables, and adapter boundaries are approved.

## Current State

The repository already has useful payment foundations, but they are not complete enough for a payment transit station.

Reusable Appbase commerce tables exist in `sdkwork-appbase/packages/native-rust/commerce/sdkwork-commerce-storage-sqlx-rust/migrations/0001_commerce_foundation.sql`:

- `commerce_order`
- `commerce_order_item`
- `commerce_order_amount_breakdown`
- `commerce_payment_intent`
- `commerce_payment_attempt`
- `commerce_payment_webhook_event`
- `commerce_payment_method`
- `commerce_payment_provider`
- `commerce_payment_provider_account`
- `commerce_payment_channel`
- `commerce_payment_route_rule`
- `commerce_refund`
- `commerce_idempotency_key`
- `commerce_account`
- `commerce_account_ledger_entry`

The schema registry in `docs/schema-registry/tables/006-commerce.yaml` already defines additional payment/refund concepts that are missing from the Appbase foundation migration or from current runtime support:

- `commerce_payment_reconciliation_run`
- `commerce_refund_item`
- `commerce_refund_attempt`
- `commerce_refund_event`
- `commerce_order_event`

The Claw Router generated Postgres schema currently does not create the Appbase payment fact tables. It does contain `open_platform_pay_binding`, which is reusable as a binding between open-platform accounts and payment provider accounts/channels. It must not become the payment source of truth.

The definition-only payment aggregate OpenAPI file exists at `crates/sdkwork-claw-http/specs/payment-aggregate-openapi.json`. It exposes `/payments/v3` for provider discovery, payment intents, capture, cancel, refunds, reconciliation, webhooks, and provider-native operations. This API surface is the right public contract direction, but it is ahead of the current runtime and seed catalog.

Known implementation gaps:

- `admin_transaction_center.rs` validates only `wechat_pay`, `alipay`, `paypal`, `stripe`, `apple_pay`, and `google_pay`.
- Appbase payment bootstrap seeds only the same basic provider set plus wallet method metadata.
- `app_payment_callback.rs` hardcodes provider parsing for WeChat, Alipay, Stripe/card style callbacks.
- Current webhook storage mixes delivery facts, signature metadata, normalized event facts, and processing state.
- Current refund persistence is too thin for partial refunds, native refund attempts, provider callback events, and finance review.
- Current reconciliation model has run-level metadata but lacks statement rows, statement items, reconciliation items, and explicit difference resolution.

## Design Principles

The payment transit system must use SDKWORK as the stable boundary. Native provider behavior is adapted behind the SDKWORK contract, not exposed directly to app clients.

Core principles:

- Use `commerce_payment_*` and `commerce_refund*` as the canonical payment facts. Do not create an unrelated standalone `payment_*` subsystem.
- Keep provider, method, channel, account, and route as separate concepts.
- Store money as decimal string or exact numeric in storage-specific implementations. Never use floating point.
- Every command must be idempotent by tenant, operation, and external request key.
- Every provider call must create an immutable operation attempt row, including failures.
- Webhook ingestion must preserve raw delivery facts before normalization and processing.
- Native card PAN, CVV, magnetic stripe, and sensitive authentication data must never enter SDKWORK storage.
- Provider secrets, private keys, webhook secrets, and certificates must be referenced by `secret_ref` or `certificate_ref`; raw secret material must not be stored in payment rows.
- Unified APIs must cover common use cases first. Provider-native operations are allowed only through a controlled envelope with audit, capability checks, and idempotency.
- Reconciliation must compare internal attempts, provider statements, provider events, refunds, fees, settlement batches, and disputes.

## Domain Model

Provider means the external payment institution or SDKWORK internal instrument. The catalog is intentionally extensible, but production implementation should start with mainstream providers and avoid building every domestic acquiring adapter in the first phase.

- Initial mainstream China wallets: `wechat_pay`, `alipay`
- Initial overseas providers: `stripe`, `paypal`
- Initial tokenized wallet rails: `apple_pay`, `google_pay`
- Extension domestic acquiring: `unionpay`, `yeepay`, `jd_pay`, `lianlian_pay`, `lakala`, `allinpay`, `china_ums`, `fuiou_pay`, `sandpay`, `huifu_pay`, `baofoo`, `bill99`
- Extension China bank acquiring/direct channels: `pingan_pay`, `icbc_pay`, `cmb_pay`, `ccb_pay`, `boc_pay`, `psbc_pay`
- Internal: `wallet_balance`

Method means the customer-facing payment instrument or native product:

- WeChat Pay: `wechat_jsapi`, `wechat_native`, `wechat_h5`, `wechat_app`, `wechat_mini_program`
- Alipay: `alipay_page`, `alipay_wap`, `alipay_app`, `alipay_qr`
- Card/acquiring: `card`, `stripe_card`, `stripe_checkout`, `unionpay_quickpay`
- PayPal: `paypal_checkout`
- Domestic gateway: `yeepay_gateway`, `jd_pay`, `bank_transfer`
- Internal: `wallet_balance`

Channel means one routable execution lane:

- provider account
- provider code
- method
- checkout scene
- currency
- country or region
- environment
- capability set
- risk and health metadata

Provider account means one merchant credential set, for example a WeChat merchant id, Alipay app id, Stripe account, PayPal client, UnionPay merchant, or acquiring institution merchant. It stores only references to secrets and certificates.

Route rule means a deterministic channel selection rule. It can match purchase type, country, currency, client platform, amount range, user segment, risk level, business line, and provider health state.

## API Surface

The public aggregate API remains `/payments/v3`. It should be the only payment API used by SDKWORK clients for cross-provider payments.

Required endpoint groups:

- `GET /payments/v3/providers`
- `GET /payments/v3/providers/{providerCode}/capabilities`
- `GET /payments/v3/payment_methods`
- `POST /payments/v3/payment_intents`
- `GET /payments/v3/payment_intents`
- `GET /payments/v3/payment_intents/{paymentIntentId}`
- `POST /payments/v3/payment_intents/{paymentIntentId}/confirm`
- `POST /payments/v3/payment_intents/{paymentIntentId}/capture`
- `POST /payments/v3/payment_intents/{paymentIntentId}/cancel`
- `POST /payments/v3/refunds`
- `GET /payments/v3/refunds`
- `GET /payments/v3/refunds/{refundId}`
- `POST /payments/v3/refunds/{refundId}/cancel`
- `GET /payments/v3/reconciliation/statements`
- `GET /payments/v3/reconciliation/statements/{statementId}`
- `POST /payments/v3/reconciliation/statements/downloads`
- `POST /payments/v3/reconciliation/tasks`
- `GET /payments/v3/reconciliation/tasks/{taskId}`
- `GET /payments/v3/reconciliation/tasks/{taskId}/differences`
- `POST /payments/v3/webhooks/{providerCode}/verify`
- `POST /payments/v3/webhooks/{providerCode}/events`
- `GET /payments/v3/webhook_events`
- `POST /payments/v3/webhook_events/{eventId}/replay`
- `POST /payments/v3/native_operations`

Backend/admin payment center APIs remain under `/backend/v3/api/payments/*`. They manage provider accounts, methods, channels, route rules, payment facts, webhook events, and reconciliation runs. They should not replace `/payments/v3` as the app-facing aggregate API.

App API and Backend API groups remain separate from Payment Aggregate API. In API reference grouping, `支付聚合API` should stay before App API as requested.

## Provider Capability Matrix

Every provider must declare capabilities in `commerce_payment_provider_capability`. A provider being present in the catalog does not mean every operation is available.

Capability codes:

- `payment_intent_create`
- `payment_intent_confirm`
- `payment_intent_authorize`
- `payment_intent_capture`
- `payment_intent_cancel`
- `payment_intent_query`
- `refund_create`
- `refund_query`
- `refund_cancel`
- `statement_download`
- `reconciliation_task`
- `webhook_verify`
- `webhook_event_ingest`
- `chargeback_ingest`
- `dispute_manage`
- `native_operation`

Provider notes:

- WeChat Pay needs JSAPI, Native, H5, App, Mini Program, close order, refund, refund query, trade bill, fund flow bill, APIv3 signature verification, certificate rotation, and encrypted notification handling.
- Alipay needs page, WAP, app, precreate/QR, trade query, close, refund, refund query, bill download URL query, RSA/RSA2 signature verification, and asynchronous notification handling.
- Stripe needs PaymentIntents, Checkout Sessions, confirmation, authorization/capture, refunds, balance transactions, disputes, webhook signature verification, idempotency keys, and event replay compatibility.
- PayPal needs Orders, capture, authorize/capture where enabled, refunds, webhook verification, dispute events, and payout/settlement reporting where enabled.
- UnionPay and domestic acquirers vary by institution. The adapter must expose supported scenes and statement types per provider account, not only per provider.
- Card processing must be tokenized through Stripe, PayPal, Apple Pay, Google Pay, UnionPay, or a compliant acquiring provider. SDKWORK must not store card numbers or CVV.
- Later providers are added by catalog entries, capability rows, account credentials, route rules, and adapter registration. They must not require new public SDKWORK API shapes.

## SDKWORK Payment Adapter

Every provider implementation must satisfy the same adapter contract. The adapter is a runtime boundary, not a storage schema.

Required interface:

```text
PaymentProviderAdapter
  provider_code() -> PaymentProviderCode
  capabilities(account, context) -> ProviderCapabilities
  create_payment_intent(request, context) -> ProviderOperationResult
  confirm_payment_intent(request, context) -> ProviderOperationResult
  capture_payment_intent(request, context) -> ProviderOperationResult
  cancel_payment_intent(request, context) -> ProviderOperationResult
  create_refund(request, context) -> ProviderOperationResult
  query_refund(request, context) -> ProviderOperationResult
  cancel_refund(request, context) -> ProviderOperationResult
  verify_webhook(delivery, context) -> WebhookVerificationResult
  normalize_webhook(delivery, context) -> NormalizedPaymentEvent
  download_statement(request, context) -> StatementDownloadResult
  parse_statement(file, context) -> StatementParseResult
  invoke_native_operation(request, context) -> ProviderOperationResult
```

Adapter rules:

- The adapter receives credentials through secret references resolved by platform secret infrastructure.
- The adapter never returns raw sensitive credential data.
- The adapter maps native provider status to SDKWORK normalized status.
- The adapter must expose provider-native ids in structured fields, not only in opaque JSON.
- Every call is wrapped by `commerce_payment_operation_attempt`.
- Retry behavior must be explicit: `retryable`, `not_retryable`, `requires_manual_review`, or `unknown`.
- Provider-native escape hatches must validate capability, account, method, and operation allowlist before execution.

## State Machines

Payment intent status:

- `requires_payment_method`
- `requires_confirmation`
- `requires_action`
- `processing`
- `requires_capture`
- `partially_captured`
- `succeeded`
- `failed`
- `canceled`
- `expired`
- `partially_refunded`
- `refunded`

Payment attempt status:

- `created`
- `submitted`
- `requires_action`
- `authorized`
- `capturing`
- `succeeded`
- `failed`
- `closed`
- `expired`
- `unknown`

Capture status:

- `pending`
- `submitted`
- `succeeded`
- `failed`
- `canceled`

Refund status:

- `pending`
- `processing`
- `succeeded`
- `failed`
- `canceled`
- `requires_review`

Webhook delivery status:

- `received`
- `signature_verified`
- `signature_failed`
- `normalized`
- `processed`
- `duplicate`
- `failed`
- `replayed`

Reconciliation status:

- `created`
- `statement_downloading`
- `statement_downloaded`
- `matching`
- `matched`
- `mismatched`
- `requires_review`
- `resolved`
- `failed`

Dispute status:

- `warning_needs_response`
- `needs_response`
- `under_review`
- `won`
- `lost`
- `closed`

## Reusable Tables

The following tables should be reused and extended only where needed:

- `commerce_payment_provider`: provider catalog and basic provider metadata.
- `commerce_payment_provider_account`: merchant credentials by provider and environment.
- `commerce_payment_method`: normalized customer-facing methods.
- `commerce_payment_channel`: routable provider account and method lane.
- `commerce_payment_route_rule`: deterministic routing rule.
- `commerce_payment_intent`: SDKWORK payment order state.
- `commerce_payment_attempt`: provider submission attempt and provider trade id.
- `commerce_payment_webhook_event`: normalized business event after delivery verification.
- `commerce_refund`: SDKWORK refund aggregate.
- `commerce_idempotency_key`: reusable idempotency guard.
- `commerce_account` and `commerce_account_ledger_entry`: internal balance and wallet fulfillment.
- `open_platform_pay_binding`: optional binding between open platform account entries and payment provider account/channel.

## Required Table Additions

### `commerce_payment_provider_capability`

Stores provider/account capability declarations.

Key columns:

- `id`
- `tenant_id`
- `organization_id`
- `provider_code`
- `provider_account_id`
- `capability_code`
- `method_code`
- `scene_code`
- `country_code`
- `currency_code`
- `min_amount`
- `max_amount`
- `supported_statement_types`
- `supported_webhook_events`
- `native_operation_codes`
- `status`
- `effective_from`
- `effective_to`
- `metadata_json`
- `created_at`
- `updated_at`

Constraints and indexes:

- Unique: `tenant_id`, `provider_account_id`, `capability_code`, `method_code`, `scene_code`, `country_code`, `currency_code`
- Index: `tenant_id`, `organization_id`, `provider_code`, `capability_code`, `status`

### `commerce_payment_operation_attempt`

Append-only log for every provider API call.

Key columns:

- `id`
- `tenant_id`
- `organization_id`
- `operation_no`
- `provider_code`
- `provider_account_id`
- `channel_id`
- `operation_code`
- `sdkwork_resource_type`
- `sdkwork_resource_id`
- `idempotency_key`
- `request_digest`
- `response_digest`
- `native_request_id`
- `native_trade_id`
- `native_refund_id`
- `http_status`
- `provider_error_code`
- `provider_error_message`
- `retryable`
- `status`
- `started_at`
- `completed_at`
- `created_at`

Constraints and indexes:

- Unique: `tenant_id`, `operation_no`
- Unique: `tenant_id`, `provider_code`, `operation_code`, `idempotency_key`
- Index: `tenant_id`, `sdkwork_resource_type`, `sdkwork_resource_id`, `created_at`
- Index: `tenant_id`, `provider_code`, `native_request_id`

### `commerce_payment_route_decision`

Immutable record of how a payment was routed.

Key columns:

- `id`
- `tenant_id`
- `organization_id`
- `payment_intent_id`
- `payment_attempt_id`
- `route_rule_id`
- `channel_id`
- `provider_code`
- `provider_account_id`
- `method_code`
- `scene_code`
- `country_code`
- `currency_code`
- `amount`
- `risk_level`
- `decision_reason`
- `fallback_from_channel_id`
- `created_at`

Constraints and indexes:

- Unique: `tenant_id`, `payment_attempt_id`
- Index: `tenant_id`, `payment_intent_id`, `created_at`
- Index: `tenant_id`, `provider_code`, `channel_id`, `created_at`

### `commerce_payment_capture`

Captures authorization/capture operations.

Key columns:

- `id`
- `tenant_id`
- `organization_id`
- `capture_no`
- `payment_attempt_id`
- `provider_code`
- `provider_account_id`
- `native_capture_id`
- `amount`
- `currency_code`
- `final_capture`
- `status`
- `failure_code`
- `failure_message`
- `submitted_at`
- `succeeded_at`
- `failed_at`
- `request_no`
- `idempotency_key`
- `created_at`
- `updated_at`

Constraints and indexes:

- Unique: `tenant_id`, `capture_no`
- Unique: `tenant_id`, `provider_code`, `native_capture_id`
- Index: `tenant_id`, `payment_attempt_id`, `status`

### `commerce_payment_webhook_delivery`

Raw provider webhook delivery fact before normalization.

Key columns:

- `id`
- `tenant_id`
- `organization_id`
- `delivery_no`
- `provider_code`
- `provider_account_id`
- `event_id`
- `nonce`
- `request_timestamp`
- `signature`
- `signature_algorithm`
- `headers_json`
- `payload_digest`
- `payload_ref`
- `source_ip`
- `user_agent`
- `verification_status`
- `delivery_status`
- `failure_code`
- `failure_message`
- `received_at`
- `verified_at`
- `normalized_event_id`
- `processed_at`
- `created_at`
- `updated_at`

Constraints and indexes:

- Unique: `tenant_id`, `provider_code`, `event_id`
- Unique: `tenant_id`, `provider_code`, `nonce`
- Index: `tenant_id`, `provider_code`, `delivery_status`, `received_at`
- Index: `tenant_id`, `normalized_event_id`

`commerce_payment_webhook_event` should become the normalized event table. It should reference delivery rows and store normalized event type, SDKWORK resource references, provider resource ids, normalized status transition, and processing outcome.

### `commerce_payment_statement`

Provider statement file metadata.

Key columns:

- `id`
- `tenant_id`
- `organization_id`
- `statement_no`
- `provider_code`
- `provider_account_id`
- `statement_type`
- `settlement_currency`
- `period_start`
- `period_end`
- `provider_statement_id`
- `file_ref`
- `file_digest`
- `download_status`
- `parse_status`
- `row_count`
- `total_amount`
- `fee_amount`
- `net_amount`
- `downloaded_at`
- `parsed_at`
- `request_no`
- `idempotency_key`
- `created_at`
- `updated_at`

Constraints and indexes:

- Unique: `tenant_id`, `statement_no`
- Unique: `tenant_id`, `provider_code`, `provider_account_id`, `statement_type`, `period_start`, `period_end`
- Index: `tenant_id`, `provider_code`, `period_start`, `period_end`

### `commerce_payment_statement_item`

Normalized row from provider statement.

Key columns:

- `id`
- `tenant_id`
- `organization_id`
- `statement_id`
- `provider_code`
- `provider_account_id`
- `row_no`
- `native_trade_id`
- `native_refund_id`
- `native_order_no`
- `sdkwork_out_trade_no`
- `sdkwork_out_refund_no`
- `transaction_type`
- `occurred_at`
- `settled_at`
- `gross_amount`
- `fee_amount`
- `net_amount`
- `currency_code`
- `provider_status`
- `raw_row_digest`
- `metadata_json`
- `created_at`

Constraints and indexes:

- Unique: `tenant_id`, `statement_id`, `row_no`
- Index: `tenant_id`, `provider_code`, `native_trade_id`
- Index: `tenant_id`, `sdkwork_out_trade_no`
- Index: `tenant_id`, `sdkwork_out_refund_no`

### `commerce_payment_reconciliation_item`

Difference or match result for reconciliation.

Key columns:

- `id`
- `tenant_id`
- `organization_id`
- `reconciliation_run_id`
- `statement_id`
- `statement_item_id`
- `payment_attempt_id`
- `refund_id`
- `refund_attempt_id`
- `provider_code`
- `difference_type`
- `match_status`
- `internal_amount`
- `provider_amount`
- `difference_amount`
- `currency_code`
- `internal_status`
- `provider_status`
- `resolution_status`
- `resolution_note`
- `resolved_by`
- `resolved_at`
- `created_at`
- `updated_at`

Constraints and indexes:

- Index: `tenant_id`, `reconciliation_run_id`, `match_status`
- Index: `tenant_id`, `difference_type`, `resolution_status`
- Index: `tenant_id`, `payment_attempt_id`
- Index: `tenant_id`, `refund_id`

### `commerce_payment_fee`

Normalized provider fee fact.

Key columns:

- `id`
- `tenant_id`
- `organization_id`
- `provider_code`
- `provider_account_id`
- `payment_attempt_id`
- `refund_id`
- `statement_item_id`
- `fee_type`
- `amount`
- `currency_code`
- `occurred_at`
- `created_at`

Constraints and indexes:

- Index: `tenant_id`, `payment_attempt_id`
- Index: `tenant_id`, `refund_id`
- Index: `tenant_id`, `provider_code`, `occurred_at`

### `commerce_payment_dispute`

Chargeback and dispute aggregate.

Key columns:

- `id`
- `tenant_id`
- `organization_id`
- `dispute_no`
- `provider_code`
- `provider_account_id`
- `payment_attempt_id`
- `native_dispute_id`
- `reason_code`
- `amount`
- `currency_code`
- `status`
- `evidence_due_at`
- `opened_at`
- `closed_at`
- `created_at`
- `updated_at`

Constraints and indexes:

- Unique: `tenant_id`, `dispute_no`
- Unique: `tenant_id`, `provider_code`, `native_dispute_id`
- Index: `tenant_id`, `payment_attempt_id`, `status`

### `commerce_payment_dispute_event`

Append-only dispute lifecycle events.

Key columns:

- `id`
- `tenant_id`
- `organization_id`
- `event_no`
- `dispute_id`
- `event_type`
- `from_status`
- `to_status`
- `actor_type`
- `actor_id`
- `payload_json`
- `created_at`

Constraints and indexes:

- Unique: `tenant_id`, `event_no`
- Index: `tenant_id`, `dispute_id`, `created_at`

### Refund Tables To Physically Land

The registry-defined refund tables should be physically landed and wired into runtime before full provider integration:

- `commerce_refund_item`
- `commerce_refund_attempt`
- `commerce_refund_event`

`commerce_refund` remains the aggregate. `commerce_refund_attempt` records provider-native refund submissions. `commerce_refund_event` records lifecycle transitions. `commerce_refund_item` supports partial item-level refund accounting.

## Table Ownership

Preferred ownership:

- Appbase commerce owns canonical commerce/payment schema definitions and reusable migrations.
- Claw Router product owns API aggregation, provider adapter runtime, installed route wiring, and frontend API reference exposure.
- Generated schema files must be regenerated from source registry/contracts, not hand-edited.

Migration strategy:

- Add missing canonical tables to Appbase commerce migrations where the tables are reusable across SDKWORK products.
- Reflect those tables in `docs/schema-registry/tables/006-commerce.yaml`.
- Regenerate generated schema artifacts after source registry updates.
- Add product-specific runtime tables only if the fact is specific to Claw Router and not Appbase commerce.

## Identifier Naming Rules

Table names should keep the existing `commerce_payment_*` convention because the current Appbase schema already uses that namespace. Do not introduce a parallel `commerce_pay_*` namespace.

Long table names should be shortened only when the removed word is redundant. For example, `commerce_payment_operation_attempt` is preferred over `commerce_payment_provider_operation_attempt` because the row already contains `provider_code` and `provider_account_id`.

Index, unique constraint, and foreign key names must use short names to avoid PostgreSQL identifier truncation. Recommended prefixes:

- Unique constraints: `uk_pay_*`
- Non-unique indexes: `idx_pay_*`
- Foreign keys: `fk_pay_*`
- Check constraints: `ck_pay_*`

Examples:

- `uk_pay_op_attempt_no`
- `uk_pay_op_attempt_idem`
- `idx_pay_op_attempt_resource`
- `uk_pay_webhook_delivery_event`
- `uk_pay_webhook_delivery_nonce`
- `idx_pay_webhook_delivery_status`
- `uk_pay_statement_scope`
- `idx_pay_statement_period`
- `idx_pay_recon_item_run_status`
- `idx_pay_recon_item_resolution`

## Core Flows

### Create And Confirm Payment

1. Client calls `POST /payments/v3/payment_intents` with amount, currency, order reference, method preference, scene, and idempotency key.
2. SDKWORK validates tenant, auth, amount, currency, order state, idempotency, and method availability.
3. Route selector evaluates active `commerce_payment_route_rule`, channel health, capability, risk level, amount range, country, currency, and client platform.
4. SDKWORK creates `commerce_payment_intent`, `commerce_payment_attempt`, and `commerce_payment_route_decision`.
5. Adapter call is wrapped by `commerce_payment_operation_attempt`.
6. Response returns normalized next action such as QR code URL, redirect URL, JSAPI payload, app SDK payload, client secret, or no-action success.

### Capture Payment

1. Client or backend calls `POST /payments/v3/payment_intents/{id}/capture`.
2. SDKWORK validates that the attempt is authorized and provider capability supports capture.
3. SDKWORK creates `commerce_payment_capture`.
4. Adapter capture call is logged in `commerce_payment_operation_attempt`.
5. Capture result updates capture, attempt, intent, order, and downstream fulfillment state.

### Cancel Or Close Payment

1. Client or backend calls `POST /payments/v3/payment_intents/{id}/cancel`.
2. SDKWORK validates current status and provider close/cancel support.
3. Adapter close/cancel call is logged.
4. SDKWORK updates attempt, intent, order, and emits normalized payment event.

### Refund

1. Client or backend calls `POST /payments/v3/refunds`.
2. SDKWORK validates original payment status, refundable amount, item quantities, tax/shipping splits, and idempotency.
3. SDKWORK creates `commerce_refund`, optional `commerce_refund_item`, and `commerce_refund_attempt`.
4. Adapter refund call is logged.
5. Refund callbacks or queries update `commerce_refund_attempt`, `commerce_refund`, and `commerce_refund_event`.

### Webhook

1. Provider posts webhook to `/payments/v3/webhooks/{providerCode}/events` or compatibility callback route.
2. SDKWORK creates `commerce_payment_webhook_delivery` before business processing.
3. Adapter verifies signature, timestamp, nonce, certificate, and payload digest.
4. Adapter normalizes event into `commerce_payment_webhook_event`.
5. SDKWORK deduplicates by provider event id, nonce, native trade id, and SDKWORK trade id.
6. Business processor transitions attempt, intent, refund, dispute, statement, wallet, or order state exactly once.
7. Replay uses delivery/event id and creates a new processing attempt without mutating the original raw delivery.

### Reconciliation

1. Finance or worker creates a reconciliation task by provider account, statement type, and period.
2. SDKWORK downloads or imports provider statements into `commerce_payment_statement`.
3. Statement parser writes `commerce_payment_statement_item`.
4. Reconciliation compares statement rows with `commerce_payment_attempt`, `commerce_payment_capture`, `commerce_refund_attempt`, webhook events, disputes, and fees.
5. Results are stored in `commerce_payment_reconciliation_item`.
6. Differences are assigned status: `matched`, `missing_in_sdkwork`, `missing_in_provider`, `amount_mismatch`, `currency_mismatch`, `status_mismatch`, `duplicate_provider_record`, `fee_mismatch`, `settlement_mismatch`, or `chargeback_mismatch`.
7. Finance resolves differences with audit notes. Resolved differences must remain queryable.

## Error Model

All payment APIs should return a stable SDKWORK error envelope with:

- `code`
- `message`
- `requestId`
- `providerCode`
- `providerErrorCode`
- `providerErrorMessage`
- `retryable`
- `operationAttemptId`
- `documentationUrl`

Error classes:

- `invalid_request`
- `authentication_failed`
- `permission_denied`
- `idempotency_conflict`
- `payment_method_unavailable`
- `provider_account_unavailable`
- `route_not_found`
- `provider_timeout`
- `provider_rejected`
- `signature_verification_failed`
- `amount_mismatch`
- `currency_mismatch`
- `state_conflict`
- `rate_limited`
- `internal_error`

## Idempotency

Idempotency must be enforced at these levels:

- Public API command idempotency through `Idempotency-Key`.
- Provider call idempotency through provider-supported idempotency keys or SDKWORK-generated out trade numbers.
- Webhook delivery deduplication through provider event id, nonce, timestamp, payload digest, and native trade id.
- Fulfillment idempotency through source table and source id, for example `commerce_payment_attempt`.
- Reconciliation idempotency through provider account, statement type, period, and statement digest.

Idempotency conflicts must return the original result when the request payload digest matches and must fail when the same key is reused with a different payload digest.

## Security And Compliance

Card and wallet compliance:

- SDKWORK must not store card PAN, CVV, magnetic stripe, or sensitive authentication data.
- Card payments must use provider tokens, setup intents, payment method tokens, or wallet tokens.
- If future direct card acquiring is introduced, PCI DSS scope must be reassessed before implementation.

Secret handling:

- Store `secret_ref`, `webhook_secret_ref`, and `certificate_ref`.
- Do not store raw private keys, API keys, certificates, or webhook secrets in payment tables.
- Provider account rotation must update references and preserve historical operation attempts.

Webhook security:

- Verify provider-specific signatures before normalization.
- Enforce timestamp skew checks where provider supports timestamps.
- Deduplicate nonce/event ids.
- Store payload digest and payload reference rather than large raw body in hot tables.
- Preserve failed verification rows for audit and attack analysis.

Audit:

- Provider operations, admin account changes, route rule changes, replay actions, manual reconciliation resolutions, dispute responses, and refund approvals must be auditable.
- Audit logs must record actor, tenant, organization, resource, old/new status, request id, and timestamp.

Data retention:

- Hot payment facts remain queryable for support and finance.
- Large raw payloads and statement files should be stored by reference with retention policy.
- Sensitive metadata must be redacted before display in admin UI and SDK logs.

## External Standard References

The design uses current official provider/security documentation as constraints, not as copied API shapes:

- PCI SSC PCI DSS v4.0.1 document library, `https://www.pcisecuritystandards.org/document_library`: cardholder data and sensitive authentication data must remain outside SDKWORK storage unless a future PCI-scoped direct acquiring project explicitly approves that scope.
- Stripe idempotency documentation, `https://docs.stripe.com/api/idempotent_requests`: write operations need idempotency keys, response replay for the same key, and request-parameter conflict detection.
- Stripe webhook signature documentation, `https://docs.stripe.com/webhooks/signature`: webhook verification requires raw request body preservation plus signature header and endpoint secret handling.
- PayPal idempotency documentation, `https://developer.paypal.com/api/rest/reference/idempotency/`: supported REST POST operations use caller-generated request ids to avoid duplicate capture/refund style operations.
- PayPal webhook documentation, `https://developer.paypal.com/api/rest/webhooks/`: webhook receivers must acknowledge delivery and verify message authenticity before business processing.
- WeChat Pay APIv3 documentation center, `https://pay.weixin.qq.com/doc/v3/merchant/`: payment requests, responses, callbacks, payment invocation, and bill download must be modeled as signed/verifiable provider operations before normalization.
- Alipay OpenAPI documentation center, `https://opendocs.alipay.com/open/`: Alipay trade, refund, async notification, and bill download capabilities must be normalized behind SDKWORK API and adapter contracts.

## Frontend And API Reference Requirements

The frontend API reference must show `支付聚合API` as a first-class group before App API. App API and Backend API must remain.

Payment Aggregate API pages must expose:

- provider discovery
- method discovery
- payment intent lifecycle
- refund lifecycle
- reconciliation statements and tasks
- webhook verification/event/replay
- native operation envelope

Admin payment center must expose:

- providers
- provider accounts
- capabilities
- methods
- channels
- route rules
- payment intents
- attempts
- captures
- refunds and refund attempts
- webhook deliveries and normalized events
- statements
- reconciliation runs and items
- disputes
- operation attempts

Provider-specific raw APIs should not be shown as the primary user experience. They can appear under controlled native operations with clear capability and audit semantics.

## Required Alignment Work

Provider enum alignment:

- `crates/sdkwork-claw-http/specs/payment-aggregate-openapi.json`
- `services/sdkwork-clawrouter-router-service/src/api/admin_transaction_center.rs`
- Appbase bootstrap payment provider seeds
- Appbase bootstrap payment method seeds
- frontend API reference grouping and schema tabs
- callback provider parsing and adapter registry

Storage alignment:

- Appbase foundation migration
- schema registry
- generated schema artifacts
- runtime SQL stores
- SQLite and Postgres test installers

Runtime alignment:

- payment route selector
- payment callback store
- admin transaction center store
- provider secret store
- audit log and operation attempt store
- reconciliation worker
- webhook replay worker

## Phased Landing Plan

### Phase 0: Contract And Catalog Alignment

Deliverables:

- Commit the payment aggregate OpenAPI contract.
- Align provider and method enums across OpenAPI, backend validation, bootstrap seeds, and frontend schema metadata.
- Add provider capability contract definitions.
- Keep runtime provider execution disabled unless provider account/channel is explicitly active.

Acceptance:

- API reference shows Payment Aggregate API.
- Provider list is consistent across contract, admin validation, and seed catalog.
- No provider-native runtime calls are introduced.

### Phase 1: Schema Foundation

Deliverables:

- Add or align canonical table definitions for provider capabilities, operation attempts, route decisions, captures, webhook deliveries, statements, statement items, reconciliation items, fees, disputes, and missing refund tables.
- Regenerate generated schema artifacts from source registry or migrations.
- Add migration tests for Postgres and SQLite where applicable.

Acceptance:

- All payment transit tables exist in the canonical migration source.
- Generated schema and registry agree.
- Tests prove indexes and unique constraints needed for idempotency, lookup, and reconciliation.

### Phase 2: Adapter Runtime Skeleton

Deliverables:

- Define `PaymentProviderAdapter` trait/interface.
- Implement adapter registry and capability lookup.
- Add no-op or sandbox adapters for supported providers.
- Wrap all adapter calls in provider operation attempts.

Acceptance:

- Runtime can resolve provider account, channel, method, and capability without hardcoded provider parsing.
- Provider operation attempts are written for every simulated provider call.

### Phase 3: Payment And Refund Runtime

Deliverables:

- Implement create/confirm/capture/cancel intent flow.
- Implement refund creation, refund attempts, refund callbacks, and refund events.
- Add exact-once fulfillment integration for wallet/recharge/order workflows.

Acceptance:

- Payment and refund commands are idempotent.
- State transitions reject invalid terminal transitions.
- SQLite and Postgres paths behave consistently.

### Phase 4: Webhook And Reconciliation Runtime

Deliverables:

- Split raw webhook delivery from normalized event.
- Implement provider-specific verification adapters.
- Implement replay with audit.
- Implement statement download/import, parse, matching, and reconciliation item generation.

Acceptance:

- Duplicate webhook delivery does not double fulfill.
- Failed signature verification is retained and visible.
- Reconciliation differences are queryable and resolvable.

### Phase 5: Mainstream Provider Integrations

Deliverables:

- WeChat Pay APIv3 adapter.
- Alipay OpenAPI adapter.
- Stripe adapter.
- PayPal adapter.
- Tokenized card and wallet flows through Stripe, PayPal, Apple Pay, and Google Pay where supported.

Acceptance:

- Each provider adapter passes contract tests for capability declaration, payment, refund, webhook verification, and reconciliation where supported.
- Provider-specific unsupported features return capability errors, not generic internal errors.

### Phase 6: Extension Provider Integrations

Deliverables:

- UnionPay adapter.
- YeePay adapter.
- JD Pay adapter.
- Domestic acquiring adapters prioritized by commercial value, customer demand, and provider documentation availability.

Acceptance:

- New providers are added through catalog, capability, account, channel, route, and adapter registration.
- Public `/payments/v3` request and response shapes do not change for each new provider.

## Testing Strategy

Contract tests:

- OpenAPI validates with project contract tooling.
- Provider enum and method enum are consistent across contract and backend allowlists.
- API reference loads the Payment Aggregate API group before App API.

Schema tests:

- Each required table exists.
- Unique constraints enforce idempotency.
- Indexes support provider lookup, webhook dedupe, payment search, refund search, and reconciliation matching.

Runtime tests:

- Payment create/confirm idempotency.
- Capture status transitions.
- Cancel terminal-state rejection.
- Refund partial and full refund rules.
- Webhook duplicate and replay behavior.
- Provider operation attempt logging on success and failure.
- Statement parsing and reconciliation difference generation.

Provider adapter contract tests:

- Capability declaration.
- Native status normalization.
- Provider error normalization.
- Signature verification positive and negative cases.
- Timeout and retry classification.

Security tests:

- Secret values are never returned by admin or app APIs.
- Card PAN/CVV-like fields are rejected or redacted.
- Webhook timestamp skew and nonce replay are rejected.
- Logs and operation attempts store digests or references, not raw sensitive data.

## Open Decisions

- Whether the canonical payment transit tables should be added directly to Appbase commerce migrations first or introduced as a Claw Router product migration and later upstreamed.
- Which domestic providers should be Phase 6 production priorities after the mainstream provider set.
- Whether `wallet_balance` remains solely an internal method or becomes a first-class provider with a dedicated adapter.
- Whether large webhook payloads should be stored in object storage immediately or only after payload size crosses a threshold.
- Whether disputes should be Phase 1 schema-only or deferred until Stripe/PayPal production integration.

## Completion Criteria For This Design

The payment transit design is ready for implementation planning when:

- The source payment contract, provider catalog, table plan, adapter contract, state machines, security model, and phased landing plan are approved.
- The implementation plan splits contract alignment, schema foundation, adapter runtime, payment/refund runtime, webhook/reconciliation runtime, and provider integrations into separately testable work.
- No provider-specific API bypasses SDKWORK idempotency, audit, route, and capability checks.

