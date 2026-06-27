# SDKWork File Picker PC React

Embeddable file picker components for business pages.

The picker loads files through `@sdkwork/file-service` and returns stable
`FileRef` values. It does not expose object storage keys, bucket names, or
presigned URLs.

Business pages configure `slotCode`, optional target, and selection mode. The
component remains a reusable file-platform block instead of a storage-specific
browser.

## SDKWork Documentation Contract

Domain: drive
Capability: file-picker
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

- `pnpm --filter @sdkwork/file-picker-pc-react typecheck`

### Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`.
