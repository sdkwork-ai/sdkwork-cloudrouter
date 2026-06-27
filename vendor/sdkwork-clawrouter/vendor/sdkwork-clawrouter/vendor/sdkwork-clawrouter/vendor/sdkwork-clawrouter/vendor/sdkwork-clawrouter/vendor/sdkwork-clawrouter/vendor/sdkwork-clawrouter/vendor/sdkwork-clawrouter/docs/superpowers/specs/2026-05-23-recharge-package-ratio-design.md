# Recharge Package Ratio Design

## Goal

Fix point recharge behavior across console recharge, membership credit purchase, appbase recharge order creation, and admin membership recharge package management.

The system must:

- Load recharge packages from the backend only.
- Pass the selected `packageId` when creating recharge payment orders.
- Support custom recharge amounts.
- Calculate custom amount points from a backend-configured money-to-points ratio.
- Let admin membership center manage that ratio.
- Recalculate displayed amount and points in real time.
- Keep the backend as the final authority for payable amount and credited points.

## Current Problems

Console recharge currently falls back to hardcoded frontend packages when the backend package list is empty or fails. It also computes points in the frontend with a fixed `moneyCents / 10` rule.

`RechargeService.submitRecharge()` currently sends `amount`, `paymentMethod`, and `packageId` under `metadata`. The appbase recharge router reads only top-level `amount` and `method`, so selected package identity is not honored.

The appbase recharge command and storage layers do not carry `packageId`. Storage matches packages by amount, which breaks duplicate-price package behavior and package-specific bonus handling.

Backend package list and admin package list both compute base points with a hardcoded function equivalent to `1 CNY = 10 points`.

Admin membership recharge package management exposes package amount, bonus points, and status, but does not expose the money-to-points ratio.

## Storage Strategy

Do not add a new table or migration for this change.

Reuse the existing `commerce_exchange_rule` table. Add support for a `CASH -> POINTS` rule:

- `source_asset_type = cash`
- `target_asset_type = points`
- `rate = points credited for 1 CNY`
- `status = active`

The existing `POINTS -> CASH` rule remains available for existing exchange behavior. Admin exchange rule validation and app exchange rule validation must accept both supported pairs:

- `POINTS -> CASH`
- `CASH -> POINTS`

Default ratio behavior must preserve current production semantics when no configured rule exists:

- default `CASH -> POINTS` rate: `10`
- example: `10.00 CNY` credits `100` base points before package bonus.

## Backend App API

### Recharge Settings

Add an app read endpoint:

`GET /app/v3/api/recharges/settings`

Response data:

```json
{
  "sourceAssetType": "CASH",
  "targetAssetType": "POINTS",
  "rate": "10"
}
```

This endpoint lets console recharge fetch the configured ratio for real-time custom amount display. The frontend display remains advisory; order creation recalculates points on the backend.

### Recharge Order Create

Change `POST /app/v3/api/recharges/orders` request schema from the generic standard command request to a recharge-specific request:

```json
{
  "clientRequestNo": "recharge-...",
  "amount": "10.00",
  "method": "wechat",
  "packageId": "pack-owner-10"
}
```

Rules:

- `method` is required.
- `packageId` is optional.
- `amount` is required when `packageId` is absent.
- When `packageId` is present, the backend loads the active package by id for tenant and organization scope.
- When both `packageId` and `amount` are present, `amount` must equal the package price. A mismatch returns a validation/conflict error.
- When `packageId` is present, the order uses the package price, package SKU, package name, and package bonus.
- When `packageId` is absent, the order is a custom amount order, does not receive any package bonus, and uses the default active recharge product/SKU.
- Top-level fields are the canonical API. The portal must not send recharge inputs only inside `metadata`.

Order response should include enough data for UI and checkout flow:

```json
{
  "success": true,
  "orderNo": "RC...",
  "amount": "10.00",
  "points": 125,
  "paymentMethod": "wechat",
  "status": "pending"
}
```

## Backend Storage and Domain

Extend `CreatePointsRechargeOrderCommand` with:

- `package_id: Option<String>`

Add a recharge ratio read abstraction in the recharge store path. It should load the active `CASH -> POINTS` rule for the tenant and organization with global fallback, using the same table semantics as existing exchange rule readers.

Point calculation:

- `base_points = round(amount * rate)`
- Package order: `credited_points = base_points + package.bonus_points`
- Custom order: `credited_points = base_points`
- Minimum credited base points remains `1` for a valid positive amount.

Package loading:

- Add a `load_recharge_pack_by_id` path for package orders.
- Keep amount-based SKU selection only for custom amount fallback.
- Prefer package SKU for package orders.
- Reject inactive, deleted, out-of-window, cross-tenant, or cross-organization packages.

Package list:

- Use configured ratio for `points` in app package list and admin package list.
- Preserve package `bonus` as additive package-only bonus.

Checkout status:

- Continue reading credited points from payment attempt callback payload.
- No schema change is required for checkout storage.

## Admin API

Add backend management endpoints:

`GET /backend/v3/api/recharges/settings`

`PUT /backend/v3/api/recharges/settings`

Mutation request:

```json
{
  "rate": "10"
}
```

Response item:

```json
{
  "sourceAssetType": "CASH",
  "targetAssetType": "POINTS",
  "rate": "10",
  "status": "active"
}
```

Implementation should route through the admin marketing store because the membership center recharge package page already owns the admin recharge package surface. The store can reuse existing exchange rule upsert logic after it supports the `CASH -> POINTS` pair.

Audit logging:

- Write an admin audit log entry for ratio updates.
- Use a distinct action such as `update_recharge_points_ratio`.
- Include old/new rate when practical; at minimum include the saved rate and asset pair.

## Frontend App Behavior

### Console Recharge

`apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-recharge`

Changes:

- Remove `referenceRechargeOptions`.
- Remove hardcoded `pointsForAmount` fallback.
- Load packages from `RechargeService.fetchPackages()`.
- Load recharge settings from a new `RechargeService.fetchSettings()`.
- Package cards show backend `points`.
- Custom amount uses backend `rate` for real-time displayed points.
- Disable pay while packages/settings are loading only when the selected path depends on the missing data.
- Empty backend package list displays an empty state instead of frontend default packages.
- Package order submits `{ amount, method, packageId }`.
- Custom order submits `{ amount, method }`.

### membership Credit Purchase

`apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-membership/src/MembershipView.tsx`

Changes:

- Continue loading packages from `RechargeService.fetchPackages()`.
- Continue using backend package `points`.
- Ensure package order passes `packageId` and top-level request fields through `RechargeService.submitRecharge()`.
- Do not add custom amount to the membership modal unless requested separately; the current membership flow is package-based.

### Admin Membership Center

`apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships`

Changes:

- Add ratio settings to `MembershipRechargePackagesPage`.
- Fetch settings in parallel with packages.
- Add a small settings panel above the package table:
  - ratio input
  - "1 CNY = N points" preview
  - save button
  - load/save error state
- After saving the ratio, refresh settings and recharge packages so package total points reflect the backend value.
- Keep package drawer fields as amount, bonus points, and status.

## SDK and Contract

App frontend calls must continue using `@sdkwork/clawrouter-app-sdk` through `getClawRouterAppSdkClient()`.

Admin frontend calls must continue using `@sdkwork/clawrouter-backend-sdk` through the existing backend SDK boundary.

Contract updates:

- Add `appRechargesSettingsRetrieve`.
- Add `backendRechargesSettingsRetrieve`.
- Add `backendRechargesSettingsUpdate`.
- Replace `appRechargesOrdersCreate` request schema with a recharge-specific request that includes `amount`, `method`, `packageId`, and `clientRequestNo`.
- Add or update response schemas to include recharge order fields used by the UI.

Regenerate generated artifacts using the existing Claw Router SDK workflow, rather than hand-editing generated SDK output.

## Error Handling

Package list failures show a blocking error and retry affordance. They do not fall back to frontend package constants.

Settings load failure should not create an order with frontend-only assumptions. Custom amount point display should show `0` or unavailable state until settings load succeeds. Package cards may still show backend package `points` if package load succeeds.

Order creation failures surface backend messages directly where already supported by UI error helpers.

Package id mismatch between request `amount` and package price returns a validation/conflict error and does not create an order.

Missing active `CASH -> POINTS` rule uses default rate `10` so recharge remains available.

## Testing Plan

Backend Rust tests:

- App package list uses configured `CASH -> POINTS` ratio.
- App package list falls back to default rate `10` when no rule exists.
- Package order with `packageId` uses package price, package SKU, and package bonus.
- Package order rejects mismatched `amount`.
- Custom amount order uses ratio and no package bonus.
- Settings endpoint returns configured ratio.
- Admin settings update persists `CASH -> POINTS` ratio.

Frontend TypeScript/runtime tests:

- Console recharge source no longer contains `referenceRechargeOptions` or hardcoded point fallback.
- `RechargeService.submitRecharge()` sends top-level `amount`, `method`, and optional `packageId`.
- Console custom amount calculates display points from settings rate.
- Empty backend package list renders empty state instead of default options.
- membership credit purchase passes selected package id.
- Admin recharge packages page loads and saves ratio settings through backend SDK boundary.

Contract/SDK verification:

- Run API contract manifest generation.
- Run OpenAPI generation.
- Regenerate app and backend TypeScript SDKs.
- Run SDK guardian/schema quality gate or report exact failures.

## Acceptance Criteria

- `/console/recharge` never displays frontend hardcoded recharge packages.
- `/console/recharge` custom amount points are based on backend ratio settings.
- `/console/recharge` package orders pass `packageId`.
- `/memberships` credit purchase package orders pass `packageId`.
- Backend order creation honors package identity, not just amount.
- Backend rejects package amount mismatch.
- Admin membership center can update `1 CNY = N points`.
- Package list points change when the admin ratio changes.
- No database migration is introduced for this change.
