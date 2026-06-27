> Migrated from `docs/superpowers/specs/2026-05-23-appbase-promotion-membership-entitlement-design.md` on 2026-06-24.
> Owner: SDKWork maintainers

## Canonical Source

The canonical promotion and card-coupon design is:

- [2026-05-26-admin-marketing-promotion-standard-design.md](2026-05-26-admin-marketing-promotion-standard-design.md)

This document only records the appbase ownership boundary around that design.

## Ownership Boundary

`sdkwork-appbase` owns reusable promotion, membership, entitlement, wallet, recharge, payment, and catalog capabilities. Product applications compose appbase runtime contracts, generated SDKs, and admin adapters. Product applications do not define promotion storage, rule engines, stock counters, wallet coupon lifecycle logic, or discount allocation logic.

## Bounded Contexts

Benefit and entitlement:

- `benefit_definition`
- `entitlement_grant`
- `entitlement_account`
- `entitlement_ledger_entry`

Membership:

- `membership_plan`
- `membership_plan_version`
- `membership_plan_benefit`
- `membership_package_group`
- `membership_package`
- `membership_subscription`
- `membership_period`

Promotion:

- `promotion_offer`
- `promotion_offer_version`
- `promotion_offer_scope`
- `promotion_offer_audience_rule`
- `promotion_offer_time_window`
- `promotion_budget_account`
- `promotion_budget_ledger_entry`
- `promotion_coupon_stock`
- `promotion_code`
- `promotion_user_coupon`
- `promotion_discount_application`
- `promotion_discount_allocation`
- `promotion_coupon_ledger_entry`
- `promotion_external_binding`
- `promotion_event_outbox`

## Admin Boundaries

Admin should be split by business responsibility:

- Benefit Catalog: reusable benefit definitions, units, measurement type, lifecycle.
- Entitlement Accounts: subject accounts, grants, balances, ledger entries, expiry, corrections, reversals.
- Membership Center: plans, versions, benefits, package groups, packages, subscriptions, periods, member state.
- Promotion Center: offers, versions, scopes, audience rules, time windows, budgets, stocks, codes, user coupons, applications, allocations, ledgers, external bindings, event outbox.
- Payment Configuration: payment methods, providers, provider accounts, channels, route rules.

## Runtime Boundary

Runtime/API naming follows the bounded context:

- Promotion operations use `promotions.*`.
- Membership operations use `memberships.*`.
- Entitlement operations use `entitlements.*`.
- Benefit catalog operations use `benefits.*`.
- Payment configuration operations use `payments.*`.

## Invariants

- Appbase is the single source of truth for reusable promotion and membership primitives.
- Product applications consume generated SDKs and do not implement local promotion repositories.
- Published commercial rules are immutable and versioned.
- Ledgers are append-only.
- External sync uses binding and outbox tables rather than direct ad hoc callbacks.
- Demo or seed data must remain deterministic and inactive unless a test explicitly activates it.

