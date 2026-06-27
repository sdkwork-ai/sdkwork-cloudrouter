> Migrated from `docs/superpowers/specs/2026-06-10-commerce-order-payment-hardening-design.md` on 2026-06-24.
> Owner: SDKWork maintainers

# Commerce Order And Payment Hardening Design

## Objective

Complete the first main-agent hardening slice for SDKWork Commerce order and
payment. This design narrows the broader transaction schema hardening work to
the order/payment source-of-record tables and their storage tests.

The goal is not to add every possible commerce feature. The goal is to make the
current order and payment table design provably industry-aligned for the
highest-risk facts: order identity, order state, amount allocation, address and
event snapshots, payment intent identity, payment attempts, provider callbacks,
refund auditability, and reconciliation readiness.

## Standards

This design follows:

- `../sdkwork-specs/SOUL.md`
- `../sdkwork-specs/DATABASE_SPEC.md`
- `../sdkwork-specs/DOMAIN_SPEC.md`
- `../sdkwork-specs/API_SPEC.md`
- `../sdkwork-specs/WEB_BACKEND_SPEC.md`
- `../sdkwork-specs/RUST_CODE_SPEC.md`
- `../sdkwork-specs/TEST_SPEC.md`
- `docs/superpowers/specs/2026-06-10-commerce-transaction-schema-hardening-design.md`

## Current Coverage

Current storage already includes the essential order/payment table families in
`crates/sdkwork-commerce-storage-repository-sqlx/migrations/0001_commerce_foundation.sql`.

Order tables:

- `commerce_order`
- `commerce_order_item`
- `commerce_order_amount_breakdown`
- `commerce_order_address_snapshot`
- `commerce_order_event`
- `commerce_order_cancellation`

Payment and refund tables:

- `commerce_payment_intent`
- `commerce_payment_attempt`
- `commerce_payment_webhook_event`
- `commerce_payment_method`
- `commerce_payment_provider`
- `commerce_payment_provider_account`
- `commerce_payment_channel`
- `commerce_payment_route_rule`
- `commerce_payment_provider_capability`
- `commerce_payment_operation_attempt`
- `commerce_payment_route_decision`
- `commerce_payment_capture`
- `commerce_payment_webhook_delivery`
- `commerce_payment_statement`
- `commerce_payment_statement_item`
- `commerce_payment_reconciliation_run`
- `commerce_payment_reconciliation_item`
- `commerce_payment_fee`
- `commerce_payment_dispute`
- `commerce_payment_dispute_event`
- `commerce_refund`
- `commerce_refund_item`
- `commerce_refund_attempt`
- `commerce_refund_event`

Existing tests already cover table presence, selected indexes, payment provider
code naming, webhook uniqueness, reconciliation batch structure, and repository
operation registration. The remaining gap is that several industry-level order
and payment invariants are not yet explicit enough to prevent regression.

## Design Decisions

### Order

`commerce_order` remains the aggregate root for customer-facing order facts. It
must carry separate state dimensions for commercial lifecycle:

- `status`: overall order lifecycle.
- `payment_status`: payment lifecycle.
- `fulfillment_status`: fulfillment/shipment lifecycle.
- `refund_status`: refund/after-sales lifecycle.

This prevents one overloaded status field from hiding paid-but-unfulfilled,
partially shipped, partially refunded, or closed-with-refund states.

`commerce_order_item` must preserve item facts at purchase time:

- product id and SKU id;
- shop id when seller/shop ownership matters;
- SKU snapshot JSON;
- unit price, discount, tax, and total amount;
- fulfillment status and refund status;
- purchased quantity.

`commerce_order_amount_breakdown` must allow multiple rows per order, because
order total, item subtotal, discount, shipping, tax, payable, paid, refunded,
and fee allocation are different facts. The unique key should therefore scope
by allocation dimension instead of only `(tenant_id, order_id)`.

`commerce_order_event` and `commerce_order_cancellation` remain audit/event
facts. They must retain request/idempotency metadata and tenant scope.

### Payment

`commerce_payment_intent` is the internal payment aggregate for an order or
business source. It must have a stable `payment_intent_no` and an idempotency
unique constraint so retried payment creation cannot create duplicate payment
intent facts.

`commerce_payment_attempt` remains provider-attempt-level state. It must retain
`provider_code`, `out_trade_no`, amount, currency, and status, with provider
trade uniqueness.

`commerce_payment_webhook_event` remains the normalized callback event table. It
must retain provider-scoped event and nonce uniqueness.

`commerce_payment_operation_attempt`, capture, webhook delivery, statement,
reconciliation, fee, dispute, and refund tables remain first-class operational
facts. This keeps provider calls, reconciliation, disputes, and refunds
auditable instead of collapsing them into a single payment row.

### Refund

`commerce_refund` must be auditable without joining through provider attempts
for every basic question. It should include:

- `organization_id`;
- `order_id`;
- `refund_reason_code`;
- `currency_code`;
- `requested_by_type`;
- `requested_by`;
- idempotency uniqueness by order and command key.

`commerce_refund_attempt` remains provider-level refund execution and keeps
provider refund uniqueness.

## First Implementation Slice

The first implementation slice should:

1. Add failing storage tests for the missing order/payment invariants.
2. Patch `0001_commerce_foundation.sql` minimally.
3. Update `commerce_database_indexes()` if new unique indexes are added as
   named indexes.
4. Run focused storage tests.
5. Avoid touching generated SDK output and unrelated dirty files.

## Acceptance Criteria

- Order table has separate payment, fulfillment, and refund status columns.
- Order item table has product, shop, SKU snapshot, discount, tax,
  fulfillment status, and refund status facts.
- Order amount breakdown can store multiple allocation rows per order.
- Payment intent has a stable payment intent number and idempotency uniqueness.
- Refund table has order, organization, currency, reason, requester, and
  idempotency audit fields.
- Focused tests fail before schema changes and pass after minimal changes.
- Existing unrelated working tree changes remain untouched.

