# SDKWork File Contracts

Canonical TypeScript contracts for the SDKWork file platform.

This package is intentionally pure. It does not depend on React, generated SDK
clients, object-storage clients, or runtime services.

It defines stable file references, slot definitions, Drive spaces/nodes,
storage-safe API route and operation contracts, table names, S3-compatible
storage provider types, logical bucket scopes, and storage usage snapshots for
tenant, organization, user, app, space, and business-domain accounting.
Upload lifecycle state, session preparation, part presigning, provider object
keys, and client upload transport belong to SDKWork Drive Uploader through
`sdkwork-drive-app-sdk`, not this file contract package.

## SDKWork Documentation Contract

Domain: drive
Capability: file-contracts
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

- `pnpm --filter @sdkwork/file-contracts typecheck`

### Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`.
