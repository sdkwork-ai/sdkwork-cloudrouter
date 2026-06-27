# SDKWork File SDK Adapter

Approved wrapper boundary between generated SDK clients and the SDKWork file
platform service/component interfaces.

This package does not perform HTTP, configure auth headers, or fork generated
SDK code. It accepts semantic app/backend SDK wrapper clients, maps them to the
file platform service and admin storage port shapes, and validates the mapping
against the canonical OpenAPI contracts. Backend admin mappings cover storage
provider, bucket, and quota-policy list/create commands, usage counters,
append-only usage ledger queries, and historical usage snapshots. They also map
reconciliation run list/create and garbage-collection job create operations
through semantic generated SDK wrapper methods. Mutating storage configuration
commands carry explicit idempotency keys at the port boundary; the adapter still
delegates only to semantic generated SDK wrapper methods.
Adapter standard validation also requires command mappings to point at OpenAPI
operations with JSON request bodies, so generated SDK wrappers cannot silently
degrade command inputs to untyped or transport-specific shapes.
Every adapter-mapped operation must also point at an OpenAPI operation with a
typed JSON `200` response schema. This keeps app service facades and backend
admin storage ports aligned with generated SDK return types for both commands
and read/list operations.

## SDKWork Documentation Contract

Domain: drive
Capability: file-sdk-adapter
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

- `pnpm --filter @sdkwork/file-sdk-adapter typecheck`

### Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`.
