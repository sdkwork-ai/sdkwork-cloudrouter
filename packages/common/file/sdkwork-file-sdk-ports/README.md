# SDKWork File SDK Ports

SDK port interfaces for the SDKWork file platform.

This package defines the dependency-injection boundary used by services and UI.
Adapters may implement these ports with generated SDK clients, Tauri bridges, or
test doubles. It does not perform HTTP requests itself.

The ports keep upload, binding, access, drive, usage, and admin storage concerns
separate. Drive APIs return canonical drive spaces and nodes; usage APIs return
the canonical storage usage snapshot contract rather than database ledger rows
or object-storage provider details. Admin storage ports expose provider, bucket,
quota, usage counter, usage ledger, and usage snapshot query boundaries for
backend governance consoles without leaking generated SDK transport details.
They also cover idempotent provider, bucket, and quota-policy create commands,
plus reconciliation runs and garbage-collection job commands, so storage
configuration and operations use the same generated-SDK-facing boundary.
Provider types and logical bucket scopes are imported from
`@sdkwork/file-contracts`, keeping port inputs aligned with OpenAPI schemas and
database catalog naming.

## SDKWork Documentation Contract

Domain: drive
Capability: file-sdk-ports
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

- `pnpm --filter @sdkwork/file-sdk-ports typecheck`

### Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`.
