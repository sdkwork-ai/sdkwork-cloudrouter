# SDKWork Storage Usage PC React

Embeddable storage usage and quota components for business pages.

The components read standard storage usage snapshots through
`@sdkwork/file-service`. They expose tenant, organization, user, app, space, and
business-domain accounting without leaking ledger rows, providers, buckets,
object keys, or presigned URLs.

## SDKWork Documentation Contract

Domain: drive
Capability: storage-usage
Package type: react-package
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

- `pnpm --filter @sdkwork/storage-usage-pc-react typecheck`

### Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`.
