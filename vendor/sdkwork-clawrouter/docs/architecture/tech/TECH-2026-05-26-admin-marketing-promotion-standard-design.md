> Migrated from `docs/superpowers/specs/2026-05-26-admin-marketing-promotion-standard-design.md` on 2026-06-24.
> Owner: SDKWork maintainers

## Goal

Admin marketing is a professional card-coupon promotion center. It owns the complete lifecycle of offer definition, rule versioning, stock, codes, wallet coupons, checkout applications, allocation, budget, external platform synchronization, event publication, and audit.

The source of truth is the `promotion_` bounded context owned by `sdkwork-appbase`. Product applications compose generated appbase backend/app SDKs and render app-specific admin routes.

## Non-Negotiable Rules

1. Use only `promotion_*` tables for card, coupon, voucher, code, claim, wallet, redemption, discount, budget, and external platform binding data.
2. Use one canonical concept name for each responsibility: offer, version, scope, audience, time window, budget, stock, code, user coupon, application, allocation, ledger, external binding, and event.
3. Store money as integer minor units plus ISO currency. Store percentage discounts as basis points.
4. Keep queryable business rules normalized. JSON snapshots are immutable evidence, not the operational rule source.
5. Never physically delete business records. Lifecycle state and append-only ledgers provide traceability.
6. Every write command carries `request_no`, `idempotency_key`, `operator_id`, and `occurred_at`.
7. Every stock, claim, redemption, rollback, budget movement, and external sync is auditable from database state.
8. Admin API naming uses `promotions.*`; app paths use `/app/v3/api/promotions/...`; backend paths use `/backend/v3/api/promotions/...`.

## Industry Alignment

The model follows the mature primitives used by WeChat Pay merchant coupons, WeChat card coupons, Alipay/Antom vouchers, Amazon-style promo codes and gift-card incentives, and common commerce promotion engines:

- Offer/template: stable business identity and merchant-visible card/coupon definition.
- Version: immutable published rule version so issued coupons are not changed retroactively.
- Presentation: customer-facing card surface, merchant brand, display text, terms, assets, and action metadata.
- Stock: quantity, budget, issue window, claim counters, and pause/exhaustion state.
- Code: public code, private code, channel code, member-only code, or external platform code.
- Code redemption: independent exchange attempt fact with hashed submitted code, success/failure result, subject, currency, and idempotency.
- User coupon: wallet instance owned by a subject.
- Discount application: checkout/order-level reservation, application, settlement, rollback, and traceability.
- Allocation: item-level amount split for partial refund, invoice, accounting, and reporting.
- Ledger: append-only stock, coupon, and budget evidence.
- External binding: WeChat, Alipay, Stripe promo, partner channel, or merchant platform identifiers.
- External operation: append-only platform API attempt log for template/stock creation, issue, redeem, cancel, activate, sync, callback, and reconciliation.
- Event outbox: reliable notifications and downstream synchronization.

Interface-specific semantics are first-class columns where they affect lifecycle, reconciliation, fraud review, or finance:

- Alipay/Antom-style cards require template parameter schemas, dynamic field schemas, verification method, recognition type, and hashed recognition payloads.
- WeChat Pay merchant coupons require stock creator merchant id, coupon code mode, uploaded/preloaded merchant code inventories, callback event ids, callback signature hashes, and platform response codes.
- Amazon-style incentives and product vouchers require amount/currency, idempotent creation request ids, activation/cancel state, cancel windows, resend eligibility, and hashed external claim codes.

## Final Table Set

The final standard promotion domain contains 18 tables:

1. `promotion_offer`
2. `promotion_offer_version`
3. `promotion_offer_presentation`
4. `promotion_offer_scope`
5. `promotion_offer_audience_rule`
6. `promotion_offer_time_window`
7. `promotion_budget_account`
8. `promotion_budget_ledger_entry`
9. `promotion_coupon_stock`
10. `promotion_code`
11. `promotion_code_redemption`
12. `promotion_user_coupon`
13. `promotion_discount_application`
14. `promotion_discount_allocation`
15. `promotion_coupon_ledger_entry`
16. `promotion_external_binding`
17. `promotion_external_operation`
18. `promotion_event_outbox`

The table set is intentionally explicit. Budget, scope, audience, time windows, card presentation, code redemption attempts, external bindings, external API operation attempts, and reliable events are first-class data rather than hidden JSON fragments.

## Canonical Type Rules

| Category | Standard |
| --- | --- |
| Primary keys | `text` containing UUIDv7 or ULID sortable ids. |
| Business numbers | Human-safe opaque strings such as `offer_no`, `stock_no`, `coupon_no`, `application_no`, `ledger_no`, and `event_no`; unique per tenant. |
| Money | `*_amount_minor bigint` plus `currency_code char(3)`; no floating point and no decimal strings for money. |
| Percent | `*_percent_bps int`; 1 basis point is 0.01%, 10000 basis points is 100%. |
| Quantity | `bigint` for stock and counters; `numeric(24, 8)` only for non-money benefit quantities. |
| Time | `timestamptz` for absolute time, IANA `timezone` plus local time columns for recurring local windows. |
| JSON | `jsonb` only for immutable snapshots, external sanitized metadata, and event payloads. |
| Code storage | Store claimable and submitted codes as salted hashes plus safe suffix columns. Plain codes may exist only in transient command handling or encrypted export artifacts. |
| State | Lowercase snake-case strings with domain validation and explicit transition functions. |
| Idempotency | `request_no` and `idempotency_key` are unique within tenant on command result tables. |

## Naming Discipline

Database names stay short enough for engineers to scan while preserving domain meaning:

- Do not repeat the table concept in a column when the table already supplies context. Example: use `claim_code_hash` inside `promotion_code` instead of restating that the code came from a platform.
- Use business terms before vendor terms. Example: use `param_schema_json`, `field_schema_json`, and `verify_method`; map Alipay `tpl_params`, WeChat coupon code modes, and Amazon claim-code fields in adapters.
- Use `platform_*` only where a row is explicitly an external binding. Example: `platform_template_id` and `platform_stock_id` belong in `promotion_external_binding`.
- Use `*_hash` and `*_suffix` for sensitive codes. Plain claim codes, submitted codes, signatures, and recognition payloads are transient request data only.
- Keep financial fields explicit and non-overlapping. `total_amount_minor`, `reserved_amount_minor`, `consumed_amount_minor`, and `available_amount_minor` are balances; `planned_amount_minor` and `overrun_amount_minor` are campaign controls.
- Index only lookup paths used by lifecycle commands, support search, callback idempotency, and reconciliation. Do not index low-cardinality flags such as `can_resend` by themselves.

## Currency Discipline

Coupon currency is first-class lifecycle data, not a display preference. Admin sets `promotion_offer_version.currency_code` when designing the published rule version. Stocks, codes, code redemption attempts, wallet coupons, discount applications, item allocations, budget accounts, and budget ledgers copy that value as immutable monetary evidence.

Rules:

- `currency_code` uses ISO 4217 uppercase 3-letter codes such as `CNY`, `USD`, `HKD`, and `JPY`.
- A stock cannot be created with a currency different from its offer version.
- A wallet coupon snapshots its offer version currency and monetary rule fields at issue time.
- Checkout application currency must equal the order currency, wallet coupon currency, stock currency, budget account currency, and allocation currency.
- Budget ledger rows carry their own `currency_code` so reservation, settlement, release, and reversal audit remains correct after related rows change state.
- External bindings carry `external_currency_code` so WeChat, Alipay, Amazon, partner, or payment-platform card definitions can be reconciled explicitly.
- Currency conversion is outside coupon calculation. Cross-currency coupon application is rejected; any FX handling belongs to payment/settlement, not promotion rule evaluation.

## Referential Integrity

All standard implementations must define foreign keys or equivalent repository-level referential checks for these relationships:

| From | To |
| --- | --- |
| `promotion_offer.current_offer_version_id` | `promotion_offer_version.id` |
| `promotion_offer_version.offer_id` | `promotion_offer.id` |
| `promotion_offer_presentation.offer_version_id` | `promotion_offer_version.id` |
| `promotion_offer_scope.offer_version_id` | `promotion_offer_version.id` |
| `promotion_offer_audience_rule.offer_version_id` | `promotion_offer_version.id` |
| `promotion_offer_time_window.offer_version_id` | `promotion_offer_version.id` |
| `promotion_budget_account.offer_id` | `promotion_offer.id` |
| `promotion_budget_account.offer_version_id` | `promotion_offer_version.id` |
| `promotion_budget_account.stock_id` | `promotion_coupon_stock.id` |
| `promotion_budget_ledger_entry.budget_account_id` | `promotion_budget_account.id` |
| `promotion_budget_ledger_entry.application_id` | `promotion_discount_application.id` |
| `promotion_coupon_stock.offer_id` | `promotion_offer.id` |
| `promotion_coupon_stock.offer_version_id` | `promotion_offer_version.id` |
| `promotion_coupon_stock.budget_account_id` | `promotion_budget_account.id` |
| `promotion_code.stock_id` | `promotion_coupon_stock.id` |
| `promotion_code_redemption.code_id` | `promotion_code.id` |
| `promotion_code_redemption.stock_id` | `promotion_coupon_stock.id` |
| `promotion_code_redemption.user_coupon_id` | `promotion_user_coupon.id` |
| `promotion_user_coupon.stock_id` | `promotion_coupon_stock.id` |
| `promotion_user_coupon.code_id` | `promotion_code.id` |
| `promotion_discount_application.user_coupon_id` | `promotion_user_coupon.id` |
| `promotion_discount_allocation.application_id` | `promotion_discount_application.id` |
| `promotion_coupon_ledger_entry.stock_id` | `promotion_coupon_stock.id` |
| `promotion_coupon_ledger_entry.user_coupon_id` | `promotion_user_coupon.id` |
| `promotion_coupon_ledger_entry.application_id` | `promotion_discount_application.id` |
| `promotion_external_operation.binding_id` | `promotion_external_binding.id` |

## Standard Enumerations

The service layer must centralize these enums and reject unknown database values instead of silently mapping them.

| Field | Values |
| --- | --- |
| `offer_type` | `cash_coupon`, `discount_coupon`, `exchange_coupon`, `gift_coupon`, `shipping_coupon`, `points_coupon`, `membership_coupon`, `bundle_offer` |
| `audience_scope` | `all`, `new_user`, `member`, `segment`, `invitee`, `manual`, `external_platform` |
| `combinability` | `exclusive`, `same_offer_exclusive`, `stackable`, `best_price` |
| `promotion_offer.status` | `draft`, `active`, `paused`, `expired`, `archived` |
| `promotion_offer_version.lifecycle_status` | `draft`, `reviewing`, `published`, `superseded`, `archived` |
| `discount_type` | `fixed_amount`, `percentage`, `fixed_price`, `free_shipping`, `gift`, `points_grant`, `entitlement_grant` |
| `benefit_kind` | `discount`, `stored_value`, `gift_card`, `product_voucher`, `shipping`, `points`, `entitlement` |
| `stack_strategy` | `exclusive`, `allow_different_offer`, `allow_same_offer`, `best_price` |
| `scope_type` | `all`, `category`, `spu`, `sku`, `membership_plan`, `recharge_package`, `model`, `provider`, `channel`, `region`, `payment_method`, `client_app` |
| `match_mode` | `include`, `exclude` |
| `audience_rule_type` | `subject_segment`, `new_user`, `member_level`, `invite_relation`, `first_order`, `min_account_age`, `risk_level`, `natural_person_limit`, `device_limit`, `geo_region` |
| `rule_operator` | `eq`, `neq`, `in`, `not_in`, `gte`, `lte`, `exists` |
| `time_window_type` | `claim`, `redeem`, `display` |
| `validity_type` | `fixed_window`, `relative_after_claim`, `relative_after_activation`, `external_platform` |
| `return_policy` | `returnable`, `non_returnable`, `refund_only`, `external_platform` |
| `settlement_policy` | `reserve_then_settle`, `direct_settle`, `external_settle` |
| `budget_type` | `discount_amount`, `points`, `entitlement_quantity`, `external_platform` |
| `budget_status` | `active`, `paused`, `exhausted`, `expired`, `closed` |
| `lock_mode` | `hard_cap`, `soft_cap`, `external_authorized`, `manual_review` |
| `budget_ledger_direction` | `increase`, `reserve`, `release`, `consume`, `reverse`, `adjust` |
| `stock_type` | `open_claim`, `code_claim`, `private_issue`, `member_grant`, `external_stock` |
| `issue_channel` | `internal`, `wechat_pay`, `wechat_card`, `alipay`, `amazon`, `partner`, `offline` |
| `code_mode` | `platform_generated`, `merchant_api`, `merchant_upload`, `single_shared_code`, `claim_code` |
| `stock_status` | `draft`, `active`, `paused`, `exhausted`, `expired`, `closed` |
| `overspend_policy` | `strict_stop`, `warn_then_stop`, `external_platform`, `manual_review` |
| `code_type` | `public`, `private`, `channel`, `member_only`, `external` |
| `code_status` | `active`, `paused`, `exhausted`, `expired`, `disabled` |
| `activation_status` | `not_applicable`, `pending`, `activated`, `canceled`, `activation_failed`, `expired` |
| `verify_method` | `none`, `qr_code`, `bar_code`, `serial_code`, `sound_wave`, `claim_code`, `platform_callback` |
| `recognition_type` | `none`, `qr_code`, `bar_code`, `wave_code`, `text_code`, `external_token` |
| `code_redemption_status` | `succeeded`, `failed`, `duplicate`, `risk_rejected`, `expired`, `exhausted` |
| `subject_type` | `user`, `account`, `organization`, `member`, `anonymous` |
| `user_coupon_status` | `available`, `locked`, `redeemed`, `expired`, `disabled`, `returned` |
| `claim_source` | `manual`, `public_code`, `private_code`, `campaign`, `member_grant`, `external_platform`, `system` |
| `application_status` | `reserved`, `applied`, `settled`, `released`, `rolled_back`, `failed` |
| `coupon_ledger_direction` | `increase`, `claim`, `lock`, `release`, `redeem`, `expire`, `disable`, `return`, `adjust` |
| `coupon_ledger_business_type` | `stock_create`, `stock_adjust`, `claim`, `checkout_reserve`, `checkout_release`, `redeem`, `refund_return`, `expire`, `disable` |
| `external_platform` | `wechat_pay`, `wechat_card`, `alipay`, `antom`, `stripe`, `partner`, `internal` |
| `external_operation_type` | `template_create`, `template_update`, `stock_create`, `stock_activate`, `stock_pause`, `issue`, `redeem`, `cancel`, `status_query`, `callback`, `reconcile` |
| `external_sync_status` | `pending`, `synced`, `failed`, `disabled` |
| `event_status` | `pending`, `processing`, `published`, `failed`, `dead_letter` |

## Canonical Invariants

These invariants are part of the domain model and must be enforced by database constraints, transactional repository code, or both:

1. A published offer version is immutable.
2. An active offer has exactly one current published version.
3. A user coupon always points to the exact offer version used when it was issued.
4. A stock cannot issue beyond its quantity cap.
5. A budget cannot reserve or consume beyond its available balance.
6. A promotion code cannot claim beyond `max_claims`.
7. A subject cannot exceed stock-level subject limits.
8. One wallet coupon cannot have more than one active discount application.
9. Discount allocation sum equals application discount amount.
10. Every stock counter mutation has a matching coupon ledger entry.
11. Every budget counter mutation has a matching budget ledger entry.
12. Every externally synchronized aggregate has a binding row.
13. Every domain event that other systems need is written to the outbox in the same transaction as the state change.
14. Query-facing status is derived from canonical lifecycle columns and time windows, not from UI-only flags.
15. Offer version, stock, wallet coupon, discount application, discount allocation, budget account, budget ledger, and external binding currency fields must agree for one coupon lifecycle.

## Common Columns

Every mutable business table uses the same ownership and audit shape unless explicitly noted:

| Column | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | uuid/text | yes | Stable primary key generated by the service. |
| `tenant_id` | text | yes | Tenant boundary. |
| `organization_id` | text | no | Merchant/business organization. Null means tenant-wide. |
| `created_at` | timestamptz | yes | Insert time. |
| `updated_at` | timestamptz | yes | Last mutation time. |
| `created_by` | text | no | Operator/service that created the row. |
| `updated_by` | text | no | Operator/service that last changed the row. |

Ledgers and outbox rows use `occurred_at` and `created_at`; they do not use `updated_at` because they are append-only.

## Table Design

### `promotion_offer`

Stable promotion identity. It is the object admin users search, duplicate, pause, archive, and report on.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | text | yes | Primary key. |
| `tenant_id` | text | yes | Tenant boundary. |
| `organization_id` | text | no | Merchant boundary. |
| `offer_no` | text | yes | Internal unique number. |
| `offer_code` | text | yes | Business code, visible in admin/API. |
| `name` | text | yes | Admin display name. |
| `description` | text | no | Admin description. |
| `offer_type` | text | yes | `cash_coupon`, `discount_coupon`, `exchange_coupon`, `gift_coupon`, `shipping_coupon`, `points_coupon`, `membership_coupon`, `bundle_offer`. |
| `audience_scope` | text | yes | `all`, `new_user`, `member`, `segment`, `invitee`, `manual`, `external_platform`. |
| `combinability` | text | yes | `exclusive`, `same_offer_exclusive`, `stackable`, `best_price`. |
| `priority` | int | yes | Higher priority applies first when rules tie. |
| `status` | text | yes | `draft`, `active`, `paused`, `expired`, `archived`. |
| `current_offer_version_id` | text | no | Current published version. Null allowed while draft-only. |
| `starts_at` | timestamptz | no | Overall visible/claimable start. |
| `ends_at` | timestamptz | no | Overall visible/claimable end. |
| `created_at` | timestamptz | yes | Insert time. |
| `updated_at` | timestamptz | yes | Last mutation time. |
| `created_by` | text | no | Creator. |
| `updated_by` | text | no | Last updater. |

Constraints:

- `unique (tenant_id, offer_no)`
- `unique (tenant_id, organization_id, offer_code)`
- `check (status in (...))`
- `check (ends_at is null or starts_at is null or ends_at > starts_at)`

Indexes:

- `(tenant_id, organization_id, status, starts_at, ends_at)`
- `(tenant_id, organization_id, offer_code)`
- `(tenant_id, current_offer_version_id)`

### `promotion_offer_version`

Immutable published rules for an offer. Admin can edit draft versions, but a published version is never mutated in place.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | text | yes | Primary key. |
| `tenant_id` | text | yes | Tenant boundary. |
| `organization_id` | text | no | Merchant boundary. |
| `offer_id` | text | yes | Parent offer. |
| `version_no` | int | yes | Monotonic per offer. |
| `lifecycle_status` | text | yes | `draft`, `reviewing`, `published`, `superseded`, `archived`. |
| `discount_type` | text | yes | `fixed_amount`, `percentage`, `fixed_price`, `free_shipping`, `gift`, `points_grant`, `entitlement_grant`. |
| `discount_amount_minor` | bigint | no | Fixed discount amount. |
| `discount_percent_bps` | int | no | Basis points. 1000 means 10%. |
| `fixed_price_minor` | bigint | no | Fixed price promotion. |
| `maximum_discount_amount_minor` | bigint | no | Cap for percentage discount. |
| `minimum_order_amount_minor` | bigint | yes | Default 0. |
| `currency_code` | char(3) | yes | ISO 4217 currency for all money rules in this immutable version. |
| `benefit_kind` | text | yes | Benefit family: discount, stored value, gift card, product voucher, shipping, points, or entitlement. |
| `face_value_minor` | bigint | yes | Stored-value, gift-card, or voucher face amount. Default 0 for pure discounts. |
| `liability_policy` | text | yes | Merchant, platform, shared, or internal liability policy. |
| `breakage_policy` | text | yes | Expiry/breakage handling for stored-value and voucher balances. |
| `tax_treatment` | text | yes | Tax handling classification used for checkout, invoice, and settlement. |
| `validity_type` | text | yes | Fixed window, relative after claim, relative after activation, or external-platform validity. |
| `validity_duration_seconds` | bigint | no | Relative validity duration when the version uses relative expiry. |
| `return_policy` | text | yes | Whether rollback may return the coupon, keep it terminal, or defer to an external platform. |
| `settlement_policy` | text | yes | Reserve-then-settle, direct settle, or external settle. |
| `customer_visible` | bool | yes | Whether the version is visible in wallet/discovery surfaces. |
| `benefit_definition_id` | text | no | For entitlement/points/member benefit grants. |
| `benefit_quantity` | numeric(24, 8) | no | Granted benefit quantity. |
| `stack_strategy` | text | yes | `exclusive`, `allow_different_offer`, `allow_same_offer`, `best_price`. |
| `rule_snapshot_json` | jsonb | yes | Immutable complete rule snapshot for replay/debug. |
| `published_at` | timestamptz | no | Set only for published versions. |
| `created_at` | timestamptz | yes | Insert time. |
| `updated_at` | timestamptz | yes | Last mutation time for draft versions. |
| `created_by` | text | no | Creator. |
| `updated_by` | text | no | Last updater. |

Constraints:

- `unique (tenant_id, offer_id, version_no)`
- `check (minimum_order_amount_minor >= 0)`
- `check (discount_amount_minor is null or discount_amount_minor >= 0)`
- `check (face_value_minor >= 0)`
- `check (maximum_discount_amount_minor is null or maximum_discount_amount_minor >= 0)`
- `check (discount_percent_bps is null or discount_percent_bps between 1 and 10000)`
- exactly one valid value set for `discount_type` and `benefit_kind`; stored-value and gift-card benefits cannot be represented only as discount amount fields.

Indexes:

- `(tenant_id, offer_id, lifecycle_status)`
- `(tenant_id, lifecycle_status, published_at)`

### `promotion_offer_presentation`

Customer-facing card/voucher presentation. This keeps Alipay/WeChat-style card surface data separate from rule evaluation while still making display name, merchant brand, terms, assets, and action metadata auditable.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | text | yes | Primary key. |
| `tenant_id` | text | yes | Tenant boundary. |
| `organization_id` | text | no | Merchant boundary. |
| `presentation_no` | text | yes | Internal unique presentation number. |
| `offer_id` | text | no | Parent offer for denormalized lookup. |
| `offer_version_id` | text | yes | Immutable version owning the presentation. |
| `surface_type` | text | yes | Wallet, checkout, external card, campaign page, or partner surface. |
| `locale` | text | yes | Locale code for display text. |
| `display_name` | text | yes | Customer-facing card/coupon title. |
| `merchant_display_name` | text | yes | Merchant name shown to customers. |
| `brand_name` | text | no | Brand line shown on supported surfaces. |
| `logo_asset_id` | text | no | Internal asset id for logo. |
| `cover_asset_id` | text | no | Internal asset id for card cover. |
| `primary_color` | text | no | Display color token or hex value. |
| `secondary_color` | text | no | Secondary display color token or hex value. |
| `param_schema_json` | jsonb | yes | Named template parameter contract, matching Alipay-style `tpl_params` and card template placeholders. |
| `field_schema_json` | jsonb | yes | Runtime field update contract for balance, validity, status, merchant text, and card surface updates. |
| `verify_method` | text | yes | How the card is verified or redeemed on this surface. |
| `recognition_type` | text | yes | Provider recognition code type such as QR, barcode, wave code, text code, or none. |
| `recognition_hash` | text | no | Hash of provider recognition payload when a template-level payload exists. No raw recognition payload is stored. |
| `terms_json` | jsonb | yes | Structured use instructions, restrictions, and legal terms. |
| `customer_action_json` | jsonb | yes | Structured CTA, mini-program/app link, QR action, or redeem action metadata. |
| `style_snapshot_json` | jsonb | yes | Provider/surface-specific sanitized style snapshot. |
| `status` | text | yes | Draft, active, disabled, archived. |
| `created_at` | timestamptz | yes | Insert time. |
| `updated_at` | timestamptz | yes | Last mutation time. |

Constraints:

- `unique (tenant_id, presentation_no)`
- `unique (tenant_id, offer_version_id, surface_type, locale)`

Indexes:

- `(tenant_id, offer_version_id, status)`
- `(tenant_id, surface_type, locale, status)`

### `promotion_offer_scope`

Queryable applicability rules. This replaces hidden JSON-only product/channel/model constraints.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | text | yes | Primary key. |
| `tenant_id` | text | yes | Tenant boundary. |
| `organization_id` | text | no | Merchant boundary. |
| `offer_version_id` | text | yes | Version that owns the scope. |
| `scope_type` | text | yes | `all`, `category`, `spu`, `sku`, `membership_plan`, `recharge_package`, `model`, `provider`, `channel`, `region`, `payment_method`, `client_app`. |
| `scope_id` | text | no | Target id. Null only for `all`. |
| `match_mode` | text | yes | `include`, `exclude`. |
| `created_at` | timestamptz | yes | Insert time. |

Constraints:

- `unique (tenant_id, offer_version_id, scope_type, scope_id, match_mode)`
- `check ((scope_type = 'all' and scope_id is null) or (scope_type <> 'all' and scope_id is not null))`

Indexes:

- `(tenant_id, scope_type, scope_id)`
- `(tenant_id, offer_version_id, match_mode)`

### `promotion_offer_audience_rule`

Normalized audience and anti-abuse rules used during listing, claiming, and checkout.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | text | yes | Primary key. |
| `tenant_id` | text | yes | Tenant boundary. |
| `organization_id` | text | no | Merchant boundary. |
| `offer_version_id` | text | yes | Version that owns the rule. |
| `rule_type` | text | yes | `subject_segment`, `new_user`, `member_level`, `invite_relation`, `first_order`, `min_account_age`, `risk_level`, `natural_person_limit`, `device_limit`, `geo_region`. |
| `operator` | text | yes | `eq`, `neq`, `in`, `not_in`, `gte`, `lte`, `exists`. |
| `rule_value` | text | no | Scalar or encoded list id. |
| `limit_quantity` | int | no | For per-subject or risk limits. |
| `period_seconds` | int | no | Rolling period for limit rules. |
| `created_at` | timestamptz | yes | Insert time. |

Constraints:

- `unique (tenant_id, offer_version_id, rule_type, operator, rule_value)`
- `check (limit_quantity is null or limit_quantity >= 0)`
- `check (period_seconds is null or period_seconds > 0)`

Indexes:

- `(tenant_id, offer_version_id, rule_type)`
- `(tenant_id, rule_type, rule_value)`

### `promotion_offer_time_window`

Recurring availability rules such as weekdays, hours, or seasonal windows.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | text | yes | Primary key. |
| `tenant_id` | text | yes | Tenant boundary. |
| `organization_id` | text | no | Merchant boundary. |
| `offer_version_id` | text | yes | Version that owns the time window. |
| `window_type` | text | yes | `claim`, `redeem`, `display`. |
| `timezone` | text | yes | IANA timezone. |
| `starts_at` | timestamptz | no | Absolute start. |
| `ends_at` | timestamptz | no | Absolute end. |
| `weekday_mask` | int | no | Bitmask for recurring weekdays. |
| `start_time_local` | time | no | Local day start. |
| `end_time_local` | time | no | Local day end. |
| `created_at` | timestamptz | yes | Insert time. |

Constraints:

- `check (ends_at is null or starts_at is null or ends_at > starts_at)`
- `check (weekday_mask is null or weekday_mask between 1 and 127)`

Indexes:

- `(tenant_id, offer_version_id, window_type)`
- `(tenant_id, starts_at, ends_at)`

### `promotion_budget_account`

Money or points budget account for a promotion. Quantity stock is not enough for percentage discounts, budget caps, or external settlement.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | text | yes | Primary key. |
| `tenant_id` | text | yes | Tenant boundary. |
| `organization_id` | text | no | Merchant boundary. |
| `budget_no` | text | yes | Unique budget number. |
| `offer_id` | text | yes | Parent offer. |
| `offer_version_id` | text | no | Optional version binding. |
| `stock_id` | text | no | Optional stock binding. |
| `budget_type` | text | yes | `discount_amount`, `points`, `entitlement_quantity`, `external_platform`. |
| `currency_code` | char(3) | yes | ISO 4217 currency; must match the bound offer version or stock for money budgets. |
| `total_amount_minor` | bigint | no | Null means uncapped by amount. |
| `available_amount_minor` | bigint | yes | Current available amount. |
| `reserved_amount_minor` | bigint | yes | Checkout reservations. |
| `used_amount_minor` | bigint | yes | Settled usage. |
| `planned_amount_minor` | bigint | yes | Expected spend exposure used for warnings and campaign planning. |
| `overrun_amount_minor` | bigint | yes | Spend beyond planned cap when platform or manual policy allows it. |
| `lock_mode` | text | yes | Hard cap, soft cap, external authorized, or manual review lock behavior. |
| `status` | text | yes | `active`, `paused`, `exhausted`, `expired`, `closed`. |
| `created_at` | timestamptz | yes | Insert time. |
| `updated_at` | timestamptz | yes | Last mutation time. |

Constraints:

- `unique (tenant_id, budget_no)`
- `check (available_amount_minor >= 0)`
- `check (reserved_amount_minor >= 0)`
- `check (used_amount_minor >= 0)`
- `check (total_amount_minor is null or total_amount_minor >= available_amount_minor + reserved_amount_minor + used_amount_minor)`

Indexes:

- `(tenant_id, offer_id, status)`
- `(tenant_id, stock_id, status)`

### `promotion_budget_ledger_entry`

Append-only money/points budget movement ledger.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | text | yes | Primary key. |
| `tenant_id` | text | yes | Tenant boundary. |
| `organization_id` | text | no | Merchant boundary. |
| `ledger_no` | text | yes | Unique ledger number. |
| `budget_account_id` | text | yes | Budget account. |
| `application_id` | text | no | Discount application if applicable. |
| `direction` | text | yes | `increase`, `reserve`, `release`, `consume`, `reverse`, `adjust`. |
| `amount_minor_delta` | bigint | yes | Signed delta. |
| `currency_code` | char(3) | yes | ISO 4217 currency copied from the budget account for immutable audit. |
| `available_after_minor` | bigint | yes | Balance after event. |
| `reserved_after_minor` | bigint | yes | Reserved after event. |
| `used_after_minor` | bigint | yes | Used after event. |
| `source_type` | text | yes | Command/source object type. |
| `source_id` | text | yes | Source object id. |
| `request_no` | text | yes | Request number. |
| `idempotency_key` | text | yes | Idempotency key. |
| `operator_id` | text | no | Admin/user/system operator. |
| `occurred_at` | timestamptz | yes | Business event time. |
| `created_at` | timestamptz | yes | Insert time. |

Constraints:

- `unique (tenant_id, ledger_no)`
- `unique (tenant_id, request_no)`

Indexes:

- `(tenant_id, budget_account_id, occurred_at)`
- `(tenant_id, source_type, source_id)`

### `promotion_coupon_stock`

Coupon inventory pool. This is equivalent to industry stock/template inventory.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | text | yes | Primary key. |
| `tenant_id` | text | yes | Tenant boundary. |
| `organization_id` | text | no | Merchant boundary. |
| `stock_no` | text | yes | Unique stock number. |
| `name` | text | yes | Admin display name. |
| `offer_id` | text | yes | Parent offer. |
| `offer_version_id` | text | yes | Immutable rule version used by issued coupons. |
| `budget_account_id` | text | no | Optional budget cap. |
| `stock_type` | text | yes | `open_claim`, `code_claim`, `private_issue`, `member_grant`, `external_stock`. |
| `currency_code` | char(3) | yes | ISO 4217 currency copied from the offer version. |
| `issue_channel` | text | yes | Internal, WeChat, Alipay, Amazon, partner, or offline issuing channel. |
| `stock_creator_merchant_id` | text | no | External merchant id or platform creator id when a platform owns the stock. |
| `code_mode` | text | yes | Platform-generated, merchant API, merchant upload, shared code, or external claim-code mode. |
| `activation_status` | text | yes | Activation state for external/gift-card stocks. Use `not_applicable` for ordinary coupons. |
| `cancel_until` | timestamptz | no | Last cancellation time when the external platform supports cancellation. |
| `can_resend` | bool | yes | Whether claim code or voucher delivery can be resent without reissuing. |
| `budget_warning_threshold_bps` | int | no | Budget warning threshold in basis points for offline/paused workflows. |
| `budget_stop_threshold_bps` | int | no | Stop threshold in basis points for platforms where budget is not a hard cap. |
| `overspend_policy` | text | yes | Strict stop, warn then stop, external platform, or manual review. |
| `total_quantity` | bigint | no | Null means uncapped by quantity. |
| `available_quantity` | bigint | yes | Can still be claimed/issued. |
| `claimed_quantity` | bigint | yes | User coupons created. |
| `locked_quantity` | bigint | yes | Reserved during checkout. |
| `redeemed_quantity` | bigint | yes | Successfully redeemed/settled. |
| `disabled_quantity` | bigint | yes | Disabled/invalidated. |
| `returned_quantity` | bigint | yes | Returned after rollback/refund if policy allows. |
| `max_claims_per_subject` | int | no | User/subject receive cap. |
| `max_claims_per_natural_person` | int | no | Risk identity cap. |
| `status` | text | yes | `draft`, `active`, `paused`, `exhausted`, `expired`, `closed`. |
| `starts_at` | timestamptz | no | Claim start. |
| `expires_at` | timestamptz | no | Claim end. |
| `created_at` | timestamptz | yes | Insert time. |
| `updated_at` | timestamptz | yes | Last mutation time. |
| `created_by` | text | no | Creator. |
| `updated_by` | text | no | Last updater. |

Constraints:

- `unique (tenant_id, stock_no)`
- all counters `>= 0`
- `total_quantity is null or total_quantity >= available_quantity + claimed_quantity + disabled_quantity`
- `claimed_quantity >= locked_quantity + redeemed_quantity`
- `expires_at is null or starts_at is null or expires_at > starts_at`

Indexes:

- `(tenant_id, offer_id, status, expires_at)`
- `(tenant_id, offer_version_id, status)`
- `(tenant_id, stock_type, status)`
- `(tenant_id, code_mode, status)`
- `(tenant_id, activation_status, cancel_until)`

### `promotion_code`

Claim/redemption code. It may issue a coupon into a wallet or directly grant a benefit depending on the offer version.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | text | yes | Primary key. |
| `tenant_id` | text | yes | Tenant boundary. |
| `organization_id` | text | no | Merchant boundary. |
| `code_no` | text | yes | Internal unique number. |
| `stock_id` | text | yes | Stock pool. |
| `offer_id` | text | yes | Parent offer. |
| `offer_version_id` | text | yes | Rule version. |
| `promotion_code_hash` | text | yes | Hash of actual code. Plain code is not required at rest. |
| `promotion_code_last4` | text | no | Debug/display suffix. |
| `code_type` | text | yes | `public`, `private`, `channel`, `member_only`, `external`. |
| `currency_code` | char(3) | yes | ISO 4217 currency copied from the stock and offer version. |
| `claim_code_hash` | text | no | Hash of Amazon/partner claim code. Plain claim codes are forbidden at rest. |
| `claim_code_suffix` | text | no | Safe suffix for support and reconciliation. |
| `activation_status` | text | yes | Activation state for external claim codes. Use `not_applicable` for ordinary codes. |
| `activated_at` | timestamptz | no | External activation time. |
| `canceled_at` | timestamptz | no | External cancellation time. |
| `cancel_until` | timestamptz | no | Last cancellation time. |
| `can_resend` | bool | yes | Whether this claim code can be resent. |
| `channel_code` | text | no | Attribution channel. |
| `max_claims` | bigint | yes | Default 1. |
| `claimed_quantity` | bigint | yes | Successful claims. |
| `status` | text | yes | `active`, `paused`, `exhausted`, `expired`, `disabled`. |
| `starts_at` | timestamptz | no | Valid start. |
| `expires_at` | timestamptz | no | Valid end. |
| `created_at` | timestamptz | yes | Insert time. |
| `updated_at` | timestamptz | yes | Last mutation time. |

Constraints:

- `unique (tenant_id, code_no)`
- `unique (tenant_id, promotion_code_hash)`
- `check (max_claims > 0)`
- `check (claimed_quantity >= 0 and claimed_quantity <= max_claims)`

Indexes:

- `(tenant_id, promotion_code_hash)`
- `(tenant_id, claim_code_hash)`
- `(tenant_id, activation_status, cancel_until)`
- `(tenant_id, stock_id, status, expires_at)`
- `(tenant_id, offer_id, status)`
- `(tenant_id, channel_code, status)`

### `promotion_code_redemption`

Independent exchange attempt fact. This records successful and failed code exchange attempts without storing the plaintext submitted code, making support, fraud review, idempotent replay, and external voucher reconciliation possible.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | text | yes | Primary key. |
| `tenant_id` | text | yes | Tenant boundary. |
| `organization_id` | text | no | Merchant boundary. |
| `redemption_no` | text | yes | Internal unique redemption number. |
| `code_id` | text | no | Matched code when available. |
| `stock_id` | text | yes | Stock involved in the attempt. |
| `offer_id` | text | yes | Parent offer. |
| `offer_version_id` | text | yes | Rule version evaluated for the attempt. |
| `user_coupon_id` | text | no | Wallet coupon created by a successful exchange. |
| `submitted_code_hash` | text | yes | Hash of the submitted code. |
| `submitted_code_suffix` | text | no | Safe suffix for support search. |
| `subject_type` | text | yes | User, account, organization, member, or anonymous subject. |
| `subject_id` | text | yes | Subject id. |
| `owner_user_id` | text | no | User id when known. |
| `currency_code` | char(3) | yes | Currency copied from the evaluated offer version. |
| `result_status` | text | yes | Succeeded, failed, duplicate, risk rejected, expired, or exhausted. |
| `failure_code` | text | no | Stable failure reason. |
| `failure_message` | text | no | Masked support-facing failure detail. |
| `redemption_channel` | text | yes | App, admin, partner, WeChat, Alipay, Amazon, or offline channel. |
| `redemption_scene` | text | no | Checkout, wallet, campaign, customer support, or external callback. |
| `request_no` | text | yes | Request number. |
| `idempotency_key` | text | yes | Idempotency key. |
| `occurred_at` | timestamptz | yes | Business event time. |
| `created_at` | timestamptz | yes | Insert time. |

Constraints:

- `unique (tenant_id, redemption_no)`
- `unique (tenant_id, request_no)`
- `unique (tenant_id, idempotency_key)`
- `plain_code` and `submitted_code` columns are forbidden.

Indexes:

- `(tenant_id, code_id, occurred_at)`
- `(tenant_id, submitted_code_hash, occurred_at)`
- `(tenant_id, subject_type, subject_id, result_status, occurred_at)`
- `(tenant_id, stock_id, result_status, occurred_at)`

### `promotion_user_coupon`

Wallet item owned by a subject. This table is the user-facing card/coupon instance.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | text | yes | Primary key. |
| `tenant_id` | text | yes | Tenant boundary. |
| `organization_id` | text | no | Merchant boundary. |
| `coupon_no` | text | yes | Internal unique number. |
| `stock_id` | text | yes | Source stock. |
| `code_id` | text | no | Source code if claimed by code. |
| `offer_id` | text | yes | Parent offer. |
| `offer_version_id` | text | yes | Immutable rule version. |
| `budget_account_id` | text | no | Budget account if applicable. |
| `subject_type` | text | yes | `user`, `account`, `organization`, `member`, `anonymous`. |
| `subject_id` | text | yes | Owner subject id. |
| `owner_user_id` | text | no | User id for wallet UI. |
| `coupon_code_hash` | text | yes | Wallet coupon code hash. |
| `coupon_code_last4` | text | no | Safe display suffix. |
| `verify_method` | text | yes | Wallet verification method such as QR, barcode, serial code, claim code, callback, or none. |
| `recognition_type` | text | no | Provider recognition type copied from presentation or platform issuance. |
| `recognition_hash` | text | no | Hash of issued card recognition payload. Plain payload is forbidden at rest. |
| `claim_code_hash` | text | no | Hash of Amazon/partner claim code if the wallet item is a product voucher or gift-card incentive. |
| `claim_code_suffix` | text | no | Safe suffix for customer support and reconciliation. |
| `activation_status` | text | yes | Activation state for external/gift-card wallet items. Use `not_applicable` for ordinary coupons. |
| `cancel_until` | timestamptz | no | Last cancellation time supported by the external platform. |
| `can_resend` | bool | yes | Whether delivery can be resent without creating a new wallet coupon. |
| `face_value_minor` | bigint | yes | Monetary face value snapshot. Default 0 for non-money benefits. |
| `maximum_discount_amount_minor` | bigint | yes | Maximum discount snapshot. Default 0 when uncapped or not applicable. |
| `minimum_order_amount_minor` | bigint | yes | Required order threshold snapshot. Default 0. |
| `discount_percent_bps` | int | no | Percentage discount snapshot in basis points. |
| `currency_code` | char(3) | yes | ISO 4217 currency copied from the stock and offer version. |
| `status` | text | yes | `available`, `locked`, `redeemed`, `expired`, `disabled`, `returned`. |
| `claim_source` | text | yes | `manual`, `public_code`, `private_code`, `campaign`, `member_grant`, `external_platform`, `system`. |
| `claimed_at` | timestamptz | yes | Claim/issue time. |
| `valid_from` | timestamptz | no | Coupon valid start. |
| `expires_at` | timestamptz | no | Coupon expiry. |
| `locked_at` | timestamptz | no | Current checkout lock time. |
| `lock_expires_at` | timestamptz | no | Lock expiry. |
| `redeemed_at` | timestamptz | no | Final redemption/settlement time. |
| `disabled_at` | timestamptz | no | Disable time. |
| `returned_at` | timestamptz | no | Return time. |
| `request_no` | text | yes | Claim request number. |
| `idempotency_key` | text | yes | Claim idempotency key. |
| `created_at` | timestamptz | yes | Insert time. |
| `updated_at` | timestamptz | yes | Last mutation time. |

Constraints:

- `unique (tenant_id, coupon_no)`
- `unique (tenant_id, coupon_code_hash)`
- `unique (tenant_id, request_no)`
- `unique (tenant_id, idempotency_key)`
- `expires_at is null or valid_from is null or expires_at > valid_from`

Indexes:

- `(tenant_id, subject_type, subject_id, status, expires_at)`
- `(tenant_id, owner_user_id, status, expires_at)`
- `(tenant_id, stock_id, status)`
- `(tenant_id, offer_id, status)`
- `(tenant_id, claim_code_hash)`
- `(tenant_id, activation_status, cancel_until)`

### `promotion_discount_application`

Order/checkout discount application. It supports reservation before payment, settlement after payment, and rollback/refund.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | text | yes | Primary key. |
| `tenant_id` | text | yes | Tenant boundary. |
| `organization_id` | text | no | Merchant boundary. |
| `application_no` | text | yes | Unique application number. |
| `offer_id` | text | yes | Offer. |
| `offer_version_id` | text | yes | Rule version. |
| `stock_id` | text | no | Stock if coupon-backed. |
| `user_coupon_id` | text | no | Wallet coupon if used. |
| `budget_account_id` | text | no | Budget account if applicable. |
| `order_id` | text | yes | Order id. |
| `order_no` | text | no | External/business order number. |
| `payment_id` | text | no | Payment id after payment starts. |
| `subject_type` | text | yes | Buyer subject type. |
| `subject_id` | text | yes | Buyer subject id. |
| `discount_amount_minor` | bigint | yes | Discount amount. |
| `currency_code` | char(3) | yes | ISO currency. |
| `status` | text | yes | `reserved`, `applied`, `settled`, `released`, `rolled_back`, `failed`. |
| `failure_code` | text | no | Failure reason code. |
| `failure_message` | text | no | Failure detail. |
| `rule_snapshot_json` | jsonb | yes | Rule snapshot used for computation. |
| `request_no` | text | yes | Request number. |
| `idempotency_key` | text | yes | Idempotency key. |
| `reserved_at` | timestamptz | no | Reservation time. |
| `reservation_expires_at` | timestamptz | no | Reservation timeout. |
| `applied_at` | timestamptz | no | Applied time. |
| `settled_at` | timestamptz | no | Settled time. |
| `released_at` | timestamptz | no | Release time. |
| `rolled_back_at` | timestamptz | no | Rollback time. |
| `created_at` | timestamptz | yes | Insert time. |
| `updated_at` | timestamptz | yes | Last mutation time. |

Constraints:

- `unique (tenant_id, application_no)`
- `unique (tenant_id, order_id, user_coupon_id)` where `user_coupon_id is not null`
- `unique (tenant_id, request_no)`
- `unique (tenant_id, idempotency_key)`
- `check (discount_amount_minor >= 0)`

Indexes:

- `(tenant_id, order_id, status)`
- `(tenant_id, user_coupon_id, status)`
- `(tenant_id, subject_type, subject_id, status, created_at)`
- `(tenant_id, reservation_expires_at, status)`

### `promotion_discount_allocation`

Line/item-level discount allocation.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | text | yes | Primary key. |
| `tenant_id` | text | yes | Tenant boundary. |
| `organization_id` | text | no | Merchant boundary. |
| `application_id` | text | yes | Parent application. |
| `order_id` | text | yes | Order id. |
| `order_item_id` | text | no | Order item id. Null means order-level allocation. |
| `sku_id` | text | no | SKU id. |
| `allocation_amount_minor` | bigint | yes | Allocated discount. |
| `currency_code` | char(3) | yes | ISO currency. |
| `created_at` | timestamptz | yes | Insert time. |

Constraints:

- `unique (tenant_id, application_id, order_item_id)`
- `check (allocation_amount_minor >= 0)`
- sum of allocations for one application must equal `promotion_discount_application.discount_amount_minor`

Indexes:

- `(tenant_id, application_id, order_item_id)`
- `(tenant_id, order_id)`
- `(tenant_id, sku_id)`

### `promotion_coupon_ledger_entry`

Append-only coupon/stock lifecycle ledger.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | text | yes | Primary key. |
| `tenant_id` | text | yes | Tenant boundary. |
| `organization_id` | text | no | Merchant boundary. |
| `ledger_no` | text | yes | Unique ledger number. |
| `stock_id` | text | yes | Stock. |
| `offer_id` | text | yes | Offer. |
| `offer_version_id` | text | no | Version. |
| `user_coupon_id` | text | no | Coupon instance if applicable. |
| `application_id` | text | no | Application if applicable. |
| `subject_type` | text | no | Subject type. |
| `subject_id` | text | no | Subject id. |
| `direction` | text | yes | `increase`, `claim`, `lock`, `release`, `redeem`, `expire`, `disable`, `return`, `adjust`. |
| `quantity_delta` | bigint | yes | Signed quantity movement. |
| `available_after` | bigint | no | Stock available after event. |
| `claimed_after` | bigint | no | Stock claimed after event. |
| `locked_after` | bigint | no | Stock locked after event. |
| `redeemed_after` | bigint | no | Stock redeemed after event. |
| `business_type` | text | yes | `stock_create`, `stock_adjust`, `claim`, `checkout_reserve`, `checkout_release`, `redeem`, `refund_return`, `expire`, `disable`. |
| `source_type` | text | yes | Command/source object type. |
| `source_id` | text | yes | Source object id. |
| `request_no` | text | yes | Request number. |
| `idempotency_key` | text | yes | Idempotency key. |
| `operator_id` | text | no | Admin/user/system operator. |
| `occurred_at` | timestamptz | yes | Business event time. |
| `created_at` | timestamptz | yes | Insert time. |

Constraints:

- `unique (tenant_id, ledger_no)`
- `unique (tenant_id, request_no)`

Indexes:

- `(tenant_id, stock_id, occurred_at)`
- `(tenant_id, user_coupon_id, occurred_at)`
- `(tenant_id, application_id)`
- `(tenant_id, source_type, source_id)`

### `promotion_external_binding`

External platform mapping for WeChat, Alipay, Amazon, partner campaigns, payment providers, or marketplace coupons.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | text | yes | Primary key. |
| `tenant_id` | text | yes | Tenant boundary. |
| `organization_id` | text | no | Merchant boundary. |
| `platform` | text | yes | `wechat_pay`, `wechat_card`, `alipay`, `antom`, `stripe`, `partner`, `internal`. |
| `external_object_type` | text | yes | `offer`, `offer_version`, `stock`, `code`, `user_coupon`, `application`. |
| `external_object_id` | text | yes | Platform object id. |
| `external_currency_code` | char(3) | yes | External platform currency for reconciliation with local `currency_code`. |
| `platform_template_id` | text | no | Platform template id for Alipay/WeChat card template mapping. |
| `platform_stock_id` | text | no | Platform stock id. |
| `platform_card_id` | text | no | Platform card/pass id. |
| `platform_coupon_id` | text | no | Platform issued coupon id. |
| `claim_code_hash` | text | no | Hashed claim code when the binding represents a claim-code object. |
| `claim_code_suffix` | text | no | Safe claim-code suffix for reconciliation. |
| `local_object_type` | text | yes | Local table/object type. |
| `local_object_id` | text | yes | Local id. |
| `sync_status` | text | yes | `pending`, `synced`, `failed`, `disabled`. |
| `last_synced_at` | timestamptz | no | Last successful sync. |
| `last_error_code` | text | no | Last error code. |
| `last_error_message` | text | no | Last error message. |
| `metadata_snapshot_json` | jsonb | yes | Sanitized external metadata snapshot. |
| `created_at` | timestamptz | yes | Insert time. |
| `updated_at` | timestamptz | yes | Last mutation time. |

Constraints:

- `unique (tenant_id, platform, external_object_type, external_object_id)`
- `unique (tenant_id, local_object_type, local_object_id, platform)`

Indexes:

- `(tenant_id, local_object_type, local_object_id)`
- `(tenant_id, platform, sync_status)`

### `promotion_external_operation`

Append-only external API operation attempt log. This supports WeChat/Alipay template and stock synchronization, Amazon-style gift-card or promo-code activation/status checks, callbacks, retries, and reconciliation without hiding request results inside the binding row.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | text | yes | Primary key. |
| `tenant_id` | text | yes | Tenant boundary. |
| `organization_id` | text | no | Merchant boundary. |
| `operation_no` | text | yes | Internal unique operation number. |
| `binding_id` | text | no | External binding if one already exists. |
| `platform` | text | yes | WeChat Pay, WeChat Card, Alipay, Antom, Amazon, partner, Stripe, or internal. |
| `aggregate_type` | text | yes | Local aggregate type. |
| `aggregate_id` | text | yes | Local aggregate id. |
| `operation_type` | text | yes | Template create, stock create, activate, pause, issue, redeem, cancel, status query, callback, or reconcile. |
| `external_request_no` | text | no | Platform request/order/request id. |
| `external_operation_id` | text | no | Platform-side operation id. |
| `provider_request_id` | text | no | Provider request id returned in synchronous or asynchronous platform responses. |
| `provider_code` | text | no | Stable provider response/business code for routing retry and support workflows. |
| `callback_id` | text | no | External callback event id for WeChat/Alipay/Amazon-style async events. |
| `callback_sig_hash` | text | no | Hash of callback signature material; raw signature headers are not stored. |
| `callback_at` | timestamptz | no | Time the callback was received by the platform adapter. |
| `external_status` | text | no | Platform-side status. |
| `status` | text | yes | Pending, succeeded, failed, retrying, or dead-letter. |
| `request_hash` | text | no | Hash of canonical request payload. |
| `response_hash` | text | no | Hash of canonical response payload. |
| `sanitized_request_json` | jsonb | yes | Masked request snapshot with no secrets or claim codes. |
| `sanitized_response_json` | jsonb | yes | Masked response snapshot with no secrets or claim codes. |
| `retry_count` | int | yes | Retry count. |
| `next_retry_at` | timestamptz | no | Retry schedule. |
| `cancel_until` | timestamptz | no | Last cancellation time for operations that create cancelable external value. |
| `replay_op_id` | text | no | Previous operation id when this row is an idempotent replay or retry audit. |
| `idempotency_key` | text | yes | Idempotency key. |
| `error_code` | text | no | Stable error code. |
| `error_message` | text | no | Masked error detail. |
| `occurred_at` | timestamptz | yes | Operation attempt time. |
| `created_at` | timestamptz | yes | Insert time. |

Constraints:

- `unique (tenant_id, operation_no)`
- `unique (tenant_id, idempotency_key)`
- raw request/response payloads and external claim codes are forbidden.

Indexes:

- `(tenant_id, binding_id, occurred_at)`
- `(tenant_id, platform, status, next_retry_at)`
- `(tenant_id, platform, external_request_no)`
- `(tenant_id, platform, provider_request_id)`
- `(tenant_id, platform, callback_id)`

### `promotion_event_outbox`

Reliable domain event publication table. It prevents admin writes from silently losing external sync, analytics, or notification events.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | text | yes | Primary key. |
| `tenant_id` | text | yes | Tenant boundary. |
| `organization_id` | text | no | Merchant boundary. |
| `event_no` | text | yes | Unique event number. |
| `event_type` | text | yes | Example: `promotion.stock.created`, `promotion.coupon.claimed`, `promotion.discount.settled`. |
| `aggregate_type` | text | yes | `offer`, `stock`, `code`, `user_coupon`, `application`, `budget`. |
| `aggregate_id` | text | yes | Aggregate id. |
| `payload_json` | jsonb | yes | Event payload. |
| `status` | text | yes | `pending`, `processing`, `published`, `failed`, `dead_letter`. |
| `attempt_count` | int | yes | Default 0. |
| `next_attempt_at` | timestamptz | no | Retry schedule. |
| `last_error` | text | no | Last failure. |
| `occurred_at` | timestamptz | yes | Event time. |
| `created_at` | timestamptz | yes | Insert time. |
| `published_at` | timestamptz | no | Publish time. |

Constraints:

- `unique (tenant_id, event_no)`
- `check (attempt_count >= 0)`

Indexes:

- `(tenant_id, status, next_attempt_at)`
- `(tenant_id, aggregate_type, aggregate_id, occurred_at)`

## State Machines

### Offer

`draft -> active -> paused -> active -> expired -> archived`

Rules:

- `archived` is terminal.
- `expired` is terminal for claim/display but historical applications stay queryable.
- A new `active` offer must have one `published` current version.

### Offer Version

`draft -> reviewing -> published -> superseded -> archived`

Rules:

- `published` rows are immutable.
- Publishing a new version sets previous current version to `superseded`.
- Issued coupons keep their original `offer_version_id`.

### Stock

`draft -> active -> paused -> active -> exhausted -> closed`

Also: `active -> expired -> closed`.

Rules:

- Stock can be claimed only in `active`.
- `exhausted` is derived when quantity or budget is unavailable.
- `closed` blocks claim and external sync except audit reads.

### Promotion Code

`active -> paused -> active -> exhausted`

Also: `active -> expired`, `active -> disabled`.

Rules:

- Private one-time codes use `max_claims = 1`.
- Public/channel codes can use larger `max_claims`.
- Actual codes are hashed at rest.

### User Coupon

`available -> locked -> redeemed`

Alternative terminal paths:

- `available -> expired`
- `available -> disabled`
- `locked -> released -> available`
- `redeemed -> returned` only when rollback policy allows coupon return.

Rules:

- One user coupon can have at most one active reservation/application at a time.
- Lock expiry must release stock/budget through ledger entries.

### Discount Application

`reserved -> applied -> settled`

Alternative paths:

- `reserved -> released`
- `reserved -> failed`
- `applied -> rolled_back`
- `settled -> rolled_back`

Rules:

- `settled` means order/payment accepted the discount.
- `rolled_back` must write both coupon ledger and budget ledger reversals.

## Rule Model

The normalized rule tables cover queryable decisions:

- Product/service applicability: `promotion_offer_scope`
- Audience eligibility: `promotion_offer_audience_rule`
- Time windows: `promotion_offer_time_window`
- Stock and budget caps: `promotion_coupon_stock`, `promotion_budget_account`
- Stacking strategy: `promotion_offer_version.stack_strategy`

`promotion_offer_version.rule_snapshot_json` stores the full evaluated rule set only for replay, debugging, and audit. Application code must not make it the only source of live eligibility.

## Claim And Redemption Flows

The domain treats exchange and redemption as two separate business moments:

- Code exchange: a subject submits a public/private/channel/external code and receives a wallet coupon or direct benefit. This mutates `promotion_code`, `promotion_user_coupon`, `promotion_coupon_stock`, coupon ledger, optional budget ledger, and outbox.
- Checkout redemption: a wallet coupon is reserved, applied, settled, released, or rolled back against an order. This mutates `promotion_user_coupon`, `promotion_discount_application`, `promotion_discount_allocation`, `promotion_coupon_stock`, budget ledger, coupon ledger, and outbox.

No code-exchange or checkout-redemption path may bypass the ledger tables. Failed attempts are recorded through the admin audit trail with the submitted code hashed or masked; successful state changes are reconstructable from promotion tables alone.

### Claim by public offer

1. Load active offer and current published version.
2. Validate scope, audience, time window, per-subject limits, stock, budget, and currency consistency.
3. Lock stock row.
4. Create `promotion_user_coupon` with currency and monetary snapshots from the published version.
5. Increment stock counters.
6. Write `promotion_coupon_ledger_entry`.
7. Write `promotion_event_outbox`.

### Claim by promotion code

1. Hash submitted code and load `promotion_code`.
2. Validate code status, time window, max claims, stock, audience, currency consistency, and risk limits.
3. Lock code and stock rows.
4. Create `promotion_user_coupon` with currency and monetary snapshots from the published version.
5. Increment code and stock counters.
6. Write coupon ledger and outbox event.

Idempotent replay returns the original wallet coupon. An exhausted public/channel code moves to `exhausted`; a private one-time code moves to `exhausted` after its first successful claim. Code exchange must never store plaintext code after command validation.

### Checkout reserve/apply

1. Load wallet coupon and published version.
2. Validate subject, order, scope, stack strategy, budget, expiry, and exact currency match.
3. Create `promotion_discount_application` with `reserved`.
4. Create `promotion_discount_allocation` rows in the same currency as the application.
5. Lock coupon/stock/budget.
6. On payment confirmation, move application to `settled`.
7. On order cancel or timeout, release locks.

Reservation uses `promotion_discount_application.reservation_expires_at` and `promotion_user_coupon.lock_expires_at`. A background expiry task releases stale reservations by writing coupon and budget ledger entries in the same transaction.

### Refund/rollback

1. Load application and allocations.
2. Compute refundable/returnable discount.
3. Move application to `rolled_back`.
4. Return or disable coupon according to published version snapshot.
5. Reverse budget and stock counters.
6. Write ledger entries and outbox events.

Rollback must use the immutable allocation rows. A partial refund reverses only the related allocation amount; a full rollback may return the user coupon only when the published version snapshot permits return, otherwise the coupon remains terminal and the budget ledger records the reversal evidence.

## Admin Management Surface

`/admin/marketing` should become Promotion Center with these sections:

1. Overview: active offers, stock pressure, claim rate, redemption rate, discount spend, budget risk, expiring stocks.
2. Offers: list, create, edit draft, duplicate, publish version, pause, archive.
3. Offer Versions: rule builder, version diff, publish history, immutable snapshots.
4. Stocks: quantity/budget, issue window, pause/resume, close, export.
5. Codes: public/private/channel codes, stock-based generation, safe export, disable, channel attribution.
6. User Coupons: wallet inspection, status, owner, expiry, source, lock/redeem history.
7. Applications: order-level reservations, settlement, rollback, failure reason.
8. Allocations: item-level discount split for refund/invoice/accounting.
9. Ledgers: coupon and budget audit trail.
10. External Bindings: WeChat/Alipay/partner sync state.
11. Event Outbox: publish/retry/dead-letter operations.

UI should use a work-surface layout consistent with the `usage` page pattern: bounded viewport height, fixed toolbar, independent table scroll, sticky headers, and detail drawers for rule editing and trace inspection.

## API Contract

Backend/admin operations:

- `promotions.offers.management.list`
- `promotions.offers.create`
- `promotions.offers.update`
- `promotions.offers.versions.list`
- `promotions.offers.versions.create`
- `promotions.offers.versions.publish`
- `promotions.couponStocks.list`
- `promotions.couponStocks.create`
- `promotions.couponStocks.update`
- `promotions.codes.list`
- `promotions.codes.create`
- `promotions.codes.disable`
- `promotions.codes.redemptions.list`
- `promotions.userCoupons.management.list`
- `promotions.userCoupons.management.disable`
- `promotions.userCoupons.management.return`
- `promotions.discountApplications.list`
- `promotions.discountApplications.rollback`
- `promotions.discountApplications.releaseExpired`
- `promotions.discountAllocations.list`
- `promotions.couponLedgerEntries.list`
- `promotions.budgetLedgerEntries.list`
- `promotions.externalBindings.list`
- `promotions.events.list`
- `promotions.events.retry`

App/runtime operations:

- `promotions.offers.list`
- `promotions.offers.retrieve`
- `promotions.userCoupons.wallet.list`
- `promotions.userCoupons.wallet.retrieve`
- `promotions.userCoupons.claims.create`
- `promotions.codes.redemptions.create`
- `promotions.discountApplications.create`
- `promotions.discountApplications.settle`
- `promotions.discountApplications.release`
- `promotions.discountApplications.reversals.create`

## Data Integrity And Transaction Rules

1. Offer publish, stock create, claim, code redeem, checkout reserve, settle, release, and rollback are single transactional commands.
2. All counter updates lock the owning stock/budget/code row.
3. Idempotency is enforced by `unique (tenant_id, idempotency_key)` or `unique (tenant_id, request_no)` on the command result table.
4. A command that mutates stock or budget must write the corresponding ledger row in the same transaction.
5. A command that creates a user-visible business event must write `promotion_event_outbox` in the same transaction.
6. A published offer version cannot be updated. Changes require a new draft version and publish action.
7. Order refund and rollback must read `promotion_discount_allocation`, not recalculate allocation from current rules.

## Reporting Model

Operational reports should read from canonical tables first:

- Offer performance: `promotion_offer`, `promotion_coupon_stock`, `promotion_user_coupon`, `promotion_discount_application`
- Stock health: `promotion_coupon_stock`, `promotion_coupon_ledger_entry`
- Discount spend: `promotion_budget_account`, `promotion_budget_ledger_entry`, `promotion_discount_application`
- Channel conversion: `promotion_code.channel_code`, `promotion_user_coupon.claim_source`, `promotion_discount_application`
- Refund impact: `promotion_discount_application`, `promotion_discount_allocation`, `promotion_budget_ledger_entry`

Derived analytics tables can be added later as projections, but they must not become the system of record.

## Implementation Sequence

1. Make the schema registry describe exactly the 15 canonical `promotion_*` tables.
2. Update appbase migrations, manifests, contracts, generated OpenAPI components, and generated SDKs from this design.
3. Implement repository commands around the canonical state machines and transaction rules.
4. Expose backend/app promotion operations through generated SDKs only.
5. Build Promotion Center admin sections around the canonical operations, including currency-aware offer, stock, wallet coupon, redemption, budget, and external binding views.
6. Add focused tests for state machines, idempotency, stock counters, budget counters, allocation sum, append-only ledgers, event outbox, and external bindings.
7. Run schema gates, API contract gates, generated SDK checks, portal runtime tests, and backend SQL contract tests.

## Acceptance Criteria

- `promotion_*` tables are the only card-coupon source of truth.
- Fixed amount and budget fields use integer minor units.
- Coupon currency is set on the published offer version and remains immutable across stock, wallet coupon, application, allocation, budget, ledger, and external binding records.
- Percent discounts use basis points.
- Published rules are immutable.
- Coupon stock, user coupon, application, budget, and ledger rows can reconstruct every claim, lock, redeem, release, rollback, and adjustment.
- Admin UI can manage offers, versions, stocks, codes, user coupons, applications, allocations, ledgers, external bindings, and outbox events.
- The implementation can integrate WeChat/Alipay-like external card-coupon systems through `promotion_external_binding` without schema changes.

