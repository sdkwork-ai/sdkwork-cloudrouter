# SDKWork File Upload Client

Standard Drive uploader facade for the SDKWork file platform.

This package exposes the file upload client contract as a thin wrapper over an
injected Drive uploader implementation. Browser, desktop, and React callers
provide an `uploadFile` function backed by `sdkwork-drive-app-sdk`
`client.uploader.*`; this package does not create upload sessions, presign
parts, choose buckets, build object keys, call raw HTTP, or own provider
transport.

## SDKWork Documentation Contract

Domain: drive
Capability: file-upload-client
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

Do not add secrets, live tokens, manual auth headers, raw Drive HTTP calls, or
app-local credential handling to this module.

### Extension Points

Extension points are limited to declared public exports, runtime entrypoints, SDK clients, events, and config keys.

### Verification

- `pnpm --filter @sdkwork/file-upload-client typecheck`
- `pnpm --filter @sdkwork/file-upload-client test`

### Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`.
