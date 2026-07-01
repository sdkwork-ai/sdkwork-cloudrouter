# SDKWork File API Contracts

Canonical OpenAPI contract documents for the SDKWork file platform app and
backend API surfaces.

The package keeps API standards executable: route alignment, operation id
uniqueness, exact alignment with canonical operation contracts, app/backend
authority separation, backend RBAC metadata, and storage-internal field
boundaries are covered by tests. Every templated route also derives required
OpenAPI `in: path` parameters from the canonical route path, so generated SDK
method signatures cannot drift from `{fileId}`, `{sessionId}`, `{nodeId}`, and
other path variables. Adapter-facing read/list operations define standard query
parameters for `requestId`, pagination, target filters, usage scopes, bucket
scope filters, reconciliation filters, and usage ledger/snapshot time windows.
The app API surface intentionally does not define upload sessions, part
presigning, or app-local upload completion endpoints; client upload is provided
by SDKWork Drive Uploader through `sdkwork-drive-app-sdk`. Backend storage
configuration commands define
JSON request body schemas with explicit `idempotencyKey` and `requestId` fields
so generated SDKs carry retry-safe admin command contracts. Storage provider
type and logical bucket scope enums come from `@sdkwork/file-contracts`, so API
schemas and TypeScript ports share one canonical vocabulary. App file-access URL
and file-binding command operations also bind explicit request body schemas,
keeping generated SDK methods strongly typed for short-lived access URL
issuance and binding lifecycle commands while upload transport remains in Drive.

Foundation read/list operations now also require typed JSON `200` responses.
App-side file list/detail, binding list, drive space/node list, and current
usage responses use storage-safe schemas that expose only stable file, drive,
binding, and usage resources. Backend storage provider, bucket, quota,
reconciliation, usage counter, ledger, and snapshot lists use explicit admin
resource envelopes. Storage configuration and operation mutation responses
return the same typed admin resource schemas instead of generic objects, while
still avoiding credential values and transport details.

The standard now applies globally across the app and backend OpenAPI surfaces:
every operation must expose a typed JSON `200` response, and every non-GET
command must define a JSON request body whose schema includes `requestId`. This
keeps generated SDK methods traceable, strongly typed, and free from ad hoc
transport-shaped inputs across file, drive, storage, file-slot, security, and
audit APIs.

Each OpenAPI document publishes only schemas reachable from its own paths.
App-side SDK artifacts therefore do not carry backend admin storage governance,
security, or audit component schemas unless an app operation actually references
them. After pruning, every remaining `#/components/schemas/*` reference must
resolve inside that same OpenAPI document; unresolved refs are reported as
`unresolved_schema_ref:<surface>:<schema>` so generator input drift is caught
before SDK code generation.

Object schemas must also stay bounded. `additionalProperties: true` is rejected
because it generates weak DTOs and hides contract drift. Map-like fields are
allowed only when their value schema is explicit. Storage garbage-collection
selection now uses a structured
`StorageGarbageCollectionCriteria` schema instead of a free-form criteria
object.

Reusable type fields must bind to canonical vocabularies from
`@sdkwork/file-contracts`. Drive node type, drive space type, and storage usage
scope fields are emitted as OpenAPI enums and validated for drift, so generated
SDKs do not reduce these platform concepts back to arbitrary strings.

## SDKWork Documentation Contract

Domain: drive
Capability: file-api-contracts
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

- `pnpm --filter @sdkwork/file-api-contracts typecheck`

### Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`.
