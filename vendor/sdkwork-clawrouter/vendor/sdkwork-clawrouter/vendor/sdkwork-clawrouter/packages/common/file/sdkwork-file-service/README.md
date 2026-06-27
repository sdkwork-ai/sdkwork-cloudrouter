# SDKWork File Service

Service orchestration for the SDKWork file platform.

The service validates business file slots, reserves quota, delegates upload and
binding work through SDK ports, and returns stable file references. It does not
perform raw HTTP requests or object-storage operations directly.

Uploads are delegated through the Drive app SDK uploader facade. The service
coordinates slot policy and quota, then returns stable Drive space/node
identities and `FileRef` metadata without exposing upload sessions, buckets,
object keys, provider internals, or presigned URLs to business callers.

It also exposes file listing, file binding management, short-lived file access
URL issuance, drive browsing, and scoped storage usage reads for UI building
blocks while preserving the rule that business callers never handle buckets,
object keys, provider internals, or presigned URLs as durable data.

`bindFile` enforces slot cardinality before creating a binding, so single and
bounded multi-file slots cannot be overfilled by callers that bypass UI
components.

## SDKWork Documentation Contract

Domain: drive
Capability: file-service
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

- `pnpm --filter @sdkwork/file-service typecheck`

### Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`.
