# @sdkwork/commerce-runtime

Commerce runtime composition for SaaS, local, and private deployments.

The runtime validates generated app SDK completeness before exposing the commerce service. Local/private hosts can compose the same boundary with the Rust commerce crates.

## SDKWork Documentation Contract

Domain: commerce
Capability: commerce-runtime
Package type: node-package
Status: standard

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

- `pnpm --filter @sdkwork/commerce-runtime typecheck`

### Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`.
