# @sdkwork/commerce-pc-admin-membership

Admin membership management package for SDKWork PC React applications.

This package owns the admin-facing membership management surface. It uses the shared
`@sdkwork/commerce-service` SDK boundary and calls `admin.memberships.*` resources for:

- membership levels
- membership packages
- membership records
- membership entitlement inventory

Runtime ownership stays separated from user-facing membership purchase flows:
`@sdkwork/commerce-pc-membership` owns member dashboards and purchase actions, while this
package owns admin review and mutation workflows.

## SDKWork Documentation Contract

Domain: iam
Capability: membership-admin
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

- `pnpm --filter @sdkwork/commerce-pc-admin-membership typecheck`

### Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`.
