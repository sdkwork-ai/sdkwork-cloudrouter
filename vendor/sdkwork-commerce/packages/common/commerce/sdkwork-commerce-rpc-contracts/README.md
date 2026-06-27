# @sdkwork/commerce-rpc-contracts

Canonical SDKWork commerce RPC contract package.

This package owns protobuf service definitions for the first commerce gRPC slice:

- `sdkwork.commerce.app.v3.WalletService`
- `sdkwork.commerce.app.v3.CheckoutService`
- `sdkwork.commerce.backend.v3.PaymentAdminService`
- `sdkwork.commerce.backend.v3.CommerceReportService`

The RPC package is contract-first. Rust manifests in `sdkwork-commerce-service-host::rpc`
map every RPC method back to the canonical SDKWork operationId catalog so that
HTTP/OpenAPI, Tauri, and gRPC surfaces stay aligned.

## SDKWork Documentation Contract

Domain: commerce
Capability: commerce
Package type: node-package
Status: standard (proto authority; live gRPC runtime deferred per ADR)

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

- `node apps/scripts/validate-component-specs.mjs --apps-root apps --json`

### Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`.
