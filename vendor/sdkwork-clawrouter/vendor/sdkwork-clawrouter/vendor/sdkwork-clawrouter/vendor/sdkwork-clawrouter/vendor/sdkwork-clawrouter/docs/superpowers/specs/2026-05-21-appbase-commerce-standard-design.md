# Appbase Commerce Standard Design

## Status

This specification defines the new standard commerce foundation for
`sdkwork-appbase` and supersedes the billing-centered design in
`2026-05-20-appbase-commerce-platform-design.md`.

This is a new-system design. It must not introduce compatibility routes,
legacy aliases, billing namespace shims, product-local fallback stores, response
envelope compatibility modes, dual-write migration paths, or historical
`/billing` API surfaces. Any existing appbase or product code that exposes
`billing` as the commerce namespace is treated as unfinished work that must be
replaced by this standard.

## Goal

Build a complete commercial transaction foundation inside `sdkwork-appbase`.
The foundation must support physical goods, virtual goods, membership
purchases, points recharge, wallet recharge, subscriptions, service purchases,
coupons, invoices, refunds, shipment, digital delivery, wallet ledger, provider
payment configuration, webhook verification, reconciliation, and admin
operations.

The final platform must feel like building blocks:

- Unified Product Center, inventory, cart, address, checkout, order, payment, refund,
  fulfillment, membership, recharge, wallet, coupon, invoice, and audit are
  separate bounded contexts.
- The product center, order center, and payment center provide unified
  governance and lifecycle control, but they do not own every commerce concept.
- Product apps compose appbase through generated SDK adapters, route mounting,
  provider adapter registration, seed data, and product policy. They must not
  fork appbase-owned SQL, SDK clients, or commerce contracts.
- API contracts must follow `specs/API_SPEC.md` exactly.

## Non-Negotiable Standards

1. No `/billing` namespace.

   App and backend APIs use domain resources such as `/orders`, `/payments`,
   `/catalog`, `/cart`, `/checkout`, `/wallet`, `/memberships`, and
   `/recharges`. `billing` can be a UI menu label in a host product, but it
   must not appear in public appbase route paths, SDK namespaces, operation ids,
   reusable package names, or new table names.

2. No compatibility path.

   This is a fresh standard. Do not add legacy aliases, compatibility routers,
   compatibility envelopes, dual path registration, product-local fallbacks, or
   adapter layers whose only purpose is to preserve the old billing layout.

3. API first.

   Path segments use lower_snake_case. Path parameters use `{lowerCamelCase}`.
   Query wire names use lower_snake_case with `q`, `page`, and `page_size`.
   JSON fields use lowerCamelCase. Every operation has a stable resource-tree
   `operationId` and a concrete request/response schema. Mutations with side
   effects require `Idempotency-Key`. Errors use RFC 7807 `ProblemDetail`.

4. Database contract first.

   Core tables use the `commerce_` prefix, explicit tenant and organization
   isolation, stable public ids, audit timestamps, optimistic version where
   mutable, immutable event or ledger tables where facts must be traceable, and
   indexes that match real access paths. Money must not use float or double.

5. Center means control plane, not giant aggregate.

   The order center unifies order lifecycle, status, amount, item, event,
   cancellation, and relationship to fulfillment/refund/payment. The payment
   center unifies provider configuration, payment intent, payment attempt,
   webhook, refund, reconciliation, and dispute governance. Inventory, wallet,
   membership, recharge, invoice, and fulfillment stay separate.

6. Provider differences stay in adapters.

   WeChat Pay, Alipay, PayPal, Stripe, Apple Pay, Google Pay, cards, QR code,
   wallet redirects, app pay, H5, JSAPI, mini program pay, bank transfer, and
   local payment methods are normalized through provider/channel adapters. Their
   provider-specific fields must not leak into order, refund, wallet, or
   catalog core tables.

## Industry Design Baseline

The standard follows established patterns from mature commerce and payment
platforms:

- Stripe-style payment intents separate "intent to collect" from concrete
  attempts and asynchronous next actions.
- PayPal-style order/capture/refund separation informs external provider
  reference modeling and idempotent request handling.
- Shopify-style order, fulfillment order, shipment, refund, and transaction
  separation informs physical goods and partial fulfillment.
- WeChat Pay and Alipay inform domestic channel support: merchant account,
  app/mini-program/H5/native scenes, platform certificates, signature
  verification, asynchronous notification idempotency, and merchant refund
  order numbers.
- Apple Pay and Google Pay are tokenized wallet payment sources. They may be
  direct provider adapters only when supported by the host, but commonly route
  through a gateway such as Stripe, PayPal/Braintree, Adyen, or another PSP.
- PCI DSS v4.0.1 and OWASP ASVS 5.0 are security baselines. Appbase does not
  store raw card data or sensitive payment secrets in ordinary config tables.

## Bounded Contexts

### Unified Product Center

The Unified Product Center owns the catalog control plane for sellable product
definitions. It supports SPU, SKU, category, attributes, media, price lists, and
product visibility. It does not own stock, cart, order, or payment.

Responsibilities:

- Category trees and category assignment.
- SPU as the product concept.
- SKU as the purchasable variant.
- Attribute definitions and SKU attribute values.
- Product media.
- Price lists and price list items for market, tenant, currency, channel, or
  membership-specific prices.
- Product type and fulfillment type declarations.

### Inventory

Inventory owns stock and reservations for physical or limited virtual goods. It
does not own order status. Order and checkout reserve or release stock through
inventory commands.

Responsibilities:

- Stock by SKU, warehouse, and sales channel.
- Reservation during checkout/order creation.
- Deduction on fulfillment start or payment success depending on product policy.
- Release on checkout expiry, order cancellation, payment timeout, or refund
  policy.
- Immutable inventory ledger.

### Cart

Cart owns current user purchase intent before checkout. It does not price final
orders and must not become an order substitute.

Responsibilities:

- Current cart and cart items.
- Selected SKU, quantity, selected address candidate, coupon candidates, and
  user notes.
- Cart validation against current catalog and inventory.
- Conversion into a checkout session.

### Addresses

Addresses own user-maintained shipping/contact addresses. Orders use snapshots
so historical facts never change after the user edits an address.

Responsibilities:

- User address CRUD.
- Default address selection.
- Address validation and normalized region codes.
- Order address snapshots.

### Checkout

Checkout is a short-lived orchestration context. It builds a quote and creates
orders. It does not own payment collection, long-lived order status, inventory
truth, wallet balances, or membership activation.

Responsibilities:

- Compose cart, direct purchase, address, coupon, price, tax, freight, and
  inventory reservation into a quote.
- Split checkout lines into order groups when required by seller, fulfillment
  type, warehouse, address, currency, or payment rules.
- Create one or more orders atomically when possible.
- Expire sessions and release reservations.

### Unified Order Center

The order center is the system of record for purchase facts. It accepts orders
from checkout or trusted backend imports, tracks order lifecycle, stores
immutable snapshots, and coordinates with payment, fulfillment, refund, invoice,
membership, recharge, and wallet through events.

The order center does not:

- Store raw payment provider payloads.
- Own provider configuration.
- Own stock truth.
- Own wallet balance.
- Own membership entitlement usage.
- Own shipment tracking events.

### Unified Payment Center

The payment center is the system of record for payment configuration and money
movement with external or internal payment rails. It owns normalized payment
intent, attempt, refund, webhook, reconciliation, dispute, and payment method
configuration.

The payment center does not:

- Decide what was purchased.
- Mutate wallet balances directly without ledger commands.
- Activate memberships directly.
- Fulfill goods directly.
- Store raw card numbers or unrestricted provider secrets.

### Refunds And After-Sales

Refunds are part of payment governance, but refund eligibility depends on order,
item, fulfillment, and product policy. Refund command validation composes order
state, payment capture state, fulfillment state, and prior refund state.

### Fulfillment And Shipment

Fulfillment owns delivery work. Physical fulfillment produces shipment records
and tracking events. Virtual fulfillment produces digital delivery records.
Membership, points, and wallet recharge fulfillment produce entitlement or
ledger commands.

### Memberships

Membership owns membership plans, packages, memberships, entitlement grants, renewals,
upgrades, downgrade policy, grace periods, and entitlement usage. Membership
purchases still go through order and payment.

### Recharges And Wallet

Recharge owns packaged purchase offers for points or stored value. Wallet owns
accounts, holds, ledger entries, exchanges, and adjustments. A paid recharge is
fulfilled by wallet ledger credit.

### Coupons And Promotions

Coupons own templates, campaigns, codes, claim, eligibility, redemption,
rollback, and discount allocation. Orders store discount snapshots and
redemption references.

### Invoices

Invoices own invoice title, invoice application, invoice items, issuance, void,
and external invoice provider references. Invoices are created from paid order
and payment facts.

### Audit And Outbox

Audit owns admin action logs and sensitive operation traces. Outbox owns
transactional domain event publication.

## Purchase And Fulfillment Types

`purchaseType` is stored on order and order item:

- `physical_good`
- `virtual_good`
- `membership`
- `points_recharge`
- `wallet_recharge`
- `subscription`
- `service`

`fulfillmentType` is stored on SKU and copied to order item snapshots:

- `physical_shipment`
- `digital_delivery`
- `entitlement_grant`
- `points_credit`
- `wallet_credit`
- `subscription_activation`
- `service_activation`
- `none`

Rules:

- Physical goods require shipping address and inventory policy.
- Virtual goods require delivery instructions or license/asset references.
- Membership purchases require package, plan, entitlement policy, start/end
  policy, renewal/upgrade policy, and activation event.
- Points recharge requires points account, ledger credit policy, and refund
  reversal policy.
- Wallet recharge requires stored value account, currency, ledger credit policy,
  and compliance controls.
- Subscription requires recurring cycle, invoice policy, and payment retry
  policy.
- Service purchases require service activation or scheduling policy.

## Canonical State Machines

### Order Status

- `draft`
- `pending_payment`
- `partially_paid`
- `paid`
- `fulfilling`
- `partially_fulfilled`
- `fulfilled`
- `completed`
- `cancelled`
- `expired`
- `refund_pending`
- `partially_refunded`
- `refunded`
- `closed`

Only the order center changes order status. Other contexts request transitions
through commands or events.

### Payment Intent Status

- `requires_payment_method`
- `requires_confirmation`
- `requires_action`
- `processing`
- `succeeded`
- `cancelled`
- `expired`
- `failed`

### Payment Attempt Status

- `created`
- `submitted`
- `requires_action`
- `authorized`
- `captured`
- `failed`
- `cancelled`
- `expired`
- `unknown`

`unknown` is allowed only as an internal provider reconciliation state, not as
an untyped public DTO.

### Refund Status

- `requested`
- `approved`
- `submitted`
- `processing`
- `succeeded`
- `failed`
- `cancelled`
- `rejected`

### Fulfillment Status

- `not_required`
- `pending`
- `allocated`
- `in_progress`
- `partially_shipped`
- `shipped`
- `delivered`
- `completed`
- `failed`
- `cancelled`

### Inventory Reservation Status

- `reserved`
- `confirmed`
- `released`
- `expired`
- `deducted`

### Membership Status

- `pending_activation`
- `active`
- `grace_period`
- `expired`
- `cancelled`
- `suspended`

## Data Model

All tables include `id`, `uuid` or public business number where appropriate,
`tenant_id`, `organization_id`, `created_at`, `updated_at` for mutable rows,
and explicit indexes. Exact database-specific DDL can be generated from schema
registry records. The following is the logical contract.

### Catalog Tables

`commerce_product_category`

- Tree entity for product categories.
- Key columns: `category_no`, `parent_id`, `path`, `level_no`, `name`,
  `status`, `sort_order`.
- Unique: `(tenant_id, organization_id, category_no)`.

`commerce_product_spu`

- Product concept.
- Key columns: `spu_no`, `product_type`, `title`, `subtitle`,
  `description`, `category_id`, `brand`, `status`, `published_at`.
- Product type values align with purchase types but are catalog-facing:
  `physical_good`, `virtual_good`, `membership`, `points_recharge`,
  `wallet_recharge`, `subscription`, `service`.

`commerce_product_sku`

- Purchasable variant.
- Key columns: `sku_no`, `spu_id`, `title`, `fulfillment_type`,
  `tax_category`, `sales_unit`, `status`, `published_at`.
- SKU does not store all prices in one fixed column. Default price is allowed
  for simple deployments, but price lists are the standard source for advanced
  pricing.

`commerce_product_attribute`

- Attribute definition.
- Key columns: `attribute_no`, `name`, `value_type`, `scope`, `required`,
  `searchable`, `filterable`, `status`.

`commerce_product_attribute_value`

- Allowed values for enumerated attributes.
- Key columns: `attribute_id`, `value_code`, `display_value`, `sort_order`,
  `status`.

`commerce_product_sku_attribute`

- SKU selected attribute values.
- Key columns: `sku_id`, `attribute_id`, `attribute_value_id`,
  `custom_value`.
- Unique: `(tenant_id, sku_id, attribute_id)`.

`commerce_product_media`

- Product and SKU media.
- Key columns: `owner_type`, `owner_id`, `media_type`, `url`, `alt_text`,
  `sort_order`, `status`.

`commerce_price_list`

- Price list header.
- Key columns: `price_list_no`, `currency_code`, `market_code`,
  `customer_segment`, `starts_at`, `ends_at`, `status`.

`commerce_price_list_item`

- SKU price in price list.
- Key columns: `price_list_id`, `sku_id`, `price_amount`,
  `compare_at_amount`, `min_quantity`, `max_quantity`.

### Inventory Tables

`commerce_inventory_stock`

- Stock by SKU and location.
- Key columns: `sku_id`, `warehouse_id`, `available_quantity`,
  `reserved_quantity`, `sold_quantity`, `version`, `status`.

`commerce_inventory_reservation`

- Reservation for checkout/order.
- Key columns: `reservation_no`, `checkout_session_id`, `order_id`, `sku_id`,
  `quantity`, `status`, `expires_at`, `idempotency_key`.

`commerce_inventory_ledger`

- Immutable stock movement ledger.
- Key columns: `movement_no`, `sku_id`, `warehouse_id`, `direction`,
  `quantity`, `balance_after`, `business_type`, `source_type`, `source_id`,
  `idempotency_key`, `created_at`.

### Cart And Address Tables

`commerce_cart`

- Current user cart.
- Key columns: `owner_user_id`, `status`, `currency_code`, `version`.
- Unique active cart per `(tenant_id, organization_id, owner_user_id)`.

`commerce_cart_item`

- Cart item.
- Key columns: `cart_id`, `sku_id`, `quantity`, `selected`,
  `metadata_json`, `created_at`, `updated_at`.

`commerce_user_address`

- User-maintained address.
- Key columns: `owner_user_id`, `recipient_name`, `phone_country_code`,
  `phone_number_encrypted`, `country_code`, `region_code`, `city`,
  `district`, `address_line1_encrypted`, `postal_code`, `is_default`,
  `status`.

`commerce_order_address_snapshot`

- Immutable order address snapshot.
- Key columns: `order_id`, `snapshot_version`, `recipient_name_snapshot`,
  `phone_masked`, `country_code`, `region_code`, `city`, `district`,
  `address_line1_encrypted`, `postal_code`, `source_address_id`,
  `captured_at`.

### Checkout Tables

`commerce_checkout_session`

- Short-lived quote and order creation session.
- Key columns: `checkout_session_no`, `owner_user_id`, `source_type`,
  `status`, `currency_code`, `expires_at`, `idempotency_key`,
  `request_hash`.

`commerce_checkout_line`

- Checkout line before order creation.
- Key columns: `checkout_session_id`, `sku_id`, `quantity`,
  `purchase_type`, `fulfillment_type`, `price_snapshot_json`,
  `promotion_snapshot_json`, `inventory_reservation_id`.

`commerce_checkout_quote`

- Quote result.
- Key columns: `checkout_session_id`, `quote_no`, `original_amount`,
  `discount_amount`, `shipping_amount`, `tax_amount`, `payable_amount`,
  `currency_code`, `expires_at`.

### Unified Order Center Tables

`commerce_order`

- Order root and purchase fact.
- Key columns: `order_no`, `owner_user_id`, `purchase_type`, `status`,
  `currency_code`, `original_amount`, `discount_amount`, `shipping_amount`,
  `tax_amount`, `payable_amount`, `paid_amount`, `refunded_amount`,
  `checkout_session_id`, `payment_intent_id`, `requires_shipping`,
  `requires_fulfillment`, `idempotency_key`, `request_hash`, `expires_at`,
  `paid_at`, `completed_at`, `cancelled_at`.
- Unique: `(tenant_id, order_no)`.
- Indexes: owner/status/created, payment_intent, checkout_session, status/time.

`commerce_order_item`

- Order item snapshot.
- Key columns: `order_id`, `order_item_no`, `spu_id`, `sku_id`,
  `spu_title_snapshot`, `sku_title_snapshot`, `sku_attributes_snapshot_json`,
  `purchase_type`, `fulfillment_type`, `quantity`, `unit_price_amount`,
  `discount_amount`, `tax_amount`, `payable_amount`, `refunded_quantity`,
  `fulfilled_quantity`.

`commerce_order_amount_allocation`

- Amount allocation across item, coupon, shipping, tax, refund, and payment.
- Key columns: `order_id`, `order_item_id`, `allocation_type`,
  `source_type`, `source_id`, `amount`, `currency_code`.

`commerce_order_event`

- Immutable order lifecycle event.
- Key columns: `event_no`, `order_id`, `event_type`, `from_status`,
  `to_status`, `actor_type`, `actor_id`, `reason_code`, `message`,
  `payload_json`, `request_id`, `idempotency_key`, `created_at`.

`commerce_order_cancellation`

- Cancellation request and result.
- Key columns: `cancellation_no`, `order_id`, `status`, `reason_code`,
  `reason_message`, `requested_by`, `approved_by`, `idempotency_key`,
  `created_at`, `completed_at`.

### Unified Payment Center Tables

`commerce_payment_provider`

- Provider catalog.
- Key columns: `provider_code`, `display_name`, `provider_type`,
  `supported_countries`, `supported_currencies`, `status`.
- Examples: `wechat_pay`, `alipay`, `stripe`, `paypal`, `apple_pay`,
  `google_pay`, `manual_bank_transfer`, `wallet_balance`.

`commerce_payment_provider_account`

- Merchant account under provider.
- Key columns: `account_no`, `provider_code`, `merchant_id`,
  `environment`, `country_code`, `settlement_currency`, `secret_ref`,
  `webhook_secret_ref`, `certificate_ref`, `status`, `rotated_at`.
- Secrets are references to a secret manager, not plaintext columns.

`commerce_payment_method`

- User-facing or admin-configured method.
- Key columns: `method_code`, `method_type`, `display_name`,
  `icon_media_resource_id`, `icon_object_blob_id`, `icon_resource_snapshot`,
  `status`, `sort_order`.
- Method types: `card`, `wallet`, `bank_redirect`, `qr_code`, `app_pay`,
  `web_pay`, `mini_program_pay`, `h5_pay`, `native_pay`, `balance`.

`commerce_payment_channel`

- Concrete provider account plus method plus scene.
- Key columns: `channel_no`, `provider_account_id`, `method_id`,
  `scene_code`, `currency_code`, `country_code`, `status`, `priority`.

`commerce_payment_route_rule`

- Channel routing rule.
- Key columns: `rule_no`, `priority`, `purchase_type`, `country_code`,
  `currency_code`, `client_platform`, `amount_min`, `amount_max`,
  `user_segment`, `risk_level`, `channel_id`, `status`, `starts_at`,
  `ends_at`.

`commerce_payment_intent`

- Internal intent to collect payment.
- Key columns: `payment_intent_no`, `order_id`, `owner_user_id`,
  `amount`, `currency_code`, `status`, `capture_method`,
  `confirmation_method`, `selected_method_id`, `selected_channel_id`,
  `expires_at`, `idempotency_key`, `request_hash`.
- Unique: `(tenant_id, payment_intent_no)`.

`commerce_payment_attempt`

- Concrete provider call attempt.
- Key columns: `payment_attempt_no`, `payment_intent_id`, `order_id`,
  `provider_code`, `provider_account_id`, `channel_id`, `out_trade_no`,
  `provider_transaction_id`, `amount`, `currency_code`, `status`,
  `next_action_type`, `next_action_payload_json`, `failure_code`,
  `failure_message`, `submitted_at`, `authorized_at`, `captured_at`,
  `expired_at`.
- Unique: `(tenant_id, provider_code, out_trade_no)`.

`commerce_payment_webhook_event`

- Verified and deduplicated provider callback.
- Key columns: `provider_code`, `provider_account_id`, `external_event_id`,
  `event_type`, `nonce`, `signature`, `request_timestamp`, `payload_digest`,
  `payload_encrypted_ref` or `payload_json`, `verification_status`,
  `processing_status`, `related_attempt_id`, `related_refund_id`,
  `received_at`, `processed_at`.
- Unique: `(tenant_id, provider_code, provider_account_id, external_event_id)`.

`commerce_payment_reconciliation_run`

- Reconciliation batch.
- Key columns: `run_no`, `provider_code`, `provider_account_id`,
  `statement_date`, `status`, `started_at`, `completed_at`, `summary_json`.

`commerce_payment_reconciliation_item`

- Reconciliation item.
- Key columns: `run_id`, `external_transaction_id`, `internal_attempt_id`,
  `internal_refund_id`, `amount`, `currency_code`, `match_status`,
  `difference_amount`, `reason_code`.

`commerce_payment_dispute`

- Chargeback or dispute.
- Key columns: `dispute_no`, `provider_code`, `provider_dispute_id`,
  `payment_attempt_id`, `amount`, `currency_code`, `status`, `reason_code`,
  `evidence_due_at`, `resolved_at`.

### Refund Tables

`commerce_refund`

- Refund root.
- Key columns: `refund_no`, `order_id`, `payment_intent_id`,
  `payment_attempt_id`, `owner_user_id`, `reason_code`, `status`,
  `requested_amount`, `approved_amount`, `currency_code`,
  `idempotency_key`, `request_hash`.

`commerce_refund_item`

- Item-level refund.
- Key columns: `refund_id`, `order_item_id`, `quantity`,
  `refund_amount`, `tax_refund_amount`, `shipping_refund_amount`.

`commerce_refund_attempt`

- Provider refund attempt.
- Key columns: `refund_attempt_no`, `refund_id`, `provider_code`,
  `provider_account_id`, `out_refund_no`, `provider_refund_id`, `amount`,
  `status`, `failure_code`, `failure_message`, `submitted_at`,
  `succeeded_at`, `failed_at`.
- Unique: `(tenant_id, provider_code, out_refund_no)`.

`commerce_refund_event`

- Immutable refund lifecycle event.

### Fulfillment Tables

`commerce_fulfillment_order`

- Fulfillment work order.
- Key columns: `fulfillment_no`, `order_id`, `fulfillment_type`,
  `status`, `warehouse_id`, `address_snapshot_id`, `provider_code`,
  `created_at`, `completed_at`.

`commerce_fulfillment_item`

- Fulfillment item.
- Key columns: `fulfillment_id`, `order_item_id`, `sku_id`, `quantity`,
  `status`.

`commerce_shipment`

- Physical shipment.
- Key columns: `shipment_no`, `fulfillment_id`, `carrier_code`,
  `tracking_no`, `status`, `shipped_at`, `delivered_at`.

`commerce_shipment_tracking_event`

- Tracking event.
- Key columns: `shipment_id`, `event_time`, `event_code`, `location`,
  `description`, `raw_payload_json`.

`commerce_digital_delivery`

- Digital delivery fact.
- Key columns: `delivery_no`, `fulfillment_id`, `order_item_id`,
  `delivery_type`, `delivery_ref`, `status`, `delivered_at`.

`commerce_entitlement_grant`

- Entitlement grant for membership or service.
- Key columns: `grant_no`, `owner_user_id`, `source_order_id`,
  `source_order_item_id`, `entitlement_code`, `quantity`, `starts_at`,
  `expires_at`, `status`.

### Wallet And Recharge Tables

`commerce_account`

- Wallet, points, token, stored credit, or product-defined account.
- Key columns: `owner_user_id`, `asset_type`, `currency_code`,
  `available_amount`, `frozen_amount`, `version`, `status`.

`commerce_account_hold`

- Account hold/pre-authorization.
- Replaces any `commerce_billing_prehold` naming.
- Key columns: `hold_no`, `account_id`, `asset_type`, `amount`, `status`,
  `expires_at`, `settled_at`, `released_at`, `idempotency_key`.

`commerce_account_ledger_entry`

- Immutable account ledger.
- Key columns: `ledger_no`, `account_id`, `owner_user_id`, `asset_type`,
  `direction`, `amount`, `balance_after`, `business_type`, `source_type`,
  `source_id`, `transaction_no`, `request_no`, `idempotency_key`,
  `created_at`.

`commerce_recharge_package`

- Recharge package catalog.
- Key columns: `package_no`, `sku_id`, `asset_type`, `credit_amount`,
  `bonus_amount`, `price_amount`, `currency_code`, `status`, `starts_at`,
  `ends_at`, `sort_order`.

`commerce_exchange_rule`

- Asset exchange rule.
- Key columns: `rule_no`, `source_asset_type`, `target_asset_type`,
  `rate_numerator`, `rate_denominator`, `min_source_amount`,
  `max_source_amount`, `status`, `starts_at`, `ends_at`.

`commerce_exchange_transaction`

- Asset exchange transaction.
- Key columns: `exchange_no`, `rule_id`, `owner_user_id`,
  `source_account_id`, `target_account_id`, `source_amount`,
  `target_amount`, `status`, `idempotency_key`.

### Membership Tables

`membership_plan`

- membership plan.
- Key columns: `plan_no`, `name`, `level_code`, `status`, `sort_order`.

`membership_package`

- Purchasable membership package, linked to SKU.
- Key columns: `package_no`, `plan_id`, `sku_id`, `duration_days`,
  `recurrence_cycle`, `price_amount`, `currency_code`, `status`.

`membership_subscription`

- User membership.
- Key columns: `membership_no`, `owner_user_id`, `plan_id`,
  `source_order_id`, `source_payment_intent_id`, `status`, `starts_at`,
  `expires_at`, `grace_until`, `auto_renew`.

`entitlement_grant`

- Entitlement granted to membership.

`entitlement_ledger_entry`

- Entitlement usage ledger.

### Promotion And Invoice Tables

`promotion_offer`, `promotion_offer_version`,
`promotion_offer_scope`, `promotion_offer_audience_rule`,
`promotion_offer_time_window`, `promotion_budget_account`,
`promotion_budget_ledger_entry`, `promotion_coupon_stock`, `promotion_code`,
`promotion_user_coupon`, `promotion_discount_application`,
`promotion_discount_allocation`, `promotion_coupon_ledger_entry`,
`promotion_external_binding`, and `promotion_event_outbox` own the card-coupon
promotion lifecycle.

`commerce_invoice_title`, `commerce_invoice`, `commerce_invoice_item`,
`commerce_invoice_event`, and `commerce_invoice_provider_attempt` own invoice
lifecycle.

### Platform Tables

`commerce_idempotency_key`

- Scoped by tenant, organization, actor, operation id, idempotency key, and
  request hash.
- Stores replayable response references for deterministic retries.

`commerce_audit_log`

- Immutable admin and sensitive user operation audit.

`commerce_outbox_event`

- Transactional domain event outbox.

## API Design

### App API

App APIs are buyer or current-user operations.

Catalog:

```text
GET /app/v3/api/catalog/categories
GET /app/v3/api/catalog/products
GET /app/v3/api/catalog/products/{productId}
GET /app/v3/api/catalog/skus/{skuId}
```

Cart:

```text
GET    /app/v3/api/cart/current
POST   /app/v3/api/cart/items
PATCH  /app/v3/api/cart/items/{cartItemId}
DELETE /app/v3/api/cart/items/{cartItemId}
```

Addresses:

```text
GET    /app/v3/api/addresses
POST   /app/v3/api/addresses
PATCH  /app/v3/api/addresses/{addressId}
DELETE /app/v3/api/addresses/{addressId}
POST   /app/v3/api/addresses/{addressId}/default_selection
```

Checkout:

```text
POST /app/v3/api/checkout/sessions
GET  /app/v3/api/checkout/sessions/{checkoutSessionId}
POST /app/v3/api/checkout/sessions/{checkoutSessionId}/quotes
POST /app/v3/api/checkout/sessions/{checkoutSessionId}/orders
```

Orders:

```text
GET  /app/v3/api/orders
GET  /app/v3/api/orders/{orderId}
GET  /app/v3/api/orders/{orderId}/events
POST /app/v3/api/orders/{orderId}/cancellations
```

Payments:

```text
GET  /app/v3/api/payments/methods
POST /app/v3/api/payments/intents
GET  /app/v3/api/payments/intents/{paymentIntentId}
POST /app/v3/api/payments/intents/{paymentIntentId}/attempts
GET  /app/v3/api/payments/attempts/{paymentAttemptId}
```

Refunds:

```text
POST /app/v3/api/refunds
GET  /app/v3/api/refunds
GET  /app/v3/api/refunds/{refundId}
```

Fulfillments:

```text
GET /app/v3/api/fulfillments
GET /app/v3/api/fulfillments/{fulfillmentId}
GET /app/v3/api/shipments/{shipmentId}
```

Memberships:

```text
GET  /app/v3/api/memberships/current
GET  /app/v3/api/memberships/packages
POST /app/v3/api/memberships/purchases
```

Recharges:

```text
GET  /app/v3/api/recharges/packages
POST /app/v3/api/recharges/orders
GET  /app/v3/api/recharges/orders/{orderId}
```

Wallet:

```text
GET  /app/v3/api/wallet/accounts
GET  /app/v3/api/wallet/ledger_entries
GET  /app/v3/api/wallet/ledger_entries/{ledgerEntryId}
POST /app/v3/api/wallet/exchanges
```

Promotions:

```text
GET  /app/v3/api/promotions/offers
GET  /app/v3/api/promotions/offers/{offerId}
GET  /app/v3/api/promotions/user_coupons/wallet
GET  /app/v3/api/promotions/user_coupons/wallet/{userCouponId}
POST /app/v3/api/promotions/user_coupon_claims
POST /app/v3/api/promotions/codes/redemptions
POST /app/v3/api/promotions/discount_applications
POST /app/v3/api/promotions/discount_applications/reversals
```

Invoices:

```text
GET  /app/v3/api/invoices
GET  /app/v3/api/invoices/{invoiceId}
POST /app/v3/api/invoices
POST /app/v3/api/invoices/{invoiceId}/submissions
POST /app/v3/api/invoices/{invoiceId}/cancellations
```

### Backend API

Backend APIs are admin, operations, configuration, reconciliation, reporting,
and audit surfaces.

Catalog:

```text
/backend/v3/api/catalog/categories
/backend/v3/api/catalog/products
/backend/v3/api/catalog/skus
/backend/v3/api/catalog/attributes
/backend/v3/api/catalog/price_lists
```

Inventory:

```text
/backend/v3/api/inventory/stocks
/backend/v3/api/inventory/reservations
/backend/v3/api/inventory/ledger_entries
```

Orders:

```text
/backend/v3/api/orders
/backend/v3/api/orders/{orderId}
/backend/v3/api/orders/{orderId}/events
/backend/v3/api/orders/{orderId}/cancellations
```

Payments:

```text
/backend/v3/api/payments/providers
/backend/v3/api/payments/provider_accounts
/backend/v3/api/payments/methods
/backend/v3/api/payments/channels
/backend/v3/api/payments/route_rules
/backend/v3/api/payments/intents
/backend/v3/api/payments/attempts
/backend/v3/api/payments/webhook_events
/backend/v3/api/payments/webhook_events/{eventId}/replays
/backend/v3/api/payments/reconciliation_runs
/backend/v3/api/payments/disputes
```

Refunds:

```text
/backend/v3/api/refunds
/backend/v3/api/refunds/{refundId}
/backend/v3/api/refunds/{refundId}/attempts
```

Fulfillment:

```text
/backend/v3/api/fulfillments
/backend/v3/api/fulfillments/{fulfillmentId}
/backend/v3/api/shipments
/backend/v3/api/shipments/{shipmentId}
/backend/v3/api/shipments/{shipmentId}/tracking_events
```

Memberships:

```text
/backend/v3/api/memberships/plans
/backend/v3/api/memberships/packages
/backend/v3/api/memberships/members
/backend/v3/api/memberships/entitlements
```

Recharges:

```text
/backend/v3/api/recharges/packages
/backend/v3/api/recharges/orders
```

Wallet:

```text
/backend/v3/api/wallet/accounts
/backend/v3/api/wallet/ledger_entries
/backend/v3/api/wallet/adjustments
/backend/v3/api/wallet/holds
/backend/v3/api/wallet/exchange_rules
```

Promotions:

```text
/backend/v3/api/promotions/offers
/backend/v3/api/promotions/offers/{offerId}
/backend/v3/api/promotions/offers/{offerId}/versions
/backend/v3/api/promotions/offers/{offerId}/versions/{versionId}/publish
/backend/v3/api/promotions/coupon_stocks
/backend/v3/api/promotions/codes
/backend/v3/api/promotions/user_coupons
/backend/v3/api/promotions/discount_applications
/backend/v3/api/promotions/discount_allocations
/backend/v3/api/promotions/coupon_ledger_entries
/backend/v3/api/promotions/budget_ledger_entries
/backend/v3/api/promotions/external_bindings
/backend/v3/api/promotions/events
```

Invoices:

```text
/backend/v3/api/invoices/titles
/backend/v3/api/invoices
/backend/v3/api/invoices/{invoiceId}/issuances
/backend/v3/api/invoices/{invoiceId}/voids
```

Reports And Audit:

```text
/backend/v3/api/commerce_reports/payment_reconciliation
/backend/v3/api/commerce_reports/order_revenue
/backend/v3/api/commerce_reports/refunds
/backend/v3/api/audit/commerce_events
```

### OperationId Examples

Operation ids do not include surface prefixes:

- `catalog.categories.list`
- `catalog.products.retrieve`
- `cart.current.retrieve`
- `cart.items.create`
- `addresses.defaultSelection.create`
- `checkout.sessions.create`
- `checkout.sessions.quotes.create`
- `checkout.sessions.orders.create`
- `orders.list`
- `orders.retrieve`
- `orders.events.list`
- `orders.cancellations.create`
- `payments.methods.list`
- `payments.intents.create`
- `payments.intents.retrieve`
- `payments.intents.attempts.create`
- `payments.attempts.retrieve`
- `payments.providerAccounts.create`
- `payments.routeRules.update`
- `payments.webhookEvents.replays.create`
- `payments.reconciliationRuns.list`
- `refunds.create`
- `refunds.attempts.list`
- `fulfillments.list`
- `shipments.trackingEvents.list`
- `memberships.purchases.create`
- `recharges.orders.create`
- `wallet.ledgerEntries.list`
- `promotions.codes.redemptions.create`
- `invoices.submissions.create`

## SDK Shape

Generated app SDK groups should mirror resource domains:

```ts
client.catalog.products.list()
client.cart.items.create()
client.checkout.sessions.orders.create()
client.orders.retrieve(orderId)
client.payments.intents.create()
client.refunds.create()
client.memberships.purchases.create()
client.recharges.orders.create()
client.wallet.ledgerEntries.list()
```

Generated backend SDK groups should expose admin control planes:

```ts
client.payments.providerAccounts.create()
client.payments.routeRules.list()
client.payments.webhookEvents.replays.create()
client.orders.events.list()
client.inventory.reservations.list()
client.fulfillments.update()
client.commerceReports.paymentReconciliation.retrieve()
```

No generated SDK public namespace is named `billing`.

## Payment Provider Adapter Contract

Provider adapters implement normalized commands:

- `createPaymentAttempt`
- `retrievePaymentAttempt`
- `cancelPaymentAttempt`
- `createRefundAttempt`
- `retrieveRefundAttempt`
- `verifyWebhook`
- `parseWebhook`
- `normalizeProviderStatus`
- `buildNextAction`
- `healthCheck`

Adapters must return provider-neutral results:

- `providerCode`
- `providerAccountId`
- `outTradeNo`
- `providerTransactionId`
- `status`
- `amount`
- `currencyCode`
- `nextAction`
- `failureCode`
- `failureMessage`
- `rawPayloadRef`

Required provider families:

- Domestic China: WeChat Pay API v3 and Alipay OpenAPI.
- Global PSP: Stripe and PayPal.
- Wallet tokenization: Apple Pay and Google Pay, either directly or through a
  gateway channel.
- Internal: wallet balance, manual bank transfer, and fake/test provider.

Provider secrets:

- Stored only in a secret manager or encrypted secret store.
- Tables keep `secret_ref`, `webhook_secret_ref`, `certificate_ref`, and
  rotation metadata.
- Logs and audit entries never print raw secrets, card data, or decrypted
  payloads.

## Event Flow

Physical goods:

1. User adds SKU to cart.
2. Checkout validates address, price, coupon, and inventory.
3. Checkout creates order and inventory reservation.
4. Payment center creates intent and attempt.
5. Provider webhook marks attempt captured.
6. Payment center emits payment succeeded event.
7. Order center marks paid.
8. Fulfillment creates fulfillment order and shipment.
9. Shipment delivery completes order.

Virtual goods:

1. Checkout creates order with `virtual_good`.
2. Payment succeeds.
3. Fulfillment creates digital delivery record.
4. Order completes after delivery success.

Membership:

1. Membership package is represented by SKU.
2. Checkout creates `membership` order.
3. Payment succeeds.
4. Membership context activates membership and grants entitlements.
5. Order completes after entitlement grant.

Points recharge:

1. Recharge package is represented by SKU.
2. Checkout or recharge order creates `points_recharge` order.
3. Payment succeeds.
4. Wallet credits points ledger.
5. Order completes after ledger entry commit.

Wallet recharge:

1. Wallet recharge SKU or package creates `wallet_recharge` order.
2. Payment succeeds.
3. Wallet credits stored value ledger.
4. Order completes after ledger entry commit.

Refund:

1. User or admin creates refund request.
2. Refund validates order item, fulfillment, payment, and prior refund state.
3. Payment center submits refund attempt to provider.
4. Webhook or reconciliation confirms refund.
5. Order updates refunded amount/status.
6. Wallet, membership, inventory, fulfillment, or invoice applies reversal if
   policy requires it.

## Admin Payment Configuration

Admin backend must support:

- Provider catalog enable/disable.
- Provider account CRUD with environment, country, settlement currency, secret
  references, webhook endpoint, certificate references, and health status.
- Payment method CRUD with display metadata and supported client platforms.
- Channel CRUD combining provider account, method, scene, currency, country,
  and status.
- Route rule CRUD with priority, amount ranges, purchase type, country, currency,
  client platform, risk level, user segment, and effective window.
- Webhook event inspection, verification status, replay, and dedupe evidence.
- Reconciliation run upload/import/sync, matching, and difference resolution.
- Refund governance and dispute tracking.
- Audit log for every admin mutation.

## Idempotency

Required for:

- Cart item mutation.
- Address mutation.
- Checkout session create, quote, order creation.
- Order cancellation.
- Payment intent creation.
- Payment attempt creation.
- Refund creation and refund attempt creation.
- Coupon claim and redemption.
- Wallet hold, adjustment, exchange, transfer, top-up, withdrawal.
- Recharge order creation.
- Membership purchase, renewal, upgrade, activation.
- Fulfillment creation and shipment mutation.
- Invoice submission, issuance, void.
- Admin provider/account/channel/route-rule mutations.
- Webhook replay and reconciliation commands.

Idempotency key scope:

```text
tenant_id + organization_id + actor_type + actor_id + operation_id + idempotency_key
```

The stored request hash must be compared on replay. Same key with different
request hash is an idempotency conflict.

## Security And Compliance

- Do not store raw card data.
- Do not log provider secrets, payment tokens, raw signatures, card PAN, CVV,
  or decrypted sensitive payloads.
- Store provider secrets as secret references.
- Webhooks require provider-specific verification before business processing.
- Webhook events are recorded before processing and deduplicated by provider
  event id, nonce, out trade number, and payload digest where available.
- Admin mutations require authorization, audit log, request id, and
  idempotency key.
- Payment and refund commands must be replay safe.
- PII in addresses is encrypted or masked according to field sensitivity.
- Reconciliation and audit exports must support masking.
- Every irreversible money movement has immutable ledger or event evidence.

## Appbase Package Shape

Rust:

- `sdkwork-commerce-catalog-rust`
- `sdkwork-commerce-inventory-rust`
- `sdkwork-commerce-cart-rust`
- `sdkwork-commerce-address-rust`
- `sdkwork-commerce-checkout-rust`
- `sdkwork-commerce-order-rust`
- `sdkwork-commerce-payment-rust`
- `sdkwork-commerce-refund-rust`
- `sdkwork-commerce-fulfillment-rust`
- `sdkwork-commerce-wallet-rust`
- `sdkwork-commerce-membership-rust`
- `sdkwork-commerce-recharge-rust`
- `sdkwork-commerce-coupon-rust`
- `sdkwork-commerce-invoice-rust`
- `sdkwork-commerce-audit-rust`
- `sdkwork-commerce-storage-sqlx-rust`
- `sdkwork-commerce-runtime-rust`
- `sdkwork-commerce-http-rust`
- `sdkwork-commerce-bootstrap-rust`

TypeScript:

- `@sdkwork/commerce-contracts`
- `@sdkwork/commerce-sdk-ports`
- `@sdkwork/commerce-service`
- UI blocks can remain specialized: catalog, cart, checkout, order, payment,
  wallet, coupon, membership, recharge, invoice.

Appbase packages must not import concrete `@sdkwork/clawrouter-*` SDKs.

## Required Changes From Current State

The current appbase commerce implementation is incomplete against this standard.
Required changes:

- Replace `CommerceSdkNamespace = "billing"` with standard domain groups.
- Remove `sdkNamespaces: ["billing"]`.
- Replace every `/app/v3/api/billing/**` and `/backend/v3/api/billing/**` route
  with standard paths.
- Remove operation ids that use `backend.` prefixes.
- Rename `commerce_billing_prehold` to `commerce_account_hold`.
- Split `commerce_product` into `commerce_product_spu` and
  `commerce_product_sku`.
- Add category, attribute, attribute value, SKU attribute, media, price list,
  inventory, cart, address, checkout, order event, cancellation, fulfillment,
  shipment, digital delivery, provider account, payment channel, route rule,
  reconciliation, refund item, refund attempt, dispute, audit, and outbox
  tables.
- Replace provider strings on payment intent/attempt with normalized provider,
  provider account, method, and channel references.
- Replace loose checkout status under payment with first-class checkout session
  and payment intent state.
- Ensure every public DTO is typed and generated from the contract chain.

## Verification Gates

Add or update gates that fail if:

- Any appbase route path contains `/billing`.
- Any appbase SDK namespace is `billing`.
- Any new commerce table contains `billing` in its name.
- Any OpenAPI operation id starts with `app.` or `backend.`.
- Any side-effecting route omits `Idempotency-Key`.
- Any public DTO uses `unknown`, generic `Record<string, unknown>`,
  `OperationResponse`, or generic `PageResult`.
- Any payment provider secret is represented as a plaintext config field.
- Any money column is float/double.
- Any webhook table lacks provider event dedupe.
- Any wallet/account balance mutation lacks a ledger entry.
- Any order lifecycle transition can occur without an order event.
- Any product-specific module owns generic commerce stores.

## Implementation Slices

### Slice 1: Contract And Governance

- Replace public route catalog and TypeScript contracts with the new domain
  groups.
- Add no-billing route/SDK/table lint gates.
- Add schema registry records for the full standard table set.
- Update appbase integration manifest to forbid product-local commerce stores
  and billing namespace usage.

### Slice 2: Schema Foundation

- Rebuild SQLx migration around the standard schema.
- Add SQLite and Postgres contract tests.
- Add seed data for catalog, membership packages, recharge packages, fake
  provider, and standard payment methods.

### Slice 3: Unified Order Center

- Implement order domain, store, runtime handlers, app routes, backend routes,
  and event emission.
- Support physical, virtual, membership, points recharge, wallet recharge,
  subscription, and service order types.

### Slice 4: Unified Payment Center

- Implement provider config, method/channel/route rule, intent, attempt,
  webhook, refund, and reconciliation primitives.
- Ship fake/test provider first, then Stripe/PayPal/WeChat Pay/Alipay adapter
  boundaries, then Apple Pay/Google Pay tokenized wallet support.

### Slice 5: Checkout, Cart, Catalog, Address, Inventory

- Implement buyer flow from catalog to cart to checkout quote to order creation.
- Add inventory reservation and release.
- Add address snapshots.

### Slice 6: Fulfillment, Membership, Recharge, Wallet, Invoice

- Implement fulfillment work orders for physical/digital/entitlement/ledger
  fulfillment.
- Implement membership activation and entitlement grants.
- Implement points and wallet recharge ledger credit.
- Implement invoice application and issuance flow.

### Slice 7: Admin Control Plane And Reports

- Implement backend payment configuration, route rules, webhook replay,
  reconciliation, order ops, refund ops, fulfillment ops, wallet adjustments,
  coupon ops, invoice ops, and audit search.

## Acceptance Criteria

- No public appbase commerce API, SDK namespace, or new table uses `billing`.
- A fresh SDKWork app can mount appbase commerce and complete:
  catalog -> cart -> address -> checkout -> order -> payment -> fulfillment.
- The same order center supports physical goods, virtual goods, membership
  purchase, points recharge, wallet recharge, subscription, and service purchase.
- The same payment center supports WeChat Pay, Alipay, PayPal, Stripe, Apple
  Pay, Google Pay, wallet balance, manual bank transfer, and fake provider
  through provider adapters.
- Admin backend can configure payment methods, provider accounts, channels,
  route rules, webhook secrets, and reconciliation runs without code changes.
- Every money movement is idempotent, auditable, and either provider-reconciled
  or ledger-backed.
- Every order transition writes `commerce_order_event`.
- Every webhook is verified, stored, deduplicated, replayable, and traceable.
- Every wallet balance mutation writes `commerce_account_ledger_entry`.
- Every physical order can split into fulfillment orders and shipments.
- Every virtual, membership, points, and wallet order has explicit fulfillment evidence.
- OpenAPI and generated SDKs pass `API_SPEC.md` governance.

## Open Decisions

1. Whether the first production payment adapter should be Stripe or WeChat Pay.
   The fake provider is mandatory for local tests regardless.
2. Whether inventory deduction occurs at payment success or shipment allocation
   by default. The standard should support both through SKU policy.
3. Whether subscription recurring charging is implemented in the first commerce
   release or only the table/API contract is reserved.
4. Which secret manager abstraction appbase uses for provider secret references
   in standalone Rust deployments.
