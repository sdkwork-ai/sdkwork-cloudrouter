# @sdkwork/commerce-pc-membership-purchase

## Purpose

membership package purchase entry points for top-header menus, package selection, renewal, and upgrade submission.

## Placement

- Architecture: `pc-react`
- Domain: `commerce`
- Capability: `membership-purchase`
- Status: `ready`

## Depends on

- `@sdkwork/ui-pc-react` for shared UI primitives and patterns
- `@sdkwork/commerce-pc-membership` for membership dashboard types and membership mutation mapping
- `@sdkwork/commerce-service` for generated app SDK boundaries, session checks, and response normalization
- Lower-level foundation host packages only

## Ownership

This package owns purchase-specific header and menu contracts. membership dashboard display remains in `@sdkwork/commerce-pc-membership`, and admin membership management remains in `@sdkwork/commerce-pc-admin-membership`.

The purchase flow is intentionally service-first:

- `createSdkworkMembershipPurchaseService()` is the package-level submission boundary.
- `SdkworkMembershipPurchaseMenu` always submits through the purchase service, then refreshes the injected membership controller.
- Hosts can inject a custom purchase service for composition, but the default path still resolves to the shared commerce service boundary.

## Runtime Boundary

Remote purchase, renew, and upgrade calls are routed through `@sdkwork/commerce-service` and `memberships.purchases.*` via the reusable membership service. This package does not create raw HTTP clients, mutate browser location, or own wallet state.

## Verification

Use the package `typecheck` script and focused Vitest coverage for route intents, purchase service behavior, header integration, duplicate-submit protection, and failure display.

## SDKWork Documentation Contract

Domain: iam
Capability: membership-purchase
Package type: react-package
Status: ready

### Public API

Public exports are declared in `specs/component.spec.json` under `contracts.publicExports`.

### Required SDK Surface

- None declared in `specs/component.spec.json`.

### Configuration

Configuration keys and runtime entrypoints are declared in `specs/component.spec.json`.

### SaaS/Private/Local Behavior

This module follows the canonical standards linked from `specs/component.spec.json`, including deployment and runtime configuration rules where applicable.

### Security

Do not add secrets, live tokens, manual auth headers, or app-local credential handling to this module.

### Extension Points

Extension points are limited to declared public exports, runtime entrypoints, SDK clients, events, and config keys.

### Verification

- `pnpm --filter @sdkwork/commerce-pc-membership-purchase typecheck`

### Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`.
